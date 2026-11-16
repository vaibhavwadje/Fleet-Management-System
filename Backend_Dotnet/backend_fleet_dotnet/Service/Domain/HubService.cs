using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FleetManagement.DTO.Responses;
using FleetManagement.Middleware;
using FleetManagement.Models;
using FleetManagement.Models.Enums;
using FleetManagement.Repository;

namespace FleetManagement.Service.Domain;

public class HubService : GenericService<Hub, HubResponse>
{
    public HubService(IGenericRepository<Hub> repo, IMapper mapper,
        ILogger<GenericService<Hub, HubResponse>> logger)
        : base(repo, mapper, logger) { }

    private IQueryable<Hub> WithNames()
        => Repository.Query().Include(h => h.City).Include(h => h.State);

    public async Task<IReadOnlyList<HubResponse>> GetByStateAndCityAsync(
        int stateId, int cityId, CancellationToken ct = default)
    {
        var hubs = await WithNames()
            .Where(h => h.StateId == stateId && h.CityId == cityId)
            .OrderBy(h => h.HubName)
            .ToListAsync(ct);

        return Mapper.Map<IReadOnlyList<HubResponse>>(hubs);
    }

    /// <summary>
    /// Every hub, for the staff location picker. The customer flow narrows
    /// state then city because a customer knows where they are; staff know the
    /// hub name and want to type it.
    /// </summary>
    public async Task<IReadOnlyList<HubResponse>> GetEveryHubAsync(CancellationToken ct = default)
    {
        var hubs = await WithNames().OrderBy(h => h.HubName).ToListAsync(ct);
        return Mapper.Map<IReadOnlyList<HubResponse>>(hubs);
    }

    public async Task<HubResponse> GetByIdWithNamesAsync(int hubId, CancellationToken ct = default)
    {
        var hub = await WithNames().FirstOrDefaultAsync(h => h.HubId == hubId, ct)
            ?? throw new ResourceNotFoundException("Hub not found");

        return Mapper.Map<HubResponse>(hub);
    }
}
