namespace FleetManagement.DTO.Responses;

public class ExcelRowError
{
    public int RowNumber { get; set; }
    public string Message { get; set; } = default!;
}
