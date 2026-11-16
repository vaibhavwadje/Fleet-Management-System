using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.DTO;
using FleetManagement.DTO.Requests;
using FleetManagement.DTO.Responses;
using FleetManagement.Integration;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Domain;

namespace FleetManagement.Controllers;

/// <summary>Staff authentication and staff records.</summary>
[ApiController]
[Route("api/staff")]
public class StaffController : ControllerBase
{
    private readonly StaffService _service;
    public StaffController(StaffService service) => _service = service;

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<StaffLoginResponse>>> Login(
        [FromBody] LoginRequest request, CancellationToken ct)
        => Ok(ApiResponse<StaffLoginResponse>.Ok(
            await _service.LoginAsync(request, ct), "Login successful"));

    [HttpPost("register")]
    [Authorize(Roles = "ROLE_STAFF")]
    public async Task<ActionResult<ApiResponse<StaffResponse>>> Register(
        [FromBody] StaffRegisterRequest request, CancellationToken ct)
        => Ok(ApiResponse<StaffResponse>.Ok(
            await _service.RegisterAsync(request, ct), "Staff registered successfully"));

    [HttpGet]
    [Authorize(Roles = "ROLE_STAFF")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<StaffResponse>>>> GetAll(
        CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<StaffResponse>>.Ok(
            await _service.GetAllWithHubAsync(ct), "Staff fetched successfully"));

    [HttpGet("hub/{hubId:int}")]
    [Authorize(Roles = "ROLE_STAFF")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<StaffResponse>>>> GetByHub(
        int hubId, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<StaffResponse>>.Ok(
            await _service.GetByHubAsync(hubId, ct), "Staff fetched successfully"));

    [HttpGet("{id:int}")]
    [Authorize(Roles = "ROLE_STAFF")]
    public async Task<ActionResult<ApiResponse<StaffResponse>>> GetOne(int id, CancellationToken ct)
        => Ok(ApiResponse<StaffResponse>.Ok(
            await _service.GetOneAsync(id, ct), "Staff fetched successfully"));

    /// <summary>Uses the GENERIC service's update - requirement 9 in action.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "ROLE_STAFF")]
    public async Task<ActionResult<ApiResponse<StaffResponse>>> Update(
        int id, [FromBody] UpdateStaffRequest request, CancellationToken ct)
        => Ok(ApiResponse<StaffResponse>.Ok(
            await _service.UpdateAsync(id, request, ct), "Staff updated successfully"));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "ROLE_STAFF")]
    public async Task<ActionResult<ApiResponse<string>>> Delete(int id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return Ok(ApiResponse<string>.Ok("Deleted", "Staff deleted successfully"));
    }
}
