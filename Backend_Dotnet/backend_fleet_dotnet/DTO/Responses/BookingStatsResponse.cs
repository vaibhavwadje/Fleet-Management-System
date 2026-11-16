namespace FleetManagement.DTO.Responses;

public class BookingStatsResponse
{
    public long Total { get; set; }
    public long TodayBookings { get; set; }
    public long Pending { get; set; }
    public long Confirmed { get; set; }
    public long Cancelled { get; set; }
    public long Completed { get; set; }
}
