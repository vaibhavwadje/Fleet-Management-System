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
/// Customer authentication and profile. Mirrors the Java CustomerController.
/// </summary>
[ApiController]
[Route("api/customer")]
public class CustomerController : ControllerBase
{
    private readonly CustomerService _service;
    private readonly ILogger<CustomerController> _logger;

    public CustomerController(CustomerService service, ILogger<CustomerController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<string>>> Register(
        [FromBody] RegisterRequest request, CancellationToken ct)
    {
        // Argument TYPES only, never values - this payload holds a raw
        // password, and logging it would put it in the log file forever.
        _logger.LogInformation("Registration requested [{Type}]", nameof(RegisterRequest));

        return Ok(ApiResponse<string>.Ok(
            await _service.RegisterAsync(request, ct), "Registration successful"));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login(
        [FromBody] LoginRequest request, CancellationToken ct)
        => Ok(ApiResponse<LoginResponse>.Ok(
            await _service.LoginAsync(request, ct), "Login successful"));

    [HttpGet("profile")]
    [Authorize(Roles = "ROLE_CUSTOMER")]
    public async Task<ActionResult<ApiResponse<ProfileResponse>>> GetProfile(CancellationToken ct)
        => Ok(ApiResponse<ProfileResponse>.Ok(
            await _service.GetProfileAsync(ct), "Profile fetched successfully"));

    [HttpPut("profile")]
    [Authorize(Roles = "ROLE_CUSTOMER")]
    public async Task<ActionResult<ApiResponse<ProfileResponse>>> UpdateProfile(
        [FromBody] UpdateCustomerRequest request, CancellationToken ct)
        => Ok(ApiResponse<ProfileResponse>.Ok(
            await _service.UpdateProfileAsync(request, ct), "Profile updated successfully"));

    [HttpPut("change-password")]
    [Authorize(Roles = "ROLE_CUSTOMER")]
    public async Task<ActionResult<ApiResponse<string>>> ChangePassword(
        [FromBody] ChangePasswordRequest request, CancellationToken ct)
        => Ok(ApiResponse<string>.Ok(
            await _service.ChangePasswordAsync(request, ct), "Password changed successfully"));
}
