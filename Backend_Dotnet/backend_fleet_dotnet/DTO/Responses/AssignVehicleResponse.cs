namespace FleetManagement.DTO.Responses;

public class AssignVehicleResponse
{
    public long BookingId { get; set; }
    public int AssignedCarId { get; set; }
    public string? CarRegistrationNo { get; set; }
    public string? BrandName { get; set; }
    public string? ModelName { get; set; }
    public string Message { get; set; } = default!;
}
