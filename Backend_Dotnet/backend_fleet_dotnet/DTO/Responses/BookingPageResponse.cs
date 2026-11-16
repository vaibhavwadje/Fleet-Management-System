namespace FleetManagement.DTO.Responses;

public class BookingPageResponse
{
    public List<BookingResponse> Bookings { get; set; } = new();
    public int CurrentPage { get; set; }
    public int PageSize { get; set; }
    public long TotalElements { get; set; }
    public int TotalPages { get; set; }
    public bool First { get; set; }
    public bool Last { get; set; }
}
