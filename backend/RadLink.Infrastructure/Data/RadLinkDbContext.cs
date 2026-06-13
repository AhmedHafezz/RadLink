using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using RadLink.Domain.Entities;
using RadLink.Domain.Enums;

namespace RadLink.Infrastructure.Data;

public interface ITenantContext
{
    Guid? TenantId { get; }
}

public class RadLinkDbContext : DbContext
{
    private readonly ITenantContext? _tenantContext;

    public RadLinkDbContext(DbContextOptions<RadLinkDbContext> options, ITenantContext? tenantContext = null)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Study> Studies => Set<Study>();
    public DbSet<Series> Series => Set<Series>();
    public DbSet<DicomInstance> DicomInstances => Set<DicomInstance>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Tenant ──────────────────────────────────────────────────────────
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.HasIndex(t => t.Subdomain).IsUnique();
            entity.Property(t => t.Name).HasMaxLength(200).IsRequired();
            entity.Property(t => t.Subdomain).HasMaxLength(100).IsRequired();

            entity.OwnsOne(t => t.Settings, s =>
            {
                s.Property(x => x.LogoUrl).HasMaxLength(500);
                s.Property(x => x.PrimaryColor).HasMaxLength(20);
                s.Property(x => x.ReportHeader).HasMaxLength(2000);
                s.Property(x => x.ReportFooter).HasMaxLength(2000);
            });

            entity.HasOne(t => t.Subscription)
                  .WithOne(s => s.Tenant)
                  .HasForeignKey<Subscription>(s => s.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── User ─────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => new { u.TenantId, u.Email }).IsUnique();
            entity.Property(u => u.Email).HasMaxLength(256).IsRequired();
            entity.Property(u => u.PasswordHash).HasMaxLength(512).IsRequired();
            entity.Property(u => u.FirstName).HasMaxLength(100);
            entity.Property(u => u.LastName).HasMaxLength(100);
            entity.Property(u => u.Role).HasConversion<int>();

            entity.HasOne(u => u.Tenant)
                  .WithMany(t => t.Users)
                  .HasForeignKey(u => u.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Multi-tenancy filter
            if (_tenantContext?.TenantId.HasValue == true)
            {
                entity.HasQueryFilter(u => u.TenantId == _tenantContext.TenantId.Value && u.IsActive);
            }
        });

        // ── Study ────────────────────────────────────────────────────────────
        modelBuilder.Entity<Study>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.HasIndex(s => new { s.TenantId, s.StudyInstanceUid }).IsUnique();
            entity.HasIndex(s => s.ShareToken);
            entity.Property(s => s.StudyInstanceUid).HasMaxLength(128).IsRequired();
            entity.Property(s => s.PatientName).HasMaxLength(200);
            entity.Property(s => s.PatientId).HasMaxLength(64);
            entity.Property(s => s.ModalitiesInStudy).HasMaxLength(100);
            entity.Property(s => s.ShareToken).HasMaxLength(128);

            entity.HasOne(s => s.Tenant)
                  .WithMany(t => t.Studies)
                  .HasForeignKey(s => s.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(s => s.UploadedBy)
                  .WithMany()
                  .HasForeignKey(s => s.UploadedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Multi-tenancy filter
            if (_tenantContext?.TenantId.HasValue == true)
            {
                entity.HasQueryFilter(s => s.TenantId == _tenantContext.TenantId.Value);
            }
        });

        // ── Series ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Series>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.HasIndex(s => s.SeriesInstanceUid);
            entity.Property(s => s.SeriesInstanceUid).HasMaxLength(128).IsRequired();
            entity.Property(s => s.Modality).HasMaxLength(16);
            entity.Property(s => s.SeriesDescription).HasMaxLength(256);

            entity.HasOne(s => s.Study)
                  .WithMany(st => st.Series)
                  .HasForeignKey(s => s.StudyId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── DicomInstance ─────────────────────────────────────────────────────
        modelBuilder.Entity<DicomInstance>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.HasIndex(d => d.SopInstanceUid);
            entity.Property(d => d.SopInstanceUid).HasMaxLength(128).IsRequired();
            entity.Property(d => d.SopClassUid).HasMaxLength(128);
            entity.Property(d => d.StoragePath).HasMaxLength(512).IsRequired();

            entity.HasOne(d => d.Series)
                  .WithMany(s => s.DicomInstances)
                  .HasForeignKey(d => d.SeriesId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Report ────────────────────────────────────────────────────────────
        modelBuilder.Entity<Report>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => r.StudyId);
            entity.HasIndex(r => r.TenantId);
            entity.Property(r => r.Content).HasColumnType("text");
            entity.Property(r => r.Findings).HasColumnType("text");
            entity.Property(r => r.Impression).HasColumnType("text");
            entity.Property(r => r.Recommendation).HasColumnType("text");
            entity.Property(r => r.Status).HasConversion<int>();
            entity.Property(r => r.PdfStoragePath).HasMaxLength(512);

            entity.HasOne(r => r.Study)
                  .WithMany(s => s.Reports)
                  .HasForeignKey(r => r.StudyId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.Tenant)
                  .WithMany()
                  .HasForeignKey(r => r.TenantId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(r => r.Radiologist)
                  .WithMany(u => u.Reports)
                  .HasForeignKey(r => r.RadiologistId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Multi-tenancy filter
            if (_tenantContext?.TenantId.HasValue == true)
            {
                entity.HasQueryFilter(r => r.TenantId == _tenantContext.TenantId.Value);
            }
        });

        // ── Subscription ──────────────────────────────────────────────────────
        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.HasIndex(s => s.TenantId).IsUnique();
            entity.Property(s => s.Tier).HasConversion<int>();
            entity.Property(s => s.Price).HasColumnType("decimal(18,2)");
        });
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var utcNow = DateTime.UtcNow;

        foreach (EntityEntry entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Properties.Any(p => p.Metadata.Name == "CreatedAt"))
                    entry.Property("CreatedAt").CurrentValue = utcNow;
                if (entry.Properties.Any(p => p.Metadata.Name == "UpdatedAt"))
                    entry.Property("UpdatedAt").CurrentValue = utcNow;
            }
            else if (entry.State == EntityState.Modified)
            {
                if (entry.Properties.Any(p => p.Metadata.Name == "UpdatedAt"))
                    entry.Property("UpdatedAt").CurrentValue = utcNow;
                if (entry.Properties.Any(p => p.Metadata.Name == "CreatedAt"))
                    entry.Property("CreatedAt").IsModified = false;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
