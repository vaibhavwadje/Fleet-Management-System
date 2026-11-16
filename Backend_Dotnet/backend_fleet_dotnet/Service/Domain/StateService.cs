using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FleetManagement.DTO.Responses;
using FleetManagement.Middleware;
using FleetManagement.Models;
using FleetManagement.Models.Enums;
using FleetManagement.Repository;

namespace FleetManagement.Service.Domain;

// ─────────────────────────────────────────────────────────────────────────────
//  REQUIREMENT 9 - entity-specific services that INTERNALLY CALL the generic
//  one.
//
//  Each inherits GenericService<TEntity, TDto>, so plain CRUD is already
//  there, and adds only the queries genuinely specific to the entity. That is
//  the pattern the requirement describes - the assignment's "EmployeeService"
//  is the same shape applied to a sample entity; these are the same shape
//  applied to the real domain.
// ─────────────────────────────────────────────────────────────────────────────

public class StateService : GenericService<State, StateResponse>
{
    public StateService(IGenericRepository<State> repo, IMapper mapper,
        ILogger<GenericService<State, StateResponse>> logger)
        : base(repo, mapper, logger) { }

    /// <summary>Alphabetical, because it feeds a type-to-search dropdown.</summary>
    public async Task<IReadOnlyList<StateResponse>> GetAllOrderedAsync(CancellationToken ct = default)
    {
        var states = await Repository.Query().OrderBy(s => s.StateName).ToListAsync(ct);
        return Mapper.Map<IReadOnlyList<StateResponse>>(states);
    }
}
