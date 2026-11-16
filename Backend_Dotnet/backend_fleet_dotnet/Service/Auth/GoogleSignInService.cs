using Microsoft.EntityFrameworkCore;
using FleetManagement.Data;
using FleetManagement.Models;

namespace FleetManagement.Service.Auth;

/// <summary>
/// Turns a Google identity into one of our own JWTs.
///
/// A direct port of the Java OAuth2SuccessHandler, and deliberately so: both
/// backends write to the same customer table, so "first sign-in with Google"
/// has to create the same row either way, or the second backend would see a
/// duplicate e-mail and refuse.
///
/// The rest of the application is stateless and JWT based. Google is only ever
/// used to establish WHO the person is; from the moment this returns, a Google
/// user is indistinguishable from one who signed in with a password.
/// </summary>
public class GoogleSignInService
{
    private readonly FleetDbContext _db;
    private readonly ITokenService _tokens;
    private readonly ILogger<GoogleSignInService> _logger;

    public GoogleSignInService(
        FleetDbContext db,
        ITokenService tokens,
        ILogger<GoogleSignInService> logger)
    {
        _db = db;
        _tokens = tokens;
        _logger = logger;
    }

    /// <summary>
    /// Resolves the Google profile to an account and issues a token for it.
    ///
    /// Staff are checked first, the same order the Java handler uses: a staff
    /// member whose e-mail also exists as a customer should get their staff
    /// session, not the customer one.
    /// </summary>
    public async Task<GoogleSignInResult> SignInAsync(
        string email,
        string? givenName,
        string? familyName,
        string? fullName,
        CancellationToken ct = default)
    {
        email = email.Trim().ToLowerInvariant();

        var staff = await _db.Staff
            .Include(s => s.Hub)
            .FirstOrDefaultAsync(s => s.Email == email, ct);

        if (staff is not null)
        {
            _logger.LogInformation("Google sign-in matched staff account {Email}", email);

            return new GoogleSignInResult(
                _tokens.CreateStaffToken(staff.Id, staff.Email, staff.HubId), "STAFF");
        }

        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Email == email, ct);

        if (customer is null)
        {
            customer = await CreateFromGoogleAsync(email, givenName, familyName, fullName, ct);
            _logger.LogInformation("Created a new customer from Google sign-in: {Email}", email);
        }

        return new GoogleSignInResult(
            _tokens.CreateCustomerToken(customer.CustomerId, customer.Email), "CUSTOMER");
    }

    /// <summary>
    /// Builds a minimal customer from the Google profile.
    ///
    /// Without this a brand new Google user would simply be told they are not
    /// registered, which defeats the point of single sign-on. The profile is
    /// deliberately thin; they complete it on My Information or during their
    /// first booking.
    /// </summary>
    private async Task<Customer> CreateFromGoogleAsync(
        string email,
        string? givenName,
        string? familyName,
        string? fullName,
        CancellationToken ct)
    {
        var firstName = givenName;
        var lastName = familyName;

        // Google usually gives given_name / family_name, but not always -
        // some accounts only carry a single display name.
        if (string.IsNullOrWhiteSpace(firstName))
        {
            if (!string.IsNullOrWhiteSpace(fullName))
            {
                var parts = fullName.Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                firstName = parts[0];

                if (parts.Length > 1 && string.IsNullOrWhiteSpace(lastName)) lastName = parts[1];
            }
            else
            {
                firstName = email.Split('@')[0];
            }
        }

        var customer = new Customer
        {
            // A UUID, matching the Java generator, so ids stay unique across
            // both backends writing to the same table.
            CustomerId = Guid.NewGuid().ToString(),
            Email = email,
            FirstName = firstName!,
            LastName = lastName,
            Phone = await PlaceholderPhoneAsync(ct),

            // No password: this account can only ever sign in through Google.
            PasswordHash = null,
            IsActive = true,
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(ct);

        return customer;
    }

    /// <summary>
    /// A unique, obviously-fake phone number.
    ///
    /// phone is NOT NULL and UNIQUE in the schema and Google never gives us
    /// one, so the insert needs something. Starting with 0 means it can never
    /// collide with a real Indian mobile, which our validation requires to
    /// start 6-9 - so the customer is forced to replace it rather than being
    /// left with a plausible-looking wrong number.
    /// </summary>
    private async Task<string> PlaceholderPhoneAsync(CancellationToken ct)
    {
        while (true)
        {
            var candidate = "0" + DateTime.UtcNow.Ticks.ToString()[^9..];

            if (!await _db.Customers.AnyAsync(c => c.Phone == candidate, ct)) return candidate;
        }
    }
}
