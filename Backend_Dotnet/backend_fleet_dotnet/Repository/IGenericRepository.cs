using System.Linq.Expressions;

namespace FleetManagement.Repository;

/// <summary>
/// REQUIREMENT 7 - the generic CRUD contract, reusable for every entity.
///
/// WHY IQueryable IS EXPOSED
/// -------------------------
/// Query() lets a caller compose a filter that is translated into SQL and runs
/// in the database. Without it every "find the bookings for this hub" would
/// have to pull the whole table into memory and filter it in C# - correct, and
/// unusable at 1,800 cars.
///
/// It is a deliberate leak of EF into the service layer. The alternative is a
/// specification pattern, which is more ceremony than this project needs.
/// </summary>
public interface IGenericRepository<T> where T : class
{
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default);

    Task<T?> GetByIdAsync(object id, CancellationToken ct = default);

    Task<IReadOnlyList<T>> FindAsync(
        Expression<Func<T, bool>> predicate, CancellationToken ct = default);

    Task<T?> FirstOrDefaultAsync(
        Expression<Func<T, bool>> predicate, CancellationToken ct = default);

    Task<bool> ExistsAsync(
        Expression<Func<T, bool>> predicate, CancellationToken ct = default);

    Task<int> CountAsync(
        Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default);

    Task<T> AddAsync(T entity, CancellationToken ct = default);

    Task AddRangeAsync(IEnumerable<T> entities, CancellationToken ct = default);

    Task<T> UpdateAsync(T entity, CancellationToken ct = default);

    Task DeleteAsync(T entity, CancellationToken ct = default);

    /// <summary>Composable query, for paging and joins. Not tracked.</summary>
    IQueryable<T> Query();

    /// <summary>
    /// Commits. Separate from the operations above so a service can make
    /// several changes and have them succeed or fail together.
    /// </summary>
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
