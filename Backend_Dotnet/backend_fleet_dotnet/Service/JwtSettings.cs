using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace FleetManagement.Service;

/// <summary>Bound from the "Jwt" section of appsettings.</summary>
public class JwtSettings
{
    public string Secret { get; set; } = default!;
    public string Issuer { get; set; } = "fleman";
    public string Audience { get; set; } = "fleman-clients";

    /// <summary>Milliseconds, matching the Java jwt.expiration property.</summary>
    public long ExpirationMs { get; set; } = 86_400_000;
}
