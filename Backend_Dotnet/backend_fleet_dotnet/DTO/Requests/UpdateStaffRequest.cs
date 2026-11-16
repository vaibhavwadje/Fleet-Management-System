using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

public class UpdateStaffRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Gender { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? Phone { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? CityName { get; set; }
    public string? StateName { get; set; }
    public int? HubId { get; set; }
}
