using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

public class ReturnVehicleRequest
{
    [Required] public long BookingId { get; set; }
    [Required, Range(0, 100)] public int FuelLevelIn { get; set; }

    /// <summary>
    /// No longer used, and deliberately not required. The fuel charge is
    /// calculated on the server from the two gauge readings; whatever arrives
    /// here is ignored. Kept so an older client keeps working.
    /// </summary>
    public decimal? FuelCharges { get; set; }
}
