namespace FleetManagement.Service.Auth;

/// <summary>
/// Bound from the "Authentication:Google" section of configuration.
///
/// WHERE THE CREDENTIALS LIVE
/// --------------------------
/// Not here, and not in appsettings.json. Program.cs also loads
/// appsettings.Local.json, which is git-ignored - the same arrangement the
/// Java backend uses with application-local.properties. A client secret in a
/// committed file is a client secret you have to rotate.
/// </summary>
public class GoogleAuthSettings
{
    public string? ClientId { get; set; }

    public string? ClientSecret { get; set; }

    /// <summary>
    /// Where Google sends the browser back to. Must match an Authorised
    /// redirect URI in the Google Cloud console EXACTLY, character for
    /// character - Google compares strings, not URLs.
    ///
    /// The path deliberately matches Spring Security's default so the two
    /// backends differ only by port:
    ///     Java  http://localhost:8080/login/oauth2/code/google
    ///     .NET  http://localhost:5100/login/oauth2/code/google
    ///
    /// Both need to be registered if you want to be able to switch.
    /// </summary>
    public string CallbackUrl { get; set; } = "http://localhost:5100/login/oauth2/code/google";

    /// <summary>
    /// Where the browser ends up once we have issued our own JWT. The React
    /// app reads token and role off the query string here.
    /// Matches the Java backend's app.oauth2.redirect-uri.
    /// </summary>
    public string FrontendRedirectUri { get; set; } = "http://localhost:5174/oauth-success";

    /// <summary>
    /// True only when there is something to configure the handler with.
    ///
    /// This mirrors the ObjectProvider check in the Java SecurityConfig: with
    /// no credentials the whole feature is switched off rather than failing at
    /// startup. An EMPTY client id is not the same as an absent one - passing
    /// "" to the handler throws, which is precisely the trap the Java config
    /// documents.
    /// </summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ClientId) && !string.IsNullOrWhiteSpace(ClientSecret);
}
