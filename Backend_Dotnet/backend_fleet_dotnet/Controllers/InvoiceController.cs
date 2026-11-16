using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.DTO;
using FleetManagement.DTO.Requests;
using FleetManagement.DTO.Responses;
using FleetManagement.Integration;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Domain;

namespace FleetManagement.Controllers;

/// <summary>
/// Customer invoices. The PDF itself is rendered by the Java service - see
/// JavaMicroserviceClient for why.
/// </summary>
[ApiController]
[Route("api/invoices")]
[Authorize(Roles = "ROLE_CUSTOMER")]
public class InvoiceController : ControllerBase
{
    private readonly InvoiceService _service;
    private readonly JavaMicroserviceClient _java;

    public InvoiceController(InvoiceService service, JavaMicroserviceClient java)
    {
        _service = service;
        _java = java;
    }

    [HttpGet("booking/{bookingId:long}")]
    public async Task<ActionResult<ApiResponse<InvoiceResponse>>> GetForBooking(
        long bookingId, CancellationToken ct)
        => Ok(ApiResponse<InvoiceResponse>.Ok(
            await _service.GetForBookingAsync(bookingId, ct), "Invoice fetched successfully"));

    [HttpGet("booking/{bookingId:long}/download")]
    public async Task<IActionResult> Download(long bookingId, CancellationToken ct)
    {
        // Ownership is checked here before we ask Java for anything.
        await _service.GetForBookingAsync(bookingId, ct);

        var token = Request.Headers.Authorization.ToString()
            .Replace("Bearer ", string.Empty, StringComparison.OrdinalIgnoreCase);

        var pdf = await _java.DownloadInvoicePdfAsync(bookingId, token, ct);

        return File(pdf, "application/pdf", $"Invoice-{bookingId}.pdf");
    }
}
