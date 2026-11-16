namespace FleetManagement.DTO.Responses;

public class CarTypeResponse
{
    public int CarTypeId { get; set; }
    public string CarClass { get; set; } = default!;

    /// <summary>Maps from CarType.CarTypeName - the Java field is "carType".</summary>
    public string CarType { get; set; } = default!;

    public string? ImageUrl { get; set; }
    public double DailyRate { get; set; }
    public double WeeklyRate { get; set; }
    public double MonthlyRate { get; set; }
    public int HubId { get; set; }
    public string? HubName { get; set; }
}
