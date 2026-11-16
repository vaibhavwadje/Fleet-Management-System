namespace FleetManagement.Middleware;

/// <summary>403 - authenticated, but not allowed to do this.</summary>
public class UnauthorizedActionException : AppException
{
    public override int StatusCode => StatusCodes.Status403Forbidden;
    public UnauthorizedActionException(string message) : base(message) { }
}
