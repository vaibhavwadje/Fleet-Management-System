using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

[Table("booking_detail")]
public class BookingDetail : BaseEntity
{
    [Key, Column("booking_detail_id")] public long BookingDetailId { get; set; }
    [Column("booking_id")] public long BookingId { get; set; }
    [Column("addon_id")] public long? AddonId { get; set; }
    [Column("addon_name")] public string? AddonName { get; set; }

    /// <summary>A TOTAL for the rental period, not a per-day rate.</summary>
    [Column("addon_price")] public decimal? AddonPrice { get; set; }

    [Column("booking_source")] public BookingSource BookingSource { get; set; }
}
