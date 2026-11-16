using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using FleetManagement.Data;

namespace FleetManagement.Repository;

/// <summary>
/// REQUIREMENT 8 - one implementation, reused by every entity.
///
/// Registered open-generically in Program.cs:
///     services.AddScoped(typeof(IGenericRepository&lt;&gt;), typeof(GenericRepository&lt;&gt;));
/// so asking for IGenericRepository&lt;Car&gt; resolves without a line of
/// per-entity wiring.
/// </summary>
public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    protected readonly FleetDbContext Context;
    protected readonly DbSet<T> Set;
    private readonly ILogger<GenericRepository<T>> _logger;

    public GenericRepository(FleetDbContext context, ILogger<GenericRepository<T>> logger)
    {
        Context = context;
        Set = context.Set<T>();
        _logger = logger;
    }

    public async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default)
        => await Set.AsNoTracking().ToListAsync(ct);

    public async Task<T?> GetByIdAsync(object id, CancellationToken ct = default)
        => await Set.FindAsync(new[] { id }, ct);

    public async Task<IReadOnlyList<T>> FindAsync(
        Expression<Func<T, bool>> predicate, CancellationToken ct = default)
        => await Set.AsNoTracking().Where(predicate).ToListAsync(ct);

    public async Task<T?> FirstOrDefaultAsync(
        Expression<Func<T, bool>> predicate, CancellationToken ct = default)
        => await Set.FirstOrDefaultAsync(predicate, ct);

    public async Task<bool> ExistsAsync(
        Expression<Func<T, bool>> predicate, CancellationToken ct = default)
        => await Set.AsNoTracking().AnyAsync(predicate, ct);

    public async Task<int> CountAsync(
        Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default)
        => predicate is null
            ? await Set.AsNoTracking().CountAsync(ct)
            : await Set.AsNoTracking().CountAsync(predicate, ct);

    public async Task<T> AddAsync(T entity, CancellationToken ct = default)
    {
        await Set.AddAsync(entity, ct);
        _logger.LogDebug("Added {Entity}", typeof(T).Name);
        return entity;
    }

    public async Task AddRangeAsync(IEnumerable<T> entities, CancellationToken ct = default)
        => await Set.AddRangeAsync(entities, ct);

    public Task<T> UpdateAsync(T entity, CancellationToken ct = default)
    {
        Set.Update(entity);
        _logger.LogDebug("Updated {Entity}", typeof(T).Name);
        return Task.FromResult(entity);
    }

    public Task DeleteAsync(T entity, CancellationToken ct = default)
    {
        Set.Remove(entity);
        _logger.LogDebug("Deleted {Entity}", typeof(T).Name);
        return Task.CompletedTask;
    }

    /// <summary>
    /// AsNoTracking because callers compose read queries with this. A service
    /// that needs to modify what it reads uses FirstOrDefaultAsync instead,
    /// which does track.
    /// </summary>
    public IQueryable<T> Query() => Set.AsNoTracking();

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
        => Context.SaveChangesAsync(ct);
}
