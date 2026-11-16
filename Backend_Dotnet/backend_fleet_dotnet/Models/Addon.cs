using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

[Table("addon")]
public class Addon : BaseEntity
{
    [Key, Column("addon_id")] public int AddonId { get; set; }
    [Column("addon_name"), Required] public string AddonName { get; set; } = default!;
    [Column("description")] public string? Description { get; set; }
    [Column("price_per_day")] public double PricePerDay { get; set; }

    [Column("hub_id")] public int HubId { get; set; }
    [ForeignKey(nameof(HubId))] public Hub? Hub { get; set; }

    [Column("available_quantity")] public int AvailableQuantity { get; set; }
    [Column("effective_from")] public DateOnly? EffectiveFrom { get; set; }
    [Column("effective_to")] public DateOnly? EffectiveTo { get; set; }
}
