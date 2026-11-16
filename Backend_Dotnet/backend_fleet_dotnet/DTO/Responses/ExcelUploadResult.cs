namespace FleetManagement.DTO.Responses;

public class ExcelUploadResult
{
    public string FileName { get; set; } = default!;
    public int TotalRows { get; set; }
    public int Inserted { get; set; }
    public int Updated { get; set; }
    public int Failed { get; set; }
    public List<ExcelRowError> Errors { get; set; } = new();
}
