using System.Security.Claims;
using FleetManagement.Middleware;

namespace FleetManagement.Service;

/// <summary>
/// Reads the caller out of the JWT.
///
/// Pulled into its own service rather than digging into HttpContext from
/// inside business logic - a service that reaches for the HTTP context is a
/// service you cannot unit test, and this project has four of them that need
/// to know who is asking.
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _accessor;

    public CurrentUserService(IHttpContextAccessor accessor) => _accessor = accessor;

    private ClaimsPrincipal? User => _accessor.HttpContext?.User;

    public string? Email => User?.Identity?.IsAuthenticated == true
        ? User.FindFirst(ClaimTypes.Name)?.Value
          ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value
        : null;

    public bool IsStaff => User?.IsInRole("ROLE_STAFF") == true;
    public bool IsCustomer => User?.IsInRole("ROLE_CUSTOMER") == true;

    public string RequireEmail()
        => Email ?? throw new UnauthorizedActionException("Not authenticated");

    public int RequireHubId()
    {
        var raw = User?.FindFirst("hubId")?.Value;

        return int.TryParse(raw, out var hubId)
            ? hubId
            : throw new UnauthorizedActionException("Staff is not authenticated");
    }
}
