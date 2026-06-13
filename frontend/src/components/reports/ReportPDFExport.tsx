'use client';

import React, { useState, useCallback } from 'react';
import { Download, Eye, X, Loader2 } from 'lucide-react';
import { reportsApi } from '@/lib/api';
import type { Report } from '@/types/report';

interface ReportPDFExportProps {
  report: Report;
  patientName?: string;
  studyDate?: string;
  hospitalName?: string;
  logoUrl?: string;
  onClose?: () => void;
}

interface PDFPreviewProps {
  report: Report;
  patientName: string;
  studyDate: string;
  hospitalName: string;
  onDownload: () => void;
  onClose: () => void;
  downloading: boolean;
}

function PDFPreview({
  report,
  patientName,
  studyDate,
  hospitalName,
  onDownload,
  onClose,
  downloading,
}: PDFPreviewProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 flex-shrink-0">
          <h2 className="font-semibold text-white">PDF Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading ? 'Generating…' : 'Download PDF'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Simulated PDF page */}
          <div className="bg-white text-gray-900 rounded-lg p-8 font-serif shadow-inner min-h-[600px]">
            {/* Header */}
            <div className="border-b-2 border-gray-800 pb-4 mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{hospitalName}</h1>
                <p className="text-sm text-gray-600">Department of Radiology</p>
                <p className="text-xs text-gray-500 mt-1">Powered by RadLink Cloud-PACS</p>
              </div>
              <div className="text-right">
                <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                  QR Code
                </div>
                <p className="text-xs text-gray-500 mt-1">Scan to verify</p>
              </div>
            </div>

            {/* Patient info */}
            <div className="bg-gray-50 rounded p-3 mb-6 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-semibold text-gray-600">Patient: </span>
                <span>{patientName || '—'}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Study Date: </span>
                <span>{studyDate || '—'}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Report Status: </span>
                <span className={report.status === 'Finalized' ? 'text-green-700 font-semibold' : 'text-yellow-700'}>
                  {report.status}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Radiologist: </span>
                <span>{report.radiologistName || '—'}</span>
              </div>
            </div>

            {/* Report title */}
            <h2 className="text-lg font-bold text-center text-gray-800 mb-4 uppercase tracking-wide">
              Radiology Report
            </h2>

            {/* Findings */}
            {report.findings && (
              <div className="mb-4">
                <h3 className="font-bold text-gray-800 uppercase text-sm tracking-wide border-b border-gray-300 pb-1 mb-2">
                  Findings
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {report.findings}
                </p>
              </div>
            )}

            {/* Impression */}
            {report.impression && (
              <div className="mb-4">
                <h3 className="font-bold text-gray-800 uppercase text-sm tracking-wide border-b border-gray-300 pb-1 mb-2">
                  Impression
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {report.impression}
                </p>
              </div>
            )}

            {/* Recommendation */}
            {report.recommendation && (
              <div className="mb-4">
                <h3 className="font-bold text-gray-800 uppercase text-sm tracking-wide border-b border-gray-300 pb-1 mb-2">
                  Recommendation
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {report.recommendation}
                </p>
              </div>
            )}

            {/* Full content fallback */}
            {report.content && !report.findings && (
              <div className="mb-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {report.content}
                </p>
              </div>
            )}

            {/* Key images */}
            {report.keyImages && report.keyImages.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold text-gray-800 uppercase text-sm tracking-wide border-b border-gray-300 pb-1 mb-2">
                  Key Images
                </h3>
                <div className="flex flex-wrap gap-3">
                  {report.keyImages.map((ki) => (
                    <div key={ki.id} className="border border-gray-200 rounded overflow-hidden">
                      {ki.imageDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ki.imageDataUrl}
                          alt={`Key image slice ${ki.sliceIndex + 1}`}
                          className="w-28 h-28 object-cover"
                        />
                      ) : (
                        <div className="w-28 h-28 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                          Slice {ki.sliceIndex + 1}
                        </div>
                      )}
                      <p className="text-xs text-center text-gray-500 py-0.5">
                        Slice {ki.sliceIndex + 1}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signature */}
            {report.finalizedAt && (
              <div className="mt-8 pt-4 border-t border-gray-300">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{report.radiologistName}</p>
                    <p className="text-xs text-gray-500">Radiologist</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Finalized: {new Date(report.finalizedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="w-32 border-b border-gray-400 mb-1 h-8" />
                    <p className="text-xs text-gray-500">Signature</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportPDFExport({
  report,
  patientName = '',
  studyDate = '',
  hospitalName = 'RadLink Medical Center',
  logoUrl,
  onClose,
}: ReportPDFExportProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      // If the server provides a PDF endpoint, use it
      const pdfUrl = reportsApi.getPdf(report.id);
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `radlink-report-${patientName.replace(/\s+/g, '-') || report.id}.pdf`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // Fallback: generate client-side PDF using jsPDF if available
      try {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const pageW = doc.internal.pageSize.getWidth();
        const margin = 20;
        const lineH = 7;
        let y = margin;

        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(hospitalName, pageW / 2, y, { align: 'center' });
        y += lineH;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('Department of Radiology', pageW / 2, y, { align: 'center' });
        y += lineH * 1.5;

        // Divider
        doc.setDrawColor(50, 50, 50);
        doc.line(margin, y, pageW - margin, y);
        y += lineH;

        // Patient info
        doc.setTextColor(0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Patient:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(patientName || '—', margin + 25, y);
        doc.setFont('helvetica', 'bold');
        doc.text('Study Date:', 110, y);
        doc.setFont('helvetica', 'normal');
        doc.text(studyDate || '—', 135, y);
        y += lineH;

        doc.setFont('helvetica', 'bold');
        doc.text('Radiologist:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(report.radiologistName || '—', margin + 30, y);
        y += lineH;

        doc.line(margin, y, pageW - margin, y);
        y += lineH;

        // Report title
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('RADIOLOGY REPORT', pageW / 2, y, { align: 'center' });
        y += lineH * 1.5;

        const addSection = (title: string, content: string) => {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(title, margin, y);
          y += 5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          const lines = doc.splitTextToSize(content, pageW - margin * 2);
          for (const line of lines) {
            if (y > 270) { doc.addPage(); y = margin; }
            doc.text(line, margin, y);
            y += 5;
          }
          y += 3;
        };

        if (report.findings) addSection('FINDINGS', report.findings);
        if (report.impression) addSection('IMPRESSION', report.impression);
        if (report.recommendation) addSection('RECOMMENDATION', report.recommendation);
        if (report.content && !report.findings) addSection('REPORT', report.content);

        // Signature
        if (report.finalizedAt) {
          y += 10;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(`Finalized by: ${report.radiologistName}`, margin, y);
          y += 5;
          doc.text(`Date: ${new Date(report.finalizedAt).toLocaleString()}`, margin, y);
        }

        doc.save(`radlink-report-${patientName.replace(/\s+/g, '-') || report.id}.pdf`);
      } catch (jsPdfErr) {
        console.error('PDF generation failed:', jsPdfErr);
        alert('PDF generation failed. Please try downloading from the server.');
      }
    } finally {
      setDownloading(false);
    }
  }, [report, patientName, studyDate, hospitalName]);

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Preview button */}
        <button
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white border border-gray-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview PDF
        </button>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white border border-green-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {downloading ? 'Downloading…' : 'Download PDF'}
        </button>
      </div>

      {showPreview && (
        <PDFPreview
          report={report}
          patientName={patientName}
          studyDate={studyDate}
          hospitalName={hospitalName}
          onDownload={handleDownload}
          onClose={() => setShowPreview(false)}
          downloading={downloading}
        />
      )}
    </>
  );
}
