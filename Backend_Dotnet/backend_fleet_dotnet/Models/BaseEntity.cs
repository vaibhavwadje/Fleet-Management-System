using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FleetManagement.Models.Enums;

namespace FleetManagement.Models;

// ─────────────────────────────────────────────────────────────────────────────
//  MASTER DATA
//
//  These map onto the tables Hibernate already created and the seed data
//  already populated. Column names are given explicitly rather than relying on
//  a naming convention, because the schema is owned by the Java backend and
//  must not shift underneath it.
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>
/// created_at / updated_at, mirroring the Java BaseEntity.
/// EF sets them in <c>FleetDbContext.SaveChanges</c>.
/// </summary>
public abstract class BaseEntity
{
    [Column("created_at")] public DateTime? CreatedAt { get; set; }
    [Column("updated_at")] public DateTime? UpdatedAt { get; set; }
}
