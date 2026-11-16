using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

[Table("staff")]
public class Staff : BaseEntity
{
    [Key, Column("id")] public int Id { get; set; }

    [Column("first_name"), Required] public string FirstName { get; set; } = default!;
    [Column("last_name"), Required] public string LastName { get; set; } = default!;
    [Column("email"), Required] public string Email { get; set; } = default!;
    [Column("gender")] public string? Gender { get; set; }
    [Column("date_of_birth")] public DateOnly? DateOfBirth { get; set; }
    [Column("password_hash"), Required] public string PasswordHash { get; set; } = default!;
    [Column("phone"), Required] public string Phone { get; set; } = default!;

    [Column("address_line_1"), Required] public string AddressLine1 { get; set; } = default!;
    [Column("address_line_2")] public string? AddressLine2 { get; set; }
    [Column("city_name"), Required] public string CityName { get; set; } = default!;
    [Column("state_name"), Required] public string StateName { get; set; } = default!;

    /// <summary>The hub this staff member works at. Drives every scoped list.</summary>
    [Column("hub_id")] public int HubId { get; set; }
    [ForeignKey(nameof(HubId))] public Hub? Hub { get; set; }
}
