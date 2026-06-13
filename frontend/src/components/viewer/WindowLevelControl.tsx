'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Sliders } from 'lucide-react';
import { useViewerStore } from '@/store/viewerStore';
import { getWindowPresets, WINDOW_PRESETS } from '@/lib/dicom-utils';
import type { WindowPreset } from '@/types/dicom';

interface WindowLevelControlProps {
  modality?: string;
  onApply?: (windowCenter: number, windowWidth: number) => void;
}

export default function WindowLevelControl({ modality = 'CT', onApply }: WindowLevelControlProps) {
  const windowCenter = useViewerStore((s) => s.windowCenter);
  const windowWidth = useViewerStore((s) => s.windowWidth);
  const setWindowLevel = useViewerStore((s) => s.setWindowLevel);

  const [localWC, setLocalWC] = useState(String(windowCenter));
  const [localWW, setLocalWW] = useState(String(windowWidth));
  const [open, setOpen] = useState(false);

  // Keep local inputs in sync with store (e.g., when user drags in viewer)
  useEffect(() => {
    setLocalWC(String(windowCenter));
    setLocalWW(String(windowWidth));
  }, [windowCenter, windowWidth]);

  const presets: WindowPreset[] = getWindowPresets(modality);

  const applyPreset = (preset: WindowPreset) => {
    setWindowLevel(preset.windowCenter, preset.windowWidth);
    onApply?.(preset.windowCenter, preset.windowWidth);
    setOpen(false);
  };

  const applyManual = () => {
    const wc = parseInt(localWC, 10);
    const ww = parseInt(localWW, 10);
    if (!isNaN(wc) && !isNaN(ww) && ww > 0) {
      setWindowLevel(wc, ww);
      onApply?.(wc, ww);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applyManual();
  };

  // Find matching preset name
  const matchedPreset = presets.find(
    (p) => p.windowCenter === windowCenter && p.windowWidth === windowWidth
  );

  return (
    <div className="relative flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5">
      <Sliders className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />

      {/* WW input */}
      <div className="flex items-center gap-1">
        <label className="text-xs text-gray-500">WW</label>
        <input
          type="number"
          value={localWW}
          onChange={(e) => setLocalWW(e.target.value)}
          onBlur={applyManual}
          onKeyDown={handleKeyDown}
          className="w-16 bg-transparent text-white text-xs font-mono text-center border-b border-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <span className="text-gray-600 text-xs">/</span>

      {/* WC input */}
      <div className="flex items-center gap-1">
        <label className="text-xs text-gray-500">WC</label>
        <input
          type="number"
          value={localWC}
          onChange={(e) => setLocalWC(e.target.value)}
          onBlur={applyManual}
          onKeyDown={handleKeyDown}
          className="w-16 bg-transparent text-white text-xs font-mono text-center border-b border-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Preset dropdown trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors border-l border-gray-700 pl-2 ml-1"
      >
        <span className="max-w-[80px] truncate hidden sm:block">
          {matchedPreset?.name ?? 'Presets'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 min-w-[200px] py-1 overflow-hidden">
          <p className="px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
            Window Presets
          </p>
          {presets.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-500">No presets for {modality}</p>
          ) : (
            presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                  matchedPreset?.name === preset.name ? 'text-blue-400' : 'text-gray-300'
                }`}
              >
                <span>{preset.name}</span>
                <span className="text-xs text-gray-500 font-mono">
                  {preset.windowWidth}/{preset.windowCenter}
                </span>
              </button>
            ))
          )}

          {/* All modality groups */}
          {Object.keys(WINDOW_PRESETS).filter((k) => k !== modality && k !== 'DEFAULT').map((mod) => (
            <React.Fragment key={mod}>
              <p className="px-3 py-1.5 text-xs text-gray-600 uppercase tracking-wider border-t border-gray-700/50">
                {mod}
              </p>
              {(WINDOW_PRESETS as Record<string, WindowPreset[]>)[mod]?.map((preset) => (
                <button
                  key={`${mod}-${preset.name}`}
                  onClick={() => applyPreset(preset)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-gray-700 transition-colors text-gray-400"
                >
                  <span>{preset.name}</span>
                  <span className="text-gray-600 font-mono">
                    {preset.windowWidth}/{preset.windowCenter}
                  </span>
                </button>
              ))}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
