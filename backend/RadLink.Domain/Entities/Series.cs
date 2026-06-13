namespace RadLink.Domain.Entities;

public class Series
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StudyId { get; set; }
    public string SeriesInstanceUid { get; set; } = string.Empty;
    public int? SeriesNumber { get; set; }
    public string? SeriesDescription { get; set; }
    public string Modality { get; set; } = string.Empty;
    public int NumberOfInstances { get; set; } = 0;

    // Navigation properties
    public Study Study { get; set; } = null!;
    public ICollection<DicomInstance> DicomInstances { get; set; } = new List<DicomInstance>();
}
