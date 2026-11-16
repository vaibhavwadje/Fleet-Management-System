using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace FleetManagement.Service;

/// <summary>
/// REQUIREMENT 2 - issues the JWTs the API is secured with.
///
/// COMPATIBILITY WITH THE JAVA BACKEND
/// -----------------------------------
/// Same signing secret, same subject (the e-mail), same role claim values
/// (ROLE_CUSTOMER / ROLE_STAFF) as the Java JwtService. That means a token
/// issued by either backend is accepted by the other, so the React client can
/// be pointed at .NET without anyone having to log in again.
///
/// The secret lives in configuration, never in the source.
/// </summary>
public class TokenService : ITokenService
{
    private readonly JwtSettings _settings;
    private readonly ILogger<TokenService> _logger;

    public TokenService(JwtSettings settings, ILogger<TokenService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public string CreateCustomerToken(string customerId, string email)
        => Create(email, "ROLE_CUSTOMER", new Claim("customerId", customerId));

    public string CreateStaffToken(int staffId, string email, int hubId)
        => Create(email, "ROLE_STAFF",
            new Claim("staffId", staffId.ToString()),
            new Claim("hubId", hubId.ToString()));

    private string Create(string subject, string role, params Claim[] extra)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, subject),
            new(ClaimTypes.Name, subject),
            new(ClaimTypes.Role, role),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        claims.AddRange(extra);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMilliseconds(_settings.ExpirationMs),
            signingCredentials: credentials);

        _logger.LogInformation("Issued {Role} token for {Subject}", role, subject);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
