'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Upload, Eye, FileText, RefreshCw, ChevronLeft, ChevronRight,
  Activity, Clock, CheckCircle2, Database, AlertCircle
} from 'lucide-react';
import { studiesApi, tenantApi } from '@/lib/api';
import { isAuthenticated, getAuthUser } from '@/lib/auth';
import type { StudyListItem, StudyStats, PaginatedStudyList } from '@/types/dicom';
import type { Tenant } from '@/types/tenant';

const STATUS_BADGE: Record<string, string> = {
  Draft: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  Finalized: 'bg-green-500/20 text-green-400 border border-green-500/30',
  Amended: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'No Report': 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

const MODALITY_COLORS: Record<string, string> = {
  CT: 'bg-blue-500/20 text-blue-300',
  MR: 'bg-purple-500/20 text-purple-300',
  CR: 'bg-orange-500/20 text-orange-300',
  DX: 'bg-teal-500/20 text-teal-300',
  US: 'bg-cyan-500/20 text-cyan-300',
  NM: 'bg-pink-500/20 text-pink-300',
  PT: 'bg-red-500/20 text-red-300',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DashboardPage() {
  const router = useRouter();
  const user = getAuthUser();

  const [studies, setStudies] = useState<StudyListItem[]>([]);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchName, setSearchName] = useState('');
  const [filterModality, setFilterModality] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/');
    }
  }, [router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studiesRes, statsRes, tenantRes] = await Promise.allSettled([
        studiesApi.list({
          page,
          pageSize: PAGE_SIZE,
          patientName: searchName || undefined,
          modality: filterModality || undefined,
          reportStatus: filterStatus || undefined,
        }),
        studiesApi.getStats(),
        tenantApi.getSubscription(),
      ]);

      if (studiesRes.status === 'fulfilled') {
        const data = studiesRes.value as PaginatedStudyList;
        setStudies(data.items ?? (data as unknown as StudyListItem[]));
        setTotalPages(data.totalPages ?? 1);
        setTotalCount(data.totalCount ?? 0);
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value as StudyStats);
      if (tenantRes.status === 'fulfilled') setTenant(tenantRes.value as Tenant);
    } catch (err) {
      setError('Failed to load dashboard data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, searchName, filterModality, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const storagePercent =
    stats && stats.storageMaxGB > 0
      ? Math.min(100, Math.round((stats.storageUsedGB / stats.storageMaxGB) * 100))
      : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Welcome back, {user?.firstName} {user?.lastName}
          </p>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload New Study
        </Link>
      </div>

      <div className="px-6 py-6 max-w-screen-2xl mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Activity className="w-5 h-5 text-blue-400" />}
            label="Total Studies"
            value={stats?.totalStudies ?? '—'}
            color="blue"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-yellow-400" />}
            label="Pending Reports"
            value={stats?.pendingReports ?? '—'}
            color="yellow"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5 text-green-400" />}
            label="Studies This Month"
            value={stats?.studiesThisMonth ?? '—'}
            color="green"
          />
          <StatCard
            icon={<Database className="w-5 h-5 text-purple-400" />}
            label="Storage"
            value={
              stats
                ? `${stats.storageUsedGB.toFixed(1)} / ${stats.storageMaxGB} GB`
                : '—'
            }
            color="purple"
            sub={
              stats ? (
                <div className="mt-1 w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${storagePercent > 80 ? 'bg-red-500' : 'bg-purple-500'}`}
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
              ) : null
            }
          />
        </div>

        {/* Subscription Info */}
        {tenant && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
            <span className="text-sm text-gray-400">Subscription:</span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-600/30">
              {tenant.subscription?.tier ?? tenant.subscriptionTier}
            </span>
            {tenant.subscription?.features?.slice(0, 4).map((f) => (
              <span key={f} className="text-xs text-gray-500 hidden md:inline">
                • {f}
              </span>
            ))}
            <Link href="/admin" className="ml-auto text-xs text-blue-400 hover:underline">
              Manage Plan →
            </Link>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search patient name…"
            value={searchName}
            onChange={(e) => { setSearchName(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-56"
          />
          <select
            value={filterModality}
            onChange={(e) => { setFilterModality(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Modalities</option>
            {['CT', 'MR', 'CR', 'DX', 'US', 'NM', 'PT', 'MG'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Finalized">Finalized</option>
            <option value="NoReport">No Report</option>
          </select>
          <button
            onClick={fetchData}
            className="ml-auto flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Studies Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-900/30 text-red-400 border-b border-red-800/30">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800/80">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Patient Name</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Study Date</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Modality</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Description</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Instances</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-700/50">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-700 rounded animate-pulse w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : studies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-gray-500">
                      No studies found.{' '}
                      <Link href="/upload" className="text-blue-400 hover:underline">
                        Upload your first study
                      </Link>
                    </td>
                  </tr>
                ) : (
                  studies.map((study) => (
                    <tr
                      key={study.id}
                      className="border-b border-gray-700/50 hover:bg-gray-700/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-white">{study.patientName}</td>
                      <td className="px-4 py-3 text-gray-300">{formatDate(study.studyDate)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(study.modalities ?? []).map((m) => (
                            <span
                              key={m}
                              className={`px-2 py-0.5 rounded text-xs font-mono ${MODALITY_COLORS[m] ?? 'bg-gray-600/40 text-gray-300'}`}
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                        {study.studyDescription || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{study.numberOfInstances}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[study.reportStatus ?? 'No Report'] ?? STATUS_BADGE['No Report']}`}
                        >
                          {study.reportStatus ?? 'No Report'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/viewer/${study.id}`}
                            className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 px-2.5 py-1 rounded text-xs font-medium transition-colors border border-blue-600/30"
                          >
                            <Eye className="w-3 h-3" /> View
                          </Link>
                          <Link
                            href={`/viewer/${study.id}?tab=report`}
                            className="flex items-center gap-1 bg-green-600/20 hover:bg-green-600/40 text-green-300 px-2.5 py-1 rounded text-xs font-medium transition-colors border border-green-600/30"
                          >
                            <FileText className="w-3 h-3" /> Report
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 text-sm text-gray-400">
              <span>
                {totalCount} studies · Page {page} of {totalPages}
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

function StatCard({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'blue' | 'yellow' | 'green' | 'purple';
  sub?: React.ReactNode;
}) {
  const borderMap = {
    blue: 'border-blue-500/30',
    yellow: 'border-yellow-500/30',
    green: 'border-green-500/30',
    purple: 'border-purple-500/30',
  };
  return (
    <div className={`bg-gray-800 border ${borderMap[color]} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {sub}
    </div>
  );
}
