namespace FleetManagement.Middleware;

/// <summary>404 - the thing asked for does not exist.</summary>
public class ResourceNotFoundException : AppException
{
    public override int StatusCode => StatusCodes.Status404NotFound;
    public ResourceNotFoundException(string message) : base(message) { }
}
