namespace FleetManagement.Service.Pricing;

/// <summary>
/// The one place the rental rate structure is implemented, ported line for
/// line from the Java com.example.demo.service.pricing.RentalPricingCalculator.
///
/// THE RULE
/// --------
///   vehicleAmount = whole months  x monthly
///                 + whole weeks   x weekly
///                 + leftover days x daily
///   taxAmount     = (vehicleAmount + addonAmount) x 18%
///   grandTotal    = vehicleAmount + addonAmount + taxAmount
///   finalAmount   = grandTotal + fuelCharges        (settled at return)
///
/// So 40 days is 1 month + 1 week + 3 days.
///
/// This MUST agree with the Java implementation to the paisa. Both backends
/// write to the same booking_header rows, and a booking priced by one and
/// invoiced by the other has to come out at the same number.
/// </summary>
public class RentalPricingCalculator
{
    /// <summary>GST applied to the vehicle and add-on subtotal.</summary>
    public const decimal TaxRate = 0.18m;

    /// <summary>
    /// What a full tank costs to replace. Fuel is charged in proportion to
    /// what is missing, so a quarter tank is 10.00.
    /// </summary>
    public const decimal FullTankCharge = 40.00m;

    /// <summary>Days before its service date that a car stops being rentable.</summary>
    public const int ServiceBlackoutDays = 3;

    /// <summary>
    /// The date a rental is billed FROM.
    ///
    /// The start date is what the customer planned; the hand-over date is when
    /// they actually drove the car away. Billing from the planned date would
    /// charge them for days the car sat at the hub waiting for them.
    /// </summary>
    public DateOnly BillingStartDate(DateTime? handoverDate, DateOnly startDate)
        => handoverDate.HasValue
            ? DateOnly.FromDateTime(handoverDate.Value)
            : startDate;

    /// <summary>
    /// Whole days between two dates, floored at 1.
    ///
    /// The floor matters at return: a car collected and brought back the same
    /// morning is still a day's rental, and a duration of zero would price the
    /// whole booking at nothing.
    /// </summary>
    public int DurationInDays(DateOnly startDate, DateOnly endDate)
    {
        var days = endDate.DayNumber - startDate.DayNumber;
        return days < 1 ? 1 : days;
    }

    /// <summary>Prices the vehicle for a number of days using the tiered rates.</summary>
    public decimal VehicleAmount(
        decimal? daily, decimal? weekly, decimal? monthly, int days)
    {
        var d = daily ?? 0m;
        var w = weekly ?? 0m;
        var m = monthly ?? 0m;

        var months = days / 30;
        var remainder = days % 30;
        var weeks = remainder / 7;
        var extraDays = remainder % 7;

        return decimal.Round(
            m * months + w * weeks + d * extraDays, 2, MidpointRounding.AwayFromZero);
    }

    /// <summary>18% GST on the vehicle and add-on subtotal.</summary>
    public decimal TaxAmount(decimal? vehicleAmount, decimal? addonAmount)
        => decimal.Round(
            ((vehicleAmount ?? 0m) + (addonAmount ?? 0m)) * TaxRate,
            2, MidpointRounding.AwayFromZero);

    /// <summary>What the customer owes before fuel is settled.</summary>
    public decimal GrandTotal(decimal? vehicleAmount, decimal? addonAmount, decimal? taxAmount)
        => decimal.Round(
            (vehicleAmount ?? 0m) + (addonAmount ?? 0m) + (taxAmount ?? 0m),
            2, MidpointRounding.AwayFromZero);

    /// <summary>
    /// Re-prices one add-on line for a new number of days.
    ///
    /// The stored line is a TOTAL, not a per-day rate, so the per-day price is
    /// recovered from it. Deliberately recovered from the line rather than read
    /// fresh from the addon table: the customer agreed a price when they
    /// booked, and a hub that has since changed its rate card must not be able
    /// to re-price a rental already under way.
    /// </summary>
    public decimal RepriceAddonLine(decimal? originalLineTotal, int originalDays, int newDays)
    {
        var total = originalLineTotal ?? 0m;

        if (originalDays < 1)
        {
            return decimal.Round(total, 2, MidpointRounding.AwayFromZero);
        }

        var perDay = decimal.Round(total / originalDays, 4, MidpointRounding.AwayFromZero);
        return decimal.Round(perDay * newDays, 2, MidpointRounding.AwayFromZero);
    }

    /// <summary>
    /// The fuel charge, from the two gauge readings.
    ///
    /// Returning with MORE fuel than it went out with is not a refund - the
    /// charge floors at zero.
    /// </summary>
    public decimal FuelCharge(int? fuelLevelOut, int? fuelLevelIn)
    {
        if (fuelLevelOut is null || fuelLevelIn is null) return 0m;

        var missing = fuelLevelOut.Value - fuelLevelIn.Value;
        if (missing <= 0) return 0m;

        return decimal.Round(
            FullTankCharge * missing / 100m, 2, MidpointRounding.AwayFromZero);
    }

    /// <summary>
    /// True when a rental would run into a vehicle's service window.
    ///
    /// A car is unavailable on its service date and for the three days before
    /// it. Checked on both ends of the booking: a rental that starts clear but
    /// ends inside the window would still have the car out on the day it is
    /// due in the workshop.
    /// </summary>
    public bool ClashesWithService(
        DateOnly? serviceDueDate, DateOnly bookingStart, DateOnly bookingEnd)
    {
        if (serviceDueDate is null) return false;

        var due = serviceDueDate.Value;
        var blackoutFrom = due.AddDays(-ServiceBlackoutDays);

        return InWindow(bookingStart, blackoutFrom, due)
            || InWindow(bookingEnd, blackoutFrom, due);
    }

    /// <summary>Inclusive at both ends - the service date itself is blocked.</summary>
    private static bool InWindow(DateOnly date, DateOnly from, DateOnly to)
        => date >= from && date <= to;
}
