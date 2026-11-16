namespace FleetManagement.DTO.Responses;

/// <summary>
/// Mirrors the Java BookingResponse field for field. The React client reads
/// every one of these names, so renaming any of them breaks the UI.
/// </summary>
public class BookingResponse
{
    public long BookingId { get; set; }
    public string BookingStatus { get; set; } = default!;
    public DateTime? BookingDate { get; set; }

    public string? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? DrivingLicenseNo { get; set; }

    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public int? CityId { get; set; }
    public string? CityName { get; set; }
    public int? StateId { get; set; }
    public string? StateName { get; set; }
    public string? Pincode { get; set; }

    public long? CarId { get; set; }
    public long? CarTypeId { get; set; }
    public string? CarTypeName { get; set; }
    public string? CarClass { get; set; }
    public string? CarTypeImageUrl { get; set; }

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int Duration { get; set; }

    public int? PickupHubId { get; set; }
    public string? PickupHubName { get; set; }
    public int? DropoffHubId { get; set; }
    public string? DropoffHubName { get; set; }

    public decimal? DailyRate { get; set; }
    public decimal? WeeklyRate { get; set; }
    public decimal? MonthlyRate { get; set; }

    public decimal VehicleAmount { get; set; }
    public decimal AddonAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal GrandTotal { get; set; }

    public int? AssignedCarId { get; set; }
    public string? AssignedCarRegistrationNo { get; set; }
    public string? AssignedCarBrandName { get; set; }
    public string? AssignedCarModelName { get; set; }

    public DateTime? HandoverDate { get; set; }
    public int? FuelLevelOut { get; set; }
    public int? FuelLevelIn { get; set; }
    public decimal? FuelCharges { get; set; }

    public List<BookingAddonResponse> Addons { get; set; } = new();

    /// <summary>True when the caller's hub is this booking's pick-up hub.</summary>
    public bool PickupHub { get; set; }

    /// <summary>True when the caller's hub is this booking's drop-off hub.</summary>
    public bool DropoffHub { get; set; }
}
