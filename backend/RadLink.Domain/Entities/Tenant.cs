using RadLink.Domain.Enums;

namespace RadLink.Domain.Entities;

public class Tenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Subdomain { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Study> Studies { get; set; } = new List<Study>();
    public Subscription? Subscription { get; set; }
    public TenantSettings Settings { get; set; } = new();
}

public class TenantSettings
{
    public string? LogoUrl { get; set; }
    public string? PrimaryColor { get; set; }
    public string ReportHeader { get; set; } = string.Empty;
    public string ReportFooter { get; set; } = string.Empty;
    public bool EnableAuditLog { get; set; } = true;
    public bool EnableHipaaMode { get; set; } = true;
}
