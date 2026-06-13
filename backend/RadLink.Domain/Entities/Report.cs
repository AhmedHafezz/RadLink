using RadLink.Domain.Enums;

namespace RadLink.Domain.Entities;

public class Report
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StudyId { get; set; }
    public Guid TenantId { get; set; }
    public Guid RadiologistId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string Findings { get; set; } = string.Empty;
    public string Impression { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
    public ReportStatus Status { get; set; } = ReportStatus.Draft;
    public Guid? TemplateId { get; set; }
    public string? PdfStoragePath { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? FinalizedAt { get; set; }

    // Navigation properties
    public Study Study { get; set; } = null!;
    public Tenant Tenant { get; set; } = null!;
    public User Radiologist { get; set; } = null!;
}
