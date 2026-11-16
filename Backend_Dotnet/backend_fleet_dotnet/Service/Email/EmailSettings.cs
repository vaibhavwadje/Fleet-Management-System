namespace FleetManagement.Service.Email;

/// <summary>
/// SMTP configuration, bound from the "Email" section.
///
/// These are the same values as the Java backend's spring.mail.* properties
/// and belong in appsettings.Local.json for the same reason: an app password
/// in a committed file is an app password you have to revoke.
/// </summary>
public class EmailSettings
{
    public string Host { get; set; } = "smtp.gmail.com";

    /// <summary>587 for STARTTLS, 465 for implicit TLS.</summary>
    public int Port { get; set; } = 587;

    /// <summary>The mailbox to authenticate as. Also the default From address.</summary>
    public string? Username { get; set; }

    /// <summary>
    /// For Gmail this is an App Password, not the account password - Google
    /// stopped accepting the latter for SMTP.
    /// </summary>
    public string? Password { get; set; }

    /// <summary>
    /// What recipients see in the From line. Defaults to
    /// <see cref="Username"/>, and to a placeholder when even that is absent,
    /// so nothing here can stop the application starting.
    /// </summary>
    public string? FromAddress { get; set; }

    public string FromName { get; set; } = "FLEMAN Fleet Management";

    /// <summary>
    /// Milliseconds. JavaMail waits forever by default and the Java backend
    /// pins these for the same reason: an unreachable SMTP host would
    /// otherwise hold a background thread open indefinitely.
    /// </summary>
    public int TimeoutMs { get; set; } = 10_000;

    /// <summary>
    /// Attach the invoice PDF, fetched from the Java rendering service.
    ///
    /// Turn it off and the e-mail still goes out with the full breakdown in
    /// the body - useful when the Java service is not running and you would
    /// rather have a plain e-mail than none.
    /// </summary>
    public bool AttachInvoicePdf { get; set; } = true;

    /// <summary>
    /// True only when there is enough to talk to a mail server with. With
    /// nothing configured every send is skipped and logged - bookings and
    /// returns carry on working, which is the whole point of e-mail being
    /// fire-and-forget.
    /// </summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Host)
        && !string.IsNullOrWhiteSpace(Username)
        && !string.IsNullOrWhiteSpace(Password);

    public string ResolvedFrom =>
        FromAddress
        ?? Username
        ?? "no-reply@fleman.local";
}
