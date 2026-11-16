using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.DTO;
using FleetManagement.DTO.Requests;
using FleetManagement.DTO.Responses;
using FleetManagement.Integration;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Domain;

namespace FleetManagement.Controllers;

/// <summary>Excel rate-card upload, delegated to the Java Apache POI importer.</summary>
[ApiController]
[Route("api/staff/excel")]
[Authorize(Roles = "ROLE_STAFF")]
public class ExcelUploadController : ControllerBase
{
    private readonly JavaMicroserviceClient _java;
    public ExcelUploadController(JavaMicroserviceClient java) => _java = java;

    [HttpPost("car-types")]
    public async Task<ActionResult<ApiResponse<string>>> Upload(
        IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(ApiResponse<string>.Fail("Please choose a file to upload."));
        }

        // Same 2 MB cap the Java service enforces, rejected here so a large
        // file is not streamed across only to be refused.
        if (file.Length > 2 * 1024 * 1024)
        {
            return BadRequest(ApiResponse<string>.Fail("The file must be 2 MB or smaller."));
        }

        var token = Request.Headers.Authorization.ToString()
            .Replace("Bearer ", string.Empty, StringComparison.OrdinalIgnoreCase);

        await using var stream = file.OpenReadStream();
        var result = await _java.UploadRateSheetAsync(stream, file.FileName, token, ct);

        return Ok(ApiResponse<string>.Ok(result, "Upload processed"));
    }

    /// <summary>
    /// The blank rate-card workbook. Streamed straight through from Java,
    /// which builds it with Apache POI.
    /// </summary>
    [HttpGet("car-types/template")]
    public async Task<IActionResult> Template(CancellationToken ct)
    {
        var token = Request.Headers.Authorization.ToString()
            .Replace("Bearer ", string.Empty, StringComparison.OrdinalIgnoreCase);

        var bytes = await _java.DownloadTemplateAsync(token, ct);

        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "vehicle-rate-upload-template.xlsx");
    }
}
