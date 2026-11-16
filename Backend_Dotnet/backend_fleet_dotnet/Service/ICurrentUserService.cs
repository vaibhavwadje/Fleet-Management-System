using System.Security.Claims;
using FleetManagement.Middleware;

namespace FleetManagement.Service;

public interface ICurrentUserService
{
    string? Email { get; }
    bool IsStaff { get; }
    bool IsCustomer { get; }

    /// <summary>The signed-in staff member's hub, or throws.</summary>
    int RequireHubId();

    string RequireEmail();
}
