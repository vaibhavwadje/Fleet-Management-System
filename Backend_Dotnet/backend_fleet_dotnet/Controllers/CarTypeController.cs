using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.DTO;
using FleetManagement.DTO.Responses;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Domain;

namespace FleetManagement.Controllers;

[ApiController]
[Route("api/car-types")]
[AllowAnonymous]
public class CarTypeController : ControllerBase
{
    private readonly CarTypeService _service;
    private readonly CarService _cars;

    public CarTypeController(CarTypeService service, CarService cars)
    {
        _service = service;
        _cars = cars;
    }

    /// <summary>Declared before {hubId} so "status" is not read as an id.</summary>
    [HttpGet("status/count")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CarStatusCountResponse>>>> StatusCount(
        CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<CarStatusCountResponse>>.Ok(
            await _cars.StatusCountsAsync(ct), "Counts fetched successfully"));

    [HttpGet("{hubId:int}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CarTypeResponse>>>> GetByHub(
        int hubId, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<CarTypeResponse>>.Ok(
            await _service.GetByHubAsync(hubId, ct), "Car types fetched successfully"));
}
