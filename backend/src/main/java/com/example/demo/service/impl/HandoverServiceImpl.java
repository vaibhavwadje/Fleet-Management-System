package com.example.demo.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.exception.error.BusinessException;
import com.example.demo.exception.error.ResourceNotFoundException;
import com.example.demo.exception.error.UnauthorizedActionException;
import com.example.demo.dto.request.AssignVehicleRequest;
import com.example.demo.dto.response.AssignVehicleResponse;
import com.example.demo.dto.response.InvoiceResponse;
import com.example.demo.entity.BookingHeader;
import com.example.demo.entity.InvoiceDetail;
import com.example.demo.entity.InvoiceHeader;
import com.example.demo.entity.base.Car;
import com.example.demo.entity.base.CarType;
import com.example.demo.entity.base.Hub;
import com.example.demo.entity.base.Staff;
import com.example.demo.enums.BookingStatus;
import com.example.demo.enums.CarClass;
import com.example.demo.enums.CarStatus;
import com.example.demo.repository.BookingDetailRepository;
import com.example.demo.repository.BookingHeaderRepository;
import com.example.demo.repository.CarRepository;
import com.example.demo.repository.CarTypeRepository;
import com.example.demo.repository.HubRepository;
import com.example.demo.repository.InvoiceDetailRepository;
import com.example.demo.repository.InvoiceHeaderRepository;
import com.example.demo.repository.StaffRepository;
import com.example.demo.response.ApiResponse;
import com.example.demo.service.EmailService;
import com.example.demo.service.HandoverService;
import com.example.demo.service.InvoiceService;
import com.example.demo.service.pricing.RentalPricingCalculator;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.example.demo.dto.request.ConfirmHandoverRequest;
import com.example.demo.dto.request.ReturnVehicleRequest;
import com.example.demo.entity.BookingDetail;

@Service
public class HandoverServiceImpl implements HandoverService {

    // =====================================================
    // Repositories
    // =====================================================

    private final BookingHeaderRepository bookingHeaderRepository;

    private final CarRepository carRepository;

    private final StaffRepository staffRepository;

    private final HubRepository hubRepository;

    /**
     * Needed to translate a booking's car_type_id into a category.
     * car_type rows are per-hub, so the id alone does not survive a
     * hand-over at a different hub - see step 8b.
     */
    private final CarTypeRepository carTypeRepository;

    private final InvoiceHeaderRepository invoiceHeaderRepository;

    private final InvoiceDetailRepository invoiceDetailRepository;

    /** The one implementation of the rate structure - see the class javadoc. */
    private final RentalPricingCalculator pricingCalculator;

    private final BookingDetailRepository bookingDetailRepository;

    private final InvoiceService invoiceService;

    private final EmailService emailService;

    private static final Logger log =
            LoggerFactory.getLogger(HandoverServiceImpl.class);

    // =====================================================
    // Constructor Injection
    // =====================================================

    
    public HandoverServiceImpl(
            BookingHeaderRepository bookingHeaderRepository,
            CarRepository carRepository,
            StaffRepository staffRepository,
            BookingDetailRepository bookingDetailRepository,
            InvoiceHeaderRepository invoiceHeaderRepository,
            InvoiceDetailRepository invoiceDetailRepository,
            RentalPricingCalculator pricingCalculator,
            HubRepository hubRepository,
            CarTypeRepository carTypeRepository,
            InvoiceService invoiceService,
            EmailService emailService) {

        this.bookingHeaderRepository = bookingHeaderRepository;
        this.carRepository = carRepository;
        this.staffRepository = staffRepository;
        this.bookingDetailRepository = bookingDetailRepository;
        this.invoiceHeaderRepository = invoiceHeaderRepository;
        this.invoiceDetailRepository = invoiceDetailRepository;
        this.pricingCalculator = pricingCalculator;
        this.hubRepository = hubRepository;
        this.carTypeRepository = carTypeRepository;
        this.invoiceService = invoiceService;
        this.emailService = emailService;
    }

    // =====================================================
    // Assign Vehicle
    // =====================================================

    @Override
    @Transactional
    public ApiResponse<AssignVehicleResponse> assignVehicle(
            AssignVehicleRequest request) {

        // -------------------------------------------------
        // Step 1 : Get Logged-in Staff
        // -------------------------------------------------

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(
                        authentication.getPrincipal())) {

            throw new UnauthorizedActionException(
                    "Staff is not authenticated");
        }

        String email =
                authentication.getName();

        // -------------------------------------------------
        // Step 2 : Find Staff
        // -------------------------------------------------

        Staff staff =
                staffRepository
                        .findByEmail(email)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Staff not found"));

        Integer staffHubId =
                staff.getHub().getHubId();

        // -------------------------------------------------
        // Step 3 : Find Booking
        // -------------------------------------------------

        BookingHeader booking =
                bookingHeaderRepository
                        .findById(request.getBookingId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Booking not found"));

        // -------------------------------------------------
        // Hub restriction: deliberately none
        //
        // Hand-over and return are now GLOBAL. Any staff member can process
        // any booking, whichever hub it belongs to, so a customer is never
        // stuck because the one person who could help them works elsewhere.
        //
        // What still follows the hubs is the physical car: a hand-over uses
        // a vehicle from the fleet of whoever is doing it, and the booking's
        // pick-up hub moves to match. On return the car is moved to the hub
        // that took it back.
        // -------------------------------------------------

        // -------------------------------------------------
        // Step 4 : Booking must be Pending
        // -------------------------------------------------

        if (booking.getBookingStatus()
                != BookingStatus.PENDING) {

            throw new BusinessException(
                    "Only pending bookings can be assigned");
        }

        // -------------------------------------------------
        // Step 5 : Check if vehicle already assigned
        // -------------------------------------------------

        if (booking.getAssignedCarId() != null) {

            throw new BusinessException(
                    "Vehicle is already assigned to this booking");
        }

        // -------------------------------------------------
        // Step 6 : Find Selected Vehicle
        // -------------------------------------------------

        Car car =
                carRepository
                        .findById(request.getCarId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Vehicle not found"));
        
        // -------------------------------------------------
        // Step 7 : Vehicle must be in THIS hub's fleet
        //
        // WHOEVER HANDS OVER BECOMES THE PICK-UP HUB
        // ------------------------------------------
        // A customer who walks into Indore collects an Indore car. The
        // booking may have said BOM when it was made, but what actually
        // happened is what the record should say - so the car comes from the
        // fleet of whoever is standing here, and the booking's pick-up hub is
        // moved to match (step 9b below).
        //
        // The previous rule tested the car against the BOOKING's pick-up hub,
        // which let an Indore staff member release a car sitting in Mumbai.
        // -------------------------------------------------

        if (car.getHub() == null
                || !car.getHub().getHubId().equals(staffHubId)) {

            throw new BusinessException(
                    "That vehicle is not in your hub's fleet. You can only "
                    + "hand over a vehicle that is standing at your own hub.");
        }

        // -------------------------------------------------
        // Step 8 : Vehicle must be AVAILABLE
        // -------------------------------------------------

        if (car.getStatus() != CarStatus.AVAILABLE) {

            throw new BusinessException(
                    "Vehicle is not available");
        }

        // -------------------------------------------------
        // Step 8a : Vehicle must not be due for service
        //
        // A car is off the road on its service date and for the three days
        // before it. Both ends of the booking are checked: a rental that
        // starts clear but ENDS inside the window would still have the car
        // out on the day it is due in the workshop.
        // -------------------------------------------------

        if (pricingCalculator.clashesWithService(
                car.getServiceDueDate(),
                booking.getStartDate(),
                booking.getEndDate())) {

            throw new BusinessException(
                    "This vehicle is due for service on "
                    + car.getServiceDueDate()
                    + " and cannot be rented within "
                    + RentalPricingCalculator.SERVICE_BLACKOUT_DAYS
                    + " days of that date. Please choose another vehicle.");
        }

        // -------------------------------------------------
        // Step 8b : Vehicle must match the booked category
        //
        // The customer paid for a specific category, so staff cannot hand
        // over a different one. The screen already filters the list, but
        // this is the check that actually enforces it.
        //
        // COMPARED BY CLASS, NOT BY car_type_id
        //
        // car_type is a per-hub rate row: "Intermediate Sedan" exists once
        // for every hub, each with its own car_type_id. The booking stores
        // the row belonging to the hub the customer originally picked.
        //
        // Comparing ids therefore rejected every cross-hub hand-over - an
        // Indore Intermediate Sedan is a genuinely correct match for a
        // booking made at BOM, but its car_type_id could never equal BOM's.
        // CarClass is the part that means the same thing at every hub, so
        // that is what the rule is actually about.
        // -------------------------------------------------

        CarClass bookedClass = null;

        if (booking.getCarTypeId() != null) {

            bookedClass = carTypeRepository
                    .findById(booking.getCarTypeId().intValue())
                    .map(CarType::getCarClass)
                    .orElse(null);
        }

        if (bookedClass != null) {

            CarClass offeredClass = (car.getCarType() == null)
                    ? null
                    : car.getCarType().getCarClass();

            if (offeredClass == null || !bookedClass.equals(offeredClass)) {

                throw new BusinessException(
                        "This vehicle is a different category from the one booked. "
                        + "Please choose a vehicle of the booked car type.");
            }
        }

        // -------------------------------------------------
        // Step 9 : Assign Vehicle to Booking
        // -------------------------------------------------

        // Assign Vehicle Id
        
        // -------------------------------------------------
        // The pick-up hub follows the hand-over
        //
        // The car being allocated belongs to THIS hub, so this is where the
        // customer is collecting from - whatever the booking said when it was
        // made. Recording it here keeps the booking, the invoice and the
        // vehicle's own hub telling the same story, and moves the booking
        // into this hub's Hand-over list where the work actually is.
        // -------------------------------------------------

        if (!staffHubId.equals(booking.getPickupHubId())) {

            log.info("Booking {} pick-up hub moved from {} to {} - handed over"
                     + " by {} hub staff",
                    booking.getBookingId(), booking.getPickupHubName(),
                    staff.getHub().getHubName(), staff.getHub().getHubName());

            booking.setPickupHubId(staffHubId);
            booking.setPickupHubName(staff.getHub().getHubName());

            // -------------------------------------------------
            // The car type row follows the hub too
            //
            // The booking still points at the ORIGINAL hub's rate row, and
            // that row is about to be read by the invoice. Leaving it there
            // would have the invoice for an Indore rental quoting a Mumbai
            // rate row - same category name, wrong hub.
            //
            // The vehicle standing in the bay is the fact here, so the
            // booking is re-pointed at that car's own car_type row.
            //
            // Deliberately NOT a re-price. The customer was quoted at
            // booking time and that figure is what they agreed to; moving
            // the collection point is our convenience, not a new contract.
            // Only the pointer moves, never the money.
            // -------------------------------------------------

            if (car.getCarType() != null
                    && car.getCarType().getCarTypeId() != null) {

                booking.setCarTypeId(
                        car.getCarType().getCarTypeId().longValue());
            }
        }

        booking.setAssignedCarId(car.getCarId());

        // Store Vehicle Snapshot
        booking.setAssignedCarRegistrationNo(
                car.getRegistrationNo());

        booking.setAssignedCarBrandName(
                car.getBrandName());

        booking.setAssignedCarModelName(
                car.getModelName());

        // Save Booking
        bookingHeaderRepository.save(booking);

        // -------------------------------------------------
        // Step 10 : Prepare Response
        // -------------------------------------------------

        AssignVehicleResponse response =
                new AssignVehicleResponse();

        response.setBookingId(
                booking.getBookingId());

        response.setAssignedCarId(
                car.getCarId());

        response.setCarRegistrationNo(
                car.getRegistrationNo());

        response.setBrandName(
                car.getBrandName());

        response.setModelName(
                car.getModelName());

        response.setMessage(
                "Vehicle assigned successfully");

        // -------------------------------------------------
        // Step 11 : Return Response
        // -------------------------------------------------

        return new ApiResponse<>(
                true,
                "Vehicle assigned successfully",
                response);
    }
    
    
    @Override
    @Transactional
    public ApiResponse<String> confirmHandover(
            ConfirmHandoverRequest request) {

        // =====================================================
        // Step 1 : Get Logged-in Staff
        // =====================================================

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {

            throw new UnauthorizedActionException("Staff is not authenticated.");
        }

        String email = authentication.getName();

        // =====================================================
        // Step 2 : Find Staff
        // =====================================================

        Staff staff =
                staffRepository.findByEmail(email)
                        .orElseThrow(() ->
                                new ResourceNotFoundException("Staff not found."));

        Integer staffHubId =
                staff.getHub().getHubId();

        // =====================================================
        // Step 3 : Find Booking
        // =====================================================

        BookingHeader booking =
                bookingHeaderRepository
                        .findById(request.getBookingId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException("Booking not found."));

        // =====================================================
        // Step 3b : Hub restriction - deliberately none
        //
        // Hand-over is global; see the note in assignVehicle.
        // =====================================================

        // =====================================================
        // Step 4 : Booking Status Validation
        // =====================================================

        if (booking.getBookingStatus() != BookingStatus.PENDING) {

            throw new BusinessException(
                    "Only pending bookings can be handed over.");
        }

        // =====================================================
        // Step 5 : Vehicle Must Be Assigned
        // =====================================================

        if (booking.getAssignedCarId() == null) {

            throw new BusinessException(
                    "Please assign a vehicle before handover.");
        }

        // =====================================================
        // Step 6 : Find Assigned Vehicle
        // =====================================================

        Car car =
                carRepository
                        .findById(booking.getAssignedCarId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Assigned vehicle not found."));

        // =====================================================
        // Step 7 : Vehicle must be in THIS hub's fleet
        //
        // Same rule as assignVehicle - see the note there.
        // =====================================================

        if (car.getHub() == null
                || !car.getHub().getHubId().equals(staffHubId)) {

            throw new BusinessException(
                    "That vehicle is not in your hub's fleet. You can only "
                    + "hand over a vehicle that is standing at your own hub.");
        }

        // =====================================================
        // Step 8 : Vehicle Status Validation
        // =====================================================

        if (car.getStatus() != CarStatus.AVAILABLE) {

            throw new BusinessException(
                    "Vehicle is not available for handover.");
        }
        
        // Check Duplicate Invoice
        // =====================================================

        invoiceHeaderRepository
             .findByBookingId(booking.getBookingId())
             .ifPresent(existing -> {
                 throw new BusinessException(
                         "Invoice already exists for this booking.");
             });

        // =====================================================
        // Step 9 : Update Booking
        // =====================================================

        booking.setBookingStatus(
                BookingStatus.CONFIRMED);

        // Re-checked here, not only at assignment: a vehicle can be assigned
        // one day and released the next, and the blackout window may have
        // been crossed in between.
        if (pricingCalculator.clashesWithService(
                car.getServiceDueDate(),
                booking.getStartDate(),
                booking.getEndDate())) {

            throw new BusinessException(
                    "This vehicle is due for service on "
                    + car.getServiceDueDate()
                    + " and cannot be released. Please assign another vehicle.");
        }

        booking.setHandoverDate(
                LocalDateTime.now());

        booking.setFuelLevelOut(
                request.getFuelLevelOut());

        bookingHeaderRepository.save(booking);

        // =====================================================
        // Step 10 : Update Vehicle
        // =====================================================

        car.setStatus(CarStatus.RENTED);

        carRepository.save(car);
        
        // =====================================================


        // =====================================================
        // Step 11 : Create Invoice Header
        // =====================================================

        InvoiceHeader invoice = new InvoiceHeader();
        
        // =====================================================
        // Step 12 : Copy Booking Information To Invoice
        // =====================================================

        // Booking Reference
        invoice.setBookingId(booking.getBookingId());

        // Customer Snapshot
        invoice.setCustomerId(booking.getCustomerId());
        invoice.setFirstName(booking.getFirstName());
        invoice.setLastName(booking.getLastName());
        invoice.setEmail(booking.getEmail());
        invoice.setPhone(booking.getPhone());
        invoice.setDrivingLicenseNo(booking.getDrivingLicenseNo());
        invoice.setPassportNo(booking.getPassportNo());

        // Address snapshot (BRD: Invoice Header Table)
        invoice.setAddressLine1(booking.getAddressLine1());
        invoice.setAddressLine2(booking.getAddressLine2());
        invoice.setCityId(booking.getCityId());
        invoice.setStateId(booking.getStateId());
        invoice.setPincode(booking.getPincode());

        // Vehicle Snapshot
        invoice.setCarId(car.getCarId());
        invoice.setRegistrationNo(
                booking.getAssignedCarRegistrationNo());

        invoice.setBrandName(
                booking.getAssignedCarBrandName());

        invoice.setModelName(
                booking.getAssignedCarModelName());
        invoice.setCarTypeId(booking.getCarTypeId());

        // Hub Snapshot
        invoice.setPickupHubId(booking.getPickupHubId());
        invoice.setPickupHubName(booking.getPickupHubName());

        invoice.setDropoffHubId(booking.getDropoffHubId());
        invoice.setDropoffHubName(booking.getDropoffHubName());

        // Booking Dates
        invoice.setStartDate(booking.getStartDate());
        invoice.setEndDate(booking.getEndDate());
        invoice.setHandoverDate(booking.getHandoverDate());

        // Charges
        invoice.setDuration(booking.getDuration());

        invoice.setDailyRate(booking.getDailyRate());
        invoice.setWeeklyRate(booking.getWeeklyRate());
        invoice.setMonthlyRate(booking.getMonthlyRate());

        invoice.setVehicleAmount(booking.getVehicleAmount());
        invoice.setAddonAmount(booking.getAddonAmount());
        invoice.setTaxAmount(booking.getTaxAmount());
        invoice.setGrandTotal(booking.getGrandTotal());

        // Fuel
        invoice.setFuelLevelOut(booking.getFuelLevelOut());

        // =====================================================
        // Step 13 : Save Invoice Header
        // =====================================================

        invoice = invoiceHeaderRepository.save(invoice);

        // =====================================================
        // Step 14 : Copy Booking Details To Invoice Details
        // =====================================================

        List<BookingDetail> bookingDetails =
                bookingDetailRepository.findByBookingId(
                        booking.getBookingId());

        for (BookingDetail detail : bookingDetails) {

            InvoiceDetail invoiceDetail = new InvoiceDetail();

            invoiceDetail.setInvoiceId(
                    invoice.getInvoiceId());

            invoiceDetail.setBookingDetailId(
                    detail.getBookingDetailId());

            invoiceDetail.setAddonId(
                    detail.getAddonId());

            invoiceDetail.setAddonName(
                    detail.getAddonName());

            invoiceDetail.setAddonPrice(
                    detail.getAddonPrice());
            
            invoiceDetailRepository.save(invoiceDetail);
        }
        
        // =====================================================
        // Step 15 : Return Success Response
        // =====================================================

        return new ApiResponse<>(
                true,
                "Vehicle handover completed successfully.",
                "Invoice generated successfully.");
    }
    
    
    @Override
    @Transactional
    public ApiResponse<String> returnVehicle(
            ReturnVehicleRequest request) {

        // =====================================================
        // Step 1 : Get Logged-in Staff
        // =====================================================

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {

            throw new UnauthorizedActionException(
                    "Staff is not authenticated.");
        }

        String email = authentication.getName();
        

        // =====================================================
        // Step 2 : Find Staff
        // =====================================================

        Staff staff =
                staffRepository
                        .findByEmail(email)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Staff not found."));

        Integer staffHubId =
                staff.getHub().getHubId();

        // =====================================================
        // Step 3 : Find Booking
        // =====================================================

        BookingHeader booking =
                bookingHeaderRepository
                        .findById(request.getBookingId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Booking not found."));

        // =====================================================
        // Step 4 : Booking Status Validation
        // =====================================================

        if (booking.getBookingStatus() != BookingStatus.CONFIRMED) {

            throw new BusinessException(
                    "Only confirmed bookings can be returned.");
        }

        // =====================================================
        // Step 5 : Vehicle Must Be Assigned
        // =====================================================

        if (booking.getAssignedCarId() == null) {

            throw new BusinessException(
                    "No vehicle is assigned to this booking.");
        }

        // =====================================================
        // Step 6 : Find Assigned Vehicle
        // =====================================================

        Car car =
                carRepository
                        .findById(booking.getAssignedCarId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Assigned vehicle not found."));

        // =====================================================
        // Step 7 : Hub Validation - deliberately none
        //
        // Returns are global. Any hub can take a vehicle back, which is what
        // a customer expects when their plans change mid-trip. The car is
        // moved to whichever hub actually received it (step 12), so the fleet
        // still knows where every vehicle is.
        // =====================================================

        // =====================================================
        // Step 8 : Vehicle Status Validation
        // =====================================================

        if (car.getStatus() != CarStatus.RENTED) {

            throw new BusinessException(
                    "Vehicle is not currently rented.");
        }

        // =====================================================
        // Step 9 : Find Invoice
        // =====================================================

        InvoiceHeader invoice =
                invoiceHeaderRepository
                        .findByBookingId(booking.getBookingId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Invoice not found."));

        // =====================================================
        // Step 9a : THE DROP-OFF LOCATION FOLLOWS THE RETURN
        //
        // Returns are global, so the customer may hand the car back somewhere
        // other than the hub they nominated when booking. Where they actually
        // brought it is the hub of the staff member processing this return -
        // that is a fact, not a plan, and the record should say so.
        //
        // Both rows are updated, and they have to be. The booking is what the
        // Returns lists and the customer's own booking screen read; the
        // invoice is a SNAPSHOT taken at hand-over, so it still carries the
        // originally chosen hub and nothing else would ever correct it. Leave
        // either one behind and the customer gets an invoice for a city they
        // did not return the car to.
        //
        // Only the location moves. Nothing here re-prices: a one-way drop is
        // a service we allow, and the amount was agreed when they booked.
        // =====================================================

        Hub returnHub = hubRepository
                .findById(staffHubId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Your hub could not be found, so the return cannot be recorded."));

        if (!staffHubId.equals(booking.getDropoffHubId())) {

            log.info("Booking {} returned to {} instead of the booked {} -"
                     + " drop-off location updated on the booking and the invoice",
                    booking.getBookingId(),
                    returnHub.getHubName(),
                    booking.getDropoffHubName());

            booking.setDropoffHubId(returnHub.getHubId());
            booking.setDropoffHubName(returnHub.getHubName());
        }

        // Set unconditionally rather than inside the branch above: an invoice
        // written before this change exists could have been snapshotted with a
        // drop-off hub that no longer matches its own booking, and this is the
        // moment we know the right answer.
        invoice.setDropoffHubId(returnHub.getHubId());
        invoice.setDropoffHubName(returnHub.getHubName());

        // =====================================================
        // Step 10 : Update Booking
        // =====================================================

        // Override planned return date with actual return date
        LocalDate plannedEndDate = booking.getEndDate();
        LocalDate actualEndDate = LocalDate.now();

        booking.setEndDate(actualEndDate);

        booking.setFuelLevelIn(
                request.getFuelLevelIn());

        // =====================================================
        // Step 10a : FUEL CHARGE, calculated not typed
        //
        // Charged in proportion to what is missing from the tank: out at
        // Full, back at 3/4, and a quarter of a tank is charged.
        //
        // Derived from the two gauge readings rather than taken from the
        // request. The staff member records what they SEE - the two fuel
        // levels - and the amount follows from that. A typed figure is a
        // second source of truth for something already implied by the first,
        // and the two would eventually disagree.
        //
        // Returning with more fuel than it went out with is not a refund;
        // the charge floors at zero.
        // =====================================================

        BigDecimal fuelCharges = pricingCalculator.fuelCharge(
                booking.getFuelLevelOut(),
                request.getFuelLevelIn());

        booking.setFuelCharges(fuelCharges);

        booking.setBookingStatus(
                BookingStatus.COMPLETED);

        // =====================================================
        // Step 10b : RE-PRICE FOR THE ACTUAL RENTAL PERIOD
        //
        // WHY THIS IS HERE
        // ----------------
        // The line above has just changed the end date to the day the car
        // actually came back, which changes how many days the customer had
        // it. Until now nothing re-costed the booking, so the amounts still
        // described the ORIGINAL date range: return a car three days late
        // and the invoice charged for the shorter, planned rental.
        //
        // The browser cannot fix this. Once the vehicle has been handed over
        // the customer can no longer edit the booking, so no screen ever
        // recalculates - and the figure the browser last sent is exactly the
        // stale one. The server is the only place that knows the real return
        // date, so the server does the arithmetic and the server's answer is
        // what gets stored.
        //
        // WHICH RATES
        // -----------
        // The rates snapshotted on the booking, not today's rate card. The
        // customer agreed those rates when they booked; a hub that has since
        // repriced must not be able to change the cost of a rental that is
        // already under way.
        //
        // WHICH DATES
        // -----------
        // HAND-OVER date to END date, not start date to end date.
        //
        // The start date is what the customer planned; the hand-over date is
        // when they actually drove the car away, stamped from the server
        // clock at hand-over. A customer who books for Monday but collects on
        // Wednesday should not be billed for the two days the car sat at the
        // hub waiting for them.
        // =====================================================

        int originalDuration = booking.getDuration() == null
                ? 0 : booking.getDuration();

        LocalDate billingStart = pricingCalculator.billingStartDate(
                booking.getHandoverDate(), booking.getStartDate());

        int actualDuration = pricingCalculator.durationInDays(
                billingStart, actualEndDate);

        BigDecimal browserGrandTotal = booking.getGrandTotal();

        // ---- Add-ons ---------------------------------------------------
        // Each line is a total for the original period, so it is scaled to
        // the new one. Both the booking lines and the invoice lines are
        // rewritten, otherwise the add-on rows printed on the invoice would
        // no longer add up to the add-on subtotal printed beneath them.

        List<BookingDetail> bookingDetails =
                bookingDetailRepository.findByBookingId(booking.getBookingId());

        List<InvoiceDetail> invoiceDetails =
                invoiceDetailRepository.findByInvoiceId(invoice.getInvoiceId());

        BigDecimal addonAmount = BigDecimal.ZERO;

        for (BookingDetail detail : bookingDetails) {

            BigDecimal repriced = pricingCalculator.repriceAddonLine(
                    detail.getAddonPrice(), originalDuration, actualDuration);

            detail.setAddonPrice(repriced);
            addonAmount = addonAmount.add(repriced);

            // Keep the matching invoice line in step.
            for (InvoiceDetail line : invoiceDetails) {
                if (detail.getBookingDetailId().equals(line.getBookingDetailId())) {
                    line.setAddonPrice(repriced);
                }
            }
        }

        if (!bookingDetails.isEmpty()) {
            bookingDetailRepository.saveAll(bookingDetails);
        }
        if (!invoiceDetails.isEmpty()) {
            invoiceDetailRepository.saveAll(invoiceDetails);
        }

        // ---- Vehicle, tax, total ---------------------------------------

        BigDecimal vehicleAmount = pricingCalculator.vehicleAmount(
                booking.getDailyRate(),
                booking.getWeeklyRate(),
                booking.getMonthlyRate(),
                actualDuration);

        BigDecimal taxAmount =
                pricingCalculator.taxAmount(vehicleAmount, addonAmount);

        BigDecimal grandTotal =
                pricingCalculator.grandTotal(vehicleAmount, addonAmount, taxAmount);

        booking.setDuration(actualDuration);
        booking.setVehicleAmount(vehicleAmount);
        booking.setAddonAmount(addonAmount);
        booking.setTaxAmount(taxAmount);
        booking.setGrandTotal(grandTotal);

        // Say plainly when the server's figure differs from the one the
        // browser last stored. This is the audit trail for "why is my bill
        // different from the quote", and it is the only place the two
        // calculations are ever compared.
        if (browserGrandTotal == null
                || browserGrandTotal.compareTo(grandTotal) != 0) {

            log.info("Booking {} re-priced on return: billed {} -> {} "
                     + "(hand-over to return), planned end was {}, "
                     + "{} day(s) -> {} day(s), stored total {} -> {}",
                    booking.getBookingId(),
                    billingStart, actualEndDate,
                    plannedEndDate,
                    originalDuration, actualDuration,
                    browserGrandTotal, grandTotal);
        }

        bookingHeaderRepository.save(booking);

        // =====================================================
        // Step 11 : Finalise the Invoice
        //
        // The invoice row was created at hand-over. The vehicle is only now
        // back, so this is the point at which the invoice is actually
        // "raised": it gets its number, its date and the return details.
        // =====================================================

        LocalDateTime now = LocalDateTime.now();

        invoice.setEndDate(
                booking.getEndDate());

        // The invoice was copied from the booking at hand-over, when the end
        // date was still the planned one. Copy the re-priced figures across
        // so the document the customer receives matches what they actually
        // owe - otherwise the invoice would still show the old quote.
        invoice.setDuration(actualDuration);
        invoice.setVehicleAmount(vehicleAmount);
        invoice.setAddonAmount(addonAmount);
        invoice.setTaxAmount(taxAmount);
        invoice.setGrandTotal(grandTotal);

        invoice.setFuelLevelIn(
                request.getFuelLevelIn());

        invoice.setFuelCharges(fuelCharges);

        invoice.setReturnDate(now);
        invoice.setInvoiceDate(now);

        // Only number it once, so a corrected return never renumbers it.
        if (invoice.getInvoiceNo() == null) {
            invoice.setInvoiceNo(buildInvoiceNumber(invoice.getInvoiceId(), now));
        }

        invoiceHeaderRepository.save(invoice);

        // =====================================================
        // Step 12 : Update Vehicle
        //
        // The car is now standing at the drop-off hub, so move it there.
        // Without this a one-way rental would leave the vehicle listed at
        // its original hub and it could never be hired out again.
        // =====================================================

        car.setStatus(CarStatus.AVAILABLE);

        if (!car.getHub().getHubId().equals(staffHubId)) {

            // Same hub the booking and invoice were just pointed at in step
            // 9a. Resolved once, so the vehicle, the booking and the invoice
            // cannot end up disagreeing about where the car is.
            car.setHub(returnHub);

            log.info("Vehicle {} moved from hub {} to hub {} on return of booking {}",
                    car.getRegistrationNo(), booking.getPickupHubId(),
                    staffHubId, booking.getBookingId());
        }

        carRepository.save(car);

        // =====================================================
        // Step 13 : Email the invoice
        //
        // Sent on a background thread and it never throws, so a mail failure
        // is logged but cannot break the return the staff member just made.
        // =====================================================

        try {
            InvoiceResponse invoiceResponse =
                    invoiceService.loadInvoiceForBooking(booking.getBookingId());

            emailService.sendInvoice(invoiceResponse);

        } catch (Exception e) {
            log.error("Could not queue the invoice email for booking {}: {}",
                    booking.getBookingId(), e.getMessage());
        }

        // =====================================================
        // Step 14 : Return Success Response
        // =====================================================

        return new ApiResponse<>(
                true,
                "Vehicle returned successfully.",
                "Booking completed and invoice generated.");
    }

    /**
     * Builds the printed invoice number, e.g. INV-2026-000042.
     * The invoice id keeps it unique; the year just makes it readable.
     */
    private String buildInvoiceNumber(Long invoiceId, LocalDateTime when) {
        return String.format("INV-%d-%06d", when.getYear(), invoiceId);
    }

}