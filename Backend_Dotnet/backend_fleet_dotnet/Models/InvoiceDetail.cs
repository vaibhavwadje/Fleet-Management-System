using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

[Table("invoice_detail")]
public class InvoiceDetail : BaseEntity
{
    [Key, Column("invoice_detail_id")] public long InvoiceDetailId { get; set; }
    [Column("invoice_id")] public long InvoiceId { get; set; }
    [Column("booking_detail_id")] public long? BookingDetailId { get; set; }
    [Column("addon_id")] public long? AddonId { get; set; }
    [Column("addon_name")] public string AddonName { get; set; } = default!;
    [Column("addon_price")] public decimal? AddonPrice { get; set; }
}
