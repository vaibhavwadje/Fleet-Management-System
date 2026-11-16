using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.DTO;
using FleetManagement.DTO.Requests;
using FleetManagement.DTO.Responses;
using FleetManagement.Integration;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Domain;

namespace FleetManagement.Controllers;

/// <summary>The staff view over bookings.</summary>
[ApiController]
[Route("api/staff/bookings")]
[Authorize(Roles = "ROLE_STAFF")]
public class StaffBookingController : ControllerBase
{
    private readonly BookingService _service;
    public StaffBookingController(BookingService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<BookingPageResponse>>> GetAll(
        [FromQuery] int page = 0, [FromQuery] int size = 10,
        [FromQuery] BookingStatus? status = null, [FromQuery] HubScope? scope = null,
        CancellationToken ct = default)
        => Ok(ApiResponse<BookingPageResponse>.Ok(
            await _service.GetStaffBookingsAsync(page, size, status, scope, ct),
            "Staff bookings fetched successfully"));

    /// <summary>On-spot booking for a walk-in customer.</summary>
    [HttpPost("on-spot")]
    public async Task<ActionResult<ApiResponse<BookingResponse>>> CreateOnSpot(
        [FromBody] StaffBookingRequest request, CancellationToken ct)
        => Ok(ApiResponse<BookingResponse>.Ok(
            await _service.CreateStaffBookingAsync(request, ct),
            "On-spot booking created successfully"));

    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<BookingStatsResponse>>> Stats(CancellationToken ct)
        => Ok(ApiResponse<BookingStatsResponse>.Ok(
            await _service.GetStatsAsync(forStaff: true, ct), "Stats fetched successfully"));

    [HttpPatch("{bookingId:long}/locations")]
    public async Task<ActionResult<ApiResponse<BookingResponse>>> UpdateLocations(
        long bookingId, [FromBody] UpdateBookingLocationsRequest request, CancellationToken ct)
        => Ok(ApiResponse<BookingResponse>.Ok(
            await _service.UpdateLocationsAsync(bookingId, request, ct),
            "Booking locations updated successfully"));

    [HttpPatch("{bookingId:long}/status")]
    public async Task<ActionResult<ApiResponse<BookingResponse>>> UpdateStatus(
        long bookingId, [FromBody] UpdateBookingStatusRequest request, CancellationToken ct)
        => Ok(ApiResponse<BookingResponse>.Ok(
            await _service.UpdateStatusAsync(bookingId, request, ct),
            "Booking status updated successfully"));

    /// <summary>Any booking, from any hub - the way out of the hub scope.</summary>
    [HttpGet("{bookingId:long}")]
    public async Task<ActionResult<ApiResponse<BookingResponse>>> GetOne(
        long bookingId, CancellationToken ct)
        => Ok(ApiResponse<BookingResponse>.Ok(
            await _service.GetStaffBookingByIdAsync(bookingId, ct),
            "Booking fetched successfully"));
}
