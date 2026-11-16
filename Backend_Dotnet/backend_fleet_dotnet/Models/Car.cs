using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

[Table("car")]
public class Car : BaseEntity
{
    [Key, Column("car_id")] public int CarId { get; set; }

    [Column("car_type_id")] public int CarTypeId { get; set; }
    [ForeignKey(nameof(CarTypeId))] public CarType? CarType { get; set; }

    [Column("hub_id")] public int HubId { get; set; }
    [ForeignKey(nameof(HubId))] public Hub? Hub { get; set; }

    [Column("registration_no"), Required] public string RegistrationNo { get; set; } = default!;
    [Column("model_name"), Required] public string ModelName { get; set; } = default!;
    [Column("brand_name"), Required] public string BrandName { get; set; } = default!;
    [Column("year")] public int Year { get; set; }
    [Column("color")] public string? Color { get; set; }
    [Column("transmission"), Required] public string Transmission { get; set; } = default!;
    [Column("mileage")] public double? Mileage { get; set; }
    [Column("fuel_type"), Required] public string FuelType { get; set; } = default!;
    [Column("fuel_capacity_liters")] public double? FuelCapacityLiters { get; set; }
    [Column("seat_capacity")] public int? SeatCapacity { get; set; }

    /// <summary>
    /// When the car is booked in for service. It is unrentable on this date
    /// and for the three days before it - see RentalPricingCalculator.
    /// </summary>
    [Column("service_due_date")] public DateOnly? ServiceDueDate { get; set; }

    [Column("status")] public CarStatus Status { get; set; }
    [Column("image")] public string? Image { get; set; }
}
