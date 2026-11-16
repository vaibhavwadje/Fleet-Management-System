using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.DTO;
using FleetManagement.DTO.Responses;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Domain;

namespace FleetManagement.Controllers;

[ApiController]
[Route("api/cars")]
[AllowAnonymous]
public class CarController : ControllerBase
{
    private readonly CarService _service;
    public CarController(CarService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CarResponse>>>> GetAll(
        CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<CarResponse>>.Ok(
            await _service.GetAllWithHubAsync(ct), "Vehicles fetched successfully"));

    [HttpGet("{carId:int}")]
    public async Task<ActionResult<ApiResponse<CarResponse>>> GetById(
        int carId, CancellationToken ct)
        => Ok(ApiResponse<CarResponse>.Ok(
            await _service.GetOneAsync(carId, ct), "Vehicle fetched successfully"));

    [HttpGet("hub/{hubId:int}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CarResponse>>>> GetByHub(
        int hubId, [FromQuery] CarStatus? status, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<CarResponse>>.Ok(
            await _service.GetByHubAsync(hubId, status, ct), "Vehicles fetched successfully"));

    [HttpGet("hub/{hubId:int}/car-type/{carTypeId:int}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CarResponse>>>> GetByHubAndType(
        int hubId, int carTypeId, [FromQuery] CarStatus? status, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<CarResponse>>.Ok(
            await _service.GetByHubAndTypeAsync(hubId, carTypeId, status, ct),
            "Vehicles fetched successfully"));
}
