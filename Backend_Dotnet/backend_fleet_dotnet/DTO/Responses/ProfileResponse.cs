namespace FleetManagement.DTO.Responses;

public class ProfileResponse
{
    public string CustomerId { get; set; } = default!;
    public string FirstName { get; set; } = default!;
    public string? LastName { get; set; }
    public string Email { get; set; } = default!;
    public string Phone { get; set; } = default!;
    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Nationality { get; set; }
    public string? DrivingLicenseNo { get; set; }
    public string? PassportNo { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public int? CityId { get; set; }
    public string? CityName { get; set; }
    public int? StateId { get; set; }
    public string? StateName { get; set; }
    public string? Pincode { get; set; }
    public string? DocumentType { get; set; }
}
