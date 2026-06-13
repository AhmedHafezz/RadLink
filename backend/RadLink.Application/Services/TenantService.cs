using RadLink.Application.DTOs;
using RadLink.Domain.Entities;

namespace RadLink.Application.Services;

/// <summary>
/// Interface for tenant management operations.
/// The implementation lives in RadLink.Infrastructure.Services.TenantService
/// to keep the Application layer free of Infrastructure dependencies.
/// </summary>
public interface ITenantService
{
    // Entity-returning overloads (used internally / by middleware)
    Task<Tenant?> GetTenantBySubdomainAsync(string subdomain);
    Task<Tenant?> GetTenantByIdAsync(Guid tenantId);

    // DTO-returning overloads used by controllers
    Task<TenantDetailDto?> GetTenantDetailByIdAsync(Guid tenantId);
    Task<TenantDetailDto?> UpdateTenantSettingsAsync(Guid tenantId, UpdateTenantSettingsRequest settings);

    // Storage
    Task<StorageUsageResult> GetStorageUsageAsync(Guid tenantId);
    Task<StorageUsageDto> GetStorageUsageDtoAsync(Guid tenantId);
    Task<bool> CheckStorageQuotaAsync(Guid tenantId, long fileSizeBytes);

    // Users
    Task<IEnumerable<UserDto>> GetTenantUsersAsync(Guid tenantId);
    Task<UserDto> InviteUserAsync(Guid tenantId, string email, string role);

    // Subscription
    Task<SubscriptionDetailDto?> GetSubscriptionAsync(Guid tenantId);
}

/// <summary>
/// Raw storage usage result (bytes + quota). Used internally for quota checks.
/// </summary>
public record StorageUsageResult(long UsedBytes, long QuotaBytes, int StudyCount);
