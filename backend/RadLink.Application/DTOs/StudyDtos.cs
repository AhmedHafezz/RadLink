namespace RadLink.Application.DTOs;

public record StudyListItemDto(
    Guid Id,
    string StudyInstanceUid,
    string PatientName,
    string PatientId,
    DateTime? StudyDate,
    string? Modality,
    string? StudyDescription,
    int NumberOfSeries,
    int NumberOfInstances,
    string? ShareToken,
    DateTime? ShareTokenExpiry,
    string? ReportStatus
);

public record StudyDetailDto(
    Guid Id,
    string StudyInstanceUid,
    string PatientName,
    string PatientId,
    DateTime? PatientBirthDate,
    string? PatientSex,
    DateTime? StudyDate,
    string? StudyDescription,
    string? AccessionNumber,
    string? Modality,
    int NumberOfSeries,
    int NumberOfInstances,
    long StorageSize,
    DateTime UploadedAt,
    string? ShareToken,
    DateTime? ShareTokenExpiry,
    IEnumerable<SeriesDto> Series
);

public record SeriesDto(
    Guid Id,
    string SeriesInstanceUid,
    string? Modality,
    string? SeriesDescription,
    int SeriesNumber,
    int NumberOfInstances,
    IEnumerable<InstanceDto> Instances
);

public record InstanceDto(
    Guid Id,
    string SopInstanceUid,
    string? SopClassUid,
    int InstanceNumber,
    string WadoUri
);

public record ShareStudyRequest(int ExpiryDays = 30);
public record ShareStudyResponse(string ShareToken, string ShareUrl, DateTime ExpiresAt);
