using System.Net.Mime;
using System.Text.Json;
using FleetManagement.DTO;

namespace FleetManagement.Middleware;

public static class GlobalExceptionMiddlewareExtensions
{
    public static IApplicationBuilder UseGlobalExceptionHandling(this IApplicationBuilder app)
        => app.UseMiddleware<GlobalExceptionMiddleware>();
}
