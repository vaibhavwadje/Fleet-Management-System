namespace FleetManagement.DTO.Responses;

public class InvoiceResponse
{
    public long InvoiceId { get; set; }
    public string? InvoiceNo { get; set; }
    public DateTime? InvoiceDate { get; set; }
    public long BookingId { get; set; }

    public string? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? DrivingLicenseNo { get; set; }
    public string? PassportNo { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? CityName { get; set; }
    public string? StateName { get; set; }
    public string? Pincode { get; set; }

    public int? CarId { get; set; }
    public string? RegistrationNo { get; set; }
    public string? BrandName { get; set; }
    public string? ModelName { get; set; }
    public string? CarTypeName { get; set; }

    public string? PickupHubName { get; set; }
    public string? DropoffHubName { get; set; }

    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public DateTime? HandoverDate { get; set; }
    public DateTime? ReturnDate { get; set; }
    public int? Duration { get; set; }

    public decimal? DailyRate { get; set; }
    public decimal? WeeklyRate { get; set; }
    public decimal? MonthlyRate { get; set; }

    public decimal VehicleAmount { get; set; }
    public decimal AddonAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal GrandTotal { get; set; }
    public decimal? FuelCharges { get; set; }

    /// <summary>grandTotal + fuelCharges. Derived, never stored.</summary>
    public decimal FinalAmount { get; set; }

    public int? FuelLevelOut { get; set; }
    public int? FuelLevelIn { get; set; }

    public List<InvoiceAddonResponse> Addons { get; set; } = new();
}
