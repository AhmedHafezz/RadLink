'use client';

import { useViewerStore } from '@/store/viewerStore';
import { Camera, Image } from 'lucide-react';

interface KeyImageLinkerProps {
  onInsertLink: (markup: string) => void;
}

export default function KeyImageLinker({ onInsertLink }: KeyImageLinkerProps) {
  const { currentSliceIndex, keyImages, captureKeyImage } = useViewerStore();

  const handleCapture = () => {
    const idx = currentSliceIndex ?? 0;
    captureKeyImage(idx);
    const markup = `[[SLICE:${idx + 1}]]`;
    onInsertLink(markup);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCapture}
        className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded bg-gray-800 hover:bg-cyan-700/40 text-gray-300 hover:text-cyan-300 border border-gray-700 hover:border-cyan-700 transition-colors"
        title="Capture current slice as key image and insert link in report"
      >
        <Camera className="w-3.5 h-3.5" />
        Key Image
      </button>

      {keyImages.length > 0 && (
        <div className="flex items-center gap-1">
          <Image className="w-3 h-3 text-gray-600" />
          <span className="text-xs text-gray-600">{keyImages.length}</span>
        </div>
      )}
    </div>
  );
}
