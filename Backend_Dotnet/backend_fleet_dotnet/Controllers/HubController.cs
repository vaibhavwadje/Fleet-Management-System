using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.DTO;
using FleetManagement.DTO.Responses;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Domain;

namespace FleetManagement.Controllers;

[ApiController]
[Route("api/hubs")]
[AllowAnonymous]
public class HubController : ControllerBase
{
    private readonly HubService _service;
    public HubController(HubService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<HubResponse>>>> GetAll(
        [FromQuery] int stateId, [FromQuery] int cityId, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<HubResponse>>.Ok(
            await _service.GetByStateAndCityAsync(stateId, cityId, ct),
            "Hubs fetched successfully."));

    /// <summary>Every hub, for the staff location picker.</summary>
    [HttpGet("all")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<HubResponse>>>> GetEvery(
        CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<HubResponse>>.Ok(
            await _service.GetEveryHubAsync(ct), "Hubs fetched successfully."));

    // Declared AFTER /all, so the literal segment wins over the parameter.
    [HttpGet("{hubId:int}")]
    public async Task<ActionResult<ApiResponse<HubResponse>>> GetById(
        int hubId, CancellationToken ct)
        => Ok(ApiResponse<HubResponse>.Ok(
            await _service.GetByIdWithNamesAsync(hubId, ct), "Hub fetched successfully."));
}
