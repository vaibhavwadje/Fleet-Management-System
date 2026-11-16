using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

/// <summary>Staff changing where a booking is collected from or returned to.</summary>
public class UpdateBookingLocationsRequest
{
    /// <summary>Refused once the vehicle has been handed over.</summary>
    public int? PickupHubId { get; set; }

    /// <summary>Editable right up until the vehicle is returned.</summary>
    public int? DropoffHubId { get; set; }
}
