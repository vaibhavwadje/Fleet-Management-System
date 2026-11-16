namespace FleetManagement.DTO.Responses;

public class AddonResponse
{
    public int AddonId { get; set; }
    public string AddonName { get; set; } = default!;
    public string? Description { get; set; }
    public double PricePerDay { get; set; }
}
