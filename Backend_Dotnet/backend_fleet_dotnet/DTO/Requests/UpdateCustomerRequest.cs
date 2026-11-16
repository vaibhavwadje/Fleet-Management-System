using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

public class UpdateCustomerRequest
{
    [StringLength(50)] public string? FirstName { get; set; }
    [StringLength(50)] public string? LastName { get; set; }

    [RegularExpression(@"^$|^[6-9]\d{9}$", ErrorMessage = "Invalid phone number")]
    public string? Phone { get; set; }

    /// <summary>
    /// Nobody was born tomorrow. The picker sets max="today", but this
    /// endpoint can be called directly.
    /// </summary>
    public DateOnly? DateOfBirth { get; set; }

    [StringLength(10)] public string? Gender { get; set; }
    [StringLength(50)] public string? Nationality { get; set; }
    public string? DrivingLicenseNo { get; set; }
    public string? PassportNo { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public int? CityId { get; set; }
    public int? StateId { get; set; }

    [RegularExpression(@"^$|^\d{6}$", ErrorMessage = "Pincode must be 6 digits")]
    public string? Pincode { get; set; }

    public string? DocumentType { get; set; }
}
