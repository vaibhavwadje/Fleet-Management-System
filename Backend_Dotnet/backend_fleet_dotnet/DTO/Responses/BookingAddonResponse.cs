namespace FleetManagement.DTO.Responses;

public class BookingAddonResponse
{
    public long BookingDetailId { get; set; }
    public long? AddonId { get; set; }
    public string? AddonName { get; set; }
    public decimal? AddonPrice { get; set; }
}
