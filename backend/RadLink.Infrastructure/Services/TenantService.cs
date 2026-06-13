using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RadLink.Application.DTOs;
using RadLink.Application.Services;
using RadLink.Domain.Entities;
using RadLink.Domain.Enums;
using RadLink.Infrastructure.Data;

namespace RadLink.Infrastructure.Services;

/// <summary>
/// Infrastructure implementation of ITenantService.
/// Lives in the Infrastructure layer to keep the Application layer clean of EF/DB dependencies.
/// </summary>
public class TenantService : ITenantService
{
    private readonly RadLinkDbContext _db;
    private readonly ILogger<TenantService> _logger;

    public TenantService(RadLinkDbContext db, ILogger<TenantService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ── Entity-returning lookups ──────────────────────────────────────────────

    public async Task<Tenant?> GetTenantBySubdomainAsync(string subdomain) =>
        await _db.Tenants
            .Include(t => t.Subscription)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Subdomain == subdomain.ToLowerInvariant() && t.IsActive);

    public async Task<Tenant?> GetTenantByIdAsync(Guid tenantId) =>
        await _db.Tenants
            .Include(t => t.Subscription)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId && t.IsActive);

    // ── DTO-returning lookups ─────────────────────────────────────────────────

    public async Task<TenantDetailDto?> GetTenantDetailByIdAsync(Guid tenantId)
    {
        var tenant = await _db.Tenants
            .AsNoTracking()
            .Include(t => t.Subscription)
            .FirstOrDefaultAsync(t => t.Id == tenantId);

        return tenant is null ? null : MapTenantDetailDto(tenant);
    }

    public async Task<TenantDetailDto?> UpdateTenantSettingsAsync(Guid tenantId, UpdateTenantSettingsRequest settings)
    {
        var tenant = await _db.Tenants
            .Include(t => t.Subscription)
            .FirstOrDefaultAsync(t => t.Id == tenantId);

        if (tenant is null)
            return null;

        tenant.Settings ??= new TenantSettings();
        if (settings.LogoUrl is not null) tenant.Settings.LogoUrl = settings.LogoUrl;
        if (settings.PrimaryColor is not null) tenant.Settings.PrimaryColor = settings.PrimaryColor;
        if (settings.ReportHeader is not null) tenant.Settings.ReportHeader = settings.ReportHeader;
        if (settings.ReportFooter is not null) tenant.Settings.ReportFooter = settings.ReportFooter;
        if (settings.EnableAuditLog.HasValue) tenant.Settings.EnableAuditLog = settings.EnableAuditLog.Value;
        if (settings.EnableHipaaMode.HasValue) tenant.Settings.EnableHipaaMode = settings.EnableHipaaMode.Value;
        tenant.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        _logger.LogInformation("Tenant {TenantId} settings updated", tenantId);
        return MapTenantDetailDto(tenant);
    }

    // ── Storage ───────────────────────────────────────────────────────────────

    public async Task<StorageUsageResult> GetStorageUsageAsync(Guid tenantId)
    {
        var usedBytes = await _db.Studies
            .Where(s => s.TenantId == tenantId)
            .SumAsync(s => (long?)s.StorageSize) ?? 0L;

        var subscription = await _db.Subscriptions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.IsActive);

        long quotaBytes = (subscription?.MaxStorageGB ?? 10) * 1024L * 1024 * 1024;
        int studyCount = await _db.Studies.CountAsync(s => s.TenantId == tenantId);

        return new StorageUsageResult(usedBytes, quotaBytes, studyCount);
    }

    public async Task<StorageUsageDto> GetStorageUsageDtoAsync(Guid tenantId)
    {
        long usedBytes = await _db.DicomInstances
            .AsNoTracking()
            .Where(i => i.Series.Study.TenantId == tenantId)
            .SumAsync(i => (long?)i.FileSize) ?? 0L;

        int totalStudies = await _db.Studies
            .AsNoTracking()
            .CountAsync(s => s.TenantId == tenantId);

        int totalInstances = await _db.DicomInstances
            .AsNoTracking()
            .CountAsync(i => i.Series.Study.TenantId == tenantId);

        var subscription = await _db.Subscriptions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.IsActive);

        int maxStorageGB = subscription?.MaxStorageGB ?? 10;
        long maxBytes = (long)maxStorageGB * 1024L * 1024L * 1024L;
        double usedGB = usedBytes / (1024.0 * 1024.0 * 1024.0);
        double usedPercent = maxBytes > 0 ? Math.Round((double)usedBytes / maxBytes * 100.0, 2) : 0;

        return new StorageUsageDto(
            UsedBytes: usedBytes,
            MaxBytes: maxBytes,
            UsedGB: Math.Round(usedGB, 3),
            MaxGB: maxStorageGB,
            UsedPercent: usedPercent,
            TotalStudies: totalStudies,
            TotalInstances: totalInstances
        );
    }

    public async Task<bool> CheckStorageQuotaAsync(Guid tenantId, long fileSizeBytes)
    {
        var usage = await GetStorageUsageAsync(tenantId);
        return usage.UsedBytes + fileSizeBytes <= usage.QuotaBytes;
    }

    // ── Users ─────────────────────────────────────────────────────────────────

    public async Task<IEnumerable<UserDto>> GetTenantUsersAsync(Guid tenantId)
    {
        var users = await _db.Users
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(u => u.TenantId == tenantId && u.IsActive)
            .OrderBy(u => u.CreatedAt)
            .ToListAsync();

        return users.Select(u => new UserDto(
            Id: u.Id,
            Email: u.Email,
            FirstName: u.FirstName,
            LastName: u.LastName,
            Role: u.Role.ToString(),
            LicenseNumber: null
        ));
    }

    public async Task<UserDto> InviteUserAsync(Guid tenantId, string email, string role)
    {
        email = email.ToLowerInvariant().Trim();

        if (!Enum.TryParse<UserRole>(role, ignoreCase: true, out var userRole))
            throw new InvalidOperationException(
                $"Invalid role '{role}'. Valid values: Admin, Radiologist, Technician, Viewer.");

        // Check subscription user limit
        var subscription = await _db.Subscriptions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.IsActive);

        int maxUsers = subscription?.MaxUsers ?? 5;
        int currentUsers = await _db.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.TenantId == tenantId && u.IsActive);

        if (currentUsers >= maxUsers)
            throw new InvalidOperationException(
                $"User limit reached ({currentUsers}/{maxUsers}). Upgrade your subscription to add more users.");

        bool alreadyExists = await _db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.TenantId == tenantId && u.Email == email);

        if (alreadyExists)
            throw new InvalidOperationException(
                $"A user with email '{email}' already exists in this tenant.");

        var tempPassword = GenerateTemporaryPassword();
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword, workFactor: 12);

        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Email = email,
            PasswordHash = passwordHash,
            FirstName = string.Empty,
            LastName = string.Empty,
            Role = userRole,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // TODO: Send invitation email with temp password / set-password link
        _logger.LogInformation(
            "Invited user {Email} with role {Role} to tenant {TenantId}", email, userRole, tenantId);

        return new UserDto(
            Id: user.Id,
            Email: user.Email,
            FirstName: user.FirstName,
            LastName: user.LastName,
            Role: user.Role.ToString(),
            LicenseNumber: null
        );
    }

    // ── Subscription ──────────────────────────────────────────────────────────

    public async Task<SubscriptionDetailDto?> GetSubscriptionAsync(Guid tenantId)
    {
        var sub = await _db.Subscriptions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId);

        return sub is null ? null : new SubscriptionDetailDto(
            Id: sub.Id,
            Tier: sub.Tier.ToString(),
            MaxUsers: sub.MaxUsers,
            MaxStorageGB: sub.MaxStorageGB,
            MaxStudiesPerMonth: sub.MaxStudiesPerMonth,
            StartDate: sub.StartDate,
            EndDate: sub.EndDate,
            IsActive: sub.IsActive,
            Price: sub.Price
        );
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static TenantDetailDto MapTenantDetailDto(Tenant tenant) => new(
        Id: tenant.Id,
        Name: tenant.Name,
        Subdomain: tenant.Subdomain,
        IsActive: tenant.IsActive,
        CreatedAt: tenant.CreatedAt,
        LogoUrl: tenant.Settings?.LogoUrl,
        PrimaryColor: tenant.Settings?.PrimaryColor,
        ReportHeader: tenant.Settings?.ReportHeader ?? string.Empty,
        ReportFooter: tenant.Settings?.ReportFooter ?? string.Empty,
        EnableAuditLog: tenant.Settings?.EnableAuditLog ?? true,
        EnableHipaaMode: tenant.Settings?.EnableHipaaMode ?? true,
        Subscription: tenant.Subscription is null ? null : new SubscriptionDetailDto(
            Id: tenant.Subscription.Id,
            Tier: tenant.Subscription.Tier.ToString(),
            MaxUsers: tenant.Subscription.MaxUsers,
            MaxStorageGB: tenant.Subscription.MaxStorageGB,
            MaxStudiesPerMonth: tenant.Subscription.MaxStudiesPerMonth,
            StartDate: tenant.Subscription.StartDate,
            EndDate: tenant.Subscription.EndDate,
            IsActive: tenant.Subscription.IsActive,
            Price: tenant.Subscription.Price
        )
    );

    private static string GenerateTemporaryPassword()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
        var random = new Random();
        return new string(Enumerable.Repeat(chars, 12)
            .Select(s => s[random.Next(s.Length)])
            .ToArray());
    }
}
