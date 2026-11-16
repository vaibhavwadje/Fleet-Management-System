using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

[Table("city")]
public class City : BaseEntity
{
    [Key, Column("city_id")] public int CityId { get; set; }
    [Column("city_name"), Required] public string CityName { get; set; } = default!;

    [Column("state_id")] public int StateId { get; set; }
    [ForeignKey(nameof(StateId))] public State? State { get; set; }
}
