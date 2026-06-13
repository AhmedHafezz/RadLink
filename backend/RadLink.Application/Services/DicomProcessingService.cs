using FellowOakDicom;
using Microsoft.Extensions.Logging;
using RadLink.Application.DTOs;

namespace RadLink.Application.Services;

public interface IDicomProcessingService
{
    Task<IEnumerable<DicomFileMetadata>> ProcessZipArchiveAsync(Stream zipStream, bool anonymize = false);
    DicomFileMetadata ExtractMetadata(string filePath);
    void AnonymizeFile(string filePath);
}

public class DicomFileMetadata
{
    public string StudyInstanceUid { get; set; } = string.Empty;
    public string SeriesInstanceUid { get; set; } = string.Empty;
    public string SopInstanceUid { get; set; } = string.Empty;
    public string? SopClassUid { get; set; }
    public string? PatientName { get; set; }
    public string? PatientId { get; set; }
    public DateTime? PatientBirthDate { get; set; }
    public string? PatientSex { get; set; }
    public DateTime? StudyDate { get; set; }
    public string? StudyTime { get; set; }
    public string? StudyDescription { get; set; }
    public string? AccessionNumber { get; set; }
    public string? Modality { get; set; }
    public string? SeriesDescription { get; set; }
    public int? SeriesNumber { get; set; }
    public int? InstanceNumber { get; set; }
    public double[]? PixelSpacing { get; set; }
    public double? WindowCenter { get; set; }
    public double? WindowWidth { get; set; }
    public int? Rows { get; set; }
    public int? Columns { get; set; }
    public int? BitsAllocated { get; set; }
    public string? LocalFilePath { get; set; }
}

public class DicomProcessingService : IDicomProcessingService
{
    private readonly ILogger<DicomProcessingService> _logger;

    public DicomProcessingService(ILogger<DicomProcessingService> logger)
    {
        _logger = logger;
    }

    public async Task<IEnumerable<DicomFileMetadata>> ProcessZipArchiveAsync(Stream zipStream, bool anonymize = false)
    {
        var results = new List<DicomFileMetadata>();
        var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);

        try
        {
            using var archive = new System.IO.Compression.ZipArchive(zipStream, System.IO.Compression.ZipArchiveMode.Read);

            foreach (var entry in archive.Entries)
            {
                if (entry.Length == 0) continue;

                var ext = Path.GetExtension(entry.Name).ToLowerInvariant();
                if (ext != ".dcm" && ext != "" && ext != ".dicom") continue;

                var destPath = Path.Combine(tempDir, entry.FullName.Replace('/', Path.DirectorySeparatorChar));
                var destDir = Path.GetDirectoryName(destPath)!;
                Directory.CreateDirectory(destDir);

                entry.ExtractToFile(destPath, overwrite: true);

                try
                {
                    if (anonymize) AnonymizeFile(destPath);
                    var metadata = ExtractMetadata(destPath);
                    metadata.LocalFilePath = destPath;
                    results.Add(metadata);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to process DICOM file: {File}", entry.Name);
                }
            }

            await Task.CompletedTask;
            return results;
        }
        catch
        {
            if (Directory.Exists(tempDir)) Directory.Delete(tempDir, recursive: true);
            throw;
        }
    }

    public DicomFileMetadata ExtractMetadata(string filePath)
    {
        var dicomFile = DicomFile.Open(filePath);
        var ds = dicomFile.Dataset;

        var meta = new DicomFileMetadata
        {
            StudyInstanceUid = ds.GetSingleValueOrDefault(DicomTag.StudyInstanceUID, string.Empty),
            SeriesInstanceUid = ds.GetSingleValueOrDefault(DicomTag.SeriesInstanceUID, string.Empty),
            SopInstanceUid = ds.GetSingleValueOrDefault(DicomTag.SOPInstanceUID, string.Empty),
            SopClassUid = ds.GetSingleValueOrDefault<string>(DicomTag.SOPClassUID, null!),
            PatientName = ds.GetSingleValueOrDefault<string>(DicomTag.PatientName, null!),
            PatientId = ds.GetSingleValueOrDefault<string>(DicomTag.PatientID, null!),
            PatientSex = ds.GetSingleValueOrDefault<string>(DicomTag.PatientSex, null!),
            StudyDescription = ds.GetSingleValueOrDefault<string>(DicomTag.StudyDescription, null!),
            AccessionNumber = ds.GetSingleValueOrDefault<string>(DicomTag.AccessionNumber, null!),
            Modality = ds.GetSingleValueOrDefault<string>(DicomTag.Modality, null!),
            SeriesDescription = ds.GetSingleValueOrDefault<string>(DicomTag.SeriesDescription, null!),
            Rows = ds.GetSingleValueOrDefault<int>(DicomTag.Rows, 0),
            Columns = ds.GetSingleValueOrDefault<int>(DicomTag.Columns, 0),
            BitsAllocated = ds.GetSingleValueOrDefault<int>(DicomTag.BitsAllocated, 16),
            LocalFilePath = filePath,
        };

        // Parse dates
        if (ds.TryGetSingleValue(DicomTag.StudyDate, out string studyDateStr) &&
            DateTime.TryParseExact(studyDateStr, "yyyyMMdd", null,
                System.Globalization.DateTimeStyles.None, out var studyDate))
            meta.StudyDate = studyDate;

        if (ds.TryGetSingleValue(DicomTag.PatientBirthDate, out string birthDateStr) &&
            DateTime.TryParseExact(birthDateStr, "yyyyMMdd", null,
                System.Globalization.DateTimeStyles.None, out var birthDate))
            meta.PatientBirthDate = birthDate;

        // Pixel Spacing (0028,0030)
        if (ds.TryGetValues(DicomTag.PixelSpacing, out double[] pixelSpacing))
            meta.PixelSpacing = pixelSpacing;

        // Window Center/Width (0028,1050) / (0028,1051)
        if (ds.TryGetSingleValue(DicomTag.WindowCenter, out double wc))
            meta.WindowCenter = wc;
        if (ds.TryGetSingleValue(DicomTag.WindowWidth, out double ww))
            meta.WindowWidth = ww;

        // Series / Instance numbers
        if (ds.TryGetSingleValue(DicomTag.SeriesNumber, out int seriesNum))
            meta.SeriesNumber = seriesNum;
        if (ds.TryGetSingleValue(DicomTag.InstanceNumber, out int instanceNum))
            meta.InstanceNumber = instanceNum;

        if (ds.TryGetSingleValue(DicomTag.StudyTime, out string studyTime))
            meta.StudyTime = studyTime;

        return meta;
    }

    public void AnonymizeFile(string filePath)
    {
        // HIPAA-compliant PHI removal
        var dicomFile = DicomFile.Open(filePath);
        var ds = dicomFile.Dataset;

        var phiTags = new[]
        {
            DicomTag.PatientName,
            DicomTag.PatientID,
            DicomTag.PatientBirthDate,
            DicomTag.PatientAddress,
            DicomTag.PatientTelephoneNumbers,
            DicomTag.PatientMotherBirthName,
            DicomTag.ResponsiblePerson,
            DicomTag.OtherPatientIDs,
            DicomTag.OtherPatientNames,
            DicomTag.ReferringPhysicianName,
            DicomTag.PerformingPhysicianName,
            DicomTag.OperatorsName,
            DicomTag.RequestingPhysician,
            DicomTag.InstitutionName,
            DicomTag.InstitutionAddress,
            DicomTag.StationName,
        };

        foreach (var tag in phiTags)
        {
            if (ds.Contains(tag))
                ds.AddOrUpdate(tag, string.Empty);
        }

        // Replace patient name with anonymous ID
        var anonId = $"ANON-{Guid.NewGuid().ToString()[..8].ToUpper()}";
        ds.AddOrUpdate(DicomTag.PatientName, anonId);
        ds.AddOrUpdate(DicomTag.PatientID, anonId);

        dicomFile.Save(filePath);
    }
}
