namespace FleetManagement.DTO.Responses;

public class StaffResponse
{
    public int Id { get; set; }
    public string FirstName { get; set; } = default!;
    public string LastName { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string? Gender { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string Phone { get; set; } = default!;
    public string AddressLine1 { get; set; } = default!;
    public string? AddressLine2 { get; set; }
    public string CityName { get; set; } = default!;
    public string StateName { get; set; } = default!;
    public int HubId { get; set; }
    public string? HubName { get; set; }
}
