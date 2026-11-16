using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

public class BookingRequest
{
    public long? CarId { get; set; }

    [Required(ErrorMessage = "Car type is required")]
    public long CarTypeId { get; set; }

    // Copied onto the customer's profile when supplied, so the booking
    // snapshot and the invoice both end up with a real address.
    public string? DrivingLicenseNo { get; set; }
    public string? PassportNo { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public int? StateId { get; set; }
    public int? CityId { get; set; }
    public string? Pincode { get; set; }

    [Required(ErrorMessage = "Start date is required")]
    public DateOnly StartDate { get; set; }

    [Required(ErrorMessage = "End date is required")]
    public DateOnly EndDate { get; set; }

    [Required(ErrorMessage = "Pick-up hub is required")]
    public int PickupHubId { get; set; }
    public string? PickupHubName { get; set; }

    [Required(ErrorMessage = "Drop-off hub is required")]
    public int DropoffHubId { get; set; }
    public string? DropoffHubName { get; set; }

    // Accepted and IGNORED. Every amount is recalculated on the server from
    // the rate card - see BookingService.ApplyPricing.
    public decimal? DailyRate { get; set; }
    public decimal? WeeklyRate { get; set; }
    public decimal? MonthlyRate { get; set; }
    public int Duration { get; set; }
    public decimal? VehicleAmount { get; set; }
    public decimal? AddonAmount { get; set; }
    public decimal? TaxAmount { get; set; }
    public decimal? GrandTotal { get; set; }

    public List<AddonRequest>? Addons { get; set; }
}
