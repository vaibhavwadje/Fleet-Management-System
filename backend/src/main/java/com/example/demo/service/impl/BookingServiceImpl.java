package com.example.demo.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.exception.error.BusinessException;
import com.example.demo.exception.error.ResourceNotFoundException;
import com.example.demo.exception.error.UnauthorizedActionException;
import com.example.demo.dto.request.AddonRequest;
import com.example.demo.dto.request.BookingRequest;
import com.example.demo.dto.request.GuestBookingRequest;
import com.example.demo.dto.request.StaffBookingRequest;
import com.example.demo.dto.request.UpdateBookingLocationsRequest;
import com.example.demo.dto.request.UpdateBookingRequest;
import com.example.demo.dto.request.UpdateBookingStatusRequest;
import com.example.demo.dto.response.BookingAddonResponse;
import com.example.demo.dto.response.BookingPageResponse;
import com.example.demo.dto.response.BookingResponse;
import com.example.demo.dto.response.BookingStatsResponse;
import com.example.demo.entity.BookingDetail;
import com.example.demo.entity.BookingHeader;
import com.example.demo.entity.base.Addon;
import com.example.demo.entity.base.CarType;
import com.example.demo.entity.base.City;
import com.example.demo.entity.base.Customer;
import com.example.demo.entity.base.Hub;
import com.example.demo.entity.base.Staff;
import com.example.demo.entity.base.State;
import com.example.demo.enums.BookingSource;
import com.example.demo.enums.BookingStatus;
import com.example.demo.enums.HubScope;
import com.example.demo.repository.BookingDetailRepository;
import com.example.demo.repository.BookingHeaderRepository;
import com.example.demo.repository.AddonRepository;
import com.example.demo.repository.CarTypeRepository;
import com.example.demo.repository.CityRepository;
import com.example.demo.repository.StateRepository;
import com.example.demo.repository.CustomerRepository;
import com.example.demo.repository.HubRepository;
import com.example.demo.repository.StaffRepository;
import com.example.demo.response.ApiResponse;
import com.example.demo.service.BookingService;
import com.example.demo.service.EmailService;
import com.example.demo.service.pricing.RentalPricingCalculator;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;


@Service
public class BookingServiceImpl implements BookingService {

    private static final Logger log =
            LoggerFactory.getLogger(BookingServiceImpl.class);

    private final BookingHeaderRepository bookingHeaderRepository;
    private final BookingDetailRepository bookingDetailRepository;
    private final CustomerRepository customerRepository;
    private final EmailService emailService;
    private final StaffRepository staffRepository;
    private final CarTypeRepository carTypeRepository;
    private final AddonRepository addonRepository;
    private final CityRepository cityRepository;
    private final StateRepository stateRepository;
    private final HubRepository hubRepository;
    private final RentalPricingCalculator pricingCalculator;

    public BookingServiceImpl(
            BookingHeaderRepository bookingHeaderRepository,
            BookingDetailRepository bookingDetailRepository,
            CustomerRepository customerRepository,
            StaffRepository staffRepository,
            CarTypeRepository carTypeRepository,
            AddonRepository addonRepository,
            CityRepository cityRepository,
            StateRepository stateRepository,
            HubRepository hubRepository,
            RentalPricingCalculator pricingCalculator,
            EmailService emailService) {

        this.bookingHeaderRepository = bookingHeaderRepository;
        this.bookingDetailRepository = bookingDetailRepository;
        this.customerRepository = customerRepository;
        this.staffRepository = staffRepository;
        this.carTypeRepository = carTypeRepository;
        this.addonRepository = addonRepository;
        this.cityRepository = cityRepository;
        this.stateRepository = stateRepository;
        this.hubRepository = hubRepository;
        this.pricingCalculator = pricingCalculator;
        this.emailService = emailService;
    }
    
    @Override
    @Transactional
    public ApiResponse<BookingResponse> createBooking(
            BookingRequest request) {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {

            throw new UnauthorizedActionException(
                    "Customer is not authenticated");
        }

        String email = authentication.getName();

        Customer customer = customerRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Customer not found"));

        BookingResponse response =
                saveBooking(customer, request);

        // Send booking confirmation email
        emailService.sendBookingConfirmation(response);

        return new ApiResponse<>(
                true,
                "Booking confirmed successfully",
                response);
    }


    @Override
    @Transactional
    public ApiResponse<BookingResponse> createStaffBooking(
            StaffBookingRequest request) {

        // --------------------------------
        // Who is taking the booking
        // --------------------------------

        Staff staff = requireLoggedInStaff();
        Integer hubId = staff.getHub().getHubId();
        String hubName = staff.getHub().getHubName();

        BookingRequest bookingRequest = request.getBooking();

        // --------------------------------
        // The on-spot rules, enforced here
        // --------------------------------
        //
        // The screen shows these as read-only fields, but a read-only input
        // is a courtesy, not a control - anyone can post whatever they like
        // to this endpoint. So the server sets them rather than checking
        // them: there is no value the caller could send that would win.
        //
        //   pick-up date  -> today, from the server clock
        //   pick-up time  -> now, recorded as the booking timestamp
        //   pick-up hub   -> the staff member's own hub
        //
        // The DROP-OFF hub is the one thing the staff member chooses. The car
        // is physically here, so it can only leave from here - but it may be
        // returned anywhere, which is an ordinary one-way rental. It defaults
        // to this hub when nothing is chosen.

        LocalDate today = LocalDate.now();

        bookingRequest.setStartDate(today);
        bookingRequest.setPickupHubId(hubId);
        bookingRequest.setPickupHubName(hubName);

        Integer dropoffHubId = bookingRequest.getDropoffHubId();

        if (dropoffHubId == null || dropoffHubId.equals(hubId)) {

            bookingRequest.setDropoffHubId(hubId);
            bookingRequest.setDropoffHubName(hubName);

        } else {

            // Resolved from the database rather than trusting the name the
            // browser sent, so the booking cannot end up labelled with one
            // hub's name and another hub's id.
            Hub dropoffHub = hubRepository
                    .findById(dropoffHubId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "The selected return location no longer exists"));

            bookingRequest.setDropoffHubId(dropoffHub.getHubId());
            bookingRequest.setDropoffHubName(dropoffHub.getHubName());
        }

        // The return date is the one thing staff genuinely choose. It still
        // has to be a real rental.
        if (bookingRequest.getEndDate() == null
                || !bookingRequest.getEndDate().isAfter(today)) {

            throw new BusinessException(
                    "The return date must be at least one day after today");
        }

        // --------------------------------
        // Vehicle category must exist at THIS hub
        // --------------------------------

        CarType carType = carTypeRepository
                .findById(bookingRequest.getCarTypeId().intValue())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "The selected vehicle type is no longer available"));

        if (carType.getHub() == null
                || !carType.getHub().getHubId().equals(hubId)) {

            throw new BusinessException(
                    "That vehicle category is not offered at your hub");
        }

        // --------------------------------
        // Build the booking
        // --------------------------------
        //
        // A walk-in has no account, so the customer snapshot is captured on
        // the booking exactly as it is for a guest booking. Everything after
        // this point - pricing, add-ons, status, e-mail - is the standard
        // flow, so an on-spot booking behaves like any other from here on.

        BookingHeader booking = new BookingHeader();

        booking.setDate(LocalDateTime.now());
        booking.setCustomerId(null);

        booking.setFirstName(request.getFirstName());
        booking.setLastName(request.getLastName());
        booking.setEmail(request.getEmail());
        booking.setPhone(request.getPhone());
        booking.setDrivingLicenseNo(request.getDrivingLicenseNo());
        booking.setPassportNo(request.getPassportNo());
        booking.setAddressLine1(request.getAddressLine1());
        booking.setAddressLine2(request.getAddressLine2());
        booking.setCityId(request.getCityId());
        booking.setStateId(request.getStateId());
        booking.setPincode(request.getPincode());

        booking.setCarTypeId(bookingRequest.getCarTypeId());
        booking.setStartDate(today);
        booking.setEndDate(bookingRequest.getEndDate());

        booking.setPickupHubId(hubId);
        booking.setPickupHubName(hubName);
        booking.setDropoffHubId(hubId);
        booking.setDropoffHubName(hubName);

        int duration = applyPricing(booking, bookingRequest);

        booking.setBookingStatus(BookingStatus.PENDING);

        BookingHeader savedBooking =
                bookingHeaderRepository.save(booking);

        // BookingSource.STAFF is what distinguishes this from an online
        // booking in the data - the enum existed but nothing ever set it.
        saveAddonLines(
                savedBooking.getBookingId(),
                bookingRequest.getAddons(),
                duration,
                BookingSource.STAFF);

        BookingResponse response = mapToBookingResponse(savedBooking);

        // The walk-in customer gets the same confirmation e-mail and PDF as
        // anyone booking online.
        emailService.sendBookingConfirmation(response);

        return new ApiResponse<>(
                true,
                "On-spot booking created successfully",
                response);
    }

    /**
     * Changes a booking whose vehicle is already out on the road.
     *
     * Only two fields are honoured - the return date and the drop-off hub -
     * and the booking is re-priced for the new period using the rates it was
     * booked at. See the note at the call site for why the rest of the
     * request is ignored rather than rejected.
     *
     * The amounts written here are provisional: the real bill is settled in
     * HandoverServiceImpl.returnVehicle from the ACTUAL return date, which may
     * differ again from what the customer plans today. Keeping them in step
     * matters anyway, because this is the figure the customer sees in My
     * Bookings until the car comes back.
     */
    private ApiResponse<BookingResponse> updateBookingAfterHandover(
            BookingHeader booking,
            UpdateBookingRequest request) {

        // --------------------------------
        // Return date
        // --------------------------------

        LocalDate newEndDate = request.getEndDate();

        if (newEndDate == null) {
            throw new BusinessException("A return date is required");
        }

        // Billed from the hand-over date, so validated against it too - see
        // the re-pricing note below.
        LocalDate billingStart = pricingCalculator.billingStartDate(
                booking.getHandoverDate(), booking.getStartDate());

        if (!newEndDate.isAfter(billingStart)) {
            throw new BusinessException(
                    "The return date must be after the day you collected the "
                    + "vehicle");
        }

        // The car is out now, so the rental cannot be made to end in the past.
        if (newEndDate.isBefore(LocalDate.now())) {
            throw new BusinessException(
                    "The return date cannot be in the past. To return the "
                    + "vehicle today, please take it to the return hub.");
        }

        // --------------------------------
        // Return location
        // --------------------------------
        //
        // Resolved from the database rather than trusting the name sent by
        // the browser, so the booking cannot end up labelled with one hub's
        // name against another hub's id. Which hub sees this booking in its
        // Return module follows from dropoff_hub_id, so this genuinely
        // re-routes the vehicle.

        Integer newDropoffHubId = request.getDropoffHubId();

        if (newDropoffHubId != null
                && !newDropoffHubId.equals(booking.getDropoffHubId())) {

            Hub dropoffHub = hubRepository
                    .findById(newDropoffHubId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "The selected return location no longer exists"));

            log.info("Booking {} return location changed from {} to {}",
                    booking.getBookingId(),
                    booking.getDropoffHubName(),
                    dropoffHub.getHubName());

            booking.setDropoffHubId(dropoffHub.getHubId());
            booking.setDropoffHubName(dropoffHub.getHubName());
        }

        // --------------------------------
        // Re-price for the new period
        // --------------------------------
        //
        // Same calculator, same rates the customer booked at. Extending a
        // rental has to cost more, and the figure has to be right before the
        // car comes back - not discovered at the counter.

        int originalDuration = booking.getDuration() == null
                ? 0 : booking.getDuration();

        // HAND-OVER date to END date, matching returnVehicle exactly. If this
        // priced from the start date instead, a customer extending their
        // rental would be quoted one figure here and charged another when the
        // car actually came back.
        int newDuration = pricingCalculator.durationInDays(
                billingStart, newEndDate);

        List<BookingDetail> details =
                bookingDetailRepository.findByBookingId(booking.getBookingId());

        BigDecimal addonAmount = BigDecimal.ZERO;

        for (BookingDetail detail : details) {
            BigDecimal repriced = pricingCalculator.repriceAddonLine(
                    detail.getAddonPrice(), originalDuration, newDuration);
            detail.setAddonPrice(repriced);
            addonAmount = addonAmount.add(repriced);
        }
        if (!details.isEmpty()) {
            bookingDetailRepository.saveAll(details);
        }

        BigDecimal vehicleAmount = pricingCalculator.vehicleAmount(
                booking.getDailyRate(),
                booking.getWeeklyRate(),
                booking.getMonthlyRate(),
                newDuration);

        BigDecimal taxAmount =
                pricingCalculator.taxAmount(vehicleAmount, addonAmount);

        BigDecimal grandTotal =
                pricingCalculator.grandTotal(vehicleAmount, addonAmount, taxAmount);

        booking.setEndDate(newEndDate);
        booking.setDuration(newDuration);
        booking.setVehicleAmount(vehicleAmount);
        booking.setAddonAmount(addonAmount);
        booking.setTaxAmount(taxAmount);
        booking.setGrandTotal(grandTotal);

        BookingHeader saved = bookingHeaderRepository.save(booking);

        BookingResponse response = mapToBookingResponse(saved);

        // The customer gets the same "your booking has been updated" e-mail
        // as any other change, with a fresh PDF showing the new return date.
        emailService.sendBookingModification(response);

        return new ApiResponse<>(
                true,
                "Return date and location updated successfully",
                response);
    }

    @Override
    @Transactional
    public ApiResponse<BookingResponse> updateBookingLocations(
            Long bookingId,
            UpdateBookingLocationsRequest request) {

        // Proves the caller is staff. No hub check: a customer can ask any
        // branch to change their pick-up point, and the branch they asked is
        // the one that should be able to do it.
        requireLoggedInStaff();

        BookingHeader booking = bookingHeaderRepository
                .findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        if (booking.getBookingStatus() == BookingStatus.CANCELLED
                || booking.getBookingStatus() == BookingStatus.COMPLETED) {

            throw new BusinessException(
                    "This booking is " + booking.getBookingStatus().name().toLowerCase()
                    + ", so its locations can no longer be changed.");
        }

        boolean handedOver = booking.getHandoverDate() != null;
        boolean changed = false;

        // --------------------------------
        // Pick-up hub
        // --------------------------------

        Integer newPickupHubId = request.getPickupHubId();

        if (newPickupHubId != null
                && !newPickupHubId.equals(booking.getPickupHubId())) {

            if (handedOver) {
                throw new BusinessException(
                        "The vehicle has already been handed over, so the "
                        + "pick-up location cannot be changed. The return "
                        + "location can still be updated.");
            }

            // A vehicle is assigned from a specific hub's fleet. Moving the
            // pick-up point would leave that car allocated at a hub the
            // customer is no longer going to, so the allocation has to be
            // undone first - deliberately by a person, not silently here.
            if (booking.getAssignedCarId() != null) {
                throw new BusinessException(
                        "A vehicle from " + booking.getPickupHubName()
                        + " is already allocated to this booking. Change the "
                        + "pick-up location before a vehicle is assigned.");
            }

            Hub pickupHub = hubRepository
                    .findById(newPickupHubId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "The selected pick-up location no longer exists"));

            log.info("Booking {} pick-up location changed from {} to {}",
                    bookingId, booking.getPickupHubName(), pickupHub.getHubName());

            booking.setPickupHubId(pickupHub.getHubId());
            booking.setPickupHubName(pickupHub.getHubName());
            changed = true;

            // --------------------------------
            // The car type row moves with the hub
            //
            // car_type rows are per-hub: every hub has its own
            // "Intermediate Sedan" with its own car_type_id. Leaving the
            // booking pointing at the OLD hub's row means the hand-over
            // screen and the invoice are both reading a rate row that
            // belongs somewhere the customer is no longer going.
            //
            // Re-pointed only, never re-priced - see the note below.
            // If the new hub does not carry the category at all, the
            // pointer stays put and the empty vehicle list is the honest
            // answer rather than something invented here.
            // --------------------------------

            if (booking.getCarTypeId() != null) {

                carTypeRepository
                        .findById(booking.getCarTypeId().intValue())
                        .map(CarType::getCarClass)
                        .flatMap(cls -> carTypeRepository
                                .findByHub_HubIdAndCarClass(
                                        pickupHub.getHubId(), cls))
                        .ifPresent(equivalent -> booking.setCarTypeId(
                                equivalent.getCarTypeId().longValue()));
            }
        }

        // --------------------------------
        // Drop-off hub
        // --------------------------------

        Integer newDropoffHubId = request.getDropoffHubId();

        if (newDropoffHubId != null
                && !newDropoffHubId.equals(booking.getDropoffHubId())) {

            Hub dropoffHub = hubRepository
                    .findById(newDropoffHubId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "The selected return location no longer exists"));

            log.info("Booking {} return location changed from {} to {}",
                    bookingId, booking.getDropoffHubName(), dropoffHub.getHubName());

            booking.setDropoffHubId(dropoffHub.getHubId());
            booking.setDropoffHubName(dropoffHub.getHubName());
            changed = true;
        }

        if (!changed) {
            return new ApiResponse<>(
                    true,
                    "No change - those are already this booking's locations",
                    mapToBookingResponse(booking));
        }

        // --------------------------------
        // Amounts are untouched, on purpose
        // --------------------------------
        //
        // Same vehicle category, same dates, same add-ons - only the
        // geography moved. Rate cards ARE per hub, so the new hub's row may
        // well carry a different daily rate, and that is exactly why nothing
        // is recalculated: the customer was quoted a figure when they booked,
        // and moving the collection point is a convenience we are offering
        // them, not a new contract. The pointer moves, the money does not.

        BookingHeader saved = bookingHeaderRepository.save(booking);

        BookingResponse response = mapToBookingResponse(saved);

        // The routing follows immediately: the staff lists are filtered on
        // pickup_hub_id and dropoff_hub_id and are queried live, so the
        // booking appears in the new hub's Hand-over or Return list on its
        // next refresh, and leaves the old one.
        emailService.sendBookingModification(response);

        return new ApiResponse<>(
                true,
                "Booking locations updated successfully",
                response);
    }

    /**
     * The signed-in staff member, or an exception.
     *
     * Pulled out because four methods were doing the same twenty lines.
     */
    private Staff requireLoggedInStaff() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {

            throw new UnauthorizedActionException(
                    "Staff is not authenticated");
        }

        Staff staff = staffRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Staff not found"));

        if (staff.getHub() == null) {
            throw new BusinessException(
                    "Your staff account is not linked to a hub, so it cannot "
                    + "take bookings. Please contact an administrator.");
        }

        return staff;
    }

    /**
     * Dates a booking must satisfy, whether it is being created or modified.
     *
     * The DTO carries @FutureOrPresent, but this runs too so the rule still
     * holds for the guest path and any future caller.
     */
    private void validateBookingDates(LocalDate startDate, LocalDate endDate) {

        if (startDate == null || endDate == null) {
            throw new BusinessException("Both the pick-up and return dates are required");
        }
        if (startDate.isBefore(LocalDate.now())) {
            throw new BusinessException("The pick-up date cannot be in the past");
        }
        if (!endDate.isAfter(startDate)) {
            throw new BusinessException("The return date must be after the pick-up date");
        }
    }

    /**
     * GST applied to the vehicle and add-on subtotal.
     *
     * Kept as a field so existing code reads unchanged, but the value now
     * comes from RentalPricingCalculator - there is one rate structure in the
     * project and this is a reference to it, not a second copy.
     */
    private static final BigDecimal TAX_RATE = RentalPricingCalculator.TAX_RATE;

    /** Null-safe Double -> BigDecimal, so a missing rate counts as zero. */
    private BigDecimal toAmount(Double value) {
        return pricingCalculator.toAmount(value);
    }

    /**
     * Prices the rental using the best combination of monthly, weekly and
     * daily rates - the same tiering the booking screen shows the customer.
     *
     * 40 days = 1 month + 1 week + 3 days.
     *
     * Delegates, so that creating, modifying and returning a booking can
     * never drift apart. The return path in HandoverServiceImpl uses the same
     * calculator to re-price against the actual return date.
     */
    private BigDecimal calculateVehicleAmount(
            BigDecimal daily,
            BigDecimal weekly,
            BigDecimal monthly,
            int days) {

        return pricingCalculator.vehicleAmount(daily, weekly, monthly, days);
    }

    /**
     * Totals the chosen add-ons using the price held in the database, never
     * the price sent by the browser.
     */
    private BigDecimal calculateAddonAmount(List<AddonRequest> addons, int days) {

        if (addons == null || addons.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal total = BigDecimal.ZERO;

        for (AddonRequest requested : addons) {

            if (requested.getAddonId() == null) {
                continue;
            }

            Addon addon = addonRepository
                    .findById(requested.getAddonId().intValue())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Add-on no longer available: " + requested.getAddonName()));

            total = total.add(
                    toAmount(addon.getPricePerDay())
                            .multiply(BigDecimal.valueOf(days)));
        }

        return total.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Prices a booking from the database and writes the figures onto it.
     *
     * WHY THIS IS A SHARED METHOD
     * ---------------------------
     * There are four ways a booking gets created or changed - customer,
     * guest, staff on-spot and modify - and each one used to do its own
     * arithmetic. Two of them simply believed the totals the browser sent.
     * The invoice reads these stored figures, so the same rental could be
     * worth different amounts depending on which door it came through.
     *
     * The rate structure itself is unchanged: months x monthly +
     * whole weeks x weekly + remaining days x daily, plus 18% GST on the
     * vehicle and add-on subtotal. What changed is that there is now exactly
     * one implementation of it.
     *
     * @return the duration in days, so the caller can price the add-on lines
     *         the same way.
     */
    private int applyPricing(
            BookingHeader booking,
            BookingRequest request) {

        CarType carType = carTypeRepository
                .findById(request.getCarTypeId().intValue())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "The selected vehicle type is no longer available"));

        BigDecimal dailyRate = toAmount(carType.getDailyRate());
        BigDecimal weeklyRate = toAmount(carType.getWeeklyRate());
        BigDecimal monthlyRate = toAmount(carType.getMonthlyRate());

        // Duration comes from the dates, never from the request. The two
        // disagreeing is how a five day price ends up on a two day booking.
        int duration = (int) ChronoUnit.DAYS.between(
                request.getStartDate(), request.getEndDate());

        BigDecimal vehicleAmount =
                calculateVehicleAmount(dailyRate, weeklyRate, monthlyRate, duration);

        BigDecimal addonAmount =
                calculateAddonAmount(request.getAddons(), duration);

        BigDecimal taxAmount = vehicleAmount.add(addonAmount)
                .multiply(TAX_RATE)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal grandTotal = vehicleAmount.add(addonAmount).add(taxAmount);

        booking.setDailyRate(dailyRate);
        booking.setWeeklyRate(weeklyRate);
        booking.setMonthlyRate(monthlyRate);

        booking.setDuration(duration);
        booking.setVehicleAmount(vehicleAmount);
        booking.setAddonAmount(addonAmount);
        booking.setTaxAmount(taxAmount);
        booking.setGrandTotal(grandTotal);

        return duration;
    }

    /**
     * Writes the add-on lines for a booking, priced from the database.
     *
     * The line prices have to come from the same place as the add-on subtotal
     * in {@link #applyPricing}, otherwise the add-on rows printed on the
     * invoice do not add up to the subtotal printed directly beneath them.
     */
    private void saveAddonLines(
            Long bookingId,
            List<AddonRequest> addons,
            int duration,
            BookingSource source) {

        if (addons == null || addons.isEmpty()) {
            return;
        }

        List<BookingDetail> details = new ArrayList<>();

        for (AddonRequest requested : addons) {

            if (requested.getAddonId() == null) {
                continue;
            }

            Addon addon = addonRepository
                    .findById(requested.getAddonId().intValue())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Add-on no longer available: "
                                    + requested.getAddonName()));

            BookingDetail detail = new BookingDetail();

            detail.setBookingId(bookingId);
            detail.setAddonId(requested.getAddonId());
            detail.setAddonName(addon.getAddonName());

            detail.setAddonPrice(
                    toAmount(addon.getPricePerDay())
                            .multiply(BigDecimal.valueOf(duration)));

            detail.setBookingSource(source);

            details.add(detail);
        }

        bookingDetailRepository.saveAll(details);
    }

    /**
     * Copies the details given at booking time onto the customer's profile:
     * licence number, passport number and the billing address.
     *
     * Only fills a value in when the customer supplied one, so an empty field
     * on the booking form never wipes something already on the profile.
     */
    private void saveDocumentsOnProfile(
            Customer customer,
            BookingRequest request) {

        boolean changed = false;

        String licence = request.getDrivingLicenseNo();
        if (licence != null && !licence.isBlank()
                && !licence.equals(customer.getDrivingLicenseNo())) {

            customer.setDrivingLicenseNo(licence.trim());
            changed = true;
        }

        String passport = request.getPassportNo();
        if (passport != null && !passport.isBlank()
                && !passport.equals(customer.getPassportNo())) {

            customer.setPassportNo(passport.trim());
            changed = true;
        }

        // ---- Billing address -------------------------------------------
        // Same idea as the documents above: whatever the customer typed on
        // the booking form becomes their saved address, so the next booking
        // pre-fills it and the invoice always has something to print.
        //
        // Blank values are ignored rather than written. If they were written
        // we would wipe a good address every time the form sent an empty
        // field, which is the opposite of what the customer expects.

        String line1 = request.getAddressLine1();
        if (line1 != null && !line1.isBlank()
                && !line1.trim().equals(customer.getAddressLine1())) {

            customer.setAddressLine1(line1.trim());
            changed = true;
        }

        String line2 = request.getAddressLine2();
        if (line2 != null && !line2.isBlank()
                && !line2.trim().equals(customer.getAddressLine2())) {

            customer.setAddressLine2(line2.trim());
            changed = true;
        }

        String pincode = request.getPincode();
        if (pincode != null && !pincode.isBlank()
                && !pincode.trim().equals(customer.getPincode())) {

            customer.setPincode(pincode.trim());
            changed = true;
        }

        // State and city are real rows, so look them up rather than trusting
        // the id blindly. An id that does not exist is simply skipped: a bad
        // address must never stop somebody renting a car.
        Integer stateId = request.getStateId();
        if (stateId != null
                && (customer.getState() == null
                    || !stateId.equals(customer.getState().getStateId()))) {

            State state = stateRepository.findById(stateId).orElse(null);
            if (state != null) {
                customer.setState(state);
                changed = true;
            }
        }

        Integer cityId = request.getCityId();
        if (cityId != null
                && (customer.getCity() == null
                    || !cityId.equals(customer.getCity().getCityId()))) {

            City city = cityRepository.findById(cityId).orElse(null);
            if (city != null) {
                customer.setCity(city);
                changed = true;
            }
        }

        if (changed) {
            customerRepository.save(customer);
        }
    }

    private BookingResponse saveBooking(
            Customer customer,
            BookingRequest request) {

        validateBookingDates(request.getStartDate(), request.getEndDate());

        // If the customer typed a licence number, passport number or address
        // on the booking form, remember it on their profile so they never
        // retype it. This reuses the same Customer record the Update Profile
        // API writes to, and it has to happen BEFORE the snapshot below is
        // taken - the snapshot reads straight off the Customer.
        saveDocumentsOnProfile(customer, request);

        BookingHeader booking = new BookingHeader();

        booking.setDate(LocalDateTime.now());

        // Customer snapshot
        booking.setCustomerId(customer.getCustomerId());
        booking.setFirstName(customer.getFirstName());
        booking.setLastName(customer.getLastName());
        booking.setEmail(customer.getEmail());
        booking.setPhone(customer.getPhone());

        booking.setDrivingLicenseNo(
                customer.getDrivingLicenseNo());

        booking.setPassportNo(
                customer.getPassportNo());

        booking.setAddressLine1(
                customer.getAddressLine1());

        booking.setAddressLine2(
                customer.getAddressLine2());

        booking.setDateOfBirth(
                customer.getDateOfBirth());

        booking.setGender(
                customer.getGender());

        booking.setNationality(
                customer.getNationality());

        // City / State are optional on the customer record, so only
        // copy them across when they are actually filled in.
        if (customer.getCity() != null) {
            booking.setCityId(
                    customer.getCity().getCityId());
        }

        if (customer.getState() != null) {
            booking.setStateId(
                    customer.getState().getStateId());
        }

        booking.setPincode(
                customer.getPincode());

        // Booking information
        // carId stays empty - staff pick the actual vehicle at hand-over.
        booking.setCarId(request.getCarId());
        booking.setCarTypeId(request.getCarTypeId());

        booking.setStartDate(request.getStartDate());
        booking.setEndDate(request.getEndDate());

        booking.setPickupHubId(
                request.getPickupHubId());

        booking.setPickupHubName(
                request.getPickupHubName());

        booking.setDropoffHubId(
                request.getDropoffHubId());

        booking.setDropoffHubName(
                request.getDropoffHubName());

        // Priced from the database, never from the browser - see applyPricing.
        int duration = applyPricing(booking, request);

        booking.setBookingStatus(
                BookingStatus.PENDING);

        BookingHeader savedBooking =
                bookingHeaderRepository.save(booking);

        saveAddonLines(
                savedBooking.getBookingId(),
                request.getAddons(),
                duration,
                BookingSource.ONLINE);

        return mapToBookingResponse(savedBooking);
    }


    private BookingResponse saveGuestBooking(
            GuestBookingRequest request) {

        BookingRequest bookingRequest =
                request.getBooking();

        validateBookingDates(
                bookingRequest.getStartDate(),
                bookingRequest.getEndDate());

        BookingHeader booking =
                new BookingHeader();

        booking.setDate(LocalDateTime.now());

        // --------------------------------
        // Guest snapshot
        // --------------------------------

        // Guest is NOT a registered customer
        booking.setCustomerId(null);

        booking.setFirstName(
                request.getFirstName());

        booking.setLastName(
                request.getLastName());

        booking.setEmail(
                request.getEmail());

        booking.setPhone(
                request.getPhone());

        booking.setDrivingLicenseNo(
                request.getDrivingLicenseNo());

        booking.setPassportNo(
                request.getPassportNo());

        booking.setAddressLine1(
                request.getAddressLine1());

        booking.setAddressLine2(
                request.getAddressLine2());

        booking.setCityId(
                request.getCityId());

        booking.setStateId(
                request.getStateId());

        booking.setPincode(
                request.getPincode());

        // --------------------------------
        // Booking information
        // --------------------------------

        booking.setCarId(
                bookingRequest.getCarId());

        booking.setCarTypeId(
                bookingRequest.getCarTypeId());

        booking.setStartDate(
                bookingRequest.getStartDate());

        booking.setEndDate(
                bookingRequest.getEndDate());

        booking.setPickupHubId(
                bookingRequest.getPickupHubId());

        booking.setPickupHubName(
                bookingRequest.getPickupHubName());

        booking.setDropoffHubId(
                bookingRequest.getDropoffHubId());

        booking.setDropoffHubName(
                bookingRequest.getDropoffHubName());

        // --------------------------------
        // Pricing
        // --------------------------------
        // Priced from the database, exactly like a signed-in customer's
        // booking. This path used to store the browser's totals.

        int duration = applyPricing(booking, bookingRequest);

        booking.setBookingStatus(
                BookingStatus.PENDING);

        // --------------------------------
        // Save header
        // --------------------------------

        BookingHeader savedBooking =
                bookingHeaderRepository.save(booking);

        // --------------------------------
        // Save addons
        // --------------------------------

        saveAddonLines(
                savedBooking.getBookingId(),
                bookingRequest.getAddons(),
                duration,
                BookingSource.ONLINE);

        return mapToBookingResponse(savedBooking);
    }
    
    
    @Override
    @Transactional
    public ApiResponse<BookingResponse> createGuestBooking(
            GuestBookingRequest request) {

        BookingResponse bookingResponse =
                saveGuestBooking(request);

        emailService.sendBookingConfirmation(
                bookingResponse);

        return new ApiResponse<>(
                true,
                "Guest booking confirmed successfully",
                bookingResponse);
    }

    
    /**
     * Single place that converts a booking entity into the API response.
     *
     * Used by every read and write method so the customer screens and the
     * staff screens always receive exactly the same shape.
     */
    private BookingResponse mapToBookingResponse(
            BookingHeader booking) {

        BookingResponse response =
                new BookingResponse();

        // ---------- Booking ----------
        response.setBookingId(
                booking.getBookingId());

        response.setBookingStatus(
                booking.getBookingStatus());

        response.setBookingDate(
                booking.getDate());

        // ---------- Customer ----------
        response.setCustomerId(
                booking.getCustomerId());

        String customerName =
                booking.getFirstName();

        if (booking.getLastName() != null
                && !booking.getLastName().isBlank()) {

            customerName +=
                    " " + booking.getLastName();
        }

        response.setCustomerName(customerName);

        response.setEmail(
                booking.getEmail());

        response.setPhone(
                booking.getPhone());

        response.setDrivingLicenseNo(
                booking.getDrivingLicenseNo());

        // Structured address, with the city and state resolved to names so
        // every screen can render it the same way.
        response.setAddressLine1(booking.getAddressLine1());
        response.setAddressLine2(booking.getAddressLine2());
        response.setPincode(booking.getPincode());
        response.setCityId(booking.getCityId());
        response.setStateId(booking.getStateId());

        if (booking.getCityId() != null) {
            cityRepository.findById(booking.getCityId())
                    .ifPresent(c -> response.setCityName(c.getCityName()));
        }
        if (booking.getStateId() != null) {
            stateRepository.findById(booking.getStateId())
                    .ifPresent(st -> response.setStateName(st.getStateName()));
        }

        // ---------- Vehicle ----------
        response.setCarId(
                booking.getCarId());

        response.setCarTypeId(
                booking.getCarTypeId());

        // Show the customer the category they actually booked, rather than a
        // placeholder, on the dashboard's Vehicle Information panel.
        if (booking.getCarTypeId() != null) {
            carTypeRepository
                    .findById(booking.getCarTypeId().intValue())
                    .ifPresent(carType -> {
                        response.setCarTypeName(carType.getCarType());
                        response.setCarTypeImageUrl(carType.getImageUrl());
                        if (carType.getCarClass() != null) {
                            response.setCarClass(carType.getCarClass().name());
                        }
                    });
        }

        // ---------- Hubs ----------
        response.setPickupHubId(
                booking.getPickupHubId());

        response.setPickupHubName(
                booking.getPickupHubName());

        response.setDropoffHubId(
                booking.getDropoffHubId());

        response.setDropoffHubName(
                booking.getDropoffHubName());

        // ---------- Dates ----------
        response.setStartDate(
                booking.getStartDate());

        response.setEndDate(
                booking.getEndDate());

        response.setDuration(
                booking.getDuration());

        // ---------- Rates ----------
        response.setDailyRate(
                booking.getDailyRate());

        response.setWeeklyRate(
                booking.getWeeklyRate());

        response.setMonthlyRate(
                booking.getMonthlyRate());

        // ---------- Amounts ----------
        response.setVehicleAmount(
                booking.getVehicleAmount());

        response.setAddonAmount(
                booking.getAddonAmount());

        response.setTaxAmount(
                booking.getTaxAmount());

        response.setGrandTotal(
                booking.getGrandTotal());

        // ---------- Assigned vehicle ----------
        response.setAssignedCarId(
                booking.getAssignedCarId());

        response.setAssignedCarRegistrationNo(
                booking.getAssignedCarRegistrationNo());

        response.setAssignedCarBrandName(
                booking.getAssignedCarBrandName());

        response.setAssignedCarModelName(
                booking.getAssignedCarModelName());

        // ---------- Hand-over / return ----------
        response.setHandoverDate(
                booking.getHandoverDate());

        response.setFuelLevelOut(
                booking.getFuelLevelOut());

        response.setFuelLevelIn(
                booking.getFuelLevelIn());

        response.setFuelCharges(
                booking.getFuelCharges());

        // ---------- Add-ons ----------
        response.setAddons(
                bookingDetailRepository
                        .findByBookingId(booking.getBookingId())
                        .stream()
                        .map(BookingAddonResponse::fromEntity)
                        .toList());

        return response;
    }
    
    
    @Override
    @Transactional(readOnly = true)
    public ApiResponse<BookingPageResponse> getBookings(
            int page,
            int size,
            BookingStatus status) {

        // -----------------------------
        // Validate pagination
        // -----------------------------

        if (page < 0) {
            throw new BusinessException(
                    "Page number cannot be negative");
        }

        if (size <= 0) {
            throw new BusinessException(
                    "Page size must be greater than 0");
        }

        // Prevent very large requests
        if (size > 100) {
            size = 100;
        }

        // -----------------------------
        // Get logged-in user
        // -----------------------------

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(
                        authentication.getPrincipal())) {

            throw new UnauthorizedActionException(
                    "User is not authenticated");
        }

        String email =
                authentication.getName();

        // -----------------------------
        // Find logged-in customer
        // -----------------------------

        Customer customer =
                customerRepository
                        .findByEmail(email)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Customer not found"));

        // -----------------------------
        // Pagination
        // -----------------------------

        Pageable pageable =
                PageRequest.of(
                        page,
                        size,
                        Sort.by("createdAt")
                                .descending());

        Page<BookingHeader> bookingPage;

        // -----------------------------
        // Optional status filter
        // -----------------------------

        if (status != null) {

            bookingPage =
                    bookingHeaderRepository
                            .findByCustomerIdAndBookingStatus(
                                    customer.getCustomerId(),
                                    status,
                                    pageable);

        } else {

            bookingPage =
                    bookingHeaderRepository
                            .findByCustomerId(
                                    customer.getCustomerId(),
                                    pageable);
        }

        // -----------------------------
        // Entity -> DTO
        // -----------------------------

        List<BookingResponse> bookings =
                bookingPage
                        .getContent()
                        .stream()
                        .map(this::mapToBookingResponse)
                        .toList();

        // -----------------------------
        // Pagination response
        // -----------------------------

        BookingPageResponse pageResponse =
                new BookingPageResponse();

        pageResponse.setBookings(bookings);

        pageResponse.setCurrentPage(
                bookingPage.getNumber());

        pageResponse.setPageSize(
                bookingPage.getSize());

        pageResponse.setTotalElements(
                bookingPage.getTotalElements());

        pageResponse.setTotalPages(
                bookingPage.getTotalPages());

        pageResponse.setFirst(
                bookingPage.isFirst());

        pageResponse.setLast(
                bookingPage.isLast());

        return new ApiResponse<>(
                true,
                "Bookings fetched successfully",
                pageResponse);
    }
    
    
    @Override
    @Transactional(readOnly = true)
    public ApiResponse<BookingResponse> getBookingById(
            Long bookingId) {

        // Get logged-in user
        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(
                        authentication.getPrincipal())) {

            throw new UnauthorizedActionException(
                    "User is not authenticated");
        }

        String email = authentication.getName();

        // Find logged-in customer
        Customer customer =
                customerRepository
                        .findByEmail(email)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Customer not found"));

        // Find booking
        BookingHeader booking =
                bookingHeaderRepository
                        .findById(bookingId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Booking not found"));

        // Ownership check
        if (booking.getCustomerId() == null
                || !booking.getCustomerId()
                        .equals(customer.getCustomerId())) {

            throw new UnauthorizedActionException(
                    "You are not authorized to access this booking");
        }

        BookingResponse response =
                mapToBookingResponse(booking);

        return new ApiResponse<>(
                true,
                "Booking fetched successfully",
                response);
    }
    
    
    @Override
    @Transactional
    public ApiResponse<BookingResponse> updateBooking(
            Long bookingId,
            UpdateBookingRequest request) {

        // --------------------------------
        // Get logged-in customer
        // --------------------------------

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(
                        authentication.getPrincipal())) {

            throw new UnauthorizedActionException(
                    "User is not authenticated");
        }

        String email = authentication.getName();

        Customer customer =
                customerRepository
                        .findByEmail(email)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Customer not found"));

        // --------------------------------
        // Find booking
        // --------------------------------

        BookingHeader booking =
                bookingHeaderRepository
                        .findById(bookingId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Booking not found"));

        // --------------------------------
        // Ownership check
        // --------------------------------

        if (booking.getCustomerId() == null
                || !booking.getCustomerId()
                        .equals(customer.getCustomerId())) {

            throw new UnauthorizedActionException(
                    "You are not authorized to modify this booking");
        }

        // --------------------------------
        // Status validation
        // --------------------------------

        if (booking.getBookingStatus()
                == BookingStatus.CANCELLED) {

            throw new BusinessException(
                    "Cancelled booking cannot be modified");
        }

        if (booking.getBookingStatus()
                == BookingStatus.COMPLETED) {

            throw new BusinessException(
                    "Completed booking cannot be modified");
        }

        // --------------------------------
        // TWO KINDS OF MODIFICATION
        // --------------------------------
        //
        // Before hand-over the booking is still just a reservation, so
        // everything about it is negotiable - dates, hubs, vehicle category,
        // add-ons.
        //
        // Once the vehicle has been handed over the customer is driving it,
        // and most of the booking has become a statement of fact. You cannot
        // retrospectively change which category of car you were given, or
        // where you collected it from, or when. Two things are still genuinely
        // open, because they are about the future:
        //
        //     the RETURN DATE      - extend or shorten the rental
        //     the RETURN LOCATION  - drop the car at a different hub
        //
        // Everything else on the request is IGNORED rather than rejected in
        // that state. A stale browser that posts the whole booking back gets
        // a sensible outcome instead of an error, and cannot quietly rewrite
        // the vehicle category of a car that is already on the road.

        boolean handedOver = booking.getHandoverDate() != null
                || booking.getAssignedCarId() != null;

        if (handedOver) {
            return updateBookingAfterHandover(booking, request);
        }

        // --------------------------------
        // Date validation
        // --------------------------------

        LocalDate startDate = request.getStartDate();
        LocalDate endDate = request.getEndDate();

        if (!endDate.isAfter(startDate)) {
            throw new BusinessException(
                    "The return date must be after the pick-up date");
        }

        if (startDate.isBefore(LocalDate.now())) {
            throw new BusinessException(
                    "The pick-up date cannot be in the past");
        }

        // Duration is derived from the dates rather than trusted from the
        // browser, so the two can never disagree.
        int duration = (int) ChronoUnit.DAYS.between(startDate, endDate);
        if (duration < 1) {
            duration = 1;
        }

        // --------------------------------
        // Vehicle type + repricing
        //
        // Every amount is recalculated here from the rate card in the
        // database. Whatever totals the browser sent are ignored, so a
        // modified booking can never be under-priced.
        // --------------------------------

        CarType carType = carTypeRepository
                .findById(request.getCarTypeId().intValue())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "The selected vehicle type is no longer available"));

        if (carType.getHub() == null
                || !carType.getHub().getHubId().equals(request.getPickupHubId())) {

            throw new BusinessException(
                    "That vehicle type is not offered at the selected pick-up hub");
        }

        BigDecimal dailyRate = toAmount(carType.getDailyRate());
        BigDecimal weeklyRate = toAmount(carType.getWeeklyRate());
        BigDecimal monthlyRate = toAmount(carType.getMonthlyRate());

        BigDecimal vehicleAmount =
                calculateVehicleAmount(dailyRate, weeklyRate, monthlyRate, duration);

        BigDecimal addonAmount =
                calculateAddonAmount(request.getAddons(), duration);

        BigDecimal taxAmount = vehicleAmount.add(addonAmount)
                .multiply(TAX_RATE)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal grandTotal = vehicleAmount.add(addonAmount).add(taxAmount);

        // --------------------------------
        // Update booking
        // --------------------------------

        booking.setCarTypeId(request.getCarTypeId());

        booking.setStartDate(startDate);
        booking.setEndDate(endDate);
        booking.setDuration(duration);

        booking.setPickupHubId(
                request.getPickupHubId());

        booking.setPickupHubName(
                request.getPickupHubName());

        booking.setDropoffHubId(
                request.getDropoffHubId());

        booking.setDropoffHubName(
                request.getDropoffHubName());

        // Rate snapshot, refreshed for the newly chosen car type
        booking.setDailyRate(dailyRate);
        booking.setWeeklyRate(weeklyRate);
        booking.setMonthlyRate(monthlyRate);

        booking.setVehicleAmount(vehicleAmount);
        booking.setAddonAmount(addonAmount);
        booking.setTaxAmount(taxAmount);
        booking.setGrandTotal(grandTotal);

        BookingHeader savedBooking =
                bookingHeaderRepository.save(booking);

        // --------------------------------
        // Update addons
        // --------------------------------

        // Replace the add-on lines. Names and prices are taken from the
        // database so the stored lines always agree with the recalculated
        // addonAmount above.
        bookingDetailRepository
                .deleteByBookingId(bookingId);

        if (request.getAddons() != null
                && !request.getAddons().isEmpty()) {

            List<BookingDetail> details =
                    new ArrayList<>();

            for (AddonRequest requested : request.getAddons()) {

                if (requested.getAddonId() == null) {
                    continue;
                }

                Addon addon = addonRepository
                        .findById(requested.getAddonId().intValue())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Add-on no longer available"));

                BookingDetail detail = new BookingDetail();

                detail.setBookingId(
                        savedBooking.getBookingId());

                detail.setAddonId(
                        requested.getAddonId());

                detail.setAddonName(
                        addon.getAddonName());

                detail.setAddonPrice(
                        toAmount(addon.getPricePerDay())
                                .multiply(BigDecimal.valueOf(duration)));

                detail.setBookingSource(
                        BookingSource.ONLINE);

                details.add(detail);
            }

            bookingDetailRepository.saveAll(details);
        }

        BookingResponse response =
                mapToBookingResponse(savedBooking);

        // Tell the customer what their booking now says. The response is
        // mapped first so the e-mail carries the saved figures rather than
        // the ones that arrived on the request.
        //
        // @Async, and the implementation swallows its own errors, so a mail
        // server that is down cannot roll back a change that is already
        // committed.
        emailService.sendBookingModification(response);

        return new ApiResponse<>(
                true,
                "Booking updated successfully",
                response);
    }
    
    
    @Override
    @Transactional
    public ApiResponse<BookingResponse> cancelBooking(
            Long bookingId) {

        // --------------------------------
        // Get logged-in user
        // --------------------------------

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(
                        authentication.getPrincipal())) {

            throw new UnauthorizedActionException(
                    "User is not authenticated");
        }

        String email = authentication.getName();

        // --------------------------------
        // Find logged-in customer
        // --------------------------------

        Customer customer =
                customerRepository
                        .findByEmail(email)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Customer not found"));

        // --------------------------------
        // Find booking
        // --------------------------------

        BookingHeader booking =
                bookingHeaderRepository
                        .findById(bookingId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Booking not found"));

        // --------------------------------
        // Ownership check
        // --------------------------------

        if (booking.getCustomerId() == null
                || !booking.getCustomerId()
                        .equals(customer.getCustomerId())) {

            throw new UnauthorizedActionException(
                    "You are not authorized to cancel this booking");
        }

        // --------------------------------
        // Status validation
        // --------------------------------

        if (booking.getBookingStatus()
                == BookingStatus.CANCELLED) {

            throw new BusinessException(
                    "Booking is already cancelled");
        }

        if (booking.getBookingStatus()
                == BookingStatus.COMPLETED) {

            throw new BusinessException(
                    "Completed booking cannot be cancelled");
        }

        // --------------------------------
        // Hand-over validation
        //
        // Once the vehicle has been handed over there is nothing left to
        // cancel - the customer is driving the car. Cancelling at that point
        // would leave a car marked RENTED against a CANCELLED booking, and no
        // Return screen would ever show it, so it could never be brought back
        // into the fleet.
        //
        // The customer can still change the return date and the return
        // location; that is what updateBooking allows after hand-over.
        // --------------------------------

        if (booking.getHandoverDate() != null
                || booking.getAssignedCarId() != null) {

            throw new BusinessException(
                    "This booking cannot be cancelled because the vehicle has "
                    + "already been handed over. You can still change the "
                    + "return date or the return location, or contact the hub "
                    + "to return the vehicle early.");
        }

        // --------------------------------
        // Cancel booking
        // --------------------------------

        booking.setBookingStatus(
                BookingStatus.CANCELLED);

        BookingHeader savedBooking =
                bookingHeaderRepository.save(booking);

        BookingResponse response =
                mapToBookingResponse(savedBooking);

        return new ApiResponse<>(
                true,
                "Booking cancelled successfully",
                response);
    }

    
    @Override
    @Transactional(readOnly = true)
    public ApiResponse<BookingStatsResponse> getBookingStats() {

        // --------------------------------
        // Get logged-in user
        // --------------------------------

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(
                        authentication.getPrincipal())) {

            throw new UnauthorizedActionException(
                    "User is not authenticated");
        }

        String email =
                authentication.getName();

        // --------------------------------
        // Find customer
        // --------------------------------

        Customer customer =
                customerRepository
                        .findByEmail(email)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Customer not found"));

        String customerId =
                customer.getCustomerId();

        // --------------------------------
        // Count bookings
        // --------------------------------

        long total =
                bookingHeaderRepository
                        .countByCustomerId(
                                customerId);

        long pending =
                bookingHeaderRepository
                        .countByCustomerIdAndBookingStatus(
                                customerId,
                                BookingStatus.PENDING);

        long confirmed =
                bookingHeaderRepository
                        .countByCustomerIdAndBookingStatus(
                                customerId,
                                BookingStatus.CONFIRMED);

        long cancelled =
                bookingHeaderRepository
                        .countByCustomerIdAndBookingStatus(
                                customerId,
                                BookingStatus.CANCELLED);

        long completed =
                bookingHeaderRepository
                        .countByCustomerIdAndBookingStatus(
                                customerId,
                                BookingStatus.COMPLETED);

        // --------------------------------
        // Create response
        // --------------------------------

        BookingStatsResponse stats =
                new BookingStatsResponse();

        stats.setTotal(total);

        stats.setPending(pending);
        stats.setConfirmed(confirmed);
        stats.setCancelled(cancelled);
        stats.setCompleted(completed);

        // Customer doesn't need today's count currently
        stats.setTodayBookings(0);

        return new ApiResponse<>(
                true,
                "Booking statistics fetched successfully",
                stats);
    }

    
    private boolean isValidStatusTransition(
            BookingStatus currentStatus,
            BookingStatus newStatus) {

        if (currentStatus == null || newStatus == null) {
            return false;
        }

        if (currentStatus == BookingStatus.PENDING) {

            return newStatus == BookingStatus.CONFIRMED
                    || newStatus == BookingStatus.CANCELLED;
        }

        if (currentStatus == BookingStatus.CONFIRMED) {

            return newStatus == BookingStatus.COMPLETED
                    || newStatus == BookingStatus.CANCELLED;
        }

        return false;
    }

 
	@Override
	@Transactional(readOnly = true)
	public ApiResponse<BookingPageResponse> getStaffBookings(
	        int page, int size, BookingStatus status, HubScope scope) {
		

	    // --------------------------------
	    // Validate pagination
	    // --------------------------------

	    if (page < 0) {
	        throw new BusinessException(
	                "Page number cannot be negative");
	    }

	    if (size <= 0) {
	        throw new BusinessException(
	                "Page size must be greater than 0");
	    }

	    if (size > 100) {
	        size = 100;
	    }

	    // --------------------------------
	    // Logged-in Staff
	    // --------------------------------

	    Authentication authentication =
	            SecurityContextHolder
	                    .getContext()
	                    .getAuthentication();

	    if (authentication == null
	            || !authentication.isAuthenticated()
	            || "anonymousUser".equals(authentication.getPrincipal())) {

	        throw new UnauthorizedActionException(
	                "Staff is not authenticated");
	    }

	    String email = authentication.getName();

	    Staff staff =
	            staffRepository
	                    .findByEmail(email)
	                    .orElseThrow(() ->
	                            new ResourceNotFoundException(
	                                    "Staff not found"));

	    Integer hubId =
	            staff.getHub().getHubId();

	    // --------------------------------
	    // Pagination
	    // --------------------------------

	    Pageable pageable =
	            PageRequest.of(
	                    page,
	                    size,
	                    Sort.by("createdAt")
	                            .descending());

	    // --------------------------------
	    // Which end of the rental is this hub responsible for?
	    //
	    //   PICKUP -> bookings we hand over   (pickup_hub_id  = my hub)
	    //   RETURN -> bookings we take back   (dropoff_hub_id = my hub)
	    //   ALL    -> anything we touch, either end
	    //
	    // A one-way BOM -> Nagpur rental therefore shows in BOM's Hand-over
	    // module and Nagpur's Return module, and in neither of the others.
	    // --------------------------------

	    // --------------------------------
	    // HUB-SCOPED BY DEFAULT
	    //
	    // A staff member's lists show their own hub's work and nothing else -
	    // a list of every booking in the country is not a work queue.
	    //
	    //     PICKUP  - what this hub hands over
	    //     RETURN  - what this hub takes back
	    //     ALL     - either end, for the general Bookings list
	    //
	    // Reaching anything OUTSIDE the hub is what the booking-ID search is
	    // for: getStaffBookingById has no hub filter, and the hand-over and
	    // return operations themselves have no hub guard, so a booking found
	    // by search can be acted on wherever it belongs.
	    //
	    // Default view = my hub. Search = everywhere. Actions = unrestricted.
	    // --------------------------------

	    HubScope effectiveScope = (scope == null) ? HubScope.ALL : scope;

	    Page<BookingHeader> bookingPage;

	    if (effectiveScope == HubScope.PICKUP) {

	        bookingPage = (status != null)
	                ? bookingHeaderRepository
	                        .findByPickupHubIdAndBookingStatus(hubId, status, pageable)
	                : bookingHeaderRepository
	                        .findByPickupHubId(hubId, pageable);

	    } else if (effectiveScope == HubScope.RETURN) {

	        bookingPage = (status != null)
	                ? bookingHeaderRepository
	                        .findByDropoffHubIdAndBookingStatus(hubId, status, pageable)
	                : bookingHeaderRepository
	                        .findByDropoffHubId(hubId, pageable);

	    } else {

	        bookingPage = bookingHeaderRepository
	                .findByEitherHub(hubId, status, pageable);
	    }

	    // --------------------------------
	    // Entity → DTO
	    // --------------------------------

	    List<BookingResponse> bookings =
	            bookingPage
	                    .getContent()
	                    .stream()
	                    .map(this::mapToBookingResponse)
	                    .toList();

	    // --------------------------------
	    // Pagination Response
	    // --------------------------------

	    BookingPageResponse response =
	            new BookingPageResponse();

	    response.setBookings(bookings);

	    response.setCurrentPage(
	            bookingPage.getNumber());

	    response.setPageSize(
	            bookingPage.getSize());

	    response.setTotalElements(
	            bookingPage.getTotalElements());

	    response.setTotalPages(
	            bookingPage.getTotalPages());

	    response.setFirst(
	            bookingPage.isFirst());

	    response.setLast(
	            bookingPage.isLast());

	    return new ApiResponse<>(
	            true,
	            "Staff bookings fetched successfully",
	            response);
	}
	
	
	@Override
	@Transactional(readOnly = true)
	public ApiResponse<BookingResponse> getStaffBookingById(
	        Long bookingId) {

	    // ----------------------------
	    // Logged-in Staff
	    // ----------------------------

	    Authentication authentication =
	            SecurityContextHolder
	                    .getContext()
	                    .getAuthentication();

	    if (authentication == null
	            || !authentication.isAuthenticated()
	            || "anonymousUser".equals(authentication.getPrincipal())) {

	        throw new UnauthorizedActionException(
	                "Staff is not authenticated");
	    }

	    String email = authentication.getName();

	    Staff staff =
	            staffRepository
	                    .findByEmail(email)
	                    .orElseThrow(() ->
	                            new ResourceNotFoundException(
	                                    "Staff not found"));

	    Integer hubId =
	            staff.getHub().getHubId();

	    // ----------------------------
	    // Find Booking
	    // ----------------------------

	    BookingHeader booking =
	            bookingHeaderRepository
	                    .findById(bookingId)
	                    .orElseThrow(() ->
	                            new ResourceNotFoundException(
	                                    "Booking not found"));

	    // ----------------------------
	    // Hub Authorization - deliberately none
	    // ----------------------------
	    //
	    // This used to reject any booking whose PICK-UP hub was not the
	    // staff member's, which broke one-way rentals outright: a
	    // BOM -> Nagpur booking appeared in Nagpur's Return list but
	    // returned "You are not authorized to access this booking" the
	    // moment Nagpur staff opened it. Two modules disagreeing about the
	    // same booking.
	    //
	    // Reading a booking is now open to any authenticated staff member,
	    // from any hub. That is a lookup, not an action - assignVehicle,
	    // confirmHandover and returnVehicle each still check the hub
	    // themselves, so nobody can release or accept a car that is not
	    // theirs. `hubId` stays in scope below because the response tells
	    // the caller how this booking relates to their own hub.

	    BookingResponse response =
	            mapToBookingResponse(booking);

	    response.setPickupHub(
	            hubId.equals(booking.getPickupHubId()));

	    response.setDropoffHub(
	            hubId.equals(booking.getDropoffHubId()));

	    return new ApiResponse<>(
	            true,
	            "Booking fetched successfully",
	            response);
	}
	
	@Override
	@Transactional(readOnly = true)
	public ApiResponse<BookingStatsResponse> getStaffBookingStats() {

	    //-----------------------------------
	    // Logged-in Staff
	    //-----------------------------------

	    Authentication authentication =
	            SecurityContextHolder
	                    .getContext()
	                    .getAuthentication();

	    if (authentication == null
	            || !authentication.isAuthenticated()
	            || "anonymousUser".equals(authentication.getPrincipal())) {

	        throw new UnauthorizedActionException(
	                "Staff is not authenticated");
	    }

	    String email = authentication.getName();

	    Staff staff =
	            staffRepository
	                    .findByEmail(email)
	                    .orElseThrow(() ->
	                            new ResourceNotFoundException(
	                                    "Staff not found"));

	    Integer hubId =
	            staff.getHub().getHubId();

	    //-----------------------------------
	    // Today's range
	    //-----------------------------------

	    LocalDateTime startOfDay =
	            LocalDate.now().atStartOfDay();

	    LocalDateTime endOfDay =
	            startOfDay.plusDays(1);

	    //-----------------------------------
	    // Counts
	    //-----------------------------------

	    // Anything this hub touches at either end.
	    long total =
	            bookingHeaderRepository
	                    .countByEitherHub(hubId, null);

	    // Waiting to be handed over BY US - so pickup hub.
	    long pending =
	            bookingHeaderRepository
	                    .countByPickupHubIdAndBookingStatus(
	                            hubId,
	                            BookingStatus.PENDING);

	    // Out on rent and coming back TO US - so drop-off hub.
	    long confirmed =
	            bookingHeaderRepository
	                    .countByDropoffHubIdAndBookingStatus(
	                            hubId,
	                            BookingStatus.CONFIRMED);

	    long completed =
	            bookingHeaderRepository
	                    .countByEitherHub(hubId, BookingStatus.COMPLETED);

	    long cancelled =
	            bookingHeaderRepository
	                    .countByEitherHub(hubId, BookingStatus.CANCELLED);

	    long todayBookings =
	            bookingHeaderRepository
	                    .countByPickupHubIdAndCreatedAtBetween(
	                            hubId,
	                            startOfDay,
	                            endOfDay);

	    //-----------------------------------
	    // Response
	    //-----------------------------------

	    BookingStatsResponse response =
	            new BookingStatsResponse();

	    response.setTotal(total);
	    response.setTodayBookings(todayBookings);

	    response.setPending(pending);
	    response.setConfirmed(confirmed);
	    response.setCompleted(completed);
	    response.setCancelled(cancelled);

	    return new ApiResponse<>(
	            true,
	            "Staff booking statistics fetched successfully",
	            response);
	}
	
	
	@Override
	@Transactional
	public ApiResponse<BookingResponse> updateStaffBookingStatus(
	        Long bookingId,
	        UpdateBookingStatusRequest request) {

	    //--------------------------------
	    // Logged-in Staff
	    //--------------------------------

	    Authentication authentication =
	            SecurityContextHolder
	                    .getContext()
	                    .getAuthentication();

	    if (authentication == null
	            || !authentication.isAuthenticated()
	            || "anonymousUser".equals(authentication.getPrincipal())) {

	        throw new UnauthorizedActionException(
	                "Staff is not authenticated");
	    }

	    String email = authentication.getName();

	    Staff staff =
	            staffRepository
	                    .findByEmail(email)
	                    .orElseThrow(() ->
	                            new ResourceNotFoundException(
	                                    "Staff not found"));

	    Integer hubId =
	            staff.getHub().getHubId();

	    //--------------------------------
	    // Find Booking
	    //--------------------------------

	    BookingHeader booking =
	            bookingHeaderRepository
	                    .findById(bookingId)
	                    .orElseThrow(() ->
	                            new ResourceNotFoundException(
	                                    "Booking not found"));

	    //--------------------------------
	    // Hub Authorization
	    //--------------------------------

	    if (!hubId.equals(
	            booking.getPickupHubId())) {

	        throw new UnauthorizedActionException(
	                "You are not authorized to update this booking");
	    }

	    //--------------------------------
	    // Status Validation
	    //--------------------------------

	    BookingStatus newStatus =
	            request.getStatus();

	    if (newStatus == null) {

	        throw new BusinessException(
	                "Booking status is required");
	    }

	    BookingStatus currentStatus =
	            booking.getBookingStatus();

	    if (!isValidStatusTransition(
	            currentStatus,
	            newStatus)) {

	        throw new BusinessException(
	                "Invalid booking status transition from "
	                        + currentStatus
	                        + " to "
	                        + newStatus);
	    }

	    //--------------------------------
	    // Update
	    //--------------------------------

	    booking.setBookingStatus(
	            newStatus);

	    BookingHeader savedBooking =
	            bookingHeaderRepository
	                    .save(booking);

	    BookingResponse response =
	            mapToBookingResponse(savedBooking);

	    return new ApiResponse<>(
	            true,
	            "Booking status updated successfully",
	            response);
	}
	
	
	@Override
	@Transactional
	public ApiResponse<BookingResponse> cancelStaffBooking(
	        Long bookingId) {

	    //--------------------------------
	    // Logged-in Staff
	    //--------------------------------

	    Authentication authentication =
	            SecurityContextHolder
	                    .getContext()
	                    .getAuthentication();

	    if (authentication == null
	            || !authentication.isAuthenticated()
	            || "anonymousUser".equals(authentication.getPrincipal())) {

	        throw new UnauthorizedActionException(
	                "Staff is not authenticated");
	    }

	    String email = authentication.getName();

	    Staff staff =
	            staffRepository
	                    .findByEmail(email)
	                    .orElseThrow(() ->
	                            new ResourceNotFoundException(
	                                    "Staff not found"));

	    Integer hubId =
	            staff.getHub().getHubId();

	    //--------------------------------
	    // Booking
	    //--------------------------------

	    BookingHeader booking =
	            bookingHeaderRepository
	                    .findById(bookingId)
	                    .orElseThrow(() ->
	                            new ResourceNotFoundException(
	                                    "Booking not found"));

	    //--------------------------------
	    // Hub Validation
	    //--------------------------------

	    if (!hubId.equals(
	            booking.getPickupHubId())) {

	        throw new UnauthorizedActionException(
	                "You are not authorized to cancel this booking");
	    }

	    //--------------------------------
	    // Validation
	    //--------------------------------

	    if (booking.getBookingStatus()
	            == BookingStatus.CANCELLED) {

	        throw new BusinessException(
	                "Booking is already cancelled");
	    }

	    if (booking.getBookingStatus()
	            == BookingStatus.COMPLETED) {

	        throw new BusinessException(
	                "Completed booking cannot be cancelled");
	    }

	    //--------------------------------
	    // Cancel
	    //--------------------------------

	    booking.setBookingStatus(
	            BookingStatus.CANCELLED);

	    BookingHeader savedBooking =
	            bookingHeaderRepository.save(booking);

	    BookingResponse response =
	            mapToBookingResponse(savedBooking);

	    return new ApiResponse<>(
	            true,
	            "Booking cancelled successfully",
	            response);
	}
    
	}
	
