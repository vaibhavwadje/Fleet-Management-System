using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FleetManagement.DTO.Responses;
using FleetManagement.Middleware;
using FleetManagement.Models;
using FleetManagement.Models.Enums;
using FleetManagement.Repository;

namespace FleetManagement.Service.Domain;

public class AddonService : GenericService<Addon, AddonResponse>
{
    public AddonService(IGenericRepository<Addon> repo, IMapper mapper,
        ILogger<GenericService<Addon, AddonResponse>> logger)
        : base(repo, mapper, logger) { }

    public async Task<IReadOnlyList<AddonResponse>> GetByHubAsync(
        int hubId, CancellationToken ct = default)
        => Mapper.Map<IReadOnlyList<AddonResponse>>(
            await Repository.Query()
                .Where(a => a.HubId == hubId)
                .OrderBy(a => a.AddonName)
                .ToListAsync(ct));
}
