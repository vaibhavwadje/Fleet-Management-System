using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

public class GuestBookingRequest
{
    [Required] public string FirstName { get; set; } = default!;
    [Required] public string LastName { get; set; } = default!;
    [Required, EmailAddress] public string Email { get; set; } = default!;
    [Required] public string Phone { get; set; } = default!;
    [Required] public string DrivingLicenseNo { get; set; } = default!;
    public string? PassportNo { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public int StateId { get; set; }
    public int CityId { get; set; }
    public string? Pincode { get; set; }

    [Required] public BookingRequest Booking { get; set; } = default!;
}
