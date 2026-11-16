using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FleetManagement.DTO.Responses;
using FleetManagement.Middleware;
using FleetManagement.Models;
using FleetManagement.Models.Enums;
using FleetManagement.Repository;

namespace FleetManagement.Service.Domain;

public class CityService : GenericService<City, CityResponse>
{
    public CityService(IGenericRepository<City> repo, IMapper mapper,
        ILogger<GenericService<City, CityResponse>> logger)
        : base(repo, mapper, logger) { }

    public async Task<IReadOnlyList<CityResponse>> GetByStateAsync(
        int stateId, CancellationToken ct = default)
    {
        var cities = await Repository.Query()
            .Where(c => c.StateId == stateId)
            .OrderBy(c => c.CityName)
            .ToListAsync(ct);

        return Mapper.Map<IReadOnlyList<CityResponse>>(cities);
    }
}
