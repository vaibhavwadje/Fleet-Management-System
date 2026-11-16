using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

/// <summary>
/// A booking, with the customer details SNAPSHOTTED onto it.
///
/// The snapshot is deliberate and carried over from the Java design: an
/// invoice has to show the address the customer had when they rented, not the
/// one they moved to afterwards.
/// </summary>
[Table("booking_header")]
public class BookingHeader : BaseEntity
{
    [Key, Column("booking_id")] public long BookingId { get; set; }

    /// <summary>When the booking was placed.</summary>
    [Column("date")] public DateTime Date { get; set; }

    [Column("customer_id")] public string? CustomerId { get; set; }

    /// <summary>Nullable: the customer books a car TYPE, staff allocate the car.</summary>
    [Column("car_id")] public long? CarId { get; set; }
    [Column("car_type_id")] public long? CarTypeId { get; set; }

    [Column("start_date")] public DateOnly StartDate { get; set; }
    [Column("end_date")] public DateOnly EndDate { get; set; }

    [Column("pickup_hub_id")] public int? PickupHubId { get; set; }
    [Column("pickup_hub_name")] public string? PickupHubName { get; set; }
    [Column("dropoff_hub_id")] public int? DropoffHubId { get; set; }
    [Column("dropoff_hub_name")] public string? DropoffHubName { get; set; }

    // ---- customer snapshot ----
    [Column("first_name")] public string? FirstName { get; set; }
    [Column("last_name")] public string? LastName { get; set; }
    [Column("email")] public string? Email { get; set; }
    [Column("phone")] public string? Phone { get; set; }
    [Column("date_of_birth")] public DateOnly? DateOfBirth { get; set; }
    [Column("gender")] public string? Gender { get; set; }
    [Column("nationality")] public string? Nationality { get; set; }
    [Column("driving_license_no")] public string? DrivingLicenseNo { get; set; }
    [Column("passport_no")] public string? PassportNo { get; set; }
    [Column("address_line_1")] public string? AddressLine1 { get; set; }
    [Column("address_line_2")] public string? AddressLine2 { get; set; }
    [Column("city_id")] public int? CityId { get; set; }
    [Column("state_id")] public int? StateId { get; set; }
    [Column("pincode")] public string? Pincode { get; set; }

    // ---- rate snapshot, agreed at booking time ----
    [Column("daily_rate")] public decimal? DailyRate { get; set; }
    [Column("weekly_rate")] public decimal? WeeklyRate { get; set; }
    [Column("monthly_rate")] public decimal? MonthlyRate { get; set; }

    [Column("booking_status")] public BookingStatus BookingStatus { get; set; }

    [Column("duration")] public int Duration { get; set; }
    [Column("vehicle_amount")] public decimal? VehicleAmount { get; set; }
    [Column("addon_amount")] public decimal? AddonAmount { get; set; }
    [Column("tax_amount")] public decimal? TaxAmount { get; set; }
    [Column("grand_total")] public decimal? GrandTotal { get; set; }

    // ---- filled in at hand-over / return ----
    [Column("assigned_car_id")] public int? AssignedCarId { get; set; }
    [Column("assigned_car_registration_no")] public string? AssignedCarRegistrationNo { get; set; }
    [Column("assigned_car_brand_name")] public string? AssignedCarBrandName { get; set; }
    [Column("assigned_car_model_name")] public string? AssignedCarModelName { get; set; }

    [Column("handover_date")] public DateTime? HandoverDate { get; set; }
    [Column("fuel_level_out")] public int? FuelLevelOut { get; set; }
    [Column("fuel_level_in")] public int? FuelLevelIn { get; set; }
    [Column("fuel_charges")] public decimal? FuelCharges { get; set; }
}
