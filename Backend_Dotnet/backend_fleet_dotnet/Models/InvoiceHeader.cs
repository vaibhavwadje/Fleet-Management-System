using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

[Table("invoice_header")]
public class InvoiceHeader : BaseEntity
{
    [Key, Column("invoice_id")] public long InvoiceId { get; set; }
    [Column("booking_id")] public long BookingId { get; set; }

    /// <summary>Assigned at RETURN, not at hand-over. Format INV-{year}-{id}.</summary>
    [Column("invoice_no")] public string? InvoiceNo { get; set; }
    [Column("invoice_date")] public DateTime? InvoiceDate { get; set; }
    [Column("return_date")] public DateTime? ReturnDate { get; set; }

    [Column("customer_id")] public string? CustomerId { get; set; }
    [Column("first_name")] public string? FirstName { get; set; }
    [Column("last_name")] public string? LastName { get; set; }
    [Column("email")] public string? Email { get; set; }
    [Column("phone")] public string? Phone { get; set; }
    [Column("driving_license_no")] public string? DrivingLicenseNo { get; set; }
    [Column("passport_no")] public string? PassportNo { get; set; }
    [Column("address_line_1")] public string? AddressLine1 { get; set; }
    [Column("address_line_2")] public string? AddressLine2 { get; set; }
    [Column("city_id")] public int? CityId { get; set; }
    [Column("state_id")] public int? StateId { get; set; }
    [Column("pincode")] public string? Pincode { get; set; }

    [Column("car_id")] public int? CarId { get; set; }
    [Column("registration_no")] public string? RegistrationNo { get; set; }
    [Column("brand_name")] public string? BrandName { get; set; }
    [Column("model_name")] public string? ModelName { get; set; }
    [Column("car_type_id")] public long? CarTypeId { get; set; }

    [Column("pickup_hub_id")] public int? PickupHubId { get; set; }
    [Column("pickup_hub_name")] public string? PickupHubName { get; set; }
    [Column("dropoff_hub_id")] public int? DropoffHubId { get; set; }
    [Column("dropoff_hub_name")] public string? DropoffHubName { get; set; }

    [Column("start_date")] public DateOnly? StartDate { get; set; }
    [Column("end_date")] public DateOnly? EndDate { get; set; }
    [Column("handover_date")] public DateTime? HandoverDate { get; set; }
    [Column("duration")] public int? Duration { get; set; }

    [Column("daily_rate")] public decimal? DailyRate { get; set; }
    [Column("weekly_rate")] public decimal? WeeklyRate { get; set; }
    [Column("monthly_rate")] public decimal? MonthlyRate { get; set; }

    [Column("vehicle_amount")] public decimal? VehicleAmount { get; set; }
    [Column("addon_amount")] public decimal? AddonAmount { get; set; }
    [Column("tax_amount")] public decimal? TaxAmount { get; set; }
    [Column("grand_total")] public decimal? GrandTotal { get; set; }

    [Column("fuel_level_out")] public int? FuelLevelOut { get; set; }
    [Column("fuel_level_in")] public int? FuelLevelIn { get; set; }
    [Column("fuel_charges")] public decimal? FuelCharges { get; set; }
}
