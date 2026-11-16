namespace FleetManagement.DTO.Responses;

// Field names here must match the Java DTOs exactly. ASP.NET serialises to
// camelCase by default, which is what the Java Jackson output already is, so
// stateId -> "stateId" on both sides.

public class StateResponse
{
    public int StateId { get; set; }
    public string StateName { get; set; } = default!;
}
