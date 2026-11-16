using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

/// <summary>
/// A booking taken by staff at the counter, for a walk-in customer.
///
/// There is no start date and no pick-up hub here on purpose: an on-spot
/// booking starts now, at the hub the staff member works at, and letting the
/// browser send those values would make the rule advisory rather than real.
/// </summary>
public class StaffBookingRequest
{
    [Required] public string FirstName { get; set; } = default!;
    [Required] public string LastName { get; set; } = default!;
    [Required, EmailAddress] public string Email { get; set; } = default!;

    [Required, RegularExpression(@"^[6-9]\d{9}$")]
    public string Phone { get; set; } = default!;

    [Required] public string DrivingLicenseNo { get; set; } = default!;
    public string? PassportNo { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public int? StateId { get; set; }
    public int? CityId { get; set; }
    public string? Pincode { get; set; }

    [Required] public BookingRequest Booking { get; set; } = default!;
}
