using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.DTO;
using FleetManagement.DTO.Responses;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Domain;

namespace FleetManagement.Controllers;

[ApiController]
[Route("api/cities")]
[AllowAnonymous]
public class CityController : ControllerBase
{
    private readonly CityService _service;
    public CityController(CityService service) => _service = service;

    [HttpGet("state/{stateId:int}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CityResponse>>>> GetByState(
        int stateId, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<CityResponse>>.Ok(
            await _service.GetByStateAsync(stateId, ct), "Cities fetched successfully"));
}
