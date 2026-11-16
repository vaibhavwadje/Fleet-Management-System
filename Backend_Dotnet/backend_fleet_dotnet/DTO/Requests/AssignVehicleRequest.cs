using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

public class AssignVehicleRequest
{
    [Required] public long BookingId { get; set; }
    [Required] public int CarId { get; set; }
}
