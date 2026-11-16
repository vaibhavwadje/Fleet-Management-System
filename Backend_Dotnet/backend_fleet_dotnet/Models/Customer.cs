using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

[Table("customer")]
public class Customer : BaseEntity
{
    /// <summary>
    /// A UUID string, not an auto-increment. Generated on registration by the
    /// Java backend and kept identical here so a customer created in either
    /// backend is recognised by the other.
    /// </summary>
    [Key, Column("customer_id")] public string CustomerId { get; set; } = default!;

    [Column("first_name"), Required] public string FirstName { get; set; } = default!;
    [Column("last_name")] public string? LastName { get; set; }
    [Column("email"), Required] public string Email { get; set; } = default!;
    [Column("phone"), Required] public string Phone { get; set; } = default!;

    /// <summary>BCrypt. Java writes $2a$ hashes; BCrypt.Net reads them.</summary>
    [Column("password_hash")] public string? PasswordHash { get; set; }

    [Column("date_of_birth")] public DateOnly? DateOfBirth { get; set; }
    [Column("gender")] public string? Gender { get; set; }
    [Column("nationality")] public string? Nationality { get; set; }
    [Column("driving_license_no")] public string? DrivingLicenseNo { get; set; }
    [Column("passport_no")] public string? PassportNo { get; set; }

    [Column("address_line_1")] public string? AddressLine1 { get; set; }
    [Column("address_line_2")] public string? AddressLine2 { get; set; }

    [Column("city_id")] public int? CityId { get; set; }
    [ForeignKey(nameof(CityId))] public City? City { get; set; }

    [Column("state_id")] public int? StateId { get; set; }
    [ForeignKey(nameof(StateId))] public State? State { get; set; }

    [Column("pincode")] public string? Pincode { get; set; }
    [Column("is_active")] public bool? IsActive { get; set; } = true;

    [Column("document_type")] public DocumentType? DocumentType { get; set; }
    [Column("file_url")] public string? FileUrl { get; set; }
}
