using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

/// <summary>
/// One row per advised call, written by the Java AOP aspect. Mapped here so
/// the .NET side can read the same audit trail; .NET writes its own rows
/// through <c>RequestLoggingMiddleware</c>.
/// </summary>
[Table("application_log")]
public class ApplicationLog
{
    [Key, Column("log_id")] public long LogId { get; set; }
    [Column("logged_at")] public DateTime LoggedAt { get; set; }
    [Column("log_level")] public string LogLevel { get; set; } = default!;
    [Column("status")] public string Status { get; set; } = default!;
    [Column("class_name")] public string ClassName { get; set; } = default!;
    [Column("method_name")] public string MethodName { get; set; } = default!;
    [Column("layer")] public string? Layer { get; set; }
    [Column("method_args")] public string? MethodArgs { get; set; }
    [Column("execution_time_ms")] public long? ExecutionTimeMs { get; set; }
    [Column("username")] public string? Username { get; set; }
    [Column("http_method")] public string? HttpMethod { get; set; }
    [Column("request_uri")] public string? RequestUri { get; set; }
    [Column("client_ip")] public string? ClientIp { get; set; }
    [Column("trace_id")] public string? TraceId { get; set; }
    [Column("message")] public string? Message { get; set; }
    [Column("exception_type")] public string? ExceptionType { get; set; }
    [Column("stack_trace")] public string? StackTrace { get; set; }
}
