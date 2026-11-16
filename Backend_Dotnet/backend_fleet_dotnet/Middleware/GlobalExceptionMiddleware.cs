using System.Net.Mime;
using System.Text.Json;
using FleetManagement.DTO;

namespace FleetManagement.Middleware;

/// <summary>
/// REQUIREMENT 4 - one place where every unhandled exception becomes a
/// response.
///
/// WHY MIDDLEWARE AND NOT TRY/CATCH IN CONTROLLERS
/// -----------------------------------------------
/// A try/catch per action is the same eight lines repeated sixty times, and
/// the sixty-first action is the one somebody forgets. Sitting at the top of
/// the pipeline means nothing can get past it: a service can throw
/// BusinessException from four layers down and the client still receives the
/// same envelope as everything else.
///
/// This replaces the Java @RestControllerAdvice GlobalExceptionHandler, and
/// maps to the same status codes.
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            // Deliberate: a rule fired. Logged at Warning, not Error - this is
            // the application working, not failing.
            _logger.LogWarning(
                "Handled {ExceptionType} on {Method} {Path}: {Message}",
                ex.GetType().Name, context.Request.Method,
                context.Request.Path, ex.Message);

            await WriteAsync(context, ex.StatusCode, ex.Message);
        }
        catch (Exception ex)
        {
            // Unexpected. Log everything, tell the client nothing - a stack
            // trace in a response body is a gift to an attacker.
            _logger.LogError(ex,
                "Unhandled exception on {Method} {Path}",
                context.Request.Method, context.Request.Path);

            var message = _env.IsDevelopment()
                ? $"{ex.GetType().Name}: {ex.Message}"
                : "Something went wrong. Please try again.";

            await WriteAsync(context, StatusCodes.Status500InternalServerError, message);
        }
    }

    private static async Task WriteAsync(HttpContext context, int status, string message)
    {
        // If the response has already started there is nothing we can do -
        // rewriting it would corrupt what the client is already reading.
        if (context.Response.HasStarted) return;

        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = MediaTypeNames.Application.Json;

        var body = JsonSerializer.Serialize(
            ApiResponse<object>.Fail(message),
            new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            });

        await context.Response.WriteAsync(body);
    }
}
