namespace FleetManagement.DTO.Responses;

public class CarResponse
{
    public int CarId { get; set; }
    public string RegistrationNo { get; set; } = default!;
    public string ModelName { get; set; } = default!;
    public string BrandName { get; set; } = default!;
    public int Year { get; set; }
    public string Transmission { get; set; } = default!;
    public double? Mileage { get; set; }
    public string FuelType { get; set; } = default!;
    public int? SeatCapacity { get; set; }
    public DateOnly? ServiceDueDate { get; set; }
    public string Status { get; set; } = default!;
    public string? Image { get; set; }
    public int CarTypeId { get; set; }
    public int HubId { get; set; }
    public string? HubName { get; set; }
}
