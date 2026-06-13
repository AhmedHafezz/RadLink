using RadLink.Domain.Enums;

namespace RadLink.Application.DTOs;

public record TenantDetailDto(
    Guid Id,
    string Name,
    string Subdomain,
    bool IsActive,
    DateTime CreatedAt,
    string? LogoUrl,
    string? PrimaryColor,
    string ReportHeader,
    string ReportFooter,
    bool EnableAuditLog,
    bool EnableHipaaMode,
    SubscriptionDetailDto? Subscription
);

public record UpdateTenantSettingsRequest(
    string? LogoUrl,
    string? PrimaryColor,
    string? ReportHeader,
    string? ReportFooter,
    bool? EnableAuditLog,
    bool? EnableHipaaMode
);

public record InviteUserRequest(
    string Email,
    string Role = "Viewer"
);

public record StorageUsageDto(
    long UsedBytes,
    long MaxBytes,
    double UsedGB,
    double MaxGB,
    double UsedPercent,
    int TotalStudies,
    int TotalInstances
);

public record SubscriptionDetailDto(
    Guid Id,
    string Tier,
    int MaxUsers,
    int MaxStorageGB,
    int MaxStudiesPerMonth,
    DateTime StartDate,
    DateTime? EndDate,
    bool IsActive,
    decimal Price
);
