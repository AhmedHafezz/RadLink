'use client';

import React, { useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { useViewerStore } from '@/store/viewerStore';
import { useReportStore } from '@/store/reportStore';

interface KeyImageLinkerProps {
  studyId: string;
  onInsertLink: () => void;
}

export default function KeyImageLinker({ studyId, onInsertLink }: KeyImageLinkerProps) {
  const currentIndex = useViewerStore((s) => s.currentInstanceIndex);
  const currentStudy = useViewerStore((s) => s.currentStudy);

  const pendingKeyImage = useReportStore((s) => s.pendingKeyImage);
  const addKeyImageToReport = useReportStore((s) => s.addKeyImageToReport);
  const removeKeyImage = useReportStore((s) => s.removeKeyImage);
  const currentReport = useReportStore((s) => s.currentReport);

  const [capturing, setCapturing] = useState(false);

  const keyImages = currentReport?.keyImages ?? [];

  const handleCapture = async () => {
    setCapturing(true);
    try {
      // Try to capture a screenshot from the Cornerstone viewport canvas
      const canvas = document.querySelector<HTMLCanvasElement>('.cornerstone-canvas, canvas');
      let imageDataUrl = '';
      if (canvas) {
        imageDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      }

      // Find SOP instance UID for current index
      const instances = currentStudy?.series?.flatMap((s) => s.instances) ?? [];
      const instance = instances[currentIndex];

      addKeyImageToReport({
        instanceId: instance?.id ?? String(currentIndex),
        sopInstanceUid: instance?.sopInstanceUid ?? '',
        sliceIndex: currentIndex,
        imageDataUrl,
        capturedAt: new Date().toISOString(),
      });

      // Insert the slice link into the report
      onInsertLink();
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Capture button */}
      <button
        onClick={handleCapture}
        disabled={capturing}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded bg-gray-800 hover:bg-cyan-900/40 text-gray-300 hover:text-cyan-300 border border-gray-700 hover:border-cyan-700 transition-colors disabled:opacity-60"
        title={`Capture slice ${currentIndex + 1} as key image and insert [[SLICE:${currentIndex + 1}]] link`}
      >
        <Camera className="w-3.5 h-3.5" />
        {capturing ? 'Capturing…' : `Key Image (Slice ${currentIndex + 1})`}
      </button>

      {/* Key image thumbnails */}
      {keyImages.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-600 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> {keyImages.length} key image{keyImages.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {keyImages.map((ki) => (
              <div
                key={ki.id}
                className="relative group w-14 h-14 rounded overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center"
                title={`Slice ${ki.sliceIndex + 1}`}
              >
                {ki.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ki.imageDataUrl}
                    alt={`Key image slice ${ki.sliceIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-500 font-mono">{ki.sliceIndex + 1}</span>
                )}
                {/* Slice badge */}
                <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-mono bg-black/60 text-cyan-300 py-0.5">
                  S:{ki.sliceIndex + 1}
                </span>
                {/* Delete button */}
                <button
                  onClick={() => removeKeyImage(ki.id)}
                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-red-600/80 rounded-full p-0.5 transition-opacity"
                  title="Remove key image"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
