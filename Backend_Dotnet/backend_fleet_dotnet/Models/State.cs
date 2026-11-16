using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

[Table("state")]
public class State : BaseEntity
{
    [Key, Column("state_id")] public int StateId { get; set; }
    [Column("state_name"), Required] public string StateName { get; set; } = default!;

    public ICollection<City> Cities { get; set; } = new List<City>();
}
