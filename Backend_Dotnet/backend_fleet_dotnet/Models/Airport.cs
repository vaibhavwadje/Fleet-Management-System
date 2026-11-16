using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

[Table("airport")]
public class Airport : BaseEntity
{
    [Key, Column("airport_id")] public int AirportId { get; set; }
    [Column("airport_name"), Required] public string AirportName { get; set; } = default!;

    /// <summary>IATA code. Unique across the whole table.</summary>
    [Column("airport_code"), Required] public string AirportCode { get; set; } = default!;

    [Column("city_id")] public int CityId { get; set; }
    [ForeignKey(nameof(CityId))] public City? City { get; set; }

    [Column("state_id")] public int StateId { get; set; }
    [ForeignKey(nameof(StateId))] public State? State { get; set; }

    /// <summary>The hub that serves this airport.</summary>
    [Column("hub_id")] public int HubId { get; set; }
    [ForeignKey(nameof(HubId))] public Hub? Hub { get; set; }
}
