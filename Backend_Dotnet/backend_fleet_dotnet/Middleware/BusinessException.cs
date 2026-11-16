namespace FleetManagement.Middleware;

/// <summary>400 - a rule of the business was broken.</summary>
public class BusinessException : AppException
{
    public override int StatusCode => StatusCodes.Status400BadRequest;
    public BusinessException(string message) : base(message) { }
}
