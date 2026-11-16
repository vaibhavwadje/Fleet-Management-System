using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

public class StaffRegisterRequest
{
    [Required] public string FirstName { get; set; } = default!;
    [Required] public string LastName { get; set; } = default!;
    [Required, EmailAddress] public string Email { get; set; } = default!;
    [Required, MinLength(8)] public string Password { get; set; } = default!;
    [Required] public string Phone { get; set; } = default!;
    public string? Gender { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    [Required] public string AddressLine1 { get; set; } = default!;
    public string? AddressLine2 { get; set; }
    [Required] public string CityName { get; set; } = default!;
    [Required] public string StateName { get; set; } = default!;
    [Required] public int HubId { get; set; }
}
