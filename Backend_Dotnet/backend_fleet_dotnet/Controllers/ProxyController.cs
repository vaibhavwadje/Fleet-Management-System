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
/// REQUIREMENT 11 - the Java microservice call, exposed directly so it can be
/// demonstrated on its own as well as used inside the invoice and Excel paths.
/// </summary>
[ApiController]
[Route("api/proxy")]
public class ProxyController : ControllerBase
{
    private readonly JavaMicroserviceClient _java;
    private readonly ILogger<ProxyController> _logger;

    public ProxyController(JavaMicroserviceClient java, ILogger<ProxyController> logger)
    {
        _java = java;
        _logger = logger;
    }

    /// <summary>Is the Java service up? GET {javaBaseUrl}/health.</summary>
    [HttpGet("health")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<string>>> Health(CancellationToken ct)
    {
        var data = await _java.GetHealthAsync(ct);
        return Ok(ApiResponse<string>.Ok(data, "Java microservice reached"));
    }

    /// <summary>
    /// Forwards any GET to the Java service, passing the caller's own token
    /// through - both backends sign with the same secret, so it is accepted
    /// on the other side.
    /// </summary>
    [HttpGet("forward")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<string>>> Forward(
        [FromQuery] string path, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(path) || !path.StartsWith('/'))
        {
            return BadRequest(ApiResponse<string>.Fail(
                "path must be supplied and start with '/', e.g. /api/states"));
        }

        _logger.LogInformation("Forwarding {Path} to the Java microservice", path);

        var token = Request.Headers.Authorization.ToString()
            .Replace("Bearer ", string.Empty, StringComparison.OrdinalIgnoreCase);

        var data = await _java.GetRawAsync(path, token, ct);

        return Ok(ApiResponse<string>.Ok(data, "Forwarded successfully"));
    }
}
