using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FleetManagement.Data;
using FleetManagement.DTO.Requests;
using FleetManagement.DTO.Responses;
using FleetManagement.Middleware;
using FleetManagement.Models;
using FleetManagement.Models.Enums;
using FleetManagement.Repository;
using FleetManagement.Service.Email;
using FleetManagement.Service.Pricing;

namespace FleetManagement.Service.Domain;

/// <summary>
/// The booking module: create, view, modify, cancel, and the staff views over
/// the same data.
///
/// Ported from the Java BookingServiceImpl, including the rules that were
/// arrived at the hard way and are commented at the point they apply.
/// </summary>
public class BookingService : GenericService<BookingHeader, BookingResponse>
{
    private readonly FleetDbContext _db;
    private readonly RentalPricingCalculator _pricing;
    private readonly CustomerService _customers;
    private readonly StaffService _staff;
    private readonly IEmailService _email;

    public BookingService(
        IGenericRepository<BookingHeader> repo,
        IMapper mapper,
        ILogger<GenericService<BookingHeader, BookingResponse>> logger,
        FleetDbContext db,
        RentalPricingCalculator pricing,
        CustomerService customers,
        StaffService staff,
        IEmailService email)
        : base(repo, mapper, logger)
    {
        _db = db;
        _pricing = pricing;
        _customers = customers;
        _staff = staff;
        _email = email;
    }

    // ═════════════════════════════════════════════════════════════════════
    //  PRICING - one implementation, used by every path that creates or
    //  changes a booking.
    //
    //  The amounts on the request are accepted and IGNORED. Two of the four
    //  creation paths in the Java version originally believed whatever the
    //  browser sent, which meant the same rental could be worth one figure
    //  when created and another when edited.
    // ═════════════════════════════════════════════════════════════════════

    private async Task<int> ApplyPricingAsync(
        BookingHeader booking, BookingRequest request, CancellationToken ct)
    {
        var carType = await _db.CarTypes.FirstOrDefaultAsync(
                t => t.CarTypeId == (int)request.CarTypeId, ct)
            ?? throw new ResourceNotFoundException(
                "The selected vehicle type is no longer available");

        var daily = (decimal)(carType.DailyRate ?? 0);
        var weekly = (decimal)(carType.WeeklyRate ?? 0);
        var monthly = (decimal)(carType.MonthlyRate ?? 0);

        // Duration comes from the dates, not the request. The two disagreeing
        // is exactly how a five-day price ends up on a two-day booking.
        var duration = _pricing.DurationInDays(request.StartDate, request.EndDate);

        var addonAmount = await CalculateAddonAmountAsync(request.Addons, duration, ct);
        var vehicleAmount = _pricing.VehicleAmount(daily, weekly, monthly, duration);
        var taxAmount = _pricing.TaxAmount(vehicleAmount, addonAmount);

        booking.DailyRate = daily;
        booking.WeeklyRate = weekly;
        booking.MonthlyRate = monthly;
        booking.Duration = duration;
        booking.VehicleAmount = vehicleAmount;
        booking.AddonAmount = addonAmount;
        booking.TaxAmount = taxAmount;
        booking.GrandTotal = _pricing.GrandTotal(vehicleAmount, addonAmount, taxAmount);

        return duration;
    }

    /// <summary>Totals add-ons at the price held in the database, never the browser's.</summary>
    private async Task<decimal> CalculateAddonAmountAsync(
        List<AddonRequest>? addons, int days, CancellationToken ct)
    {
        if (addons is null || addons.Count == 0) return 0m;

        var total = 0m;

        foreach (var requested in addons.Where(a => a.AddonId.HasValue))
        {
            var addon = await _db.Addons.FirstOrDefaultAsync(
                    a => a.AddonId == (int)requested.AddonId!.Value, ct)
                ?? throw new ResourceNotFoundException(
                    $"Add-on no longer available: {requested.AddonName}");

            total += (decimal)addon.PricePerDay * days;
        }

        return decimal.Round(total, 2, MidpointRounding.AwayFromZero);
    }

    /// <summary>
    /// Writes the add-on lines, priced from the database.
    ///
    /// The line prices must come from the same place as the subtotal, or the
    /// rows printed on the invoice will not add up to the total printed
    /// beneath them.
    /// </summary>
    private async Task SaveAddonLinesAsync(
        long bookingId, List<AddonRequest>? addons, int duration,
        BookingSource source, CancellationToken ct)
    {
        if (addons is null || addons.Count == 0) return;

        foreach (var requested in addons.Where(a => a.AddonId.HasValue))
        {
            var addon = await _db.Addons.FirstOrDefaultAsync(
                    a => a.AddonId == (int)requested.AddonId!.Value, ct)
                ?? throw new ResourceNotFoundException(
                    $"Add-on no longer available: {requested.AddonName}");

            _db.BookingDetails.Add(new BookingDetail
            {
                BookingId = bookingId,
                AddonId = requested.AddonId,
                AddonName = addon.AddonName,
                AddonPrice = decimal.Round(
                    (decimal)addon.PricePerDay * duration, 2, MidpointRounding.AwayFromZero),
                BookingSource = source,
            });
        }

        await _db.SaveChangesAsync(ct);
    }

    /// <summary>Dates a booking must satisfy, whether created or modified.</summary>
    private static void ValidateBookingDates(DateOnly start, DateOnly end)
    {
        if (start < DateOnly.FromDateTime(DateTime.Today))
        {
            throw new BusinessException("The pick-up date cannot be in the past");
        }
        if (end <= start)
        {
            throw new BusinessException("The return date must be after the pick-up date");
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    //  CREATE
    // ═════════════════════════════════════════════════════════════════════

    public async Task<BookingResponse> CreateAsync(
        BookingRequest request, CancellationToken ct = default)
    {
        var customer = await _customers.RequireCurrentCustomerAsync(ct);

        ValidateBookingDates(request.StartDate, request.EndDate);

        // Licence, passport and address given on the booking form are saved
        // onto the profile, so the snapshot below - and therefore the invoice -
        // has a real address. A blank value is ignored, never written: writing
        // it would wipe a good address every time a form posted an empty field.
        await SaveProfileDetailsAsync(customer, request, ct);

        var booking = new BookingHeader
        {
            Date = DateTime.Now,
            CustomerId = customer.CustomerId,
            FirstName = customer.FirstName,
            LastName = customer.LastName,
            Email = customer.Email,
            Phone = customer.Phone,
            DrivingLicenseNo = customer.DrivingLicenseNo,
            PassportNo = customer.PassportNo,
            AddressLine1 = customer.AddressLine1,
            AddressLine2 = customer.AddressLine2,
            DateOfBirth = customer.DateOfBirth,
            Gender = customer.Gender,
            Nationality = customer.Nationality,
            CityId = customer.CityId,
            StateId = customer.StateId,
            Pincode = customer.Pincode,

            CarId = request.CarId,
            CarTypeId = request.CarTypeId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            PickupHubId = request.PickupHubId,
            PickupHubName = request.PickupHubName,
            DropoffHubId = request.DropoffHubId,
            DropoffHubName = request.DropoffHubName,
            BookingStatus = BookingStatus.PENDING,
        };

        var duration = await ApplyPricingAsync(booking, request, ct);

        _db.BookingHeaders.Add(booking);
        await _db.SaveChangesAsync(ct);

        await SaveAddonLinesAsync(
            booking.BookingId, request.Addons, duration, BookingSource.ONLINE, ct);

        Logger.LogInformation(
            "Booking {BookingId} created for {Email}, total {Total}",
            booking.BookingId, customer.Email, booking.GrandTotal);

        // Mapped FIRST, then e-mailed, so the message carries the saved
        // figures rather than the ones that arrived on the request - the
        // server re-prices, and the customer should see what they will be
        // charged, not what their browser guessed.
        var created = await MapWithExtrasAsync(booking, ct);
        _email.QueueBookingConfirmation(created);
        return created;

        return await MapWithExtrasAsync(booking, ct);
    }

    public async Task<BookingResponse> CreateGuestAsync(
        GuestBookingRequest request, CancellationToken ct = default)
    {
        var inner = request.Booking;
        ValidateBookingDates(inner.StartDate, inner.EndDate);

        var booking = new BookingHeader
        {
            Date = DateTime.Now,
            CustomerId = null,                       // a guest has no account
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Phone = request.Phone,
            DrivingLicenseNo = request.DrivingLicenseNo,
            PassportNo = request.PassportNo,
            AddressLine1 = request.AddressLine1,
            AddressLine2 = request.AddressLine2,
            CityId = request.CityId,
            StateId = request.StateId,
            Pincode = request.Pincode,

            CarId = inner.CarId,
            CarTypeId = inner.CarTypeId,
            StartDate = inner.StartDate,
            EndDate = inner.EndDate,
            PickupHubId = inner.PickupHubId,
            PickupHubName = inner.PickupHubName,
            DropoffHubId = inner.DropoffHubId,
            DropoffHubName = inner.DropoffHubName,
            BookingStatus = BookingStatus.PENDING,
        };

        var duration = await ApplyPricingAsync(booking, inner, ct);

        _db.BookingHeaders.Add(booking);
        await _db.SaveChangesAsync(ct);

        await SaveAddonLinesAsync(
            booking.BookingId, inner.Addons, duration, BookingSource.ONLINE, ct);

        Logger.LogInformation("Guest booking {BookingId} created", booking.BookingId);

        var guestBooking = await MapWithExtrasAsync(booking, ct);
        _email.QueueBookingConfirmation(guestBooking);
        return guestBooking;
    }

    /// <summary>
    /// A booking taken by staff at the counter, for a walk-in customer.
    ///
    /// The pick-up date, time and hub are set HERE, from the server clock and
    /// the signed-in staff member's hub. The screen shows them as read-only
    /// fields, but a read-only input is a courtesy, not a control - there is
    /// no value the caller could post that would win.
    ///
    /// The DROP-OFF hub is the one thing staff choose: the car is physically
    /// here so it can only leave from here, but it may be returned anywhere.
    /// </summary>
    public async Task<BookingResponse> CreateStaffBookingAsync(
        StaffBookingRequest request, CancellationToken ct = default)
    {
        var staff = await _staff.RequireCurrentStaffAsync(ct);
        var hubId = staff.HubId;
        var hubName = staff.Hub!.HubName;

        var inner = request.Booking;
        var today = DateOnly.FromDateTime(DateTime.Today);

        inner.StartDate = today;
        inner.PickupHubId = hubId;
        inner.PickupHubName = hubName;

        if (inner.DropoffHubId == 0 || inner.DropoffHubId == hubId)
        {
            inner.DropoffHubId = hubId;
            inner.DropoffHubName = hubName;
        }
        else
        {
            // Resolved from the database rather than trusting the name the
            // browser sent, so the booking cannot end up labelled with one
            // hub's name against another hub's id.
            var dropoff = await _db.Hubs.FirstOrDefaultAsync(h => h.HubId == inner.DropoffHubId, ct)
                ?? throw new ResourceNotFoundException(
                    "The selected return location no longer exists");

            inner.DropoffHubName = dropoff.HubName;
        }

        if (inner.EndDate <= today)
        {
            throw new BusinessException("The return date must be at least one day after today");
        }

        var carType = await _db.CarTypes.FirstOrDefaultAsync(
                t => t.CarTypeId == (int)inner.CarTypeId, ct)
            ?? throw new ResourceNotFoundException(
                "The selected vehicle type is no longer available");

        if (carType.HubId != hubId)
        {
            throw new BusinessException("That vehicle category is not offered at your hub");
        }

        var booking = new BookingHeader
        {
            Date = DateTime.Now,
            CustomerId = null,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Phone = request.Phone,
            DrivingLicenseNo = request.DrivingLicenseNo,
            PassportNo = request.PassportNo,
            AddressLine1 = request.AddressLine1,
            AddressLine2 = request.AddressLine2,
            CityId = request.CityId,
            StateId = request.StateId,
            Pincode = request.Pincode,

            CarTypeId = inner.CarTypeId,
            StartDate = today,
            EndDate = inner.EndDate,
            PickupHubId = hubId,
            PickupHubName = hubName,
            DropoffHubId = inner.DropoffHubId,
            DropoffHubName = inner.DropoffHubName,
            BookingStatus = BookingStatus.PENDING,
        };

        var duration = await ApplyPricingAsync(booking, inner, ct);

        _db.BookingHeaders.Add(booking);
        await _db.SaveChangesAsync(ct);

        // BookingSource.STAFF is what distinguishes this from an online
        // booking in the data.
        await SaveAddonLinesAsync(
            booking.BookingId, inner.Addons, duration, BookingSource.STAFF, ct);

        Logger.LogInformation(
            "On-spot booking {BookingId} created at hub {HubId}", booking.BookingId, hubId);

        // The walk-in customer gets the same confirmation as anyone booking
        // online. Standing at a counter is not a reason to be told less.
        var onSpot = await MapWithExtrasAsync(booking, ct);
        _email.QueueBookingConfirmation(onSpot);
        return onSpot;

        return await MapWithExtrasAsync(booking, ct);
    }

    private async Task SaveProfileDetailsAsync(
        Customer customer, BookingRequest request, CancellationToken ct)
    {
        var changed = false;

        void Set(string? incoming, Func<string?> current, Action<string> assign)
        {
            if (!string.IsNullOrWhiteSpace(incoming) && incoming.Trim() != current())
            {
                assign(incoming.Trim());
                changed = true;
            }
        }

        Set(request.DrivingLicenseNo, () => customer.DrivingLicenseNo,
            v => customer.DrivingLicenseNo = v);
        Set(request.PassportNo, () => customer.PassportNo, v => customer.PassportNo = v);
        Set(request.AddressLine1, () => customer.AddressLine1, v => customer.AddressLine1 = v);
        Set(request.AddressLine2, () => customer.AddressLine2, v => customer.AddressLine2 = v);
        Set(request.Pincode, () => customer.Pincode, v => customer.Pincode = v);

        // State and city are real rows, so look them up rather than trusting
        // the id. An id that does not exist is skipped: a bad address must
        // never stop somebody renting a car.
        if (request.StateId is { } stateId && stateId != customer.StateId
            && await _db.States.AnyAsync(s => s.StateId == stateId, ct))
        {
            customer.StateId = stateId;
            changed = true;
        }

        if (request.CityId is { } cityId && cityId != customer.CityId
            && await _db.Cities.AnyAsync(c => c.CityId == cityId, ct))
        {
            customer.CityId = cityId;
            changed = true;
        }

        if (changed) await _db.SaveChangesAsync(ct);
    }

    // ═════════════════════════════════════════════════════════════════════
    //  READ
    // ═════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Fills in the parts a mapping profile cannot: the car type details, the
    /// city and state names, the add-on lines.
    /// </summary>
    private async Task<BookingResponse> MapWithExtrasAsync(
        BookingHeader booking, CancellationToken ct, int? callerHubId = null)
    {
        var dto = Mapper.Map<BookingResponse>(booking);

        if (booking.CarTypeId is { } carTypeId)
        {
            var carType = await _db.CarTypes.AsNoTracking()
                .FirstOrDefaultAsync(t => t.CarTypeId == (int)carTypeId, ct);

            if (carType is not null)
            {
                dto.CarTypeName = carType.CarTypeName;
                dto.CarClass = carType.CarClass.ToString();
                dto.CarTypeImageUrl = carType.ImageUrl;
            }
        }

        if (booking.CityId is { } cid)
        {
            dto.CityName = (await _db.Cities.AsNoTracking()
                .FirstOrDefaultAsync(c => c.CityId == cid, ct))?.CityName;
        }

        if (booking.StateId is { } sid)
        {
            dto.StateName = (await _db.States.AsNoTracking()
                .FirstOrDefaultAsync(s => s.StateId == sid, ct))?.StateName;
        }

        var details = await _db.BookingDetails.AsNoTracking()
            .Where(d => d.BookingId == booking.BookingId)
            .ToListAsync(ct);

        dto.Addons = Mapper.Map<List<BookingAddonResponse>>(details);

        if (callerHubId is { } hubId)
        {
            dto.PickupHub = booking.PickupHubId == hubId;
            dto.DropoffHub = booking.DropoffHubId == hubId;
        }

        return dto;
    }

    public async Task<BookingPageResponse> GetMyBookingsAsync(
        int page, int size, BookingStatus? status, CancellationToken ct = default)
    {
        var customer = await _customers.RequireCurrentCustomerAsync(ct);

        var query = _db.BookingHeaders.AsNoTracking()
            .Where(b => b.CustomerId == customer.CustomerId);

        if (status.HasValue) query = query.Where(b => b.BookingStatus == status.Value);

        return await PageAsync(query.OrderByDescending(b => b.Date), page, size, ct);
    }

    public async Task<BookingResponse> GetMyBookingAsync(
        long bookingId, CancellationToken ct = default)
    {
        var customer = await _customers.RequireCurrentCustomerAsync(ct);

        var booking = await _db.BookingHeaders.AsNoTracking()
            .FirstOrDefaultAsync(b => b.BookingId == bookingId, ct)
            ?? throw new ResourceNotFoundException("Booking not found");

        if (booking.CustomerId != customer.CustomerId)
        {
            throw new UnauthorizedActionException("You are not authorized to access this booking");
        }

        return await MapWithExtrasAsync(booking, ct);
    }

    /// <summary>
    /// The staff lists, HUB-SCOPED BY DEFAULT.
    ///
    /// A staff member's list is their own hub's work queue - a list of every
    /// booking in the country is not one. Reaching outside the hub is what the
    /// booking-ID lookup is for, and that has no hub filter at all.
    ///
    /// Default view = my hub. Search = everywhere. Actions = unrestricted.
    /// </summary>
    public async Task<BookingPageResponse> GetStaffBookingsAsync(
        int page, int size, BookingStatus? status, HubScope? scope, CancellationToken ct = default)
    {
        var staff = await _staff.RequireCurrentStaffAsync(ct);
        var hubId = staff.HubId;

        var query = _db.BookingHeaders.AsNoTracking().AsQueryable();

        query = (scope ?? HubScope.ALL) switch
        {
            HubScope.PICKUP => query.Where(b => b.PickupHubId == hubId),
            HubScope.RETURN => query.Where(b => b.DropoffHubId == hubId),
            _ => query.Where(b => b.PickupHubId == hubId || b.DropoffHubId == hubId),
        };

        if (status.HasValue) query = query.Where(b => b.BookingStatus == status.Value);

        return await PageAsync(query.OrderByDescending(b => b.Date), page, size, ct, hubId);
    }

    /// <summary>
    /// One booking by id, from ANY hub, deliberately unrestricted.
    ///
    /// This used to reject any booking whose pick-up hub was not the staff
    /// member's, which broke one-way rentals outright: a booking appeared in
    /// one hub's Return list and then refused to open. Reading is a lookup,
    /// not an action - the hand-over and return operations do their own checks.
    /// </summary>
    public async Task<BookingResponse> GetStaffBookingByIdAsync(
        long bookingId, CancellationToken ct = default)
    {
        var staff = await _staff.RequireCurrentStaffAsync(ct);

        var booking = await _db.BookingHeaders.AsNoTracking()
            .FirstOrDefaultAsync(b => b.BookingId == bookingId, ct)
            ?? throw new ResourceNotFoundException("Booking not found");

        return await MapWithExtrasAsync(booking, ct, staff.HubId);
    }

    private async Task<BookingPageResponse> PageAsync(
        IQueryable<BookingHeader> query, int page, int size,
        CancellationToken ct, int? callerHubId = null)
    {
        if (page < 0) page = 0;
        if (size <= 0) size = 10;
        if (size > 100) size = 100;

        var total = await query.LongCountAsync(ct);

        var rows = await query.Skip(page * size).Take(size).ToListAsync(ct);

        var bookings = new List<BookingResponse>(rows.Count);
        foreach (var row in rows)
        {
            bookings.Add(await MapWithExtrasAsync(row, ct, callerHubId));
        }

        var totalPages = size == 0 ? 0 : (int)Math.Ceiling(total / (double)size);

        return new BookingPageResponse
        {
            Bookings = bookings,
            CurrentPage = page,
            PageSize = size,
            TotalElements = total,
            TotalPages = totalPages,
            First = page == 0,
            Last = page >= totalPages - 1,
        };
    }

    public async Task<BookingStatsResponse> GetStatsAsync(
        bool forStaff, CancellationToken ct = default)
    {
        IQueryable<BookingHeader> query = _db.BookingHeaders.AsNoTracking();

        if (forStaff)
        {
            var staff = await _staff.RequireCurrentStaffAsync(ct);
            var hubId = staff.HubId;

            // PENDING counts against the pick-up hub, CONFIRMED against the
            // drop-off hub - each hub sees the work it will actually do.
            return new BookingStatsResponse
            {
                Total = await query.CountAsync(
                    b => b.PickupHubId == hubId || b.DropoffHubId == hubId, ct),
                TodayBookings = await query.CountAsync(
                    b => (b.PickupHubId == hubId || b.DropoffHubId == hubId)
                         && b.Date.Date == DateTime.Today, ct),
                Pending = await query.CountAsync(
                    b => b.PickupHubId == hubId && b.BookingStatus == BookingStatus.PENDING, ct),
                Confirmed = await query.CountAsync(
                    b => b.DropoffHubId == hubId && b.BookingStatus == BookingStatus.CONFIRMED, ct),
                Cancelled = await query.CountAsync(
                    b => (b.PickupHubId == hubId || b.DropoffHubId == hubId)
                         && b.BookingStatus == BookingStatus.CANCELLED, ct),
                Completed = await query.CountAsync(
                    b => (b.PickupHubId == hubId || b.DropoffHubId == hubId)
                         && b.BookingStatus == BookingStatus.COMPLETED, ct),
            };
        }

        var customer = await _customers.RequireCurrentCustomerAsync(ct);
        query = query.Where(b => b.CustomerId == customer.CustomerId);

        return new BookingStatsResponse
        {
            Total = await query.CountAsync(ct),
            TodayBookings = await query.CountAsync(b => b.Date.Date == DateTime.Today, ct),
            Pending = await query.CountAsync(b => b.BookingStatus == BookingStatus.PENDING, ct),
            Confirmed = await query.CountAsync(b => b.BookingStatus == BookingStatus.CONFIRMED, ct),
            Cancelled = await query.CountAsync(b => b.BookingStatus == BookingStatus.CANCELLED, ct),
            Completed = await query.CountAsync(b => b.BookingStatus == BookingStatus.COMPLETED, ct),
        };
    }

    // ═════════════════════════════════════════════════════════════════════
    //  MODIFY AND CANCEL
    // ═════════════════════════════════════════════════════════════════════

    public async Task<BookingResponse> UpdateAsync(
        long bookingId, UpdateBookingRequest request, CancellationToken ct = default)
    {
        var customer = await _customers.RequireCurrentCustomerAsync(ct);

        var booking = await _db.BookingHeaders
            .FirstOrDefaultAsync(b => b.BookingId == bookingId, ct)
            ?? throw new ResourceNotFoundException("Booking not found");

        if (booking.CustomerId != customer.CustomerId)
        {
            throw new UnauthorizedActionException("You are not authorized to modify this booking");
        }

        if (booking.BookingStatus is BookingStatus.CANCELLED or BookingStatus.COMPLETED)
        {
            throw new BusinessException(
                $"{booking.BookingStatus} booking cannot be modified");
        }

        // ── TWO KINDS OF MODIFICATION ─────────────────────────────────
        //
        // Before hand-over the booking is still a reservation, so everything
        // is negotiable. Once the vehicle is out, most of it has become a
        // statement of fact - you cannot retrospectively change which car you
        // were given or where you collected it. Two things remain open,
        // because they are about the future: when it comes back and where.
        //
        // Everything else on the request is IGNORED rather than rejected in
        // that state, so a stale browser posting the whole booking back gets a
        // sensible outcome instead of an error.

        var handedOver = booking.HandoverDate is not null || booking.AssignedCarId is not null;

        if (handedOver)
        {
            return await UpdateAfterHandoverAsync(booking, request, ct);
        }

        ValidateBookingDates(request.StartDate, request.EndDate);

        booking.CarTypeId = request.CarTypeId;
        booking.StartDate = request.StartDate;
        booking.EndDate = request.EndDate;
        booking.PickupHubId = request.PickupHubId;
        booking.PickupHubName = request.PickupHubName;
        booking.DropoffHubId = request.DropoffHubId;
        booking.DropoffHubName = request.DropoffHubName;

        var pricingRequest = new BookingRequest
        {
            CarTypeId = request.CarTypeId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            PickupHubId = request.PickupHubId,
            DropoffHubId = request.DropoffHubId,
            Addons = request.Addons,
        };

        var duration = await ApplyPricingAsync(booking, pricingRequest, ct);

        // Replace the add-on lines wholesale - the customer may have added or
        // removed some, and reconciling row by row buys nothing here.
        var existing = await _db.BookingDetails.Where(d => d.BookingId == bookingId).ToListAsync(ct);
        _db.BookingDetails.RemoveRange(existing);
        await _db.SaveChangesAsync(ct);

        await SaveAddonLinesAsync(bookingId, request.Addons, duration, BookingSource.ONLINE, ct);
        await _db.SaveChangesAsync(ct);

        Logger.LogInformation("Booking {BookingId} modified, new total {Total}",
            bookingId, booking.GrandTotal);

        var modified = await MapWithExtrasAsync(booking, ct);
        _email.QueueBookingModification(modified);
        return modified;
    }

    /// <summary>
    /// Changes a booking whose vehicle is already on the road. Only the return
    /// date and the drop-off hub are honoured.
    /// </summary>
    private async Task<BookingResponse> UpdateAfterHandoverAsync(
        BookingHeader booking, UpdateBookingRequest request, CancellationToken ct)
    {
        // Billed from the hand-over date, so validated against it too.
        var billingStart = _pricing.BillingStartDate(booking.HandoverDate, booking.StartDate);

        if (request.EndDate <= billingStart)
        {
            throw new BusinessException(
                "The return date must be after the day you collected the vehicle");
        }

        if (request.EndDate < DateOnly.FromDateTime(DateTime.Today))
        {
            throw new BusinessException(
                "The return date cannot be in the past. To return the vehicle today, "
                + "please take it to the return hub.");
        }

        if (request.DropoffHubId != 0 && request.DropoffHubId != booking.DropoffHubId)
        {
            var hub = await _db.Hubs.FirstOrDefaultAsync(h => h.HubId == request.DropoffHubId, ct)
                ?? throw new ResourceNotFoundException(
                    "The selected return location no longer exists");

            Logger.LogInformation("Booking {BookingId} return location changed from {Old} to {New}",
                booking.BookingId, booking.DropoffHubName, hub.HubName);

            booking.DropoffHubId = hub.HubId;
            booking.DropoffHubName = hub.HubName;
        }

        // Re-price for the new period, at the rates the customer booked at.
        var originalDuration = booking.Duration;
        var newDuration = _pricing.DurationInDays(billingStart, request.EndDate);

        var details = await _db.BookingDetails
            .Where(d => d.BookingId == booking.BookingId).ToListAsync(ct);

        var addonAmount = 0m;
        foreach (var detail in details)
        {
            var repriced = _pricing.RepriceAddonLine(
                detail.AddonPrice, originalDuration, newDuration);

            detail.AddonPrice = repriced;
            addonAmount += repriced;
        }

        var vehicleAmount = _pricing.VehicleAmount(
            booking.DailyRate, booking.WeeklyRate, booking.MonthlyRate, newDuration);

        var taxAmount = _pricing.TaxAmount(vehicleAmount, addonAmount);

        booking.EndDate = request.EndDate;
        booking.Duration = newDuration;
        booking.VehicleAmount = vehicleAmount;
        booking.AddonAmount = addonAmount;
        booking.TaxAmount = taxAmount;
        booking.GrandTotal = _pricing.GrandTotal(vehicleAmount, addonAmount, taxAmount);

        await _db.SaveChangesAsync(ct);

        Logger.LogInformation(
            "Booking {BookingId} extended to {EndDate}, {Days} day(s), total {Total}",
            booking.BookingId, request.EndDate, newDuration, booking.GrandTotal);

        // The same "your booking has been updated" e-mail as any other
        // change - the customer has just agreed to a different return date
        // and a different amount, so they need it in writing.
        var extended = await MapWithExtrasAsync(booking, ct);
        _email.QueueBookingModification(extended);
        return extended;
    }

    /// <summary>Staff changing where a booking is collected from or returned to.</summary>
    public async Task<BookingResponse> UpdateLocationsAsync(
        long bookingId, UpdateBookingLocationsRequest request, CancellationToken ct = default)
    {
        // Proves the caller is staff. No hub check: a customer can ask any
        // branch, and the branch they asked should be able to help.
        await _staff.RequireCurrentStaffAsync(ct);

        var booking = await _db.BookingHeaders
            .FirstOrDefaultAsync(b => b.BookingId == bookingId, ct)
            ?? throw new ResourceNotFoundException("Booking not found");

        if (booking.BookingStatus is BookingStatus.CANCELLED or BookingStatus.COMPLETED)
        {
            throw new BusinessException(
                $"This booking is {booking.BookingStatus.ToString().ToLowerInvariant()}, "
                + "so its locations can no longer be changed.");
        }

        var handedOver = booking.HandoverDate is not null;
        var changed = false;

        if (request.PickupHubId is { } newPickup && newPickup != booking.PickupHubId)
        {
            if (handedOver)
            {
                throw new BusinessException(
                    "The vehicle has already been handed over, so the pick-up location "
                    + "cannot be changed. The return location can still be updated.");
            }

            // A vehicle is allocated from one hub's fleet, so moving the
            // pick-up point would strand it there.
            if (booking.AssignedCarId is not null)
            {
                throw new BusinessException(
                    $"A vehicle from {booking.PickupHubName} is already allocated to this "
                    + "booking. Change the pick-up location before a vehicle is assigned.");
            }

            var hub = await _db.Hubs.FirstOrDefaultAsync(h => h.HubId == newPickup, ct)
                ?? throw new ResourceNotFoundException(
                    "The selected pick-up location no longer exists");

            booking.PickupHubId = hub.HubId;
            booking.PickupHubName = hub.HubName;
            changed = true;

            // The car type row moves with the hub.
            //
            // car_type rows are per-hub: every hub has its own "Intermediate
            // Sedan" with its own car_type_id. Leaving the booking pointing at
            // the OLD hub's row means the hand-over screen and the invoice are
            // both reading a rate row that belongs somewhere the customer is
            // no longer going.
            //
            // Re-pointed only, never re-priced - see the note below. If the
            // new hub does not carry the category at all, the pointer stays
            // put and the empty vehicle list is the honest answer rather than
            // something invented here.
            if (booking.CarTypeId is { } currentTypeId)
            {
                var bookedClass = await _db.CarTypes
                    .Where(t => t.CarTypeId == (int)currentTypeId)
                    .Select(t => (CarClass?)t.CarClass)
                    .FirstOrDefaultAsync(ct);

                if (bookedClass is { } wanted)
                {
                    var equivalent = await _db.CarTypes
                        .FirstOrDefaultAsync(
                            t => t.HubId == hub.HubId && t.CarClass == wanted, ct);

                    if (equivalent is not null) booking.CarTypeId = equivalent.CarTypeId;
                }
            }
        }

        if (request.DropoffHubId is { } newDropoff && newDropoff != booking.DropoffHubId)
        {
            var hub = await _db.Hubs.FirstOrDefaultAsync(h => h.HubId == newDropoff, ct)
                ?? throw new ResourceNotFoundException(
                    "The selected return location no longer exists");

            booking.DropoffHubId = hub.HubId;
            booking.DropoffHubName = hub.HubName;
            changed = true;
        }

        if (changed)
        {
            // Amounts are untouched on purpose: same category, same dates,
            // same add-ons - only the geography moved. Rate cards ARE per hub,
            // so the new hub's row may well carry a different daily rate, and
            // that is exactly why nothing is recalculated: the customer was
            // quoted a figure when they booked, and moving the collection
            // point is a convenience we are offering them, not a new contract.
            // The pointer moves, the money does not.
            await _db.SaveChangesAsync(ct);

            Logger.LogInformation("Booking {BookingId} locations updated to {Pickup} -> {Dropoff}",
                bookingId, booking.PickupHubName, booking.DropoffHubName);

            var relocated = await MapWithExtrasAsync(booking, ct);

            // Only when something actually moved. The no-change path above
            // returns early precisely so an idle Save button cannot mail the
            // customer about a change that did not happen.
            _email.QueueBookingModification(relocated);
            return relocated;
        }

        return await MapWithExtrasAsync(booking, ct);
    }

    public async Task<BookingResponse> CancelAsync(long bookingId, CancellationToken ct = default)
    {
        var customer = await _customers.RequireCurrentCustomerAsync(ct);

        var booking = await _db.BookingHeaders
            .FirstOrDefaultAsync(b => b.BookingId == bookingId, ct)
            ?? throw new ResourceNotFoundException("Booking not found");

        if (booking.CustomerId != customer.CustomerId)
        {
            throw new UnauthorizedActionException("You are not authorized to cancel this booking");
        }

        if (booking.BookingStatus == BookingStatus.CANCELLED)
            throw new BusinessException("Booking is already cancelled");

        if (booking.BookingStatus == BookingStatus.COMPLETED)
            throw new BusinessException("Completed booking cannot be cancelled");

        // Once the vehicle is out there is nothing left to cancel - the
        // customer is driving it. Cancelling would leave a car marked RENTED
        // against a CANCELLED booking, which no Return screen would list, so
        // it could never come back into the fleet.
        if (booking.HandoverDate is not null || booking.AssignedCarId is not null)
        {
            throw new BusinessException(
                "This booking cannot be cancelled because the vehicle has already been "
                + "handed over. You can still change the return date or the return "
                + "location, or contact the hub to return the vehicle early.");
        }

        booking.BookingStatus = BookingStatus.CANCELLED;
        await _db.SaveChangesAsync(ct);

        Logger.LogInformation("Booking {BookingId} cancelled", bookingId);

        return await MapWithExtrasAsync(booking, ct);
    }

    /// <summary>Staff setting a booking's status directly.</summary>
    public async Task<BookingResponse> UpdateStatusAsync(
        long bookingId, UpdateBookingStatusRequest request, CancellationToken ct = default)
    {
        await _staff.RequireCurrentStaffAsync(ct);

        if (!Enum.TryParse<BookingStatus>(request.Status, true, out var status))
        {
            throw new BusinessException($"Unknown booking status: {request.Status}");
        }

        var booking = await _db.BookingHeaders
            .FirstOrDefaultAsync(b => b.BookingId == bookingId, ct)
            ?? throw new ResourceNotFoundException("Booking not found");

        booking.BookingStatus = status;
        await _db.SaveChangesAsync(ct);

        Logger.LogInformation("Booking {BookingId} status set to {Status}", bookingId, status);

        return await MapWithExtrasAsync(booking, ct);
    }
}
