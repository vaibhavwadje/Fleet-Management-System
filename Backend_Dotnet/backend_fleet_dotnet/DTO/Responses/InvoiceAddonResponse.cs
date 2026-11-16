namespace FleetManagement.DTO.Responses;

public class InvoiceAddonResponse
{
    public long InvoiceDetailId { get; set; }
    public long? AddonId { get; set; }
    public string AddonName { get; set; } = default!;
    public decimal? AddonPrice { get; set; }
}
