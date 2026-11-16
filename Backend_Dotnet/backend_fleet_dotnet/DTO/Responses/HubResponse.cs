namespace FleetManagement.DTO.Responses;

public class HubResponse
{
    public int HubId { get; set; }
    public string HubName { get; set; } = default!;
    public string HubType { get; set; } = default!;
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public int CityId { get; set; }
    public string? CityName { get; set; }
    public int StateId { get; set; }
    public string? StateName { get; set; }
    public string? Pincode { get; set; }
    public string? Phone { get; set; }
}
