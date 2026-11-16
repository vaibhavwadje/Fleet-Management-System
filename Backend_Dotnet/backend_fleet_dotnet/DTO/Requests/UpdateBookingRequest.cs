using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

public class UpdateBookingRequest
{
    [Required] public long CarTypeId { get; set; }

    /// <summary>
    /// WHY THERE IS NO "not in the past" ATTRIBUTE HERE
    /// -----------------------------------------------
    /// It would make it impossible to change a booking whose vehicle is
    /// already out: the rental started days ago, so the start date IS in the
    /// past, and validation would reject the request before the service saw
    /// it - even though the customer only wants to move their return date.
    ///
    /// The rule still applies before hand-over, and BookingService enforces it
    /// there. Validation that only holds some of the time belongs where it can
    /// see which case it is in.
    /// </summary>
    [Required] public DateOnly StartDate { get; set; }

    [Required] public DateOnly EndDate { get; set; }
    [Required] public int PickupHubId { get; set; }
    public string? PickupHubName { get; set; }
    [Required] public int DropoffHubId { get; set; }
    public string? DropoffHubName { get; set; }

    [Required, Range(1, int.MaxValue, ErrorMessage = "Duration must be at least 1 day")]
    public int Duration { get; set; }

    public decimal? VehicleAmount { get; set; }
    public decimal? AddonAmount { get; set; }
    public decimal? TaxAmount { get; set; }
    public decimal? GrandTotal { get; set; }
    public List<AddonRequest>? Addons { get; set; }
}
