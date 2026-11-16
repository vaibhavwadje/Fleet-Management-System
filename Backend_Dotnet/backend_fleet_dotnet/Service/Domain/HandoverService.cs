using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FleetManagement.Data;
using FleetManagement.DTO.Requests;
using FleetManagement.DTO.Responses;
using FleetManagement.Integration;
using FleetManagement.Middleware;
using FleetManagement.Models;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Email;
using FleetManagement.Service.Pricing;

namespace FleetManagement.Service.Domain;

/// <summary>
/// Hand-over and return: allocating a vehicle, releasing it, taking it back.
///
/// HUB POLICY
/// ----------
/// Hand-over and return are GLOBAL - any staff member can process any booking,
/// so a customer is never stuck because the one person who could help them
/// works elsewhere.
///
/// What still follows the hubs is the physical car. A hand-over uses a vehicle
/// from the fleet of whoever is doing it, and the booking's pick-up hub moves
/// to match: a customer who walks into Indore collects an Indore car, and the
/// record should say so. On return the car moves to the hub that took it back.
/// </summary>
public class HandoverService
{
    private readonly FleetDbContext _db;
    private readonly IMapper _mapper;
    private readonly ILogger<HandoverService> _logger;
    private readonly RentalPricingCalculator _pricing;
    private readonly StaffService _staff;
    private readonly JavaMicroserviceClient _java;
    private readonly InvoiceService _invoices;
    private readonly IEmailService _email;
    private readonly ITokenService _tokens;

    public HandoverService(
        FleetDbContext db,
        IMapper mapper,
        ILogger<HandoverService> logger,
        RentalPricingCalculator pricing,
        StaffService staff,
        JavaMicroserviceClient java,
        InvoiceService invoices,
        IEmailService email,
        ITokenService tokens)
    {
        _db = db;
        _mapper = mapper;
        _logger = logger;
        _pricing = pricing;
        _staff = staff;
        _java = java;
        _invoices = invoices;
        _email = email;
        _tokens = tokens;
    }

    // ═════════════════════════════════════════════════════════════════════
    //  ASSIGN
    // ═════════════════════════════════════════════════════════════════════

    public async Task<AssignVehicleResponse> AssignVehicleAsync(
        AssignVehicleRequest request, CancellationToken ct = default)
    {
        var staff = await _staff.RequireCurrentStaffAsync(ct);
        var staffHubId = staff.HubId;

        var booking = await _db.BookingHeaders
            .FirstOrDefaultAsync(b => b.BookingId == request.BookingId, ct)
            ?? throw new ResourceNotFoundException("Booking not found");

        if (booking.BookingStatus != BookingStatus.PENDING)
            throw new BusinessException("Only pending bookings can be assigned");

        if (booking.AssignedCarId is not null)
            throw new BusinessException("Vehicle is already assigned to this booking");

        var car = await _db.Cars
            .Include(c => c.Hub).Include(c => c.CarType)
            .FirstOrDefaultAsync(c => c.CarId == request.CarId, ct)
            ?? throw new ResourceNotFoundException("Vehicle not found");

        // The car must be in THIS hub's fleet, not the booking's original
        // pick-up hub. Testing against the booking's hub would let a staff
        // member in Indore release a car sitting in Mumbai.
        if (car.HubId != staffHubId)
        {
            throw new BusinessException(
                "That vehicle is not in your hub's fleet. You can only hand over a "
                + "vehicle that is standing at your own hub.");
        }

        if (car.Status != CarStatus.AVAILABLE)
            throw new BusinessException("Vehicle is not available");

        // A car is off the road on its service date and for the three days
        // before it. Both ends of the booking are checked: a rental that
        // starts clear but ENDS inside the window would still have the car out
        // on the day it is due in the workshop.
        if (_pricing.ClashesWithService(car.ServiceDueDate, booking.StartDate, booking.EndDate))
        {
            throw new BusinessException(
                $"This vehicle is due for service on {car.ServiceDueDate} and cannot be "
                + $"rented within {RentalPricingCalculator.ServiceBlackoutDays} days of that "
                + "date. Please choose another vehicle.");
        }

        // The customer paid for a specific category, so staff cannot hand over
        // a different one.
        //
        // COMPARED BY CLASS, NOT BY car_type_id
        //
        // car_type is a per-hub rate row: "Intermediate Sedan" exists once for
        // every hub, each with its own car_type_id. The booking stores the row
        // belonging to the hub the customer originally picked.
        //
        // Comparing ids therefore rejected every cross-hub hand-over - an
        // Indore Intermediate Sedan is a genuinely correct match for a booking
        // made at BOM, but its car_type_id could never equal BOM's. CarClass
        // is the part that means the same thing at every hub, so that is what
        // the rule is actually about.
        if (booking.CarTypeId is { } bookedTypeId)
        {
            var bookedClass = await _db.CarTypes
                .Where(t => t.CarTypeId == (int)bookedTypeId)
                .Select(t => (CarClass?)t.CarClass)
                .FirstOrDefaultAsync(ct);

            if (bookedClass is { } wanted && car.CarType?.CarClass != wanted)
            {
                throw new BusinessException(
                    "That vehicle is not of the category the customer booked.");
            }
        }

        // The pick-up hub follows the hand-over: the car being allocated
        // belongs to this hub, so this is where the customer is collecting
        // from, whatever the booking said when it was made.
        if (booking.PickupHubId != staffHubId)
        {
            _logger.LogInformation(
                "Booking {BookingId} pick-up hub moved from {Old} to {New} - handed over here",
                booking.BookingId, booking.PickupHubName, staff.Hub!.HubName);

            booking.PickupHubId = staffHubId;
            booking.PickupHubName = staff.Hub!.HubName;

            // The car type row follows the hub too.
            //
            // The booking still points at the ORIGINAL hub's rate row, and
            // that row is about to be read by the invoice. Leaving it there
            // would have the invoice for an Indore rental quoting a Mumbai
            // rate row - same category name, wrong hub.
            //
            // Deliberately NOT a re-price. The customer was quoted at booking
            // time and that figure is what they agreed to; moving the
            // collection point is our convenience, not a new contract. Only
            // the pointer moves, never the money.
            booking.CarTypeId = car.CarTypeId;
        }

        booking.AssignedCarId = car.CarId;
        booking.AssignedCarRegistrationNo = car.RegistrationNo;
        booking.AssignedCarBrandName = car.BrandName;
        booking.AssignedCarModelName = car.ModelName;

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Vehicle {Registration} assigned to booking {BookingId}",
            car.RegistrationNo, booking.BookingId);

        return new AssignVehicleResponse
        {
            BookingId = booking.BookingId,
            AssignedCarId = car.CarId,
            CarRegistrationNo = car.RegistrationNo,
            BrandName = car.BrandName,
            ModelName = car.ModelName,
            Message = "Vehicle assigned successfully",
        };
    }

    // ═════════════════════════════════════════════════════════════════════
    //  CONFIRM HAND-OVER
    // ═════════════════════════════════════════════════════════════════════

    public async Task<string> ConfirmHandoverAsync(
        ConfirmHandoverRequest request, CancellationToken ct = default)
    {
        var staff = await _staff.RequireCurrentStaffAsync(ct);

        var booking = await _db.BookingHeaders
            .FirstOrDefaultAsync(b => b.BookingId == request.BookingId, ct)
            ?? throw new ResourceNotFoundException("Booking not found");

        if (booking.BookingStatus != BookingStatus.PENDING)
            throw new BusinessException("Only pending bookings can be handed over");

        if (booking.AssignedCarId is null)
            throw new BusinessException("No vehicle is assigned to this booking");

        var car = await _db.Cars.FirstOrDefaultAsync(c => c.CarId == booking.AssignedCarId, ct)
            ?? throw new ResourceNotFoundException("Assigned vehicle not found");

        if (car.HubId != staff.HubId)
        {
            throw new BusinessException(
                "That vehicle is not in your hub's fleet. You can only hand over a "
                + "vehicle that is standing at your own hub.");
        }

        // Re-checked here, not only at assignment: a vehicle can be assigned
        // one day and released the next, and the blackout window may have been
        // crossed in between.
        if (_pricing.ClashesWithService(car.ServiceDueDate, booking.StartDate, booking.EndDate))
        {
            throw new BusinessException(
                $"This vehicle is due for service on {car.ServiceDueDate} and cannot be "
                + "released. Please assign another vehicle.");
        }

        booking.BookingStatus = BookingStatus.CONFIRMED;

        // Stamped from the server clock, never taken from the request, so it
        // cannot be back-dated. This is also the date the rental is billed from.
        booking.HandoverDate = DateTime.Now;
        booking.FuelLevelOut = request.FuelLevelOut;

        car.Status = CarStatus.RENTED;

        // The invoice row is created NOW but numbered and dated at RETURN -
        // an invoice number should belong to a completed rental.
        var invoice = new InvoiceHeader
        {
            BookingId = booking.BookingId,
            CustomerId = booking.CustomerId,
            FirstName = booking.FirstName,
            LastName = booking.LastName,
            Email = booking.Email,
            Phone = booking.Phone,
            DrivingLicenseNo = booking.DrivingLicenseNo,
            PassportNo = booking.PassportNo,
            AddressLine1 = booking.AddressLine1,
            AddressLine2 = booking.AddressLine2,
            CityId = booking.CityId,
            StateId = booking.StateId,
            Pincode = booking.Pincode,

            CarId = car.CarId,
            RegistrationNo = car.RegistrationNo,
            BrandName = car.BrandName,
            ModelName = car.ModelName,
            CarTypeId = booking.CarTypeId,

            PickupHubId = booking.PickupHubId,
            PickupHubName = booking.PickupHubName,
            DropoffHubId = booking.DropoffHubId,
            DropoffHubName = booking.DropoffHubName,

            StartDate = booking.StartDate,
            EndDate = booking.EndDate,
            HandoverDate = booking.HandoverDate,
            Duration = booking.Duration,

            DailyRate = booking.DailyRate,
            WeeklyRate = booking.WeeklyRate,
            MonthlyRate = booking.MonthlyRate,
            VehicleAmount = booking.VehicleAmount,
            AddonAmount = booking.AddonAmount,
            TaxAmount = booking.TaxAmount,
            GrandTotal = booking.GrandTotal,
            FuelLevelOut = booking.FuelLevelOut,
        };

        _db.InvoiceHeaders.Add(invoice);
        await _db.SaveChangesAsync(ct);

        // Copy the add-on lines across.
        var details = await _db.BookingDetails
            .Where(d => d.BookingId == booking.BookingId).ToListAsync(ct);

        foreach (var detail in details)
        {
            _db.InvoiceDetails.Add(new InvoiceDetail
            {
                InvoiceId = invoice.InvoiceId,
                BookingDetailId = detail.BookingDetailId,
                AddonId = detail.AddonId,
                AddonName = detail.AddonName ?? string.Empty,
                AddonPrice = detail.AddonPrice,
            });
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Booking {BookingId} handed over at hub {HubId}, fuel {Fuel}%",
            booking.BookingId, staff.HubId, request.FuelLevelOut);

        return "Vehicle handed over successfully";
    }

    // ═════════════════════════════════════════════════════════════════════
    //  RETURN
    // ═════════════════════════════════════════════════════════════════════

    public async Task<string> ReturnVehicleAsync(
        ReturnVehicleRequest request, CancellationToken ct = default)
    {
        var staff = await _staff.RequireCurrentStaffAsync(ct);
        var staffHubId = staff.HubId;

        var booking = await _db.BookingHeaders
            .FirstOrDefaultAsync(b => b.BookingId == request.BookingId, ct)
            ?? throw new ResourceNotFoundException("Booking not found");

        if (booking.BookingStatus != BookingStatus.CONFIRMED)
            throw new BusinessException("Only confirmed bookings can be returned");

        if (booking.AssignedCarId is null)
            throw new BusinessException("No vehicle is assigned to this booking");

        var car = await _db.Cars.Include(c => c.Hub)
            .FirstOrDefaultAsync(c => c.CarId == booking.AssignedCarId, ct)
            ?? throw new ResourceNotFoundException("Assigned vehicle not found");

        if (car.Status != CarStatus.RENTED)
            throw new BusinessException("Vehicle is not currently rented");

        var invoice = await _db.InvoiceHeaders
            .FirstOrDefaultAsync(i => i.BookingId == booking.BookingId, ct)
            ?? throw new ResourceNotFoundException("Invoice not found");

        // ── The drop-off location follows the return ──────────────────
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
        var returnHub = await _db.Hubs.FirstOrDefaultAsync(h => h.HubId == staffHubId, ct)
            ?? throw new ResourceNotFoundException(
                "Your hub could not be found, so the return cannot be recorded.");

        if (booking.DropoffHubId != returnHub.HubId)
        {
            _logger.LogInformation(
                "Booking {BookingId} returned to {Actual} instead of the booked {Booked} - "
                + "drop-off location updated on the booking and the invoice",
                booking.BookingId, returnHub.HubName, booking.DropoffHubName);

            booking.DropoffHubId = returnHub.HubId;
            booking.DropoffHubName = returnHub.HubName;
        }

        // Set unconditionally rather than inside the branch above: an invoice
        // written before this change existed could have been snapshotted with
        // a drop-off hub that no longer matches its own booking, and this is
        // the moment we know the right answer.
        invoice.DropoffHubId = returnHub.HubId;
        invoice.DropoffHubName = returnHub.HubName;

        // ── The actual return date ────────────────────────────────────
        var plannedEndDate = booking.EndDate;
        var actualEndDate = DateOnly.FromDateTime(DateTime.Today);

        booking.EndDate = actualEndDate;
        booking.FuelLevelIn = request.FuelLevelIn;
        booking.BookingStatus = BookingStatus.COMPLETED;

        // ── Fuel, calculated not typed ────────────────────────────────
        //
        // Charged in proportion to what is missing from the tank. The staff
        // member records what they SEE - the two fuel levels - and the amount
        // follows. A typed figure is a second source of truth for something
        // the first already implies.
        var fuelCharges = _pricing.FuelCharge(booking.FuelLevelOut, request.FuelLevelIn);
        booking.FuelCharges = fuelCharges;

        // ── Re-price for the ACTUAL rental period ─────────────────────
        //
        // Billed HAND-OVER date to END date, not start to end. The start date
        // is what the customer planned; the hand-over date is when they
        // actually drove away. Someone who books for Monday and collects on
        // Wednesday should not pay for the two days the car sat waiting.
        var originalDuration = booking.Duration;
        var billingStart = _pricing.BillingStartDate(booking.HandoverDate, booking.StartDate);
        var actualDuration = _pricing.DurationInDays(billingStart, actualEndDate);

        var previousTotal = booking.GrandTotal;

        var bookingDetails = await _db.BookingDetails
            .Where(d => d.BookingId == booking.BookingId).ToListAsync(ct);

        var invoiceDetails = await _db.InvoiceDetails
            .Where(d => d.InvoiceId == invoice.InvoiceId).ToListAsync(ct);

        var addonAmount = 0m;

        foreach (var detail in bookingDetails)
        {
            var repriced = _pricing.RepriceAddonLine(
                detail.AddonPrice, originalDuration, actualDuration);

            detail.AddonPrice = repriced;
            addonAmount += repriced;

            // Keep the matching invoice line in step, or the add-on rows
            // printed on the invoice will not add up to the subtotal beneath.
            foreach (var line in invoiceDetails
                .Where(l => l.BookingDetailId == detail.BookingDetailId))
            {
                line.AddonPrice = repriced;
            }
        }

        var vehicleAmount = _pricing.VehicleAmount(
            booking.DailyRate, booking.WeeklyRate, booking.MonthlyRate, actualDuration);

        var taxAmount = _pricing.TaxAmount(vehicleAmount, addonAmount);
        var grandTotal = _pricing.GrandTotal(vehicleAmount, addonAmount, taxAmount);

        booking.Duration = actualDuration;
        booking.VehicleAmount = vehicleAmount;
        booking.AddonAmount = addonAmount;
        booking.TaxAmount = taxAmount;
        booking.GrandTotal = grandTotal;

        if (previousTotal != grandTotal)
        {
            _logger.LogInformation(
                "Booking {BookingId} re-priced on return: billed {From} -> {To} "
                + "(hand-over to return), planned end was {Planned}, "
                + "{OldDays} day(s) -> {NewDays} day(s), total {OldTotal} -> {NewTotal}",
                booking.BookingId, billingStart, actualEndDate, plannedEndDate,
                originalDuration, actualDuration, previousTotal, grandTotal);
        }

        // ── Finalise the invoice ──────────────────────────────────────
        var now = DateTime.Now;

        invoice.EndDate = actualEndDate;
        invoice.Duration = actualDuration;
        invoice.VehicleAmount = vehicleAmount;
        invoice.AddonAmount = addonAmount;
        invoice.TaxAmount = taxAmount;
        invoice.GrandTotal = grandTotal;
        invoice.FuelLevelIn = request.FuelLevelIn;
        invoice.FuelCharges = fuelCharges;
        invoice.ReturnDate = now;
        invoice.InvoiceDate = now;

        // Numbered once, so a corrected return never renumbers it.
        invoice.InvoiceNo ??= $"INV-{now:yyyy}-{invoice.InvoiceId:D6}";

        // ── The car moves to the hub that received it ─────────────────
        //
        // Without this a one-way rental would leave the vehicle listed at its
        // original hub and it could never be hired out again.
        car.Status = CarStatus.AVAILABLE;

        if (car.HubId != staffHubId)
        {
            _logger.LogInformation(
                "Vehicle {Registration} moved from hub {From} to hub {To} on return of booking {BookingId}",
                car.RegistrationNo, car.HubId, staffHubId, booking.BookingId);

            // Same hub the booking and invoice were just pointed at above.
            // Resolved once, so the vehicle, the booking and the invoice
            // cannot end up disagreeing about where the car is.
            car.HubId = returnHub.HubId;
        }

        await _db.SaveChangesAsync(ct);

        // ── The invoice e-mail ────────────────────────────────────────
        //
        // Sent from this process now. It used to be delegated to Java, which
        // silently did nothing: Java sends the invoice from inside its OWN
        // returnVehicle and publishes no endpoint for it, so a return
        // processed here produced no e-mail at all.
        //
        // Loaded AFTER SaveChanges so the e-mail carries the re-priced
        // figures and the corrected drop-off hub, not the pre-return ones.
        //
        // Wrapped because building the DTO reads the database, and a failure
        // there must not undo a return that is already committed. The queue
        // itself cannot throw - see EmailService.
        try
        {
            var invoiceForEmail = await _invoices.LoadForBookingAsync(booking.BookingId, ct);

            // The PDF still comes from the Java renderer, which requires a
            // token. The staff member who just processed this return is the
            // one on whose behalf it is fetched.
            var pdfToken = _tokens.CreateStaffToken(staff.Id, staff.Email, staff.HubId);

            _email.QueueInvoice(invoiceForEmail, pdfToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Could not prepare the invoice e-mail for booking {BookingId}; "
                + "the return itself completed normally", booking.BookingId);
        }

        _logger.LogInformation(
            "Booking {BookingId} completed, invoice {InvoiceNo}, final {Final}",
            booking.BookingId, invoice.InvoiceNo, grandTotal + fuelCharges);

        return "Booking completed and invoice generated.";
    }
}
