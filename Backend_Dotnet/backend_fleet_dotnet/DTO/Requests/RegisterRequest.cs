using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

// REQUIREMENT 6 (server side).
//
// Data Annotations carry the simple, structural rules - required, length,
// format - because they are declarative and Swagger publishes them. Rules that
// need to look at more than one field, or at the database, live in
// FluentValidation validators or in the services. Putting a cross-field rule
// on a single property is how you end up with a rule that is right some of the
// time; see the note on UpdateBookingRequest.StartDate.

public class RegisterRequest
{
    [Required(ErrorMessage = "First name is required")]
    [StringLength(50, MinimumLength = 2)]
    public string FirstName { get; set; } = default!;

    [Required(ErrorMessage = "Last name is required")]
    [StringLength(50, MinimumLength = 2)]
    public string LastName { get; set; } = default!;

    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Please enter a valid email address")]
    public string Email { get; set; } = default!;

    [Required(ErrorMessage = "Phone number is required")]
    [RegularExpression(@"^[6-9]\d{9}$",
        ErrorMessage = "Phone number must be 10 digits starting with 6-9")]
    public string Phone { get; set; } = default!;

    [Required(ErrorMessage = "Password is required")]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
    public string Password { get; set; } = default!;
}
