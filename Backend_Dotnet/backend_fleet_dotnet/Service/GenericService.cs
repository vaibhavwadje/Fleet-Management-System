using System.Linq.Expressions;
using AutoMapper;
using FleetManagement.Middleware;
using FleetManagement.Repository;

namespace FleetManagement.Service;

/// <summary>
/// REQUIREMENT 8 (service half) - the reusable implementation.
///
/// Entity-specific services inherit this and get CRUD for nothing, then add
/// only their own rules. See <see cref="Domain.StaffService"/> and
/// <see cref="Domain.CarService"/>, which is exactly the pattern requirement 9
/// describes: a specific service that internally calls the generic one.
/// </summary>
public class GenericService<TEntity, TDto> : IGenericService<TEntity, TDto>
    where TEntity : class
    where TDto : class
{
    protected readonly IGenericRepository<TEntity> Repository;
    protected readonly IMapper Mapper;
    protected readonly ILogger Logger;

    public GenericService(
        IGenericRepository<TEntity> repository,
        IMapper mapper,
        ILogger<GenericService<TEntity, TDto>> logger)
    {
        Repository = repository;
        Mapper = mapper;
        Logger = logger;
    }

    public virtual async Task<IReadOnlyList<TDto>> GetAllAsync(CancellationToken ct = default)
    {
        var entities = await Repository.GetAllAsync(ct);
        return Mapper.Map<IReadOnlyList<TDto>>(entities);
    }

    public virtual async Task<TDto?> GetByIdAsync(object id, CancellationToken ct = default)
    {
        var entity = await Repository.GetByIdAsync(id, ct);
        return entity is null ? null : Mapper.Map<TDto>(entity);
    }

    public virtual async Task<TDto> GetByIdOrThrowAsync(object id, CancellationToken ct = default)
    {
        var entity = await Repository.GetByIdAsync(id, ct)
            ?? throw new ResourceNotFoundException($"{typeof(TEntity).Name} not found");

        return Mapper.Map<TDto>(entity);
    }

    public virtual async Task<IReadOnlyList<TDto>> FindAsync(
        Expression<Func<TEntity, bool>> predicate, CancellationToken ct = default)
    {
        var entities = await Repository.FindAsync(predicate, ct);
        return Mapper.Map<IReadOnlyList<TDto>>(entities);
    }

    public virtual async Task<TDto> CreateAsync<TCreateDto>(
        TCreateDto dto, CancellationToken ct = default) where TCreateDto : class
    {
        var entity = Mapper.Map<TEntity>(dto);

        await Repository.AddAsync(entity, ct);
        await Repository.SaveChangesAsync(ct);

        Logger.LogInformation("Created {Entity}", typeof(TEntity).Name);
        return Mapper.Map<TDto>(entity);
    }

    public virtual async Task<TDto> UpdateAsync<TUpdateDto>(
        object id, TUpdateDto dto, CancellationToken ct = default) where TUpdateDto : class
    {
        var entity = await Repository.GetByIdAsync(id, ct)
            ?? throw new ResourceNotFoundException($"{typeof(TEntity).Name} not found");

        // Map ONTO the tracked entity rather than creating a new one, so
        // properties the DTO does not carry keep their existing values instead
        // of being overwritten with null.
        Mapper.Map(dto, entity);

        await Repository.UpdateAsync(entity, ct);
        await Repository.SaveChangesAsync(ct);

        Logger.LogInformation("Updated {Entity} {Id}", typeof(TEntity).Name, id);
        return Mapper.Map<TDto>(entity);
    }

    public virtual async Task DeleteAsync(object id, CancellationToken ct = default)
    {
        var entity = await Repository.GetByIdAsync(id, ct)
            ?? throw new ResourceNotFoundException($"{typeof(TEntity).Name} not found");

        await Repository.DeleteAsync(entity, ct);
        await Repository.SaveChangesAsync(ct);

        Logger.LogInformation("Deleted {Entity} {Id}", typeof(TEntity).Name, id);
    }

    public virtual Task<int> CountAsync(
        Expression<Func<TEntity, bool>>? predicate = null, CancellationToken ct = default)
        => Repository.CountAsync(predicate, ct);
}
