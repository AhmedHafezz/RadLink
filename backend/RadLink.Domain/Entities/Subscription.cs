using RadLink.Domain.Enums;

namespace RadLink.Domain.Entities;

public class Subscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public SubscriptionTier Tier { get; set; } = SubscriptionTier.Free;
    public int MaxUsers { get; set; } = 5;
    public int MaxStorageGB { get; set; } = 10;
    public int MaxStudiesPerMonth { get; set; } = 100;
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public decimal Price { get; set; } = 0m;

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
}
