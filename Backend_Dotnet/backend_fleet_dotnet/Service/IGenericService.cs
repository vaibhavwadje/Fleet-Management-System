using System.Linq.Expressions;

namespace FleetManagement.Service;

/// <summary>
/// REQUIREMENT 7 (service half) - standard CRUD over any entity, with the
/// mapping to and from DTOs already done.
///
/// WHY A SERVICE LAYER ON TOP OF A GENERIC REPOSITORY
/// --------------------------------------------------
/// The repository speaks entities; controllers must not. Something has to run
/// AutoMapper between them, and putting it here means an entity-specific
/// service gets the whole of CRUD for free and writes only the parts that are
/// actually specific to it.
///
/// TEntity - the EF model.  TDto - what the API exposes.
/// </summary>
public interface IGenericService<TEntity, TDto>
    where TEntity : class
    where TDto : class
{
    Task<IReadOnlyList<TDto>> GetAllAsync(CancellationToken ct = default);

    Task<TDto?> GetByIdAsync(object id, CancellationToken ct = default);

    /// <summary>Like GetByIdAsync, but throws ResourceNotFoundException.</summary>
    Task<TDto> GetByIdOrThrowAsync(object id, CancellationToken ct = default);

    Task<IReadOnlyList<TDto>> FindAsync(
        Expression<Func<TEntity, bool>> predicate, CancellationToken ct = default);

    Task<TDto> CreateAsync<TCreateDto>(TCreateDto dto, CancellationToken ct = default)
        where TCreateDto : class;

    Task<TDto> UpdateAsync<TUpdateDto>(object id, TUpdateDto dto, CancellationToken ct = default)
        where TUpdateDto : class;

    Task DeleteAsync(object id, CancellationToken ct = default);

    Task<int> CountAsync(
        Expression<Func<TEntity, bool>>? predicate = null, CancellationToken ct = default);
}
