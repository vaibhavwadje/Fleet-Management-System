package com.example.demo.aspect;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.UUID;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.example.demo.entity.ApplicationLog;
import com.example.demo.service.ApplicationLogService;

import jakarta.servlet.http.HttpServletRequest;

/**
 * ============================================================
 *  SPRING AOP - LOGGING ASPECT (console + database)
 * ============================================================
 *
 * WHAT PROBLEM DOES THIS SOLVE?
 * -----------------------------
 * Logging "method X started", "method X finished in 42 ms" is the same code
 * in every method. That is a *cross-cutting concern*: it cuts across many
 * classes but is not really part of what any of them does.
 *
 * AOP lets us write that logging ONCE, here, and have Spring apply it
 * automatically. None of the controller or service code changes at all.
 *
 * THE VOCABULARY (only four words)
 * --------------------------------
 *  Aspect     - this class. A bundle of cross-cutting behaviour.
 *  Join point - a place where the behaviour can be attached. In Spring AOP
 *               that always means "a method call on a Spring bean".
 *  Pointcut   - the expression that decides WHICH methods (see below).
 *  Advice     - the code to run. Which one you use depends on WHEN:
 *                 @Before        - just before the method runs
 *                 @After         - after it finishes, success or failure
 *                 @AfterThrowing - only when it throws
 *                 @Around        - wraps it, so it can time the call
 *
 * HOW IT WORKS UNDER THE BONNET
 * -----------------------------
 * Spring does not modify your class. At startup it creates a *proxy* object
 * that wraps the real bean. Everyone gets the proxy injected. The proxy runs
 * the advice, then calls the real method.
 *
 * One consequence worth knowing: a method calling another method *on itself*
 * bypasses the proxy, so no advice runs. Only calls that come in from outside
 * the bean are advised. (The same rule applies to @Transactional and @Async.)
 *
 * ============================================================
 *  WHERE THE LOGS GO
 * ============================================================
 *
 * Both places, on purpose:
 *
 *   CONSOLE  - unchanged. Same lines, same format as before. It is what you
 *              read while developing, and it still works when the database
 *              is down.
 *   DATABASE - one row per advised call in `application_log`, carrying the
 *              timestamp, level, class, method, status, duration, message,
 *              exception details, the signed-in user and the HTTP request.
 *              That is the part you can query, audit and keep.
 *
 * Neither is a fallback for the other. A log that exists only in a rolling
 * console file cannot be audited; a log that exists only in a table is
 * unreadable exactly when the table is unreachable.
 *
 * ============================================================
 *  THREE TRAPS THIS CODE AVOIDS
 * ============================================================
 *
 * 1. THE LOG THAT ROLLS BACK WITH THE ERROR IT RECORDS
 *
 *    A failure usually means the surrounding transaction is about to roll
 *    back. Insert the log row in that transaction and it rolls back too, so
 *    the failures - the rows you actually wanted - are the ones you never
 *    get. ApplicationLogService writes with REQUIRES_NEW, in its own
 *    transaction, so the row commits whatever happens to the caller.
 *
 * 2. THE ASPECT THAT LOGS ITSELF
 *
 *    Widen the pointcut to `service.impl..*` one day and the log writer is
 *    suddenly advised by the aspect that calls it: writing a log triggers a
 *    log, forever. The pointcut below excludes the aspect, the log service
 *    and the repositories by name, so that stays impossible.
 *
 * 3. THE LOGGER THAT BREAKS THE REQUEST
 *
 *    Logging is a convenience, not the job. Every database write here sits
 *    inside a try/catch that gives up quietly, so a full disk or a missing
 *    table cannot turn a working registration into a 500.
 *
 * ============================================================
 *  WHERE IS IT APPLIED?
 * ============================================================
 *
 * Deliberately scoped to ONE module - customer registration - so the logs
 * stay readable while you are learning:
 *
 *     POST /api/customer/register
 *       -> CustomerController.register(..)   [logged: entry, exit, time]
 *       -> CustomerServiceImpl.register(..)  [logged: execution, time]
 *
 * TO APPLY IT MORE WIDELY
 * -----------------------
 * Widen the pointcuts below, for example:
 *
 *     within(com.example.demo.controller..*)   // every controller
 *     within(com.example.demo.service.impl..*) // every service
 *
 * The notLoggingInfrastructure() guard is already in place, so widening
 * them is safe.
 *
 * SAMPLE OUTPUT
 * -------------
 *   -> ENTER  CustomerController.register() args=[RegisterRequest]
 *   -> ENTER  CustomerServiceImpl.register()
 *   <- EXIT   CustomerServiceImpl.register() took 118 ms
 *   <- EXIT   CustomerController.register() took 121 ms
 *
 * ============================================================
 */
@Aspect
@Component
public class LoggingAspect {

    private static final Logger log =
            LoggerFactory.getLogger(LoggingAspect.class);

    /** Longest stack trace we will store. Beyond this it is truncated. */
    private static final int MAX_STACK_TRACE = 8000;

    /** Longest message we will store. */
    private static final int MAX_MESSAGE = 2000;

    private final ApplicationLogService applicationLogService;

    public LoggingAspect(ApplicationLogService applicationLogService) {
        this.applicationLogService = applicationLogService;
    }

    // ============================================================
    // POINTCUTS - the "which methods" part
    // ============================================================

    /** Every public method on CustomerController. */
    @Pointcut("execution(* com.example.demo.controller.CustomerController.*(..))")
    public void customerControllerMethods() {
        // Marker method. The body is never executed - only the annotation
        // matters. It exists so the expression can be given a readable name
        // and reused by the advice below.
    }

    /** Every public method on CustomerServiceImpl. */
    @Pointcut("execution(* com.example.demo.service.impl.CustomerServiceImpl.*(..))")
    public void customerServiceMethods() {
    }

    /**
     * Everything that makes logging work, excluded from logging.
     *
     * Without this, widening the pointcuts later would make the aspect advise
     * the very class it uses to write logs - see trap 2 in the header.
     */
    @Pointcut("!within(com.example.demo.aspect..*)"
            + " && !within(com.example.demo.service.impl.ApplicationLogServiceImpl)"
            + " && !within(com.example.demo.repository..*)")
    public void notLoggingInfrastructure() {
    }

    /** Controller or service - used for the exception advice. */
    @Pointcut("(customerControllerMethods() || customerServiceMethods())"
            + " && notLoggingInfrastructure()")
    public void customerModule() {
    }

    // ============================================================
    // ADVICE - the "what to do" part
    // ============================================================

    /**
     * Wraps every controller method: entry, exit, timing and one row.
     *
     * This replaces the old @Before / @After pair. Two separate advices could
     * not measure the duration or tell success from failure, and the log
     * table is supposed to answer both.
     */
    @Around("customerControllerMethods() && notLoggingInfrastructure()")
    public Object logControllerCall(ProceedingJoinPoint joinPoint) throws Throwable {
        return proceedAndLog(joinPoint, "CONTROLLER");
    }

    /**
     * Wraps every service method so we can measure how long it took.
     *
     * @Around is the only advice that can do this, because it is the only one
     * that controls when (and whether) the real method runs - that is what
     * joinPoint.proceed() does.
     */
    @Around("customerServiceMethods() && notLoggingInfrastructure()")
    public Object logServiceExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        return proceedAndLog(joinPoint, "SERVICE");
    }

    /**
     * The shared body of both @Around advices.
     *
     * Runs the real method, times it, writes the console lines exactly as
     * before, and saves one database row either way.
     */
    private Object proceedAndLog(ProceedingJoinPoint joinPoint, String layer)
            throws Throwable {

        String className = shortClassName(joinPoint);
        String methodName = joinPoint.getSignature().getName();
        String label = className + "." + methodName + "()";
        String args = describeArguments(joinPoint.getArgs());

        // Every row from one HTTP request shares this, so the controller row
        // and the service row beneath it can be read together.
        String traceId = currentTraceId();

        long startedAt = System.currentTimeMillis();

        if ("CONTROLLER".equals(layer)) {
            log.info("-> ENTER  {} args={}", label, args);
        } else {
            log.info("-> ENTER  {}", label);
        }

        try {
            // Run the real method.
            Object result = joinPoint.proceed();

            long took = System.currentTimeMillis() - startedAt;
            log.info("<- EXIT   {} took {} ms", label, took);

            record(className, methodName, layer, args, traceId,
                    "INFO", "SUCCESS", took,
                    "Completed successfully in " + took + " ms",
                    null);

            return result;

        } catch (Throwable ex) {
            // Log the timing even on the failure path, then rethrow so the
            // normal exception handling is completely unaffected.
            long took = System.currentTimeMillis() - startedAt;
            log.warn("<- FAILED {} after {} ms", label, took);

            record(className, methodName, layer, args, traceId,
                    "ERROR", "FAILURE", took,
                    "Failed after " + took + " ms: " + ex.getMessage(),
                    ex);

            throw ex;
        }
    }

    /**
     * Runs only when a method throws.
     *
     * Note this does NOT swallow the exception - it still travels up to
     * GlobalExceptionHandler exactly as before.
     *
     * Console only. The database row for the failure is written by
     * proceedAndLog above, which knows how long the call took; writing here
     * as well would give two rows for one failure.
     */
    @AfterThrowing(pointcut = "customerModule()", throwing = "ex")
    public void logException(JoinPoint joinPoint, Throwable ex) {

        log.error("!! ERROR  {}.{}() threw {}: {}",
                shortClassName(joinPoint),
                joinPoint.getSignature().getName(),
                ex.getClass().getSimpleName(),
                ex.getMessage());
    }

    // ============================================================
    // Writing the row
    // ============================================================

    /**
     * Builds and saves one log row.
     *
     * This has a try/catch of its own on top of the one inside the service,
     * because building the row can fail too - reading the request or the
     * security context can throw in an odd state - and none of that is worth
     * failing a request over.
     */
    private void record(String className, String methodName, String layer,
                        String args, String traceId,
                        String level, String status, Long tookMs,
                        String message, Throwable ex) {
        try {
            ApplicationLog entry = new ApplicationLog();

            entry.setLoggedAt(LocalDateTime.now());
            entry.setLogLevel(level);
            entry.setStatus(status);
            entry.setClassName(className);
            entry.setMethodName(methodName);
            entry.setLayer(layer);
            entry.setMethodArgs(truncate(args, 500));
            entry.setExecutionTimeMs(tookMs);
            entry.setTraceId(traceId);
            entry.setUsername(currentUsername());
            entry.setMessage(truncate(message, MAX_MESSAGE));

            HttpServletRequest request = currentRequest();
            if (request != null) {
                entry.setHttpMethod(request.getMethod());
                entry.setRequestUri(truncate(request.getRequestURI(), 500));
                entry.setClientIp(clientIp(request));
            }

            if (ex != null) {
                entry.setExceptionType(truncate(ex.getClass().getName(), 200));
                entry.setStackTrace(truncate(stackTraceOf(ex), MAX_STACK_TRACE));
            }

            applicationLogService.save(entry);

        } catch (Exception loggingFailure) {
            log.error("Could not build application log row for {}.{}(): {}",
                    className, methodName, loggingFailure.getMessage());
        }
    }

    // ============================================================
    // Small helpers
    // ============================================================

    private String shortClassName(JoinPoint joinPoint) {
        return joinPoint.getSignature().getDeclaringType().getSimpleName();
    }

    /**
     * Logs argument TYPES, never their values.
     *
     * Registration payloads contain a raw password, so printing the values
     * would leak it straight into the log file - and now into a database
     * table that outlives the log file.
     */
    private String describeArguments(Object[] args) {
        if (args == null || args.length == 0) {
            return "[]";
        }
        return Arrays.stream(args)
                .map(a -> a == null ? "null" : a.getClass().getSimpleName())
                .toList()
                .toString();
    }

    /** The signed-in user, or "anonymous" when there is not one. */
    private String currentUsername() {
        try {
            Authentication authentication =
                    SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null
                    || !authentication.isAuthenticated()
                    || "anonymousUser".equals(authentication.getPrincipal())) {
                return "anonymous";
            }
            return authentication.getName();

        } catch (Exception ex) {
            return "unknown";
        }
    }

    /** The current HTTP request, or null when there is not one. */
    private HttpServletRequest currentRequest() {
        try {
            ServletRequestAttributes attributes =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return attributes == null ? null : attributes.getRequest();

        } catch (Exception ex) {
            return null;
        }
    }

    /**
     * One id shared by every log row of a single request.
     *
     * Kept on the request itself, so the controller row and the service row
     * it calls both find the same value. Outside a request - a scheduled job,
     * say - a fresh id is generated per call.
     */
    private String currentTraceId() {
        HttpServletRequest request = currentRequest();
        String key = "flemanTraceId";

        if (request == null) {
            return shortId();
        }

        Object existing = request.getAttribute(key);
        if (existing instanceof String s) {
            return s;
        }

        String fresh = shortId();
        request.setAttribute(key, fresh);
        return fresh;
    }

    private String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    /** Honours the proxy header, since the app may sit behind one. */
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // The header is a comma separated chain; the first entry is the
            // original client.
            return truncate(forwarded.split(",")[0].trim(), 45);
        }
        return truncate(request.getRemoteAddr(), 45);
    }

    private String stackTraceOf(Throwable ex) {
        StringWriter writer = new StringWriter();
        ex.printStackTrace(new PrintWriter(writer));
        return writer.toString();
    }

    /**
     * Keeps a value inside its column.
     *
     * An over-long value would fail the insert, and a logging failure must
     * never be the reason a request fails.
     */
    private String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max - 3) + "...";
    }
}
