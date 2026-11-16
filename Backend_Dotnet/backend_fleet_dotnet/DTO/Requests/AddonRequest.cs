using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

public class AddonRequest
{
    public long? AddonId { get; set; }
    public string? AddonName { get; set; }
    public decimal? AddonPrice { get; set; }
}
