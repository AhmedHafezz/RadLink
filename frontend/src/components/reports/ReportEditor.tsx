'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Save, CheckCircle2, Clock, FileText, ChevronDown, AlertCircle, Eye
} from 'lucide-react';
import { reportsApi } from '@/lib/api';
import { useReportStore } from '@/store/reportStore';
import { useViewerStore } from '@/store/viewerStore';
import type { Report } from '@/types/report';
import ReportTemplates from './ReportTemplates';
import KeyImageLinker from './KeyImageLinker';

interface ReportEditorProps {
  studyId: string;
  shareToken?: string;
  readOnly?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Finalized: 'bg-green-500/20 text-green-400 border-green-500/30',
  Amended: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

interface FinalizeModalProps {
  radiologistName: string;
  onConfirm: (name: string, license: string) => void;
  onClose: () => void;
  loading: boolean;
}

function FinalizeModal({ radiologistName, onConfirm, onClose, loading }: FinalizeModalProps) {
  const [name, setName] = useState(radiologistName);
  const [license, setLicense] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-white mb-1">Finalize Report</h2>
        <p className="text-sm text-gray-400 mb-4">
          Once finalized, the report will be locked and a PDF will be generated.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Radiologist Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">License Number</label>
            <input
              type="text"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              placeholder="e.g. MD-12345"
              className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(name, license)}
            disabled={loading || !name.trim() || !license.trim()}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {loading ? 'Finalizing…' : 'Sign & Finalize'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportEditor({ studyId, shareToken, readOnly = false }: ReportEditorProps) {
  const {
    currentReport,
    isDirty,
    isSaving,
    lastSavedAt,
    draftContent,
    draftFindings,
    draftImpression,
    draftRecommendation,
    setReport,
    updateDraftContent,
    updateDraftFindings,
    updateDraftImpression,
    updateDraftRecommendation,
    getDraftAsUpdateDto,
    markSaved,
    setIsSaving,
    clearReport,
  } = useReportStore();

  const currentIndex = useViewerStore((s) => s.currentInstanceIndex);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [activeSection, setActiveSection] = useState<'full' | 'sections'>('sections');

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Load report ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    clearReport();

    async function fetchReport() {
      setLoading(true);
      setError(null);
      try {
        let report: Report;
        if (shareToken) {
          const { reportsApi: ra, shareApi } = await import('@/lib/api');
          report = (await shareApi.getReport(shareToken)) as Report;
        } else {
          report = (await reportsApi.getByStudy(studyId)) as Report;
        }
        if (!cancelled) setReport(report);
      } catch (err: unknown) {
        if (!cancelled) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 404) {
            // No report yet — that's fine
          } else {
            setError('Failed to load report.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReport();
    return () => { cancelled = true; };
  }, [studyId, shareToken, setReport, clearReport]);

  // ─── Auto-save every 30s ────────────────────────────────────────────────────
  useEffect(() => {
    if (readOnly || shareToken) return;

    autoSaveTimerRef.current = setInterval(() => {
      if (isDirty) saveDraft();
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, readOnly, shareToken]);

  const saveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      const dto = getDraftAsUpdateDto();
      if (currentReport?.id) {
        const updated = (await reportsApi.update(currentReport.id, dto)) as Report;
        markSaved(updated);
      } else {
        // Create new report
        const created = (await reportsApi.create({ studyId, ...dto })) as Report;
        markSaved(created);
        setReport(created);
      }
    } catch {
      setIsSaving(false);
    }
  }, [currentReport, getDraftAsUpdateDto, markSaved, setIsSaving, setReport, studyId]);

  const handleFinalize = async (name: string, license: string) => {
    setFinalizing(true);
    try {
      let reportId = currentReport?.id;
      const dto = getDraftAsUpdateDto();

      if (!reportId) {
        const created = (await reportsApi.create({ studyId, ...dto })) as Report;
        setReport(created);
        reportId = created.id;
      } else {
        await reportsApi.update(reportId, dto);
      }

      const finalized = (await reportsApi.finalize(
        reportId,
        `${name} (License: ${license})`
      )) as Report;
      setReport(finalized);
      markSaved(finalized);
      setShowFinalizeModal(false);
    } catch {
      alert('Failed to finalize report. Please try again.');
    } finally {
      setFinalizing(false);
    }
  };

  // ─── Slice link click handler ────────────────────────────────────────────────
  const handleSliceLink = (text: string) => {
    const match = text.match(/\[\[SLICE:(\d+)\]\]/);
    if (match) {
      const setCurrentIndex = useViewerStore.getState().setCurrentIndex;
      setCurrentIndex(parseInt(match[1], 10) - 1);
    }
  };

  // Insert [[SLICE:N]] at cursor
  const insertSliceLink = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const tag = `[[SLICE:${currentIndex + 1}]]`;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newVal = draftContent.slice(0, start) + tag + draftContent.slice(end);
    updateDraftContent(newVal);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + tag.length;
      el.focus();
    });
  }, [currentIndex, draftContent, updateDraftContent]);

  // ─── Read-only mode ─────────────────────────────────────────────────────────
  if (readOnly && currentReport) {
    return (
      <div className="flex flex-col h-full bg-gray-850 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700 flex-shrink-0">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-white text-sm">Radiology Report</span>
          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[currentReport.status] ?? ''}`}>
            {currentReport.status}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm text-gray-200 font-mono whitespace-pre-wrap">
          {currentReport.findings && (
            <section>
              <h3 className="text-xs uppercase text-gray-500 font-semibold mb-1">Findings</h3>
              <p>{currentReport.findings}</p>
            </section>
          )}
          {currentReport.impression && (
            <section>
              <h3 className="text-xs uppercase text-gray-500 font-semibold mb-1">Impression</h3>
              <p>{currentReport.impression}</p>
            </section>
          )}
          {currentReport.recommendation && (
            <section>
              <h3 className="text-xs uppercase text-gray-500 font-semibold mb-1">Recommendation</h3>
              <p>{currentReport.recommendation}</p>
            </section>
          )}
          {currentReport.content && !currentReport.findings && (
            <p>{currentReport.content}</p>
          )}
          {currentReport.finalizedAt && (
            <p className="text-xs text-gray-500 pt-4 border-t border-gray-700">
              Finalized by {currentReport.radiologistName} on{' '}
              {new Date(currentReport.finalizedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-850 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-700 flex-shrink-0">
        <FileText className="w-4 h-4 text-gray-400" />
        <span className="font-semibold text-white text-sm">Report Editor</span>
        {currentReport && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[currentReport.status] ?? ''}`}>
            {currentReport.status}
          </span>
        )}

        {/* Last saved */}
        {lastSavedAt && (
          <span className="ml-auto text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Saved {new Date(lastSavedAt).toLocaleTimeString()}
          </span>
        )}
        {isDirty && !lastSavedAt && (
          <span className="ml-auto text-xs text-yellow-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Unsaved
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700 flex-shrink-0 flex-wrap">
        {/* Template selector */}
        <button
          onClick={() => setShowTemplates((p) => !p)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-gray-700/50 border border-gray-600 px-2.5 py-1 rounded transition-colors"
        >
          <FileText className="w-3 h-3" /> Templates
          <ChevronDown className={`w-3 h-3 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
        </button>

        {/* Insert slice link */}
        <button
          onClick={insertSliceLink}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-cyan-300 bg-gray-700/50 border border-gray-600 px-2.5 py-1 rounded transition-colors"
          title={`Insert link to current slice (${currentIndex + 1})`}
        >
          📌 [[SLICE:{currentIndex + 1}]]
        </button>

        {/* Section/Full toggle */}
        <div className="flex gap-0.5 bg-gray-700/50 border border-gray-600 rounded p-0.5 ml-auto">
          <button
            onClick={() => setActiveSection('sections')}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${activeSection === 'sections' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Sections
          </button>
          <button
            onClick={() => setActiveSection('full')}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${activeSection === 'full' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Full
          </button>
        </div>
      </div>

      {/* Template panel */}
      {showTemplates && (
        <div className="border-b border-gray-700 flex-shrink-0">
          <ReportTemplates
            onSelect={(content, findings, impression) => {
              updateDraftContent(content);
              if (findings) updateDraftFindings(findings);
              if (impression) updateDraftImpression(impression);
              setShowTemplates(false);
            }}
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mx-3 my-2 p-2 bg-red-900/30 text-red-400 border border-red-800/30 rounded text-xs flex-shrink-0">
          <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : activeSection === 'sections' ? (
          <>
            <ReportSection
              label="Findings"
              placeholder="Describe the imaging findings in detail…"
              value={draftFindings}
              onChange={updateDraftFindings}
              readOnly={currentReport?.status === 'Finalized'}
              onSliceLinkClick={handleSliceLink}
            />
            <ReportSection
              label="Impression"
              placeholder="Clinical impression and diagnosis…"
              value={draftImpression}
              onChange={updateDraftImpression}
              readOnly={currentReport?.status === 'Finalized'}
              onSliceLinkClick={handleSliceLink}
            />
            <ReportSection
              label="Recommendation"
              placeholder="Follow-up or management recommendations (optional)…"
              value={draftRecommendation}
              onChange={updateDraftRecommendation}
              readOnly={currentReport?.status === 'Finalized'}
              onSliceLinkClick={handleSliceLink}
            />
          </>
        ) : (
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
              Full Report
            </label>
            <textarea
              ref={contentRef}
              value={draftContent}
              onChange={(e) => updateDraftContent(e.target.value)}
              readOnly={currentReport?.status === 'Finalized'}
              rows={20}
              placeholder="Full report text…"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm font-mono px-3 py-2 rounded-lg resize-none focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        )}

        {/* Key Image Linker */}
        <KeyImageLinker studyId={studyId} onInsertLink={insertSliceLink} />
      </div>

      {/* Footer actions */}
      {currentReport?.status !== 'Finalized' && !readOnly && (
        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-700 flex-shrink-0">
          <button
            onClick={saveDraft}
            disabled={isSaving || !isDirty}
            className="flex items-center gap-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            onClick={() => setShowFinalizeModal(true)}
            className="flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-lg font-medium transition-colors ml-auto"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Finalize & Sign
          </button>
        </div>
      )}

      {showFinalizeModal && (
        <FinalizeModal
          radiologistName={currentReport?.radiologistName ?? ''}
          onConfirm={handleFinalize}
          onClose={() => setShowFinalizeModal(false)}
          loading={finalizing}
        />
      )}
    </div>
  );
}

function ReportSection({
  label,
  placeholder,
  value,
  onChange,
  readOnly,
  onSliceLinkClick,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  readOnly?: boolean;
  onSliceLinkClick?: (text: string) => void;
}) {
  // Render [[SLICE:N]] links as clickable spans in read-only view
  const renderWithSliceLinks = (text: string) => {
    const parts = text.split(/(\[\[SLICE:\d+\]\])/g);
    return parts.map((part, i) => {
      if (/\[\[SLICE:\d+\]\]/.test(part)) {
        return (
          <button
            key={i}
            onClick={() => onSliceLinkClick?.(part)}
            className="text-cyan-400 hover:text-cyan-300 underline font-mono text-xs"
          >
            {part}
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div>
      <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {readOnly ? (
        <div className="w-full bg-gray-800/50 border border-gray-700 text-gray-200 text-sm font-mono px-3 py-2 rounded-lg min-h-[80px] whitespace-pre-wrap">
          {renderWithSliceLinks(value)}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={5}
          className="w-full bg-gray-800 border border-gray-700 text-white text-sm font-mono px-3 py-2 rounded-lg resize-y focus:outline-none focus:border-blue-500 placeholder-gray-600"
        />
      )}
    </div>
  );
}
