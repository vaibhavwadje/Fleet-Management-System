using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using FleetManagement.DTO.Responses;
using FleetManagement.Integration;

namespace FleetManagement.Service.Email;

/// <summary>
/// Sends the transactional e-mails from inside this process.
///
/// WHY THIS IS NOT DELEGATED TO JAVA ANY MORE
/// ------------------------------------------
/// It could not be. The Java backend has no "send this e-mail" endpoint - it
/// sends from inside its own returnVehicle - so a return processed by .NET
/// sent nothing at all. Delegation only works where the other side actually
/// exposes a seam, and for e-mail it never did.
///
/// PDF and Excel stay delegated, because those seams are real: Java publishes
/// HTTP endpoints for both.
///
/// WHY SINGLETON, AND WHY NOTHING SCOPED IS HELD
/// ---------------------------------------------
/// Every send is handed to the thread pool and outlives the request that
/// triggered it. A captured DbContext or a captured scoped service would be
/// disposed out from under it, so the queue methods take fully-materialised
/// DTOs and open their own scope for anything they still need.
///
/// FAILURE POLICY
/// --------------
/// Nothing in here can throw into a caller, ever. By the time any of these is
/// reached the booking or the return is committed; a mail server that is down,
/// slow or misconfigured must not undo a rental. Failures are logged and that
/// is the end of it.
/// </summary>
public class EmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        EmailSettings settings,
        IServiceScopeFactory scopes,
        ILogger<EmailService> logger)
    {
        _settings = settings;
        _scopes = scopes;
        _logger = logger;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  The three e-mails
    // ═══════════════════════════════════════════════════════════════════════

    public void QueueBookingConfirmation(BookingResponse booking)
        => Queue(booking.Email, $"Booking Confirmation - #{booking.BookingId}",
            EmailTemplates.BookingEmail(booking),
            $"booking confirmation for booking {booking.BookingId}");

    public void QueueBookingModification(BookingResponse booking)
        => Queue(booking.Email, $"Booking Updated - #{booking.BookingId}",
            EmailTemplates.BookingEmail(booking, amended: true),
            $"booking modification for booking {booking.BookingId}");

    public void QueueInvoice(InvoiceResponse invoice, string? bearerToken = null)
    {
        var reference = invoice.InvoiceNo ?? invoice.InvoiceId.ToString();

        Queue(invoice.Email, $"Your FLEMAN invoice {reference}",
            EmailTemplates.InvoiceEmail(invoice),
            $"invoice for booking {invoice.BookingId}",
            attachment: async ct =>
            {
                if (!_settings.AttachInvoicePdf) return null;

                // The PDF is still rendered by Java - that microservice is
                // unchanged. Only the sending moved in-process.
                //
                // If it cannot be fetched the e-mail goes anyway: the body
                // already carries the full breakdown, and a customer with the
                // figures and no PDF is far better served than one with
                // nothing because a second service was down.
                using var scope = _scopes.CreateScope();
                var java = scope.ServiceProvider.GetRequiredService<JavaMicroserviceClient>();

                var bytes = await java.DownloadInvoicePdfAsync(
                    invoice.BookingId, bearerToken, ct);

                return new Attachment(
                    $"Invoice-{invoice.InvoiceId}.pdf", "application/pdf", bytes);
            });
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Plumbing
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>A file to hang off the message, resolved lazily on the send thread.</summary>
    private sealed record Attachment(string FileName, string MediaType, byte[] Content);

    private void Queue(
        string? to,
        string subject,
        string htmlBody,
        string description,
        Func<CancellationToken, Task<Attachment?>>? attachment = null)
    {
        if (string.IsNullOrWhiteSpace(to))
        {
            // Guest bookings without an e-mail address are legitimate; this is
            // not an error, it is simply nowhere to send to.
            _logger.LogInformation("No e-mail address on the {Description}; nothing sent", description);
            return;
        }

        if (!_settings.IsConfigured)
        {
            _logger.LogWarning(
                "SMTP is not configured, so the {Description} was not sent. "
                + "Set the Email section in appsettings.Local.json to turn e-mail on.",
                description);
            return;
        }

        // Fire-and-forget, the equivalent of Spring's @Async. Discarded on
        // purpose: the caller must not be able to await it by accident and
        // reintroduce the wait this exists to avoid.
        _ = Task.Run(async () =>
        {
            try
            {
                using var cts = new CancellationTokenSource(
                    TimeSpan.FromMilliseconds(_settings.TimeoutMs * 3));

                Attachment? file = null;

                if (attachment is not null)
                {
                    try
                    {
                        file = await attachment(cts.Token);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex,
                            "Could not fetch the attachment for the {Description}; "
                            + "sending without it", description);
                    }
                }

                await SendAsync(to, subject, htmlBody, file, cts.Token);

                _logger.LogInformation("Sent the {Description} to {To}", description, to);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Could not send the {Description} to {To}", description, to);
            }
        });
    }

    private async Task SendAsync(
        string to, string subject, string htmlBody, Attachment? file, CancellationToken ct)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_settings.FromName, _settings.ResolvedFrom));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;

        var builder = new BodyBuilder { HtmlBody = htmlBody };

        if (file is not null)
        {
            builder.Attachments.Add(
                file.FileName, file.Content, ContentType.Parse(file.MediaType));
        }

        message.Body = builder.ToMessageBody();

        using var client = new SmtpClient { Timeout = _settings.TimeoutMs };

        // STARTTLS on 587, implicit TLS on 465 - the two conventions in use.
        // Auto would negotiate either, but naming it means a misconfigured
        // port fails with a connection error rather than a silent plaintext
        // downgrade.
        var socketOptions = _settings.Port == 465
            ? SecureSocketOptions.SslOnConnect
            : SecureSocketOptions.StartTls;

        await client.ConnectAsync(_settings.Host, _settings.Port, socketOptions, ct);
        await client.AuthenticateAsync(_settings.Username, _settings.Password, ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }
}
