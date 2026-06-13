using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLink.Application.Services;
using RadLink.Domain.Entities;
using RadLink.Infrastructure.Caching;
using RadLink.Infrastructure.Data;
using System.Security.Claims;

namespace RadLink.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UploadController : ControllerBase
{
    private readonly RadLinkDbContext _db;
    private readonly IDicomProcessingService _dicomProcessor;
    private readonly IStorageService _storage;
    private readonly ICacheService _cache;
    private readonly ILogger<UploadController> _logger;

    public UploadController(
        RadLinkDbContext db,
        IDicomProcessingService dicomProcessor,
        IStorageService storage,
        ICacheService cache,
        ILogger<UploadController> logger)
    {
        _db = db;
        _dicomProcessor = dicomProcessor;
        _storage = storage;
        _cache = cache;
        _logger = logger;
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
    /// Upload a ZIP file containing DICOM files. Returns a jobId for polling.
    /// </summary>
    [HttpPost("study")]
    [RequestSizeLimit(2_147_483_648)] // 2 GB
    [ProducesResponseType(typeof(UploadJobStartedDto), 202)]
    [ProducesResponseType(400)]
    [ProducesResponseType(402)]
    public async Task<IActionResult> UploadStudy(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".zip")
            return BadRequest(new { error = "Only ZIP archives containing DICOM files are accepted." });

        var tenantId = GetTenantId();
        var userId = GetUserId();

        // Check tenant storage quota
        var subscription = await _db.Subscriptions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.IsActive);

        if (subscription is not null)
        {
            long maxBytes = (long)subscription.MaxStorageGB * 1024L * 1024L * 1024L;
            long used = await _db.DicomInstances
                .AsNoTracking()
                .Where(i => i.Series.Study.TenantId == tenantId)
                .SumAsync(i => (long?)i.FileSize) ?? 0L;

            if (used + file.Length > maxBytes)
                return StatusCode(402, new
                {
                    error = "Storage quota exceeded.",
                    usedBytes = used,
                    maxBytes,
                    uploadSizeBytes = file.Length
                });
        }

        // Generate a jobId and kick off background processing
        var jobId = Guid.NewGuid().ToString("N");

        // Store initial status in cache
        var jobStatus = new UploadJobStatus
        {
            JobId = jobId,
            State = "pending",
            CreatedAt = DateTime.UtcNow,
            TenantId = tenantId,
            UserId = userId,
            FileName = file.FileName,
            FileSizeBytes = file.Length
        };

        await _cache.SetAsync($"upload_job:{jobId}", jobStatus, TimeSpan.FromHours(2));

        // Copy file to a temp path so we can hand it off
        var tempPath = Path.Combine(Path.GetTempPath(), $"{jobId}.zip");
        await using (var tempFile = System.IO.File.Create(tempPath))
        {
            await file.CopyToAsync(tempFile);
        }

        // Process asynchronously (fire-and-forget with structured logging)
        _ = Task.Run(async () =>
        {
            await ProcessUploadAsync(jobId, tempPath, tenantId, userId, jobStatus);
        });

        _logger.LogInformation("Upload job {JobId} queued for tenant {TenantId}", jobId, tenantId);

        return Accepted(new UploadJobStartedDto(jobId, "pending",
            $"/api/upload/status/{jobId}"));
    }

    /// <summary>
    /// Poll the status of an upload/processing job.
    /// </summary>
    [HttpGet("status/{jobId}")]
    [ProducesResponseType(typeof(UploadJobStatus), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetUploadStatus(string jobId)
    {
        var tenantId = GetTenantId();

        var status = await _cache.GetAsync<UploadJobStatus>($"upload_job:{jobId}");
        if (status is null)
            return NotFound(new { error = "Job not found or has expired." });

        // Security: only the owning tenant may poll the job
        if (status.TenantId != tenantId)
            return NotFound(new { error = "Job not found or has expired." });

        return Ok(status);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Background processing
    // ──────────────────────────────────────────────────────────────────────────

    private async Task ProcessUploadAsync(
        string jobId,
        string tempZipPath,
        Guid tenantId,
        Guid userId,
        UploadJobStatus jobStatus)
    {
        jobStatus.State = "processing";
        await _cache.SetAsync($"upload_job:{jobId}", jobStatus, TimeSpan.FromHours(2));

        try
        {
            IEnumerable<DicomFileMetadata> files;
            await using (var zipStream = System.IO.File.OpenRead(tempZipPath))
            {
                files = await _dicomProcessor.ProcessZipArchiveAsync(zipStream, anonymize: false);
            }

            var fileList = files.ToList();
            if (fileList.Count == 0)
            {
                jobStatus.State = "failed";
                jobStatus.ErrorMessage = "No valid DICOM files found in the ZIP archive.";
                await _cache.SetAsync($"upload_job:{jobId}", jobStatus, TimeSpan.FromHours(2));
                return;
            }

            // Group by study → series
            var studyGroups = fileList.GroupBy(f => f.StudyInstanceUid);

            var createdStudyIds = new List<Guid>();

            foreach (var studyGroup in studyGroups)
            {
                var firstFile = studyGroup.First();

                // Upsert study
                var study = await _db.Studies
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s => s.TenantId == tenantId &&
                                              s.StudyInstanceUid == studyGroup.Key);

                if (study is null)
                {
                    study = new Study
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        StudyInstanceUid = studyGroup.Key,
                        PatientName = firstFile.PatientName ?? "Unknown",
                        PatientId = firstFile.PatientId ?? string.Empty,
                        PatientBirthDate = firstFile.PatientBirthDate,
                        PatientSex = firstFile.PatientSex,
                        StudyDate = firstFile.StudyDate,
                        StudyTime = firstFile.StudyTime,
                        StudyDescription = firstFile.StudyDescription,
                        AccessionNumber = firstFile.AccessionNumber,
                        UploadedAt = DateTime.UtcNow,
                        UploadedByUserId = userId,
                    };
                    _db.Studies.Add(study);
                    await _db.SaveChangesAsync();
                }

                var seriesGroups = studyGroup.GroupBy(f => f.SeriesInstanceUid);
                long studyStorageSize = 0;
                int totalInstances = 0;

                foreach (var seriesGroup in seriesGroups)
                {
                    var firstSeriesFile = seriesGroup.First();

                    var series = await _db.Series
                        .FirstOrDefaultAsync(s => s.StudyId == study.Id &&
                                                  s.SeriesInstanceUid == seriesGroup.Key);

                    if (series is null)
                    {
                        series = new Series
                        {
                            Id = Guid.NewGuid(),
                            StudyId = study.Id,
                            SeriesInstanceUid = seriesGroup.Key,
                            SeriesNumber = firstSeriesFile.SeriesNumber,
                            SeriesDescription = firstSeriesFile.SeriesDescription,
                            Modality = firstSeriesFile.Modality ?? string.Empty,
                        };
                        _db.Series.Add(series);
                        await _db.SaveChangesAsync();
                    }

                    foreach (var fileMetadata in seriesGroup)
                    {
                        // Skip if already stored
                        bool alreadyExists = await _db.DicomInstances
                            .AnyAsync(i => i.SopInstanceUid == fileMetadata.SopInstanceUid);

                        if (alreadyExists) continue;

                        // Upload DICOM file to S3
                        var s3Key = $"dicom/{tenantId}/{study.StudyInstanceUid}" +
                                    $"/{series.SeriesInstanceUid}/{fileMetadata.SopInstanceUid}.dcm";

                        long fileSize = 0;
                        if (fileMetadata.LocalFilePath is not null &&
                            System.IO.File.Exists(fileMetadata.LocalFilePath))
                        {
                            await using var fs = System.IO.File.OpenRead(fileMetadata.LocalFilePath);
                            fileSize = fs.Length;
                            await _storage.UploadFileAsync(fs, s3Key, "application/dicom");
                        }

                        var instance = new DicomInstance
                        {
                            Id = Guid.NewGuid(),
                            SeriesId = series.Id,
                            SopInstanceUid = fileMetadata.SopInstanceUid,
                            SopClassUid = fileMetadata.SopClassUid ?? string.Empty,
                            InstanceNumber = fileMetadata.InstanceNumber,
                            Rows = fileMetadata.Rows,
                            Columns = fileMetadata.Columns,
                            PixelSpacingRow = fileMetadata.PixelSpacing?.Length > 0 ? fileMetadata.PixelSpacing[0] : null,
                            PixelSpacingCol = fileMetadata.PixelSpacing?.Length > 1 ? fileMetadata.PixelSpacing[1] : null,
                            WindowCenter = fileMetadata.WindowCenter,
                            WindowWidth = fileMetadata.WindowWidth,
                            StoragePath = s3Key,
                            FileSize = fileSize,
                        };
                        _db.DicomInstances.Add(instance);
                        studyStorageSize += fileSize;
                        totalInstances++;
                    }

                    await _db.SaveChangesAsync();

                    // Update series instance count
                    series.NumberOfInstances = await _db.DicomInstances
                        .CountAsync(i => i.SeriesId == series.Id);
                    await _db.SaveChangesAsync();
                }

                // Update study aggregates
                study.NumberOfSeries = await _db.Series.CountAsync(s => s.StudyId == study.Id);
                study.NumberOfInstances = await _db.DicomInstances
                    .CountAsync(i => i.Series.StudyId == study.Id);
                study.StorageSize += studyStorageSize;
                study.ModalitiesInStudy = string.Join("\\",
                    studyGroup.Select(f => f.Modality).Distinct().Where(m => m is not null));
                await _db.SaveChangesAsync();

                createdStudyIds.Add(study.Id);
            }

            jobStatus.State = "completed";
            jobStatus.StudyIds = createdStudyIds;
            jobStatus.ProcessedInstances = fileList.Count;
            jobStatus.CompletedAt = DateTime.UtcNow;
            await _cache.SetAsync($"upload_job:{jobId}", jobStatus, TimeSpan.FromHours(2));

            _logger.LogInformation(
                "Upload job {JobId} completed: {StudyCount} studies, {InstanceCount} instances",
                jobId, createdStudyIds.Count, fileList.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Upload job {JobId} failed", jobId);
            jobStatus.State = "failed";
            jobStatus.ErrorMessage = ex.Message;
            await _cache.SetAsync($"upload_job:{jobId}", jobStatus, TimeSpan.FromHours(2));
        }
        finally
        {
            if (System.IO.File.Exists(tempZipPath))
                System.IO.File.Delete(tempZipPath);
        }
    }
}

// DTOs local to the upload flow
public record UploadJobStartedDto(string JobId, string State, string StatusUrl);

public class UploadJobStatus
{
    public string JobId { get; set; } = string.Empty;
    public string State { get; set; } = "pending"; // pending | processing | completed | failed
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public int ProcessedInstances { get; set; }
    public List<Guid> StudyIds { get; set; } = new();
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
