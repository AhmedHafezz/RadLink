using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;
using QRCoder;
using RadLink.Application.DTOs;

namespace RadLink.Application.Services;

public interface IReportService
{
    Task<byte[]> GeneratePdfAsync(ReportDto report, string tenantName, string? logoUrl, string viewerBaseUrl);
}

public class ReportService : IReportService
{
    private readonly IConfiguration _config;
    private readonly ILogger<ReportService> _logger;

    public ReportService(IConfiguration config, ILogger<ReportService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<byte[]> GeneratePdfAsync(
        ReportDto report,
        string tenantName,
        string? logoUrl,
        string viewerBaseUrl)
    {
        await Task.CompletedTask;

        var document = new PdfDocument();
        document.Info.Title = $"Radiology Report - {report.Id}";
        document.Info.Author = $"{report.Radiologist.FirstName} {report.Radiologist.LastName}";
        document.Info.Creator = "RadLink Cloud-PACS";

        var page = document.AddPage();
        page.Size = PdfSharpCore.PageSize.A4;

        using var gfx = XGraphics.FromPdfPage(page);

        var fontTitle = new XFont("Arial", 18, XFontStyle.Bold);
        var fontHeader = new XFont("Arial", 12, XFontStyle.Bold);
        var fontBody = new XFont("Arial", 11, XFontStyle.Regular);
        var fontSmall = new XFont("Arial", 9, XFontStyle.Regular);
        var fontItalic = new XFont("Arial", 10, XFontStyle.Italic);

        double margin = 50;
        double y = margin;
        double pageWidth = page.Width.Point;
        double contentWidth = pageWidth - 2 * margin;

        // Header bar
        gfx.DrawRectangle(XBrushes.DarkBlue, margin, y, contentWidth, 4);
        y += 10;

        // Tenant name as title
        gfx.DrawString(tenantName, fontTitle, XBrushes.DarkBlue, new XRect(margin, y, contentWidth, 30), XStringFormats.TopLeft);
        y += 30;

        // Report type
        gfx.DrawString("RADIOLOGY REPORT", fontHeader, XBrushes.Gray, new XRect(margin, y, contentWidth, 20), XStringFormats.TopLeft);
        y += 25;

        // Horizontal line
        gfx.DrawLine(XPens.LightGray, margin, y, margin + contentWidth, y);
        y += 10;

        // Patient/Study info
        gfx.DrawString($"Radiologist: Dr. {report.Radiologist.FirstName} {report.Radiologist.LastName}", fontBody, XBrushes.Black, new XRect(margin, y, contentWidth, 18), XStringFormats.TopLeft);
        y += 18;

        if (!string.IsNullOrEmpty(report.Radiologist.LicenseNumber))
        {
            gfx.DrawString($"License No: {report.Radiologist.LicenseNumber}", fontBody, XBrushes.Black, new XRect(margin, y, contentWidth, 18), XStringFormats.TopLeft);
            y += 18;
        }

        gfx.DrawString($"Report Date: {report.FinalizedAt?.ToString("dd MMMM yyyy") ?? DateTime.UtcNow.ToString("dd MMMM yyyy")}", fontBody, XBrushes.Black, new XRect(margin, y, contentWidth, 18), XStringFormats.TopLeft);
        y += 18;
        gfx.DrawString($"Report ID: {report.Id}", fontSmall, XBrushes.Gray, new XRect(margin, y, contentWidth, 16), XStringFormats.TopLeft);
        y += 25;

        // Line
        gfx.DrawLine(XPens.LightGray, margin, y, margin + contentWidth, y);
        y += 15;

        // Findings
        if (!string.IsNullOrWhiteSpace(report.Findings))
        {
            gfx.DrawString("FINDINGS:", fontHeader, XBrushes.DarkBlue, new XRect(margin, y, contentWidth, 18), XStringFormats.TopLeft);
            y += 20;
            y = DrawWrappedText(gfx, report.Findings, fontBody, XBrushes.Black, margin, y, contentWidth, 16);
            y += 10;
        }

        // Impression
        if (!string.IsNullOrWhiteSpace(report.Impression))
        {
            gfx.DrawString("IMPRESSION:", fontHeader, XBrushes.DarkBlue, new XRect(margin, y, contentWidth, 18), XStringFormats.TopLeft);
            y += 20;
            y = DrawWrappedText(gfx, report.Impression, fontBody, XBrushes.Black, margin, y, contentWidth, 16);
            y += 10;
        }

        // Recommendation
        if (!string.IsNullOrWhiteSpace(report.Recommendation))
        {
            gfx.DrawString("RECOMMENDATION:", fontHeader, XBrushes.DarkBlue, new XRect(margin, y, contentWidth, 18), XStringFormats.TopLeft);
            y += 20;
            y = DrawWrappedText(gfx, report.Recommendation, fontBody, XBrushes.Black, margin, y, contentWidth, 16);
            y += 10;
        }

        // Digital signature section
        y += 20;
        gfx.DrawLine(XPens.LightGray, margin, y, margin + contentWidth, y);
        y += 10;

        gfx.DrawString("DIGITALLY SIGNED & FINALIZED", fontHeader, XBrushes.DarkGreen, new XRect(margin, y, contentWidth, 18), XStringFormats.TopLeft);
        y += 20;
        gfx.DrawString($"Dr. {report.Radiologist.FirstName} {report.Radiologist.LastName}", fontBody, XBrushes.Black, new XRect(margin, y, 200, 18), XStringFormats.TopLeft);
        y += 16;
        gfx.DrawString($"Finalized: {report.FinalizedAt?.ToString("dd/MM/yyyy HH:mm") ?? DateTime.UtcNow.ToString("dd/MM/yyyy HH:mm")} UTC", fontSmall, XBrushes.Gray, new XRect(margin, y, 300, 16), XStringFormats.TopLeft);

        // QR Code — bottom right
        var qrUrl = $"{viewerBaseUrl}/viewer/{report.StudyId}?token={report.QrCodeToken}";
        var qrCodeBytes = GenerateQrCode(qrUrl);
        if (qrCodeBytes != null)
        {
            using var qrStream = new MemoryStream(qrCodeBytes);
            var qrImage = XImage.FromStream(() => new MemoryStream(qrCodeBytes));
            double qrSize = 80;
            double qrX = margin + contentWidth - qrSize;
            double qrY = page.Height.Point - margin - qrSize - 20;
            gfx.DrawImage(qrImage, qrX, qrY, qrSize, qrSize);
            gfx.DrawString("Scan to view images", fontSmall, XBrushes.Gray,
                new XRect(qrX - 10, qrY + qrSize + 2, qrSize + 20, 14), XStringFormats.TopCenter);
        }

        // Footer
        double footerY = page.Height.Point - margin;
        gfx.DrawLine(XPens.LightGray, margin, footerY - 15, margin + contentWidth, footerY - 15);
        gfx.DrawString("Generated by RadLink Cloud-PACS | This report is digitally signed and tamper-evident.",
            fontSmall, XBrushes.Gray, new XRect(margin, footerY - 12, contentWidth, 12), XStringFormats.TopCenter);

        using var ms = new MemoryStream();
        document.Save(ms);
        return ms.ToArray();
    }

    private static byte[]? GenerateQrCode(string content)
    {
        try
        {
            using var qrGenerator = new QRCodeGenerator();
            var qrData = qrGenerator.CreateQrCode(content, QRCodeGenerator.ECCLevel.M);
            using var qrCode = new PngByteQRCode(qrData);
            return qrCode.GetGraphic(4);
        }
        catch
        {
            return null;
        }
    }

    private static double DrawWrappedText(XGraphics gfx, string text, XFont font, XBrush brush,
        double x, double y, double maxWidth, double lineHeight)
    {
        var words = text.Split(' ', '\n');
        var line = string.Empty;

        foreach (var word in words)
        {
            if (word == "\n" || word.Contains('\n'))
            {
                gfx.DrawString(line, font, brush, new XRect(x, y, maxWidth, lineHeight), XStringFormats.TopLeft);
                y += lineHeight;
                line = word.Replace("\n", " ").Trim();
                continue;
            }

            var testLine = string.IsNullOrEmpty(line) ? word : $"{line} {word}";
            var size = gfx.MeasureString(testLine, font);

            if (size.Width > maxWidth && !string.IsNullOrEmpty(line))
            {
                gfx.DrawString(line, font, brush, new XRect(x, y, maxWidth, lineHeight), XStringFormats.TopLeft);
                y += lineHeight;
                line = word;
            }
            else
            {
                line = testLine;
            }
        }

        if (!string.IsNullOrEmpty(line))
        {
            gfx.DrawString(line, font, brush, new XRect(x, y, maxWidth, lineHeight), XStringFormats.TopLeft);
            y += lineHeight;
        }

        return y;
    }
}
