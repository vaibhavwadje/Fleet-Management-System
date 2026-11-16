using FleetManagement.DTO.Responses;

namespace FleetManagement.Service.Email;

/// <summary>
/// The three transactional e-mails, mirroring the Java EmailService.
///
/// WHY EVERY METHOD IS void AND NAMED "Queue"
/// ------------------------------------------
/// None of them are awaited by the caller, and the names say so rather than
/// leaving a Task lying around for someone to await by reflex. By the time any
/// of these is reached the booking or the return is already committed - an
/// unreachable SMTP server is not a reason to fail a rental, and a customer
/// standing at a counter should not wait on a mail round trip.
///
/// The Java side achieves this with @Async; this achieves it by handing the
/// work to the thread pool. Neither can ever throw into the caller.
/// </summary>
public interface IEmailService
{
    /// <summary>Sent as soon as a booking is made.</summary>
    void QueueBookingConfirmation(BookingResponse booking);

    /// <summary>
    /// Sent when a booking is changed. Same layout as the confirmation,
    /// different wording - a customer who has just amended a booking should
    /// not be told it has been confirmed.
    /// </summary>
    void QueueBookingModification(BookingResponse booking);

    /// <summary>
    /// Sent after the vehicle is returned, with the invoice PDF attached.
    /// </summary>
    /// <param name="bearerToken">
    /// Used to fetch the PDF from the Java rendering service, which requires
    /// authentication. Pass the token of whoever triggered the return; with
    /// none, the e-mail is sent without the attachment rather than not at all.
    /// </param>
    void QueueInvoice(InvoiceResponse invoice, string? bearerToken = null);
}
