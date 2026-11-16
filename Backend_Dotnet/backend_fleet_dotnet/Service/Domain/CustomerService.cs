using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FleetManagement.DTO.Requests;
using FleetManagement.DTO.Responses;
using FleetManagement.Middleware;
using FleetManagement.Models;
using FleetManagement.Repository;

namespace FleetManagement.Service.Domain;

/// <summary>
/// Customer registration, login and profile.
///
/// PASSWORD COMPATIBILITY
/// ----------------------
/// BCrypt.Net verifies the $2a$ hashes Spring Security wrote, and writes
/// hashes Spring Security can verify. A customer who registered against the
/// Java backend can sign in here and vice versa - which is the point of
/// sharing one database.
/// </summary>
public class CustomerService : GenericService<Customer, ProfileResponse>
{
    private readonly ITokenService _tokens;
    private readonly ICurrentUserService _currentUser;

    public CustomerService(
        IGenericRepository<Customer> repo,
        IMapper mapper,
        ILogger<GenericService<Customer, ProfileResponse>> logger,
        ITokenService tokens,
        ICurrentUserService currentUser)
        : base(repo, mapper, logger)
    {
        _tokens = tokens;
        _currentUser = currentUser;
    }

    public async Task<string> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (await Repository.ExistsAsync(c => c.Email == email, ct))
        {
            throw new BusinessException("An account with this email already exists");
        }

        if (await Repository.ExistsAsync(c => c.Phone == request.Phone, ct))
        {
            throw new BusinessException("An account with this phone number already exists");
        }

        var customer = new Customer
        {
            // A UUID, matching the Java generator, so ids stay unique across
            // both backends writing to the same table.
            CustomerId = Guid.NewGuid().ToString(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            Phone = request.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsActive = true,
        };

        await Repository.AddAsync(customer, ct);
        await Repository.SaveChangesAsync(ct);

        Logger.LogInformation("Registered customer {Email}", email);

        return "Registration successful";
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var customer = await Repository.FirstOrDefaultAsync(c => c.Email == email, ct);

        // One message for both "no such account" and "wrong password". Telling
        // them apart tells an attacker which e-mails are registered.
        if (customer is null
            || string.IsNullOrEmpty(customer.PasswordHash)
            || !BCrypt.Net.BCrypt.Verify(request.Password, customer.PasswordHash))
        {
            Logger.LogWarning("Failed customer login for {Email}", email);
            throw new UnauthorizedActionException("Invalid email or password");
        }

        return new LoginResponse
        {
            AccessToken = _tokens.CreateCustomerToken(customer.CustomerId, customer.Email),
            TokenType = "Bearer",
            CustomerId = customer.CustomerId,
            Email = customer.Email,
        };
    }

    /// <summary>The signed-in customer, resolved from the JWT subject.</summary>
    public async Task<Customer> RequireCurrentCustomerAsync(CancellationToken ct = default)
    {
        var email = _currentUser.RequireEmail();

        return await Repository.Query()
            .Include(c => c.City).Include(c => c.State)
            .FirstOrDefaultAsync(c => c.Email == email, ct)
            ?? throw new ResourceNotFoundException("Customer not found");
    }

    public async Task<ProfileResponse> GetProfileAsync(CancellationToken ct = default)
        => Mapper.Map<ProfileResponse>(await RequireCurrentCustomerAsync(ct));

    public async Task<ProfileResponse> UpdateProfileAsync(
        UpdateCustomerRequest request, CancellationToken ct = default)
    {
        // Nobody was born today or later. Enforced here rather than as an
        // attribute because the DTO is also used for partial updates that omit
        // the field entirely.
        if (request.DateOfBirth is { } dob
            && dob >= DateOnly.FromDateTime(DateTime.Today))
        {
            throw new BusinessException("Date of birth cannot be today or a future date");
        }

        var email = _currentUser.RequireEmail();

        var customer = await Repository.FirstOrDefaultAsync(c => c.Email == email, ct)
            ?? throw new ResourceNotFoundException("Customer not found");

        // Null members are skipped by the profile, so an omitted field keeps
        // its current value instead of being wiped.
        Mapper.Map(request, customer);

        if (!string.IsNullOrWhiteSpace(request.DocumentType)
            && Enum.TryParse<Models.Enums.DocumentType>(request.DocumentType, true, out var dt))
        {
            customer.DocumentType = dt;
        }

        await Repository.UpdateAsync(customer, ct);
        await Repository.SaveChangesAsync(ct);

        Logger.LogInformation("Updated profile for {Email}", email);

        return await GetProfileAsync(ct);
    }

    public async Task<string> ChangePasswordAsync(
        ChangePasswordRequest request, CancellationToken ct = default)
    {
        if (request.NewPassword != request.ConfirmPassword)
        {
            throw new BusinessException("The new passwords do not match");
        }

        var email = _currentUser.RequireEmail();

        var customer = await Repository.FirstOrDefaultAsync(c => c.Email == email, ct)
            ?? throw new ResourceNotFoundException("Customer not found");

        if (string.IsNullOrEmpty(customer.PasswordHash)
            || !BCrypt.Net.BCrypt.Verify(request.OldPassword, customer.PasswordHash))
        {
            throw new BusinessException("Your current password is not correct");
        }

        customer.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

        await Repository.UpdateAsync(customer, ct);
        await Repository.SaveChangesAsync(ct);

        Logger.LogInformation("Password changed for {Email}", email);

        return "Password changed successfully";
    }
}
