using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FleetManagement.DTO.Responses;
using FleetManagement.Middleware;
using FleetManagement.Models;
using FleetManagement.Models.Enums;
using FleetManagement.Repository;

namespace FleetManagement.Service.Domain;

public class AirportService : GenericService<Airport, AirportResponse>
{
    public AirportService(IGenericRepository<Airport> repo, IMapper mapper,
        ILogger<GenericService<Airport, AirportResponse>> logger)
        : base(repo, mapper, logger) { }

    public async Task<IReadOnlyList<AirportResponse>> GetByCityAsync(
        int cityId, CancellationToken ct = default)
        => Mapper.Map<IReadOnlyList<AirportResponse>>(
            await Repository.Query().Where(a => a.CityId == cityId).ToListAsync(ct));

    /// <summary>
    /// Type-ahead over code and name. An empty keyword returns the first 20
    /// rather than all of them - the box is a search, not a list.
    /// </summary>
    public async Task<IReadOnlyList<AirportResponse>> SearchAsync(
        string? keyword, CancellationToken ct = default)
    {
        var query = Repository.Query();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            query = query.Where(a => a.AirportCode.Contains(k) || a.AirportName.Contains(k));
        }

        var airports = await query.OrderBy(a => a.AirportCode).Take(20).ToListAsync(ct);
        return Mapper.Map<IReadOnlyList<AirportResponse>>(airports);
    }

    public async Task<AirportResponse?> GetByHubAsync(int hubId, CancellationToken ct = default)
    {
        var airport = await Repository.Query().FirstOrDefaultAsync(a => a.HubId == hubId, ct);
        return airport is null ? null : Mapper.Map<AirportResponse>(airport);
    }
}
