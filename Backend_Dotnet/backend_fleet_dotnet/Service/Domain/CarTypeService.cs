using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FleetManagement.DTO.Responses;
using FleetManagement.Middleware;
using FleetManagement.Models;
using FleetManagement.Models.Enums;
using FleetManagement.Repository;

namespace FleetManagement.Service.Domain;

public class CarTypeService : GenericService<CarType, CarTypeResponse>
{
    public CarTypeService(IGenericRepository<CarType> repo, IMapper mapper,
        ILogger<GenericService<CarType, CarTypeResponse>> logger)
        : base(repo, mapper, logger) { }

    public async Task<IReadOnlyList<CarTypeResponse>> GetByHubAsync(
        int hubId, CancellationToken ct = default)
    {
        var types = await Repository.Query()
            .Include(t => t.Hub)
            .Where(t => t.HubId == hubId)
            .ToListAsync(ct);

        return Mapper.Map<IReadOnlyList<CarTypeResponse>>(types);
    }
}
