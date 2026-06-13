'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface ReportPDFExportProps {
  reportId: string;
  patientName?: string;
}

export default function ReportPDFExport({ reportId, patientName }: ReportPDFExportProps) {
  const [loading, setLoading] = useState(false);

  const downloadPdf = async () => {
    try {
      setLoading(true);
      const blob = await api.reports.downloadPdf(reportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `radlink-report-${patientName?.replace(/\s+/g, '-') ?? reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={downloadPdf}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded bg-green-900/30 hover:bg-green-800/50 text-green-400 border border-green-800 transition-colors disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      Download PDF
    </button>
  );
}
