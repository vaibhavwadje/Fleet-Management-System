namespace FleetManagement.DTO.Responses;

public class StaffLoginResponse
{
    public string Token { get; set; } = default!;
    public string TokenType { get; set; } = "Bearer";
    public int StaffId { get; set; }
    public string FirstName { get; set; } = default!;
    public string LastName { get; set; } = default!;
    public string Email { get; set; } = default!;
    public int HubId { get; set; }
}
