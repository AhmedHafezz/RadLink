'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Maximize2, Minimize2, ArrowLeft, Share2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { studiesApi, shareApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { useViewerStore } from '@/store/viewerStore';
import type { DicomStudy } from '@/types/dicom';
import DicomViewer from '@/components/viewer/DicomViewer';
import ReportEditor from '@/components/reports/ReportEditor';
import ViewerToolbar from '@/components/viewer/ViewerToolbar';
import { buildCornerstoneImageId } from '@/lib/dicom-utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ViewerPage() {
  const params = useParams<{ studyId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const studyId = params.studyId;
  const shareToken = searchParams.get('token') ?? undefined;
  const defaultTab = searchParams.get('tab') === 'report' ? 'report' : 'viewer';

  const [study, setStudy] = useState<DicomStudy | null>(null);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePane, setActivePane] = useState<'viewer' | 'report'>(defaultTab as 'viewer' | 'report');
  const [splitPos, setSplitPos] = useState(60); // percent left panel
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const setStudyStore = useViewerStore((s) => s.setStudy);

  useEffect(() => {
    if (!shareToken && !isAuthenticated()) {
      router.replace('/');
    }
  }, [shareToken, router]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let studyData: DicomStudy;
        if (shareToken) {
          studyData = (await shareApi.getStudy(shareToken)) as DicomStudy;
        } else {
          studyData = (await studiesApi.get(studyId)) as DicomStudy;
        }
        setStudy(studyData);
        setStudyStore(studyData);

        // Build image IDs from all instances across all series
        const ids: string[] = [];
        for (const series of studyData.series ?? []) {
          for (const instance of series.instances ?? []) {
            ids.push(
              buildCornerstoneImageId(API_BASE, studyData.id, instance.sopInstanceUid, shareToken)
            );
          }
        }
        setImageIds(ids);
      } catch (err) {
        console.error(err);
        setError('Failed to load study. It may have been deleted or you lack access.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [studyId, shareToken, setStudyStore]);

  // Resizable splitter
  const onMouseDownSplitter = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startPos = splitPos;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const delta = ((ev.clientX - startX) / rect.width) * 100;
      setSplitPos(Math.min(80, Math.max(20, startPos + delta)));
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [splitPos]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading study…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold mb-2">Unable to Load Study</p>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link href="/dashboard" className="text-blue-400 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 bg-gray-800 border-b border-gray-700 px-4 py-2 flex-shrink-0">
        {!shareToken && (
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        )}
        <div className="w-px h-5 bg-gray-700" />
        {study && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="font-semibold text-white truncate">{study.patientName}</span>
            <span className="text-gray-500 text-sm hidden sm:block">
              {study.studyDate} · {(study.modalitiesInStudy ?? []).join(', ')}
            </span>
            {study.studyDescription && (
              <span className="text-gray-400 text-sm hidden md:block truncate">
                {study.studyDescription}
              </span>
            )}
          </div>
        )}

        {/* Mobile tab switcher */}
        <div className="flex md:hidden gap-1 ml-auto">
          <button
            onClick={() => setActivePane('viewer')}
            className={`px-3 py-1 rounded text-xs font-medium ${activePane === 'viewer' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Viewer
          </button>
          <button
            onClick={() => setActivePane('report')}
            className={`px-3 py-1 rounded text-xs font-medium ${activePane === 'report' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Report
          </button>
        </div>

        {study && !shareToken && (
          <button
            onClick={async () => {
              try {
                const res = (await studiesApi.generateShareToken(study.id)) as { shareUrl: string };
                await navigator.clipboard.writeText(res.shareUrl);
                alert('Share link copied to clipboard!');
              } catch {
                alert('Failed to generate share link.');
              }
            }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            title="Share study"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={toggleFullscreen}
          className="text-gray-400 hover:text-white transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Viewer Toolbar */}
      <ViewerToolbar />

      {/* Main split content */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: DICOM Viewer */}
        <div
          className={`flex-shrink-0 overflow-hidden ${activePane === 'report' ? 'hidden md:flex' : 'flex'} flex-col`}
          style={{ width: `${splitPos}%` }}
        >
          {imageIds.length > 0 ? (
            <DicomViewer
              studyId={studyId}
              imageIds={imageIds}
              shareToken={shareToken}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              No images found for this study.
            </div>
          )}
        </div>

        {/* Splitter handle (desktop only) */}
        <div
          className="hidden md:flex w-1.5 cursor-col-resize bg-gray-700 hover:bg-blue-500 flex-shrink-0 items-center justify-center transition-colors select-none"
          onMouseDown={onMouseDownSplitter}
        >
          <div className="w-0.5 h-10 bg-gray-500 rounded-full" />
        </div>

        {/* RIGHT: Report Editor */}
        <div
          className={`flex-1 overflow-hidden ${activePane === 'viewer' ? 'hidden md:flex' : 'flex'} flex-col min-w-0`}
        >
          <ReportEditor studyId={studyId} shareToken={shareToken} readOnly={!!shareToken} />
        </div>
      </div>
    </div>
  );
}
