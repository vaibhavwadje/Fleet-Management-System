using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FleetManagement.Data;
using FleetManagement.DTO.Responses;
using FleetManagement.Middleware;
using FleetManagement.Models;

namespace FleetManagement.Service.Domain;

/// <summary>
/// Invoices, for customers and for staff.
///
/// SCOPING
/// -------
/// The staff LIST is hub-scoped, which is what makes the Invoices tab a
/// staff member's own work. Looking one up BY ID is the deliberate way out of
/// that scope: a customer rings quoting an invoice number and whoever answers
/// has to be able to open it. Reading an invoice changes no data.
/// </summary>
public class InvoiceService
{
    private readonly FleetDbContext _db;
    private readonly IMapper _mapper;
    private readonly ILogger<InvoiceService> _logger;
    private readonly StaffService _staff;
    private readonly CustomerService _customers;

    public InvoiceService(
        FleetDbContext db,
        IMapper mapper,
        ILogger<InvoiceService> logger,
        StaffService staff,
        CustomerService customers)
    {
        _db = db;
        _mapper = mapper;
        _logger = logger;
        _staff = staff;
        _customers = customers;
    }

    /// <summary>Adds the add-on lines and the car type name to a mapped invoice.</summary>
    private async Task<InvoiceResponse> DecorateAsync(
        InvoiceHeader invoice, CancellationToken ct)
    {
        var dto = _mapper.Map<InvoiceResponse>(invoice);

        if (invoice.CarTypeId is { } carTypeId)
        {
            dto.CarTypeName = (await _db.CarTypes.AsNoTracking()
                .FirstOrDefaultAsync(t => t.CarTypeId == (int)carTypeId, ct))?.CarTypeName;
        }

        var details = await _db.InvoiceDetails.AsNoTracking()
            .Where(d => d.InvoiceId == invoice.InvoiceId)
            .ToListAsync(ct);

        dto.Addons = _mapper.Map<List<InvoiceAddonResponse>>(details);

        return dto;
    }

    /// <summary>The customer's own invoice for a booking. Ownership checked.</summary>
    public async Task<InvoiceResponse> GetForBookingAsync(
        long bookingId, CancellationToken ct = default)
    {
        var customer = await _customers.RequireCurrentCustomerAsync(ct);

        var invoice = await _db.InvoiceHeaders.AsNoTracking()
            .FirstOrDefaultAsync(i => i.BookingId == bookingId, ct)
            ?? throw new ResourceNotFoundException("Invoice not found");

        if (invoice.CustomerId != customer.CustomerId)
        {
            throw new UnauthorizedActionException("This invoice belongs to another customer");
        }

        return await DecorateAsync(invoice, ct);
    }

    /// <summary>Used internally - no ownership check.</summary>
    public async Task<InvoiceResponse> LoadForBookingAsync(
        long bookingId, CancellationToken ct = default)
    {
        var invoice = await _db.InvoiceHeaders.AsNoTracking()
            .FirstOrDefaultAsync(i => i.BookingId == bookingId, ct)
            ?? throw new ResourceNotFoundException("Invoice not found");

        return await DecorateAsync(invoice, ct);
    }

    /// <summary>
    /// The staff list, scoped to the caller's hub and searchable.
    /// Either end of the rental may see it - the hub that handed the car over
    /// and the hub that took it back both have a legitimate interest.
    /// </summary>
    public async Task<InvoicePageResponse> GetStaffInvoicesAsync(
        int page, int size, string? search, CancellationToken ct = default)
    {
        var staff = await _staff.RequireCurrentStaffAsync(ct);
        var hubId = staff.HubId;

        if (page < 0) page = 0;
        if (size <= 0) size = 10;
        if (size > 100) size = 100;

        var query = _db.InvoiceHeaders.AsNoTracking()
            .Where(i => i.PickupHubId == hubId || i.DropoffHubId == hubId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(i =>
                (i.InvoiceNo != null && i.InvoiceNo.Contains(s))
                || (i.Email != null && i.Email.Contains(s))
                || (i.FirstName != null && i.FirstName.Contains(s))
                || (i.LastName != null && i.LastName.Contains(s))
                || (i.RegistrationNo != null && i.RegistrationNo.Contains(s)));
        }

        var total = await query.LongCountAsync(ct);

        var rows = await query
            .OrderByDescending(i => i.InvoiceDate)
            .Skip(page * size).Take(size)
            .ToListAsync(ct);

        var invoices = new List<InvoiceResponse>(rows.Count);
        foreach (var row in rows) invoices.Add(await DecorateAsync(row, ct));

        var totalPages = size == 0 ? 0 : (int)Math.Ceiling(total / (double)size);

        return new InvoicePageResponse
        {
            Invoices = invoices,
            CurrentPage = page,
            PageSize = size,
            TotalElements = total,
            TotalPages = totalPages,
            First = page == 0,
            Last = page >= totalPages - 1,
        };
    }

    /// <summary>
    /// One invoice by id, from ANY hub.
    ///
    /// Authenticated staff only, but no hub filter - see the class note.
    /// </summary>
    public async Task<InvoiceResponse> GetStaffInvoiceAsync(
        long invoiceId, CancellationToken ct = default)
    {
        await _staff.RequireCurrentStaffAsync(ct);

        var invoice = await _db.InvoiceHeaders.AsNoTracking()
            .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId, ct)
            ?? throw new ResourceNotFoundException("Invoice not found");

        return await DecorateAsync(invoice, ct);
    }
}
