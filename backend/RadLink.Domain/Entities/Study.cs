namespace RadLink.Domain.Entities;

public class Study
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string StudyInstanceUid { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public DateTime? PatientBirthDate { get; set; }
    public string? PatientSex { get; set; }
    public DateTime? StudyDate { get; set; }
    public string? StudyTime { get; set; }
    public string? StudyDescription { get; set; }
    public string? AccessionNumber { get; set; }
    public string? ModalitiesInStudy { get; set; }
    public int NumberOfSeries { get; set; } = 0;
    public int NumberOfInstances { get; set; } = 0;
    public long StorageSize { get; set; } = 0;
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public Guid UploadedByUserId { get; set; }
    public string? ShareToken { get; set; }
    public DateTime? ShareTokenExpiry { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public ICollection<Series> Series { get; set; } = new List<Series>();
    public User UploadedBy { get; set; } = null!;
    public ICollection<Report> Reports { get; set; } = new List<Report>();
}
