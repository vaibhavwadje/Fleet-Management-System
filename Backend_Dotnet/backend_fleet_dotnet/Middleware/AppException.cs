namespace FleetManagement.Middleware;

/// <summary>
/// Base for the errors the application raises on purpose, as opposed to the
/// ones it suffers. Mirrors the Java exception.error package so the HTTP
/// status codes and messages come out identical.
/// </summary>
public abstract class AppException : Exception
{
    public abstract int StatusCode { get; }
    protected AppException(string message) : base(message) { }
}
