package com.example.demo.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/**
 * One row per advised method call, written by {@code LoggingAspect}.
 *
 * WHY THIS DOES NOT EXTEND BaseEntity
 * -----------------------------------
 * Every other entity extends BaseEntity for created_at / updated_at. A log
 * row is written once and never updated, so an updated_at column would be
 * dead weight on the table that grows fastest in the schema. It carries its
 * own {@code logged_at} instead.
 *
 * COLUMN SIZES
 * ------------
 * message and stack_trace are TEXT because a stack trace routinely runs to
 * several kilobytes. Everything else is bounded, and the aspect truncates
 * before saving so an over-long value can never fail the insert - a logging
 * failure must not be able to break a request.
 */
@Entity
@Table(
    name = "application_log",
    indexes = {
        // The three ways anyone actually queries this table: "what happened
        // recently", "what failed", and "what did this class do".
        @Index(name = "idx_app_log_logged_at", columnList = "logged_at"),
        @Index(name = "idx_app_log_status",    columnList = "status"),
        @Index(name = "idx_app_log_class",     columnList = "class_name")
    }
)
public class ApplicationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    /** When the advised method finished. */
    @Column(name = "logged_at", nullable = false)
    private LocalDateTime loggedAt;

    /** INFO, WARN or ERROR - the same level written to the console. */
    @Column(name = "log_level", length = 10, nullable = false)
    private String logLevel;

    /** SUCCESS or FAILURE. */
    @Column(name = "status", length = 10, nullable = false)
    private String status;

    /** Simple class name, e.g. CustomerServiceImpl. */
    @Column(name = "class_name", length = 150, nullable = false)
    private String className;

    /** Method name without the signature, e.g. register. */
    @Column(name = "method_name", length = 150, nullable = false)
    private String methodName;

    /** CONTROLLER or SERVICE - which layer the call was in. */
    @Column(name = "layer", length = 20)
    private String layer;

    /** Argument TYPES, never their values - see the note in LoggingAspect. */
    @Column(name = "method_args", length = 500)
    private String methodArgs;

    /** How long the method took. Null when the advice could not time it. */
    @Column(name = "execution_time_ms")
    private Long executionTimeMs;

    /** Signed-in user, or "anonymous". */
    @Column(name = "username", length = 150)
    private String username;

    /** GET, POST, ... when the call came in over HTTP. */
    @Column(name = "http_method", length = 10)
    private String httpMethod;

    @Column(name = "request_uri", length = 500)
    private String requestUri;

    @Column(name = "client_ip", length = 45)
    private String clientIp;

    /**
     * Ties the controller row and the service row of one request together,
     * so a single click can be followed through the layers.
     */
    @Column(name = "trace_id", length = 40)
    private String traceId;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    /** Exception class name, only on the failure path. */
    @Column(name = "exception_type", length = 200)
    private String exceptionType;

    @Column(name = "stack_trace", columnDefinition = "TEXT")
    private String stackTrace;

    public ApplicationLog() {
    }

    // ---------- getters / setters ----------

    public Long getLogId() { return logId; }
    public void setLogId(Long logId) { this.logId = logId; }

    public LocalDateTime getLoggedAt() { return loggedAt; }
    public void setLoggedAt(LocalDateTime loggedAt) { this.loggedAt = loggedAt; }

    public String getLogLevel() { return logLevel; }
    public void setLogLevel(String logLevel) { this.logLevel = logLevel; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }

    public String getMethodName() { return methodName; }
    public void setMethodName(String methodName) { this.methodName = methodName; }

    public String getLayer() { return layer; }
    public void setLayer(String layer) { this.layer = layer; }

    public String getMethodArgs() { return methodArgs; }
    public void setMethodArgs(String methodArgs) { this.methodArgs = methodArgs; }

    public Long getExecutionTimeMs() { return executionTimeMs; }
    public void setExecutionTimeMs(Long executionTimeMs) { this.executionTimeMs = executionTimeMs; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getHttpMethod() { return httpMethod; }
    public void setHttpMethod(String httpMethod) { this.httpMethod = httpMethod; }

    public String getRequestUri() { return requestUri; }
    public void setRequestUri(String requestUri) { this.requestUri = requestUri; }

    public String getClientIp() { return clientIp; }
    public void setClientIp(String clientIp) { this.clientIp = clientIp; }

    public String getTraceId() { return traceId; }
    public void setTraceId(String traceId) { this.traceId = traceId; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getExceptionType() { return exceptionType; }
    public void setExceptionType(String exceptionType) { this.exceptionType = exceptionType; }

    public String getStackTrace() { return stackTrace; }
    public void setStackTrace(String stackTrace) { this.stackTrace = stackTrace; }
}
