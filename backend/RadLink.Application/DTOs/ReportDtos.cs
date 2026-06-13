namespace RadLink.Application.DTOs;

public record CreateReportRequest(
    Guid StudyId,
    string? TemplateName,
    string? Content,
    string? Findings,
    string? Impression,
    string? Recommendation
);

public record UpdateReportRequest(
    string? Content,
    string? Findings,
    string? Impression,
    string? Recommendation,
    IEnumerable<KeyImageLinkDto>? KeyImageLinks
);

public record FinalizeReportRequest(
    string Content,
    string Findings,
    string Impression,
    string? Recommendation,
    IEnumerable<KeyImageLinkDto>? KeyImageLinks
);

public record KeyImageLinkDto(
    string TextAnchor,
    string SopInstanceUid,
    int? SliceIndex,
    double? WindowCenter,
    double? WindowWidth
);

public record ReportDto(
    Guid Id,
    Guid StudyId,
    string Status,
    string? Content,
    string? Findings,
    string? Impression,
    string? Recommendation,
    IEnumerable<KeyImageLinkDto>? KeyImageLinks,
    string? PdfUrl,
    string? QrCodeToken,
    DateTime CreatedAt,
    DateTime? FinalizedAt,
    UserDto Radiologist
);
