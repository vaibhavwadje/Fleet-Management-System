using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.DTO;
using FleetManagement.DTO.Requests;
using FleetManagement.DTO.Responses;
using FleetManagement.Integration;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Domain;

namespace FleetManagement.Controllers;

[ApiController]
[Route("api/staff/invoices")]
[Authorize(Roles = "ROLE_STAFF")]
public class StaffInvoiceController : ControllerBase
{
    private readonly InvoiceService _service;
    private readonly JavaMicroserviceClient _java;

    public StaffInvoiceController(InvoiceService service, JavaMicroserviceClient java)
    {
        _service = service;
        _java = java;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<InvoicePageResponse>>> GetAll(
        [FromQuery] int page = 0, [FromQuery] int size = 10,
        [FromQuery] string? search = null, CancellationToken ct = default)
        => Ok(ApiResponse<InvoicePageResponse>.Ok(
            await _service.GetStaffInvoicesAsync(page, size, search, ct),
            "Invoices fetched successfully"));

    [HttpGet("{invoiceId:long}")]
    public async Task<ActionResult<ApiResponse<InvoiceResponse>>> GetOne(
        long invoiceId, CancellationToken ct)
        => Ok(ApiResponse<InvoiceResponse>.Ok(
            await _service.GetStaffInvoiceAsync(invoiceId, ct), "Invoice fetched successfully"));

    [HttpGet("{invoiceId:long}/download")]
    public async Task<IActionResult> Download(long invoiceId, CancellationToken ct)
    {
        var invoice = await _service.GetStaffInvoiceAsync(invoiceId, ct);

        var token = Request.Headers.Authorization.ToString()
            .Replace("Bearer ", string.Empty, StringComparison.OrdinalIgnoreCase);

        var pdf = await _java.DownloadInvoicePdfAsync(invoice.BookingId, token, ct);

        return File(pdf, "application/pdf",
            $"Invoice-{invoice.InvoiceNo ?? invoiceId.ToString()}.pdf");
    }
}
