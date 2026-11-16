using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;
using FleetManagement.Service.Auth;

namespace FleetManagement.Controllers;

/// <summary>
/// Google Sign-In, matching the URLs Spring Security uses so the React app
/// needs no changes: it sends the browser to /oauth2/authorization/google and
/// expects to come back at /oauth-success?token=...&amp;role=...
///
/// THE ROUND TRIP
///   1. Browser  GET /oauth2/authorization/google
///                  -> we challenge the Google handler
///   2. Google authenticates the user and redirects to
///      /login/oauth2/code/google - handled by the Google middleware, not by
///      any action here. It completes the code exchange and signs the
///      resulting principal into a short-lived cookie.
///   3. That cookie carries the browser to /oauth2/complete/google below,
///      which reads the e-mail, issues one of OUR JWTs and drops the cookie.
///   4. Redirect to the frontend with the token on the query string.
///
/// WHY A COOKIE APPEARS IN A STATELESS API
/// ---------------------------------------
/// The OAuth2 handshake needs somewhere to keep the correlation state between
/// the redirect out and the redirect back - there is no request to carry it
/// on. The cookie exists for those few seconds and is deleted in step 3; no
/// API call is ever authenticated by it.
///
/// No [Authorize] here on purpose. These routes are how you become
/// authenticated, so requiring authentication would be a closed loop.
/// </summary>
[ApiController]
[Route("oauth2")]
public class OAuth2Controller : ControllerBase
{
    /// <summary>
    /// The cookie scheme used only to carry the Google identity from the
    /// callback to <see cref="Complete"/>. Registered in Program.cs.
    /// </summary>
    public const string TempCookieScheme = "OAuthHandshake";

    private readonly GoogleSignInService _signIn;
    private readonly GoogleAuthSettings _settings;
    private readonly ILogger<OAuth2Controller> _logger;

    public OAuth2Controller(
        GoogleSignInService signIn,
        GoogleAuthSettings settings,
        ILogger<OAuth2Controller> logger)
    {
        _signIn = signIn;
        _settings = settings;
        _logger = logger;
    }

    /// <summary>
    /// Step 1. The URL the "Sign in with Google" button points at.
    /// </summary>
    [HttpGet("authorization/google")]
    public IActionResult Start()
    {
        if (!_settings.IsConfigured)
        {
            // A clear answer beats a 404 from a handler that was never
            // registered. The person clicking the button cannot tell the
            // difference between "not set up" and "broken" otherwise.
            _logger.LogWarning("Google sign-in was attempted but no credentials are configured");

            return RedirectToFrontend(error:
                "Google Sign-In is not configured on this server. "
                + "Set Authentication:Google:ClientId and ClientSecret.");
        }

        var properties = new AuthenticationProperties
        {
            RedirectUri = Url.Action(nameof(Complete))!,
        };

        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    /// <summary>
    /// Step 3. Google has been and gone; turn the identity into our own token.
    /// </summary>
    [HttpGet("complete/google")]
    public async Task<IActionResult> Complete(CancellationToken ct)
    {
        // Reachable by typing the URL even when SSO is switched off, in which
        // case the handshake scheme was never registered and authenticating
        // against it throws rather than returning a failure.
        if (!_settings.IsConfigured)
        {
            return RedirectToFrontend(error: "Google Sign-In is not configured on this server.");
        }

        var result = await HttpContext.AuthenticateAsync(TempCookieScheme);

        if (!result.Succeeded || result.Principal is null)
        {
            _logger.LogWarning("Google sign-in did not complete: {Failure}",
                result.Failure?.Message ?? "no principal");

            return RedirectToFrontend(error: "Google sign-in did not complete. Please try again.");
        }

        var email = result.Principal.FindFirstValue(ClaimTypes.Email);

        // The handshake cookie has done its job. Drop it here rather than
        // letting it live out its expiry - it is an authenticated identity
        // sitting in the browser with no further purpose.
        await HttpContext.SignOutAsync(TempCookieScheme);

        if (string.IsNullOrWhiteSpace(email))
        {
            _logger.LogWarning("Google sign-in returned no email address");
            return RedirectToFrontend(error: "Google did not share an email address.");
        }

        var signIn = await _signIn.SignInAsync(
            email,
            result.Principal.FindFirstValue(ClaimTypes.GivenName),
            result.Principal.FindFirstValue(ClaimTypes.Surname),
            result.Principal.FindFirstValue(ClaimTypes.Name),
            ct);

        return RedirectToFrontend(token: signIn.Token, role: signIn.Role);
    }

    /// <summary>
    /// Hands control back to the React app.
    ///
    /// The token goes on the query string because the browser is arriving via
    /// a redirect from Google's domain - there is no response body to put it
    /// in and no request for the client to have attached a header to. The
    /// frontend reads it once and replaces the URL, so it does not sit in
    /// history.
    /// </summary>
    private IActionResult RedirectToFrontend(
        string? token = null, string? role = null, string? error = null)
    {
        var target = _settings.FrontendRedirectUri;

        var query = error is not null
            ? $"?error={Uri.EscapeDataString(error)}"
            : $"?token={Uri.EscapeDataString(token ?? string.Empty)}&role={role}";

        return Redirect(target + query);
    }
}
