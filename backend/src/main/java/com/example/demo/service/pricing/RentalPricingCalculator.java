package com.example.demo.service.pricing;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import org.springframework.stereotype.Component;

/**
 * The one place the rental rate structure is implemented.
 *
 * WHY THIS EXISTS
 * ---------------
 * The same arithmetic is needed in four places that do not share a service:
 * creating a booking, creating a guest booking, modifying a booking, and now
 * closing one at return. Every copy is a chance for two of them to disagree,
 * and a disagreement here means a customer is quoted one figure and invoiced
 * another.
 *
 * THE RULE
 * --------
 *   vehicleAmount = whole months  x monthly
 *                 + whole weeks   x weekly
 *                 + leftover days x daily
 *   taxAmount     = (vehicleAmount + addonAmount) x 18%
 *   grandTotal    = vehicleAmount + addonAmount + taxAmount
 *   finalAmount   = grandTotal + fuelCharges        (settled at return)
 *
 * So 40 days is 1 month + 1 week + 3 days.
 */
@Component
public class RentalPricingCalculator {

    /** GST applied to the vehicle and add-on subtotal. */
    public static final BigDecimal TAX_RATE = new BigDecimal("0.18");

    /**
     * The date a rental is billed FROM.
     *
     * WHY NOT SIMPLY THE START DATE
     * -----------------------------
     * The start date is what the customer *planned*. The hand-over date is
     * when they actually drove the car away, and it is stamped with the
     * server clock at hand-over. Those two differ whenever a customer turns
     * up late, and billing from the planned date would charge them for days
     * the car spent sitting at the hub.
     *
     * So once a vehicle has been handed over, the hand-over date is the
     * billing start. Before hand-over there is nothing else to use, and the
     * start date stands.
     *
     * @param handoverDate when the car actually left, or null if it has not
     * @param startDate    the planned pick-up date, used as the fallback
     */
    public LocalDate billingStartDate(
            LocalDateTime handoverDate,
            LocalDate startDate) {

        return handoverDate != null
                ? handoverDate.toLocalDate()
                : startDate;
    }

    /**
     * Whole days between two dates, floored at 1.
     *
     * The floor matters at return: a car collected and brought back the same
     * morning is still a day's rental, and a duration of zero would price the
     * whole booking at nothing.
     */
    public int durationInDays(LocalDate startDate, LocalDate endDate) {

        if (startDate == null || endDate == null) {
            return 1;
        }
        long days = ChronoUnit.DAYS.between(startDate, endDate);
        return days < 1 ? 1 : (int) days;
    }

    /** Prices the vehicle for a number of days using the tiered rates. */
    public BigDecimal vehicleAmount(
            BigDecimal daily,
            BigDecimal weekly,
            BigDecimal monthly,
            int days) {

        BigDecimal d = orZero(daily);
        BigDecimal w = orZero(weekly);
        BigDecimal m = orZero(monthly);

        int months = days / 30;
        int remainder = days % 30;
        int weeks = remainder / 7;
        int extraDays = remainder % 7;

        return m.multiply(BigDecimal.valueOf(months))
                .add(w.multiply(BigDecimal.valueOf(weeks)))
                .add(d.multiply(BigDecimal.valueOf(extraDays)))
                .setScale(2, RoundingMode.HALF_UP);
    }

    /** 18% GST on the vehicle and add-on subtotal. */
    public BigDecimal taxAmount(BigDecimal vehicleAmount, BigDecimal addonAmount) {
        return orZero(vehicleAmount)
                .add(orZero(addonAmount))
                .multiply(TAX_RATE)
                .setScale(2, RoundingMode.HALF_UP);
    }

    /** What the customer owes before fuel is settled. */
    public BigDecimal grandTotal(
            BigDecimal vehicleAmount,
            BigDecimal addonAmount,
            BigDecimal taxAmount) {

        return orZero(vehicleAmount)
                .add(orZero(addonAmount))
                .add(orZero(taxAmount))
                .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Re-prices one add-on line for a new number of days.
     *
     * The stored line is a TOTAL, not a per-day rate, so the per-day price has
     * to be recovered from it. Deliberately recovered from the line rather
     * than read fresh from the addon table: the customer agreed a price when
     * they booked, and a hub that has since changed its rate card must not be
     * able to re-price a rental that is already under way.
     */
    public BigDecimal repriceAddonLine(
            BigDecimal originalLineTotal,
            int originalDays,
            int newDays) {

        BigDecimal total = orZero(originalLineTotal);

        if (originalDays < 1) {
            // Nothing sensible to divide by - leave the line as it stands.
            return total.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal perDay = total.divide(
                BigDecimal.valueOf(originalDays), 4, RoundingMode.HALF_UP);

        return perDay.multiply(BigDecimal.valueOf(newDays))
                .setScale(2, RoundingMode.HALF_UP);
    }

    // ============================================================
    //  FUEL
    // ============================================================

    /**
     * What a full tank costs to replace.
     *
     * Fuel is charged in proportion to what is missing, so a quarter of a
     * tank is a quarter of this: hand a car over Full, take it back at 3/4,
     * and the customer is charged 40.00 x 0.25 = 10.00.
     *
     * One flat figure rather than litres x price, because the fuel gauge is
     * recorded as a percentage and tank sizes differ per car. If you later
     * want it per vehicle, `car.fuel_capacity_liters` is already on the Car
     * entity and this is the one place that would have to change.
     */
    public static final BigDecimal FULL_TANK_CHARGE = new BigDecimal("40.00");

    /**
     * The fuel charge for a rental, from the two gauge readings.
     *
     * Returning with MORE fuel than it went out with is not a refund - the
     * charge floors at zero. Filling the tank as a favour is not something
     * the customer gets paid for.
     *
     * @param fuelLevelOut percentage at hand-over
     * @param fuelLevelIn  percentage at return
     */
    public BigDecimal fuelCharge(Integer fuelLevelOut, Integer fuelLevelIn) {

        if (fuelLevelOut == null || fuelLevelIn == null) {
            return BigDecimal.ZERO.setScale(2);
        }

        int missing = fuelLevelOut - fuelLevelIn;

        if (missing <= 0) {
            return BigDecimal.ZERO.setScale(2);
        }

        return FULL_TANK_CHARGE
                .multiply(BigDecimal.valueOf(missing))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    // ============================================================
    //  SERVICING
    // ============================================================

    /** How many days before its service a car stops being rentable. */
    public static final int SERVICE_BLACKOUT_DAYS = 3;

    /**
     * True when a rental would run into a vehicle's service window.
     *
     * A car is unavailable on its service date and for the three days before
     * it, so there is time to get it back and prepared. The check is on both
     * ends of the booking: a rental that starts clear but ends inside the
     * window would still have the car out when it is due in the workshop.
     *
     * @param serviceDueDate when the car is booked in, or null if it is not
     */
    public boolean clashesWithService(
            LocalDate serviceDueDate,
            LocalDate bookingStart,
            LocalDate bookingEnd) {

        if (serviceDueDate == null) {
            return false;
        }

        LocalDate blackoutFrom = serviceDueDate.minusDays(SERVICE_BLACKOUT_DAYS);

        return inWindow(bookingStart, blackoutFrom, serviceDueDate)
                || inWindow(bookingEnd, blackoutFrom, serviceDueDate);
    }

    /** Inclusive at both ends - the service date itself is blocked. */
    private boolean inWindow(LocalDate date, LocalDate from, LocalDate to) {
        return date != null
                && !date.isBefore(from)
                && !date.isAfter(to);
    }

    /** Null-safe: a missing amount counts as zero, never as a crash. */
    public BigDecimal orZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    /** Null-safe Double -> BigDecimal, for rates stored as Double. */
    public BigDecimal toAmount(Double value) {
        return value == null
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }
}
