using System.ComponentModel.DataAnnotations;

namespace FleetManagement.DTO.Requests;

public class ChangePasswordRequest
{
    [Required] public string OldPassword { get; set; } = default!;
    [Required, MinLength(8)] public string NewPassword { get; set; } = default!;
    [Required] public string ConfirmPassword { get; set; } = default!;
}
