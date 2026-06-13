using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLink.Application.DTOs;
using RadLink.Application.Services;
using RadLink.Domain.Entities;
using RadLink.Infrastructure.Data;
using System.Security.Claims;

namespace RadLink.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StudiesController : ControllerBase
{
    private readonly RadLinkDbContext _db;
    private readonly IStorageService _storage;
    private readonly ILogger<StudiesController> _logger;
    private readonly IConfiguration _config;

    public StudiesController(
        RadLinkDbContext db,
        IStorageService storage,
        ILogger<StudiesController> logger,
        IConfiguration config)
    {
        _db = db;
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
    /// List studies for current tenant with pagination and filters
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<StudyListItemDto>), 200)]
    public async Task<IActionResult> ListStudies(
        [FromQuery] string? patientName,
        [FromQuery] string? modality,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var tenantId = GetTenantId();

        var query = _db.Studies
            .AsNoTracking()
            .Where(s => s.TenantId == tenantId)
            .Include(s => s.Reports)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(patientName))
            query = query.Where(s => s.PatientName.ToLower().Contains(patientName.ToLower()));

        if (!string.IsNullOrWhiteSpace(modality))
            query = query.Where(s => s.ModalitiesInStudy != null && s.ModalitiesInStudy.Contains(modality));

        if (dateFrom.HasValue)
            query = query.Where(s => s.StudyDate >= dateFrom.Value);

        if (dateTo.HasValue)
            query = query.Where(s => s.StudyDate <= dateTo.Value);

        var total = await query.CountAsync();

        var studies = await query
            .OrderByDescending(s => s.UploadedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = studies.Select(s => new StudyListItemDto(
            Id: s.Id,
            StudyInstanceUid: s.StudyInstanceUid,
            PatientName: s.PatientName,
            PatientId: s.PatientId,
            StudyDate: s.StudyDate,
            Modality: s.ModalitiesInStudy,
            StudyDescription: s.StudyDescription,
            NumberOfSeries: s.NumberOfSeries,
            NumberOfInstances: s.NumberOfInstances,
            ShareToken: s.ShareToken,
            ShareTokenExpiry: s.ShareTokenExpiry,
            ReportStatus: s.Reports.OrderByDescending(r => r.UpdatedAt).FirstOrDefault()?.Status.ToString()
        ));

        return Ok(new PagedResult<StudyListItemDto>(items, total, page, pageSize));
    }

    /// <summary>
    /// Get study details including series list
    /// </summary>
    [HttpGet("{studyId:guid}")]
    [ProducesResponseType(typeof(StudyDetailDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetStudy(Guid studyId)
    {
        var tenantId = GetTenantId();

        var study = await _db.Studies
            .AsNoTracking()
            .Where(s => s.Id == studyId && s.TenantId == tenantId)
            .Include(s => s.Series)
            .ThenInclude(sr => sr.DicomInstances)
            .FirstOrDefaultAsync();

        if (study is null)
            return NotFound(new { error = "Study not found." });

        var baseUrl = $"{Request.Scheme}://{Request.Host}";

        var seriesDtos = study.Series.OrderBy(sr => sr.SeriesNumber).Select(sr => new SeriesDto(
            Id: sr.Id,
            SeriesInstanceUid: sr.SeriesInstanceUid,
            Modality: sr.Modality,
            SeriesDescription: sr.SeriesDescription,
            SeriesNumber: sr.SeriesNumber ?? 0,
            NumberOfInstances: sr.NumberOfInstances,
            Instances: sr.DicomInstances.OrderBy(i => i.InstanceNumber).Select(i => new InstanceDto(
                Id: i.Id,
                SopInstanceUid: i.SopInstanceUid,
                SopClassUid: i.SopClassUid,
                InstanceNumber: i.InstanceNumber ?? 0,
                WadoUri: $"{baseUrl}/api/studies/{study.Id}/wado?objectUID={i.SopInstanceUid}"
            ))
        ));

        var dto = new StudyDetailDto(
            Id: study.Id,
            StudyInstanceUid: study.StudyInstanceUid,
            PatientName: study.PatientName,
            PatientId: study.PatientId,
            PatientBirthDate: study.PatientBirthDate,
            PatientSex: study.PatientSex,
            StudyDate: study.StudyDate,
            StudyDescription: study.StudyDescription,
            AccessionNumber: study.AccessionNumber,
            Modality: study.ModalitiesInStudy,
            NumberOfSeries: study.NumberOfSeries,
            NumberOfInstances: study.NumberOfInstances,
            StorageSize: study.StorageSize,
            UploadedAt: study.UploadedAt,
            ShareToken: study.ShareToken,
            ShareTokenExpiry: study.ShareTokenExpiry,
            Series: seriesDtos
        );

        return Ok(dto);
    }

    /// <summary>
    /// Get DICOM instances for a study with WADO URLs
    /// </summary>
    [HttpGet("{studyId:guid}/instances")]
    [ProducesResponseType(typeof(IEnumerable<InstanceDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetInstances(Guid studyId)
    {
        var tenantId = GetTenantId();

        var study = await _db.Studies
            .AsNoTracking()
            .Where(s => s.Id == studyId && s.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (study is null)
            return NotFound(new { error = "Study not found." });

        var instances = await _db.DicomInstances
            .AsNoTracking()
            .Where(i => i.Series.StudyId == studyId)
            .OrderBy(i => i.InstanceNumber)
            .ToListAsync();

        var baseUrl = $"{Request.Scheme}://{Request.Host}";

        var dtos = instances.Select(i => new InstanceDto(
            Id: i.Id,
            SopInstanceUid: i.SopInstanceUid,
            SopClassUid: i.SopClassUid,
            InstanceNumber: i.InstanceNumber ?? 0,
            WadoUri: $"{baseUrl}/api/studies/{studyId}/wado?objectUID={i.SopInstanceUid}"
        ));

        return Ok(dtos);
    }

    /// <summary>
    /// WADO-URI endpoint — streams a DICOM file from S3
    /// </summary>
    [HttpGet("{studyId:guid}/wado")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> WadoUri(Guid studyId, [FromQuery] string objectUID)
    {
        var tenantId = GetTenantId();

        // Verify study belongs to tenant
        bool studyExists = await _db.Studies
            .AnyAsync(s => s.Id == studyId && s.TenantId == tenantId);

        if (!studyExists)
            return NotFound(new { error = "Study not found." });

        var instance = await _db.DicomInstances
            .AsNoTracking()
            .Where(i => i.SopInstanceUid == objectUID && i.Series.StudyId == studyId)
            .FirstOrDefaultAsync();

        if (instance is null)
            return NotFound(new { error = "Instance not found." });

        try
        {
            var stream = await _storage.DownloadFileAsync(instance.StoragePath);
            return File(stream, "application/dicom", $"{objectUID}.dcm");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download DICOM instance {Uid}", objectUID);
            return StatusCode(500, new { error = "Failed to retrieve DICOM file." });
        }
    }

    /// <summary>
    /// Generate a share token for a study
    /// </summary>
    [HttpPost("{studyId:guid}/share")]
    [ProducesResponseType(typeof(ShareStudyResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ShareStudy(Guid studyId, [FromBody] ShareStudyRequest request)
    {
        var tenantId = GetTenantId();

        var study = await _db.Studies
            .Where(s => s.Id == studyId && s.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (study is null)
            return NotFound(new { error = "Study not found." });

        var token = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-").Replace("/", "_").Replace("=", "");

        var expiryDays = request.ExpiryDays > 0 ? request.ExpiryDays : 30;
        var expiresAt = DateTime.UtcNow.AddDays(expiryDays);

        study.ShareToken = token;
        study.ShareTokenExpiry = expiresAt;
        await _db.SaveChangesAsync();

        var baseUrl = _config["AppBaseUrl"] ?? $"{Request.Scheme}://{Request.Host}";
        var shareUrl = $"{baseUrl}/viewer/share/{token}";

        _logger.LogInformation("Generated share token for study {StudyId}", studyId);

        return Ok(new ShareStudyResponse(
            ShareToken: token,
            ShareUrl: shareUrl,
            ExpiresAt: expiresAt));
    }

    /// <summary>
    /// Soft-delete a study
    /// </summary>
    [HttpDelete("{studyId:guid}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DeleteStudy(Guid studyId)
    {
        var tenantId = GetTenantId();

        var study = await _db.Studies
            .Where(s => s.Id == studyId && s.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (study is null)
            return NotFound(new { error = "Study not found." });

        // Soft-delete: clear share token and mark UploadedAt as epoch (sentinel)
        // A full soft-delete pattern would use an IsDeleted column; we remove from active view
        // by renaming the StudyInstanceUid with a deleted prefix so query filters exclude it.
        // Since the domain entity has no IsDeleted, we use a naming convention.
        study.StudyInstanceUid = $"DELETED_{study.StudyInstanceUid}";
        study.ShareToken = null;
        study.ShareTokenExpiry = null;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Soft-deleted study {StudyId}", studyId);
        return NoContent();
    }

    /// <summary>
    /// Public endpoint — return study info for a share token (no auth required)
    /// </summary>
    [HttpGet("/api/share/{token}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(SharedStudyDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetSharedStudy(string token)
    {
        var study = await _db.Studies
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(s => s.ShareToken == token
                        && s.ShareTokenExpiry > DateTime.UtcNow
                        && !s.StudyInstanceUid.StartsWith("DELETED_"))
            .Include(s => s.Series)
            .ThenInclude(sr => sr.DicomInstances)
            .FirstOrDefaultAsync();

        if (study is null)
            return NotFound(new { error = "Share link not found or has expired." });

        var baseUrl = $"{Request.Scheme}://{Request.Host}";

        var imageIds = study.Series
            .SelectMany(sr => sr.DicomInstances)
            .OrderBy(i => i.InstanceNumber)
            .Select(i => $"wadouri:{baseUrl}/api/studies/{study.Id}/wado?objectUID={i.SopInstanceUid}&shareToken={token}")
            .ToList();

        return Ok(new SharedStudyDto(
            StudyId: study.Id,
            PatientName: study.PatientName,
            StudyDate: study.StudyDate,
            Modality: study.ModalitiesInStudy,
            StudyDescription: study.StudyDescription,
            ImageIds: imageIds,
            ExpiresAt: study.ShareTokenExpiry!.Value));
    }
}

// Extra DTOs used only in this controller
public record PagedResult<T>(IEnumerable<T> Items, int Total, int Page, int PageSize);
public record SharedStudyDto(
    Guid StudyId,
    string PatientName,
    DateTime? StudyDate,
    string? Modality,
    string? StudyDescription,
    IEnumerable<string> ImageIds,
    DateTime ExpiresAt);
