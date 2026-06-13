'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, Download, Eye, Search, Filter, ChevronLeft, ChevronRight,
  RefreshCw, AlertCircle
} from 'lucide-react';
import { reportsApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import type { ReportListItem, ReportStatus } from '@/types/report';

interface PaginatedReports {
  items: ReportListItem[];
  totalCount: number;
  totalPages: number;
  page: number;
}

const STATUS_STYLES: Record<ReportStatus, string> = {
  Draft: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  Finalized: 'bg-green-500/20 text-green-400 border border-green-500/30',
  Amended: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ReportsPage() {
  const router = useRouter();

  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchName, setSearchName] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | ReportStatus>('');
  const PAGE_SIZE = 25;

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/');
  }, [router]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await reportsApi.list({
        page,
        pageSize: PAGE_SIZE,
        status: filterStatus || undefined,
      })) as PaginatedReports | ReportListItem[];

      if (Array.isArray(data)) {
        // flat list response
        const filtered = searchName
          ? data.filter((r) =>
              r.patientName?.toLowerCase().includes(searchName.toLowerCase())
            )
          : data;
        setReports(filtered);
        setTotalCount(filtered.length);
        setTotalPages(1);
      } else {
        const filtered = searchName
          ? data.items.filter((r) =>
              r.patientName?.toLowerCase().includes(searchName.toLowerCase())
            )
          : data.items;
        setReports(filtered);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, searchName]);

  useEffect(() => {
    const t = setTimeout(fetchReports, 300);
    return () => clearTimeout(t);
  }, [fetchReports]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage and download radiology reports
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <FileText className="w-4 h-4" />
          {totalCount} reports
        </div>
      </div>

      <div className="px-6 py-6 max-w-screen-xl mx-auto space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status tabs */}
          <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
            {(['', 'Draft', 'Finalized'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setPage(1); }}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  filterStatus === s
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {s === '' ? 'All' : s}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by patient name…"
              value={searchName}
              onChange={(e) => { setSearchName(e.target.value); setPage(1); }}
              className="w-full bg-gray-800 border border-gray-700 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={fetchReports}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-2 rounded-lg transition-colors ml-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-900/30 text-red-400 border border-red-800/30 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800/80">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Patient</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Study Date</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Modality</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Radiologist</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Finalized</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-700/50">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-700 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : reports.length === 0
                  ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center text-gray-500">
                          No reports found.
                        </td>
                      </tr>
                    )
                  : reports.map((report) => (
                      <tr
                        key={report.id}
                        className="border-b border-gray-700/50 hover:bg-gray-700/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-white">
                          {report.patientName ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {formatDate(report.studyDate)}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {report.modality ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {report.radiologistName ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[report.status as ReportStatus] ?? ''}`}
                          >
                            {report.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {formatDate(report.finalizedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/viewer/${report.studyId}?tab=report`}
                              className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 px-2.5 py-1 rounded text-xs font-medium transition-colors border border-blue-600/30"
                            >
                              <Eye className="w-3 h-3" /> View
                            </Link>
                            {report.status === 'Finalized' && (
                              <a
                                href={reportsApi.getPdf(report.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 bg-green-600/20 hover:bg-green-600/40 text-green-300 px-2.5 py-1 rounded text-xs font-medium transition-colors border border-green-600/30"
                              >
                                <Download className="w-3 h-3" /> PDF
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 text-sm text-gray-400">
              <span>
                {totalCount} reports · Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-gray-700 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-gray-700 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
