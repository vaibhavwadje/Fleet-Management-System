namespace FleetManagement.Models.Enums;

// Stored as STRING in MySQL, exactly as Hibernate's @Enumerated(EnumType.STRING)
// writes them. The member names must match the Java enums character for
// character or the two backends will not read each other's rows.

public enum BookingStatus { PENDING, CONFIRMED, CANCELLED, COMPLETED }
