using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.DTO;
using FleetManagement.DTO.Requests;
using FleetManagement.DTO.Responses;
using FleetManagement.Integration;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Domain;

namespace FleetManagement.Controllers;

/// <summary>Customer-facing bookings.</summary>
[ApiController]
[Route("api/bookings")]
[Authorize(Roles = "ROLE_CUSTOMER")]
public class BookingController : ControllerBase
{
    private readonly BookingService _service;
    public BookingController(BookingService service) => _service = service;

    [HttpPost]
    public async Task<ActionResult<ApiResponse<BookingResponse>>> Create(
        [FromBody] BookingRequest request, CancellationToken ct)
        => Ok(ApiResponse<BookingResponse>.Ok(
            await _service.CreateAsync(request, ct), "Booking confirmed successfully"));

    /// <summary>Public: a guest can book without an account.</summary>
    [HttpPost("guest")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<BookingResponse>>> CreateGuest(
        [FromBody] GuestBookingRequest request, CancellationToken ct)
        => Ok(ApiResponse<BookingResponse>.Ok(
            await _service.CreateGuestAsync(request, ct), "Guest booking confirmed successfully"));

    [HttpGet]
    public async Task<ActionResult<ApiResponse<BookingPageResponse>>> GetMine(
        [FromQuery] int page = 0, [FromQuery] int size = 10,
        [FromQuery] BookingStatus? status = null, CancellationToken ct = default)
        => Ok(ApiResponse<BookingPageResponse>.Ok(
            await _service.GetMyBookingsAsync(page, size, status, ct),
            "Bookings fetched successfully"));

    /// <summary>Declared before {bookingId} so "stats" is not read as an id.</summary>
    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<BookingStatsResponse>>> Stats(CancellationToken ct)
        => Ok(ApiResponse<BookingStatsResponse>.Ok(
            await _service.GetStatsAsync(forStaff: false, ct), "Stats fetched successfully"));

    [HttpGet("{bookingId:long}")]
    public async Task<ActionResult<ApiResponse<BookingResponse>>> GetOne(
        long bookingId, CancellationToken ct)
        => Ok(ApiResponse<BookingResponse>.Ok(
            await _service.GetMyBookingAsync(bookingId, ct), "Booking fetched successfully"));

    [HttpPut("{bookingId:long}")]
    public async Task<ActionResult<ApiResponse<BookingResponse>>> Update(
        long bookingId, [FromBody] UpdateBookingRequest request, CancellationToken ct)
        => Ok(ApiResponse<BookingResponse>.Ok(
            await _service.UpdateAsync(bookingId, request, ct), "Booking updated successfully"));

    [HttpPatch("{bookingId:long}/cancel")]
    public async Task<ActionResult<ApiResponse<BookingResponse>>> Cancel(
        long bookingId, CancellationToken ct)
        => Ok(ApiResponse<BookingResponse>.Ok(
            await _service.CancelAsync(bookingId, ct), "Booking cancelled successfully"));
}
