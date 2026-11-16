using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FleetManagement.DTO.Requests;
using FleetManagement.DTO.Responses;
using FleetManagement.Middleware;
using FleetManagement.Models;
using FleetManagement.Repository;

namespace FleetManagement.Service.Domain;

/// <summary>
/// Staff accounts and staff login.
///
/// Another entity-specific service over the generic one - see the note at the
/// top of <see cref="StateService"/> for what that pattern is and why.
/// </summary>
public class StaffService : GenericService<Staff, StaffResponse>
{
    private readonly ITokenService _tokens;
    private readonly ICurrentUserService _currentUser;

    public StaffService(
        IGenericRepository<Staff> repo,
        IMapper mapper,
        ILogger<GenericService<Staff, StaffResponse>> logger,
        ITokenService tokens,
        ICurrentUserService currentUser)
        : base(repo, mapper, logger)
    {
        _tokens = tokens;
        _currentUser = currentUser;
    }

    private IQueryable<Staff> WithHub() => Repository.Query().Include(s => s.Hub);

    public async Task<StaffLoginResponse> LoginAsync(
        LoginRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var staff = await Repository.Query()
            .Include(s => s.Hub)
            .FirstOrDefaultAsync(s => s.Email == email, ct);

        if (staff is null || !BCrypt.Net.BCrypt.Verify(request.Password, staff.PasswordHash))
        {
            Logger.LogWarning("Failed staff login for {Email}", email);
            throw new UnauthorizedActionException("Invalid email or password");
        }

        return new StaffLoginResponse
        {
            Token = _tokens.CreateStaffToken(staff.Id, staff.Email, staff.HubId),
            TokenType = "Bearer",
            StaffId = staff.Id,
            FirstName = staff.FirstName,
            LastName = staff.LastName,
            Email = staff.Email,
            HubId = staff.HubId,
        };
    }

    public async Task<StaffResponse> RegisterAsync(
        StaffRegisterRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (await Repository.ExistsAsync(s => s.Email == email, ct))
        {
            throw new BusinessException("A staff account with this email already exists");
        }

        var staff = Mapper.Map<Staff>(request);
        staff.Email = email;
        staff.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        await Repository.AddAsync(staff, ct);
        await Repository.SaveChangesAsync(ct);

        Logger.LogInformation("Registered staff {Email} at hub {HubId}", email, request.HubId);

        return Mapper.Map<StaffResponse>(staff);
    }

    public async Task<IReadOnlyList<StaffResponse>> GetAllWithHubAsync(CancellationToken ct = default)
        => Mapper.Map<IReadOnlyList<StaffResponse>>(await WithHub().ToListAsync(ct));

    public async Task<StaffResponse> GetOneAsync(int id, CancellationToken ct = default)
    {
        var staff = await WithHub().FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new ResourceNotFoundException("Staff not found");

        return Mapper.Map<StaffResponse>(staff);
    }

    public async Task<IReadOnlyList<StaffResponse>> GetByHubAsync(
        int hubId, CancellationToken ct = default)
        => Mapper.Map<IReadOnlyList<StaffResponse>>(
            await WithHub().Where(s => s.HubId == hubId).ToListAsync(ct));

    /// <summary>
    /// The signed-in staff member. Every hub-scoped list goes through this,
    /// so it is also the check that proves the caller is staff at all.
    /// </summary>
    public async Task<Staff> RequireCurrentStaffAsync(CancellationToken ct = default)
    {
        var email = _currentUser.RequireEmail();

        var staff = await Repository.Query()
            .Include(s => s.Hub)
            .FirstOrDefaultAsync(s => s.Email == email, ct)
            ?? throw new ResourceNotFoundException("Staff not found");

        if (staff.Hub is null)
        {
            throw new BusinessException(
                "Your staff account is not linked to a hub, so it cannot take bookings. "
                + "Please contact an administrator.");
        }

        return staff;
    }
}
