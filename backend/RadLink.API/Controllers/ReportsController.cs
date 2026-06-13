using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLink.Application.DTOs;
using RadLink.Application.Services;
using RadLink.Domain.Entities;
using RadLink.Domain.Enums;
using RadLink.Infrastructure.Data;
using System.Security.Claims;

namespace RadLink.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly RadLinkDbContext _db;
    private readonly IReportService _reportService;
    private readonly IStorageService _storage;
    private readonly ILogger<ReportsController> _logger;
    private readonly IConfiguration _config;

    public ReportsController(
        RadLinkDbContext db,
        IReportService reportService,
        IStorageService storage,
        ILogger<ReportsController> logger,
        IConfiguration config)
    {
        _db = db;
        _reportService = reportService;
        _storage = storage;
        _logger = logger;
        _config = config;
    }

    private Guid GetTenantId() =>
        Guid.Parse(HttpContext.Items["TenantId"]?.ToString()
            ?? User.FindFirstValue("tenant_id")
            ?? throw new UnauthorizedAccessException("No tenant context."));

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
            ?? throw new UnauthorizedAccessException("No user context."));

    /// <summary>
    /// List all reports for the current tenant
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ReportDto>), 200)]
    public async Task<IActionResult> ListReports(
        [FromQuery] Guid? studyId,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var tenantId = GetTenantId();

        var query = _db.Reports
            .AsNoTracking()
            .Where(r => r.TenantId == tenantId)
            .Include(r => r.Radiologist)
            .AsQueryable();

        if (studyId.HasValue)
            query = query.Where(r => r.StudyId == studyId.Value);

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ReportStatus>(status, true, out var statusEnum))
            query = query.Where(r => r.Status == statusEnum);

        var total = await query.CountAsync();
        var reports = await query
            .OrderByDescending(r => r.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = reports.Select(r => MapReportDto(r, null));
        return Ok(new { items = dtos, total, page, pageSize });
    }

    /// <summary>
    /// Get a single report by ID
    /// </summary>
    [HttpGet("{reportId:guid}")]
    [ProducesResponseType(typeof(ReportDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetReport(Guid reportId)
    {
        var tenantId = GetTenantId();

        var report = await _db.Reports
            .AsNoTracking()
            .Where(r => r.Id == reportId && r.TenantId == tenantId)
            .Include(r => r.Radiologist)
            .FirstOrDefaultAsync();

        if (report is null)
            return NotFound(new { error = "Report not found." });

        string? pdfUrl = null;
        if (!string.IsNullOrWhiteSpace(report.PdfStoragePath))
        {
            try
            {
                pdfUrl = await _storage.GetPresignedUrlAsync(report.PdfStoragePath, 60);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not generate PDF URL for report {ReportId}", reportId);
            }
        }

        return Ok(MapReportDto(report, pdfUrl));
    }

    /// <summary>
    /// Create a new draft report
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ReportDto), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> CreateReport([FromBody] CreateReportRequest request)
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();

        if (request.StudyId == Guid.Empty)
            return BadRequest(new { error = "StudyId is required." });

        bool studyExists = await _db.Studies
            .AnyAsync(s => s.Id == request.StudyId && s.TenantId == tenantId);

        if (!studyExists)
            return NotFound(new { error = "Study not found." });

        var report = new Report
        {
            Id = Guid.NewGuid(),
            StudyId = request.StudyId,
            TenantId = tenantId,
            RadiologistId = userId,
            Content = request.Content ?? string.Empty,
            Findings = request.Findings ?? string.Empty,
            Impression = request.Impression ?? string.Empty,
            Recommendation = request.Recommendation ?? string.Empty,
            Status = ReportStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Reports.Add(report);
        await _db.SaveChangesAsync();

        // Reload with radiologist
        var radiologist = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        report.Radiologist = radiologist!;

        _logger.LogInformation("Created report {ReportId} for study {StudyId}", report.Id, request.StudyId);

        return CreatedAtAction(nameof(GetReport),
            new { reportId = report.Id },
            MapReportDto(report, null));
    }

    /// <summary>
    /// Update a draft report
    /// </summary>
    [HttpPut("{reportId:guid}")]
    [ProducesResponseType(typeof(ReportDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdateReport(Guid reportId, [FromBody] UpdateReportRequest request)
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();

        var report = await _db.Reports
            .Where(r => r.Id == reportId && r.TenantId == tenantId)
            .Include(r => r.Radiologist)
            .FirstOrDefaultAsync();

        if (report is null)
            return NotFound(new { error = "Report not found." });

        if (report.Status == ReportStatus.Finalized)
            return BadRequest(new { error = "Finalized reports cannot be edited. Create an amendment instead." });

        if (report.RadiologistId != userId)
            return Forbid();

        if (request.Content is not null) report.Content = request.Content;
        if (request.Findings is not null) report.Findings = request.Findings;
        if (request.Impression is not null) report.Impression = request.Impression;
        if (request.Recommendation is not null) report.Recommendation = request.Recommendation;
        report.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(MapReportDto(report, null));
    }

    /// <summary>
    /// Finalize a report — generates PDF + QR code and uploads to S3
    /// </summary>
    [HttpPost("{reportId:guid}/finalize")]
    [ProducesResponseType(typeof(ReportDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> FinalizeReport(Guid reportId, [FromBody] FinalizeReportRequest request)
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();

        var report = await _db.Reports
            .Where(r => r.Id == reportId && r.TenantId == tenantId)
            .Include(r => r.Radiologist)
            .Include(r => r.Tenant)
            .FirstOrDefaultAsync();

        if (report is null)
            return NotFound(new { error = "Report not found." });

        if (report.Status == ReportStatus.Finalized)
            return BadRequest(new { error = "Report is already finalized." });

        if (report.RadiologistId != userId)
            return Forbid();

        report.Content = request.Content;
        report.Findings = request.Findings;
        report.Impression = request.Impression;
        report.Recommendation = request.Recommendation ?? string.Empty;
        report.Status = ReportStatus.Finalized;
        report.FinalizedAt = DateTime.UtcNow;
        report.UpdatedAt = DateTime.UtcNow;

        // Generate a QR code token for the viewer link
        var qrToken = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16))
            .Replace("+", "-").Replace("/", "_").Replace("=", "");

        var viewerBaseUrl = _config["AppBaseUrl"] ?? $"{Request.Scheme}://{Request.Host}";

        var reportDto = MapReportDto(report, null, qrToken);

        try
        {
            var tenantName = report.Tenant?.Name ?? "RadLink";
            var logoUrl = report.Tenant?.Settings?.LogoUrl;
            var pdfBytes = await _reportService.GeneratePdfAsync(reportDto, tenantName, logoUrl, viewerBaseUrl);

            var pdfKey = $"reports/{tenantId}/{reportId}/{Guid.NewGuid()}.pdf";
            using var pdfStream = new MemoryStream(pdfBytes);
            await _storage.UploadFileAsync(pdfStream, pdfKey, "application/pdf");
            report.PdfStoragePath = pdfKey;

            _logger.LogInformation("Generated and uploaded PDF for report {ReportId}", reportId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate PDF for report {ReportId}", reportId);
            // Still finalize the report even if PDF generation fails
        }

        await _db.SaveChangesAsync();

        string? pdfUrl = null;
        if (!string.IsNullOrWhiteSpace(report.PdfStoragePath))
        {
            try { pdfUrl = await _storage.GetPresignedUrlAsync(report.PdfStoragePath, 60); }
            catch { /* non-critical */ }
        }

        return Ok(MapReportDto(report, pdfUrl, qrToken));
    }

    /// <summary>
    /// Download report PDF (streamed from S3)
    /// </summary>
    [HttpGet("{reportId:guid}/pdf")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DownloadPdf(Guid reportId)
    {
        var tenantId = GetTenantId();

        var report = await _db.Reports
            .AsNoTracking()
            .Where(r => r.Id == reportId && r.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (report is null)
            return NotFound(new { error = "Report not found." });

        if (string.IsNullOrWhiteSpace(report.PdfStoragePath))
            return NotFound(new { error = "PDF not available for this report." });

        try
        {
            var stream = await _storage.DownloadFileAsync(report.PdfStoragePath);
            return File(stream, "application/pdf", $"report-{reportId}.pdf");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download PDF for report {ReportId}", reportId);
            return StatusCode(500, new { error = "Failed to retrieve PDF." });
        }
    }

    // --- Helpers ---

    private static ReportDto MapReportDto(Report report, string? pdfUrl, string? qrToken = null) =>
        new(
            Id: report.Id,
            StudyId: report.StudyId,
            Status: report.Status.ToString(),
            Content: report.Content,
            Findings: report.Findings,
            Impression: report.Impression,
            Recommendation: report.Recommendation,
            KeyImageLinks: null,
            PdfUrl: pdfUrl,
            QrCodeToken: qrToken,
            CreatedAt: report.CreatedAt,
            FinalizedAt: report.FinalizedAt,
            Radiologist: new UserDto(
                Id: report.Radiologist?.Id ?? Guid.Empty,
                Email: report.Radiologist?.Email ?? string.Empty,
                FirstName: report.Radiologist?.FirstName ?? string.Empty,
                LastName: report.Radiologist?.LastName ?? string.Empty,
                Role: report.Radiologist?.Role.ToString() ?? string.Empty,
                LicenseNumber: null));
}
