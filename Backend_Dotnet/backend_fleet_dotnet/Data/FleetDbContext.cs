using Microsoft.EntityFrameworkCore;
using FleetManagement.Models;

namespace FleetManagement.Data;

/// <summary>
/// EF Core context over the SAME MySQL database the Java backend uses.
///
/// WHO OWNS THE SCHEMA
/// -------------------
/// Hibernate does, via ddl-auto=update. This context deliberately does NOT
/// create or migrate anything - it maps onto tables that already exist and are
/// already full of seed data. Two tools trying to own one schema is how you
/// get a dropped column at three in the morning.
///
/// That is also why every entity spells out [Table] and [Column]: the naming
/// has to match what Hibernate produced, not what EF would have chosen.
/// </summary>
public class FleetDbContext : DbContext
{
    public FleetDbContext(DbContextOptions<FleetDbContext> options) : base(options) { }

    public DbSet<State> States => Set<State>();
    public DbSet<City> Cities => Set<City>();
    public DbSet<Hub> Hubs => Set<Hub>();
    public DbSet<Airport> Airports => Set<Airport>();
    public DbSet<CarType> CarTypes => Set<CarType>();
    public DbSet<Car> Cars => Set<Car>();
    public DbSet<Addon> Addons => Set<Addon>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Staff> Staff => Set<Staff>();
    public DbSet<BookingHeader> BookingHeaders => Set<BookingHeader>();
    public DbSet<BookingDetail> BookingDetails => Set<BookingDetail>();
    public DbSet<InvoiceHeader> InvoiceHeaders => Set<InvoiceHeader>();
    public DbSet<InvoiceDetail> InvoiceDetails => Set<InvoiceDetail>();
    public DbSet<ApplicationLog> ApplicationLogs => Set<ApplicationLog>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        // Enums as STRING, matching Hibernate's @Enumerated(EnumType.STRING).
        // Stored as ints - the default - the two backends would read each
        // other's rows as garbage.
        b.Entity<Hub>().Property(x => x.HubType).HasConversion<string>();
        b.Entity<CarType>().Property(x => x.CarClass).HasConversion<string>();
        b.Entity<Car>().Property(x => x.Status).HasConversion<string>();
        b.Entity<Customer>().Property(x => x.DocumentType).HasConversion<string>();
        b.Entity<BookingHeader>().Property(x => x.BookingStatus).HasConversion<string>();
        b.Entity<BookingDetail>().Property(x => x.BookingSource).HasConversion<string>();

        // Money: 12,2 to match the Java @Column(precision = 12, scale = 2).
        foreach (var p in new[] { "DailyRate", "WeeklyRate", "MonthlyRate",
                                  "VehicleAmount", "AddonAmount", "TaxAmount",
                                  "GrandTotal", "FuelCharges" })
        {
            b.Entity<BookingHeader>().Property(p).HasPrecision(12, 2);
            b.Entity<InvoiceHeader>().Property(p).HasPrecision(12, 2);
        }
        b.Entity<BookingDetail>().Property(x => x.AddonPrice).HasPrecision(12, 2);
        b.Entity<InvoiceDetail>().Property(x => x.AddonPrice).HasPrecision(10, 2);

        // Uniqueness that already exists in the database. Declared so EF plans
        // queries well and so the model documents the real constraints.
        b.Entity<Airport>().HasIndex(x => x.AirportCode).IsUnique();
        b.Entity<Car>().HasIndex(x => x.RegistrationNo).IsUnique();
        b.Entity<Customer>().HasIndex(x => x.Email).IsUnique();
        b.Entity<Customer>().HasIndex(x => x.Phone).IsUnique();
        b.Entity<Staff>().HasIndex(x => x.Email).IsUnique();
        b.Entity<Staff>().HasIndex(x => x.Phone).IsUnique();
        b.Entity<InvoiceHeader>().HasIndex(x => x.BookingId).IsUnique();
    }

    /// <summary>
    /// Stamps created_at / updated_at the way the Java BaseEntity's
    /// @PrePersist and @PreUpdate callbacks do, so rows written by either
    /// backend look the same.
    /// </summary>
    public override int SaveChanges()
    {
        Stamp();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        Stamp();
        return base.SaveChangesAsync(ct);
    }

    private void Stamp()
    {
        var now = DateTime.Now;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt ??= now;
                entry.Entity.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }
    }
}
