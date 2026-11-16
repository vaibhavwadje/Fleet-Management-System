namespace FleetManagement.Service.Auth;

/// <summary>
/// What the frontend needs off the back of a Google sign-in: our JWT, and
/// which of the two dashboards to open.
/// </summary>
/// <param name="Token">A FLEMAN JWT - not Google's token, which we never keep.</param>
/// <param name="Role">"STAFF" or "CUSTOMER", matching the Java handler's values.</param>
public record GoogleSignInResult(string Token, string Role);
