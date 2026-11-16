using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FleetManagement.DTO.Responses;
using FleetManagement.Middleware;
using FleetManagement.Models;
using FleetManagement.Models.Enums;
using FleetManagement.Repository;

namespace FleetManagement.Service.Domain;

public class CarService : GenericService<Car, CarResponse>
{
    /// <summary>
    /// Needed to translate a car_type_id into a category - see
    /// <see cref="GetByHubAndTypeAsync"/> for why that translation exists.
    /// </summary>
    private readonly IGenericRepository<CarType> _carTypes;

    public CarService(IGenericRepository<Car> repo, IMapper mapper,
        ILogger<GenericService<Car, CarResponse>> logger,
        IGenericRepository<CarType> carTypes)
        : base(repo, mapper, logger)
    {
        _carTypes = carTypes;
    }

    private IQueryable<Car> WithHub() => Repository.Query().Include(c => c.Hub);

    public async Task<IReadOnlyList<CarResponse>> GetAllWithHubAsync(CancellationToken ct = default)
        => Mapper.Map<IReadOnlyList<CarResponse>>(await WithHub().ToListAsync(ct));

    public async Task<CarResponse> GetOneAsync(int carId, CancellationToken ct = default)
    {
        var car = await WithHub().FirstOrDefaultAsync(c => c.CarId == carId, ct)
            ?? throw new ResourceNotFoundException("Vehicle not found");

        return Mapper.Map<CarResponse>(car);
    }

    public async Task<IReadOnlyList<CarResponse>> GetByHubAsync(
        int hubId, CarStatus? status, CancellationToken ct = default)
    {
        var query = WithHub().Where(c => c.HubId == hubId);
        if (status.HasValue) query = query.Where(c => c.Status == status.Value);

        return Mapper.Map<IReadOnlyList<CarResponse>>(
            await query.OrderBy(c => c.RegistrationNo).ToListAsync(ct));
    }

    /// <summary>
    /// Cars of one category at a hub - what the hand-over screen offers.
    /// The server refuses a mismatched category anyway; filtering here saves
    /// staff a failed attempt.
    ///
    /// WHY THE car_type_id IS TRANSLATED INSTEAD OF MATCHED
    /// ---------------------------------------------------
    /// car_type is a per-hub rate row: "Intermediate Sedan" exists once for
    /// every hub, each with its own car_type_id. The id that arrives here is
    /// whatever the BOOKING stored, which is the row at the hub the customer
    /// originally chose.
    ///
    /// Since hand-over went global that is very often not the hub being asked
    /// about. Indore staff open a booking made for Mumbai, the screen asks for
    /// hub 4 + BOM's car_type_id 2, and no Indore car will ever point at a BOM
    /// rate row - so the list comes back empty and the screen reports "no
    /// vehicle available" while the category is standing in the bay.
    ///
    /// So: read the CLASS off the incoming car type, then look for cars of
    /// that class at this hub. The class is the part that means the same thing
    /// everywhere; the id is a local rate row and is not portable.
    /// </summary>
    public async Task<IReadOnlyList<CarResponse>> GetByHubAndTypeAsync(
        int hubId, int carTypeId, CarStatus? status, CancellationToken ct = default)
    {
        var requested = await _carTypes.GetByIdAsync(carTypeId, ct)
            ?? throw new ResourceNotFoundException($"Car type not found with Id : {carTypeId}");

        var query = WithHub().Where(c => c.HubId == hubId);

        // Include(CarType) because the filter and the response both read it,
        // and a lazy load per row would be a query per car.
        query = query.Include(c => c.CarType)
            .Where(c => c.CarType!.CarClass == requested.CarClass);

        if (status.HasValue) query = query.Where(c => c.Status == status.Value);

        return Mapper.Map<IReadOnlyList<CarResponse>>(
            await query.OrderBy(c => c.RegistrationNo).ToListAsync(ct));
    }

    public async Task<IReadOnlyList<CarStatusCountResponse>> StatusCountsAsync(
        CancellationToken ct = default)
        => await Repository.Query()
            .GroupBy(c => c.Status)
            .Select(g => new CarStatusCountResponse
            {
                Status = g.Key.ToString(),
                Count = g.LongCount(),
            })
            .ToListAsync(ct);
}
