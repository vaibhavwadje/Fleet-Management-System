using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.DTO;
using FleetManagement.DTO.Responses;
using FleetManagement.Models.Enums;
using FleetManagement.Service.Domain;

namespace FleetManagement.Controllers;

// ─────────────────────────────────────────────────────────────────────────────
//  Routes are IDENTICAL to the Java controllers - same paths, same verbs, same
//  {success, message, data} envelope. That is what lets the React client be
//  pointed at either backend with one environment variable and no code change.
//
//  Controllers stay thin: model binding validates, the service does the work,
//  and anything thrown is turned into a response by GlobalExceptionMiddleware.
//  There is deliberately no try/catch in here.
// ─────────────────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/states")]
[AllowAnonymous]
public class StateController : ControllerBase
{
    private readonly StateService _service;
    public StateController(StateService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<StateResponse>>>> GetAll(
        CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<StateResponse>>.Ok(
            await _service.GetAllOrderedAsync(ct), "States fetched successfully"));
}
