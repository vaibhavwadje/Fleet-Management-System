using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.DTO;
using FleetManagement.DTO.Responses;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Domain;

namespace FleetManagement.Controllers;

[ApiController]
[Route("api/addons")]
[AllowAnonymous]
public class AddonController : ControllerBase
{
    private readonly AddonService _service;
    public AddonController(AddonService service) => _service = service;

    [HttpGet("{hubId:int}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AddonResponse>>>> GetByHub(
        int hubId, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<AddonResponse>>.Ok(
            await _service.GetByHubAsync(hubId, ct), "Add-ons fetched successfully"));
}
