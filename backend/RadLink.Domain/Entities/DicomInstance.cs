namespace RadLink.Domain.Entities;

public class DicomInstance
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SeriesId { get; set; }
    public string SopInstanceUid { get; set; } = string.Empty;
    public string SopClassUid { get; set; } = string.Empty;
    public int? InstanceNumber { get; set; }
    public int? Rows { get; set; }
    public int? Columns { get; set; }
    public double? PixelSpacingRow { get; set; }
    public double? PixelSpacingCol { get; set; }
    public double? SliceThickness { get; set; }
    public double? SliceLocation { get; set; }
    public double? WindowCenter { get; set; }
    public double? WindowWidth { get; set; }
    public string StoragePath { get; set; } = string.Empty;
    public long FileSize { get; set; } = 0;

    // Navigation properties
    public Series Series { get; set; } = null!;
}
