'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as cornerstone from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import type { Types } from '@cornerstonejs/core';
import { initCornerstone } from '@/lib/cornerstone-init';
import { useViewerStore } from '@/store/viewerStore';
import { formatPatientName, formatDicomDate } from '@/lib/dicom-utils';

interface DicomViewerProps {
  studyId: string;
  seriesId?: string;
  imageIds: string[];
  shareToken?: string;
}

const RENDERING_ENGINE_ID = 'radlink-rendering-engine';
const VIEWPORT_ID = 'radlink-viewport';
const TOOL_GROUP_ID = 'radlink-toolgroup';

export default function DicomViewer({ studyId, seriesId, imageIds, shareToken }: DicomViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderingEngineRef = useRef<Types.IRenderingEngine | null>(null);
  const toolGroupRef = useRef<cornerstoneTools.Types.IToolGroup | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Overlay state
  const [overlayInfo, setOverlayInfo] = useState({
    patientName: '',
    patientId: '',
    studyDate: '',
    modality: '',
    studyDescription: '',
    sliceCurrent: 1,
    sliceTotal: 0,
    windowWidth: 400,
    windowCenter: 40,
    zoom: 1,
  });

  const {
    currentStudy,
    activeTool,
    windowCenter,
    windowWidth,
    setCurrentIndex,
    setWindowLevel,
    setActiveTool,
    viewportId,
    renderingEngineId,
  } = useViewerStore();

  // ─── Initialize Cornerstone3D ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await initCornerstone();
        if (cancelled) return;
        setInitialized(true);
      } catch (err) {
        console.error('Cornerstone init failed:', err);
        if (!cancelled) setInitError('Failed to initialize DICOM viewer engine.');
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // ─── Setup viewport after initialization + imageIds ready ──────────────────
  useEffect(() => {
    if (!initialized || !containerRef.current || imageIds.length === 0) return;

    let cancelled = false;

    async function setupViewport() {
      if (!containerRef.current || cancelled) return;

      // Destroy existing engine to prevent ID collisions on hot reload
      try {
        const existing = cornerstone.getRenderingEngine(RENDERING_ENGINE_ID);
        if (existing) existing.destroy();
      } catch { /* ignore */ }

      const engine = new cornerstone.RenderingEngine(RENDERING_ENGINE_ID);
      renderingEngineRef.current = engine;

      const viewportInput: Types.PublicViewportInput = {
        viewportId: VIEWPORT_ID,
        type: cornerstone.Enums.ViewportType.STACK,
        element: containerRef.current,
        defaultOptions: {
          background: [0, 0, 0] as Types.Point3,
        },
      };

      engine.enableElement(viewportInput);
      const viewport = engine.getViewport(VIEWPORT_ID) as Types.IStackViewport;

      // Setup tool group
      try { cornerstoneTools.ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID); } catch { /* ok */ }
      const toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(TOOL_GROUP_ID)!;
      toolGroupRef.current = toolGroup;

      toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName);
      toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
      toolGroup.addTool(cornerstoneTools.PanTool.toolName);
      toolGroup.addTool(cornerstoneTools.LengthTool.toolName);
      toolGroup.addTool(cornerstoneTools.AngleTool.toolName);
      toolGroup.addTool(cornerstoneTools.EllipticalROITool.toolName);
      toolGroup.addTool(cornerstoneTools.RectangleROITool.toolName);
      toolGroup.addTool(cornerstoneTools.StackScrollMouseWheelTool.toolName);
      toolGroup.addTool(cornerstoneTools.MagnifyTool.toolName);

      // Default bindings
      toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
        bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
      });
      toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
        bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
      });
      toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
        bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
      });
      toolGroup.setToolActive(cornerstoneTools.StackScrollMouseWheelTool.toolName, {
        bindings: [],
      });

      toolGroup.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);

      // Load stack
      await viewport.setStack(imageIds, 0);
      viewport.render();

      if (cancelled) return;

      // Update overlay after initial render
      updateOverlay(viewport);

      // Event listeners
      const element = containerRef.current;
      if (element) {
        element.addEventListener(
          cornerstone.EVENTS.STACK_VIEWPORT_NEW_STACK,
          () => updateOverlay(viewport)
        );
        element.addEventListener(
          cornerstone.EVENTS.IMAGE_RENDERED,
          () => updateOverlay(viewport)
        );
        element.addEventListener(
          cornerstoneTools.Events.STACK_SCROLL,
          (evt) => {
            const e = evt as CustomEvent;
            const idx = e.detail?.newImageIdIndex ?? 0;
            setCurrentIndex(idx);
            setOverlayInfo((prev) => ({ ...prev, sliceCurrent: idx + 1 }));
          }
        );
      }
    }

    setupViewport().catch((err) => {
      console.error('Viewport setup error:', err);
      if (!cancelled) setInitError('Failed to load DICOM images.');
    });

    return () => {
      cancelled = true;
      try {
        cornerstoneTools.ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
      } catch { /* ok */ }
      try {
        renderingEngineRef.current?.destroy();
        renderingEngineRef.current = null;
      } catch { /* ok */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, imageIds.join(',')]);

  // ─── Sync active tool from store → Cornerstone ─────────────────────────────
  useEffect(() => {
    if (!toolGroupRef.current || !initialized) return;
    const tg = toolGroupRef.current;

    const TOOL_MAP: Record<string, string> = {
      WindowLevel: cornerstoneTools.WindowLevelTool.toolName,
      Zoom: cornerstoneTools.ZoomTool.toolName,
      Pan: cornerstoneTools.PanTool.toolName,
      Length: cornerstoneTools.LengthTool.toolName,
      Angle: cornerstoneTools.AngleTool.toolName,
      EllipticalROI: cornerstoneTools.EllipticalROITool.toolName,
      RectangleROI: cornerstoneTools.RectangleROITool.toolName,
      Magnify: cornerstoneTools.MagnifyTool.toolName,
    };

    const csToolName = TOOL_MAP[activeTool];
    if (!csToolName) return;

    // Disable the active left-button tool and re-enable new one
    for (const [, name] of Object.entries(TOOL_MAP)) {
      try { tg.setToolPassive(name); } catch { /* ok */ }
    }
    tg.setToolActive(csToolName, {
      bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
    });
    // Always keep pan/zoom on other buttons
    tg.setToolActive(cornerstoneTools.PanTool.toolName, {
      bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
    });
    tg.setToolActive(cornerstoneTools.ZoomTool.toolName, {
      bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
    });
  }, [activeTool, initialized]);

  // ─── Sync window level from store → viewport ────────────────────────────────
  useEffect(() => {
    if (!renderingEngineRef.current || !initialized) return;
    try {
      const viewport = renderingEngineRef.current.getViewport(VIEWPORT_ID) as Types.IStackViewport;
      viewport.setProperties({ voiRange: { lower: windowCenter - windowWidth / 2, upper: windowCenter + windowWidth / 2 } });
      viewport.render();
    } catch { /* viewport not ready */ }
  }, [windowCenter, windowWidth, initialized]);

  // ─── Helper: read overlay info from current viewport state ─────────────────
  const updateOverlay = useCallback((viewport: Types.IStackViewport) => {
    try {
      const imageId = viewport.getCurrentImageId();
      const imageIndex = viewport.getCurrentImageIdIndex();
      const total = imageIds.length;
      const props = viewport.getProperties();
      const camera = viewport.getCamera();
      const ww = props.voiRange
        ? props.voiRange.upper - props.voiRange.lower
        : 400;
      const wc = props.voiRange
        ? (props.voiRange.upper + props.voiRange.lower) / 2
        : 40;

      // Try to read metadata
      let patientName = '';
      let patientId = '';
      let studyDate = '';
      let modality = '';
      let studyDescription = '';

      const meta = cornerstone.metaData.get('generalStudyModule', imageId) ?? {};
      const patMeta = cornerstone.metaData.get('patientModule', imageId) ?? {};
      const imageMeta = cornerstone.metaData.get('generalImageModule', imageId) ?? {};

      patientName = formatPatientName(patMeta.patientName ?? currentStudy?.patientName ?? '');
      patientId = patMeta.patientId ?? currentStudy?.patientId ?? '';
      studyDate = formatDicomDate(meta.studyDate ?? currentStudy?.studyDate ?? '');
      modality = imageMeta.modality ?? (currentStudy?.modalitiesInStudy?.[0] ?? '');
      studyDescription = meta.studyDescription ?? currentStudy?.studyDescription ?? '';

      const zoomVal = (camera.parallelScale != null && camera.parallelScale !== 0)
        ? parseFloat((1 / camera.parallelScale * 100).toFixed(0))
        : 1;

      setOverlayInfo({
        patientName,
        patientId,
        studyDate,
        modality,
        studyDescription,
        sliceCurrent: imageIndex + 1,
        sliceTotal: total,
        windowWidth: Math.round(ww),
        windowCenter: Math.round(wc),
        zoom: zoomVal,
      });

      // Sync to store
      setCurrentIndex(imageIndex);
      setWindowLevel(Math.round(wc), Math.round(ww));
    } catch { /* metadata not yet available */ }
  }, [imageIds.length, currentStudy, setCurrentIndex, setWindowLevel]);

  // ─── Touch support ──────────────────────────────────────────────────────────
  const touchState = useRef({
    touches: [] as React.Touch[],
    lastDist: 0,
    lastY: 0,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchState.current.touches = Array.from(e.touches);
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchState.current.lastDist = Math.sqrt(dx * dx + dy * dy);
    }
    if (e.touches.length === 1) {
      touchState.current.lastY = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!renderingEngineRef.current) return;

    const viewport = renderingEngineRef.current.getViewport(VIEWPORT_ID) as Types.IStackViewport;

    if (e.touches.length === 2) {
      // Pinch-to-zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist - touchState.current.lastDist;
      touchState.current.lastDist = dist;

      const camera = viewport.getCamera();
      if (camera.parallelScale != null) {
        viewport.setCamera({ parallelScale: camera.parallelScale * (1 - delta * 0.002) });
        viewport.render();
      }
    } else if (e.touches.length === 1) {
      // One finger: WL drag
      const dy = e.touches[0].clientY - touchState.current.lastY;
      touchState.current.lastY = e.touches[0].clientY;

      const props = viewport.getProperties();
      if (props.voiRange) {
        const ww = props.voiRange.upper - props.voiRange.lower;
        const wc = (props.voiRange.upper + props.voiRange.lower) / 2;
        viewport.setProperties({
          voiRange: {
            lower: (wc - dy * 2) - ww / 2,
            upper: (wc - dy * 2) + ww / 2,
          },
        });
        viewport.render();
      }
    }
  }, []);

  if (initError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black text-red-400 p-8 text-center">
        <div>
          <p className="text-lg font-semibold mb-2">Viewer Error</p>
          <p className="text-sm text-gray-400">{initError}</p>
        </div>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Initializing viewer…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 bg-black overflow-hidden select-none">
      {/* Cornerstone viewport container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
      />

      {/* ── OVERLAYS ── */}

      {/* Top-left: Patient info */}
      <div className="absolute top-3 left-3 pointer-events-none space-y-0.5">
        <p className="text-white text-xs font-semibold leading-tight drop-shadow-lg">
          {overlayInfo.patientName || currentStudy?.patientName || '—'}
        </p>
        {overlayInfo.patientId && (
          <p className="text-gray-300 text-xs leading-tight drop-shadow-lg">
            ID: {overlayInfo.patientId}
          </p>
        )}
      </div>

      {/* Top-right: Study info */}
      <div className="absolute top-3 right-3 pointer-events-none text-right space-y-0.5">
        <p className="text-white text-xs font-semibold leading-tight drop-shadow-lg">
          {overlayInfo.modality || ''}
        </p>
        <p className="text-gray-300 text-xs leading-tight drop-shadow-lg">
          {overlayInfo.studyDate || ''}
        </p>
        {overlayInfo.studyDescription && (
          <p className="text-gray-400 text-xs leading-tight drop-shadow-lg max-w-[200px] truncate">
            {overlayInfo.studyDescription}
          </p>
        )}
      </div>

      {/* Bottom-left: WW/WL */}
      <div className="absolute bottom-10 left-3 pointer-events-none space-y-0.5">
        <p className="text-gray-200 text-xs font-mono leading-tight drop-shadow-lg">
          WW: {overlayInfo.windowWidth}
        </p>
        <p className="text-gray-200 text-xs font-mono leading-tight drop-shadow-lg">
          WL: {overlayInfo.windowCenter}
        </p>
        <p className="text-gray-400 text-xs font-mono leading-tight drop-shadow-lg">
          Zoom: {overlayInfo.zoom}%
        </p>
      </div>

      {/* Bottom-right: Slice position */}
      <div className="absolute bottom-10 right-3 pointer-events-none text-right">
        <p className="text-gray-200 text-xs font-mono leading-tight drop-shadow-lg">
          {overlayInfo.sliceTotal > 0
            ? `${overlayInfo.sliceCurrent} / ${overlayInfo.sliceTotal}`
            : ''}
        </p>
      </div>

      {/* Bottom-center: Slice bar */}
      {overlayInfo.sliceTotal > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <p className="text-gray-400 text-xs font-mono text-center drop-shadow-lg">
            Slice {overlayInfo.sliceCurrent} / {overlayInfo.sliceTotal}
          </p>
        </div>
      )}

      {/* Loading overlay while images load */}
      {imageIds.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500 text-sm">No images to display</p>
        </div>
      )}
    </div>
  );
}
