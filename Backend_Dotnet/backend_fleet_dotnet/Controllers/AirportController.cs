using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.DTO;
using FleetManagement.DTO.Responses;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Domain;

namespace FleetManagement.Controllers;

[ApiController]
[Route("api/airports")]
[AllowAnonymous]
public class AirportController : ControllerBase
{
    private readonly AirportService _service;
    public AirportController(AirportService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AirportResponse>>>> GetAll(
        CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<AirportResponse>>.Ok(
            await _service.GetAllAsync(ct), "Airports fetched successfully"));

    [HttpGet("city/{cityId:int}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AirportResponse>>>> GetByCity(
        int cityId, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<AirportResponse>>.Ok(
            await _service.GetByCityAsync(cityId, ct), "Airports fetched successfully"));

    [HttpGet("search")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AirportResponse>>>> Search(
        [FromQuery] string? keyword, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<AirportResponse>>.Ok(
            await _service.SearchAsync(keyword, ct), "Airports fetched successfully"));

    [HttpGet("{hubId:int}")]
    public async Task<ActionResult<ApiResponse<AirportResponse?>>> GetByHub(
        int hubId, CancellationToken ct)
        => Ok(ApiResponse<AirportResponse?>.Ok(
            await _service.GetByHubAsync(hubId, ct), "Airport fetched successfully"));
}
