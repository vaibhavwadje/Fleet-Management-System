using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

public class UpdateBookingStatusRequest
{
    [Required] public string Status { get; set; } = default!;
}
