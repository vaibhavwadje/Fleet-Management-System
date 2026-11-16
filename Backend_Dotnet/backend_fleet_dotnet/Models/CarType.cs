using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

[Table("car_type")]
public class CarType : BaseEntity
{
    [Key, Column("car_type_id")] public int CarTypeId { get; set; }

    [Column("car_class")] public CarClass CarClass { get; set; }

    /// <summary>Display name, e.g. "Full Size SUV".</summary>
    [Column("car_type"), Required] public string CarTypeName { get; set; } = default!;

    [Column("image_url")] public string? ImageUrl { get; set; }

    [Column("daily_rate")] public double? DailyRate { get; set; }
    [Column("weekly_rate")] public double? WeeklyRate { get; set; }
    [Column("monthly_rate")] public double? MonthlyRate { get; set; }

    [Column("hub_id")] public int HubId { get; set; }
    [ForeignKey(nameof(HubId))] public Hub? Hub { get; set; }

    [Column("effective_from")] public DateOnly? EffectiveFrom { get; set; }
    [Column("effective_to")] public DateOnly? EffectiveTo { get; set; }
}
