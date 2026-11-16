namespace FleetManagement.DTO.Responses;

public class LoginResponse
{
    public string AccessToken { get; set; } = default!;
    public string TokenType { get; set; } = "Bearer";
    public string CustomerId { get; set; } = default!;
    public string Email { get; set; } = default!;
}
