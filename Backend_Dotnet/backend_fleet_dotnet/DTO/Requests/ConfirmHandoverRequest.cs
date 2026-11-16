using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

public class ConfirmHandoverRequest
{
    [Required] public long BookingId { get; set; }
    [Required, Range(0, 100)] public int FuelLevelOut { get; set; }
}
