namespace FleetManagement.DTO.Responses;

public class AirportResponse
{
    public int AirportId { get; set; }
    public string AirportCode { get; set; } = default!;
    public string AirportName { get; set; } = default!;
    public int HubId { get; set; }
}
