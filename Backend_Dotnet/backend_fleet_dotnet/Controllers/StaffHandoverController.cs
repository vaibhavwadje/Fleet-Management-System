using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.DTO;
using FleetManagement.DTO.Requests;
using FleetManagement.DTO.Responses;
using FleetManagement.Integration;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Domain;

namespace FleetManagement.Controllers;

[ApiController]
[Route("api/staff/handover")]
[Authorize(Roles = "ROLE_STAFF")]
public class StaffHandoverController : ControllerBase
{
    private readonly HandoverService _service;
    public StaffHandoverController(HandoverService service) => _service = service;

    [HttpPost("assign-vehicle")]
    public async Task<ActionResult<ApiResponse<AssignVehicleResponse>>> Assign(
        [FromBody] AssignVehicleRequest request, CancellationToken ct)
        => Ok(ApiResponse<AssignVehicleResponse>.Ok(
            await _service.AssignVehicleAsync(request, ct), "Vehicle assigned successfully"));

    [HttpPost("confirm")]
    public async Task<ActionResult<ApiResponse<string>>> Confirm(
        [FromBody] ConfirmHandoverRequest request, CancellationToken ct)
        => Ok(ApiResponse<string>.Ok(
            await _service.ConfirmHandoverAsync(request, ct), "Vehicle handed over successfully"));

    [HttpPost("return")]
    public async Task<ActionResult<ApiResponse<string>>> Return(
        [FromBody] ReturnVehicleRequest request, CancellationToken ct)
        => Ok(ApiResponse<string>.Ok(
            await _service.ReturnVehicleAsync(request, ct), "Vehicle returned successfully."));
}
