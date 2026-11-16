using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

[Table("hub")]
public class Hub : BaseEntity
{
    [Key, Column("hub_id")] public int HubId { get; set; }
    [Column("hub_name"), Required] public string HubName { get; set; } = default!;

    [Column("hub_type")] public HubType HubType { get; set; }

    [Column("address_line_1")] public string? AddressLine1 { get; set; }
    [Column("address_line_2")] public string? AddressLine2 { get; set; }

    [Column("city_id")] public int CityId { get; set; }
    [ForeignKey(nameof(CityId))] public City? City { get; set; }

    [Column("state_id")] public int StateId { get; set; }
    [ForeignKey(nameof(StateId))] public State? State { get; set; }

    [Column("pincode")] public string? Pincode { get; set; }
    [Column("phone")] public string? Phone { get; set; }
}
