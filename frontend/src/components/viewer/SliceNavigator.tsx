'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useViewerStore } from '@/store/viewerStore';

interface SliceNavigatorProps {
  imageIds: string[];
  onSliceChange?: (index: number) => void;
}

const THUMB_WIDTH = 56; // px
const THUMB_HEIGHT = 56; // px
const VISIBLE_COUNT = 10; // max thumbnails shown without scroll

export default function SliceNavigator({ imageIds, onSliceChange }: SliceNavigatorProps) {
  const currentIndex = useViewerStore((s) => s.currentInstanceIndex);
  const setCurrentIndex = useViewerStore((s) => s.setCurrentIndex);
  const [thumbOffset, setThumbOffset] = useState(0);
  const [keyImages, setKeyImages] = useState<Set<number>>(new Set());
  const stripRef = useRef<HTMLDivElement>(null);

  const total = imageIds.length;
  const maxOffset = Math.max(0, total - VISIBLE_COUNT);

  // Keep current slice centered in the strip
  useEffect(() => {
    const half = Math.floor(VISIBLE_COUNT / 2);
    const newOffset = Math.min(maxOffset, Math.max(0, currentIndex - half));
    setThumbOffset(newOffset);
  }, [currentIndex, maxOffset]);

  const handleSliceClick = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      onSliceChange?.(index);
    },
    [setCurrentIndex, onSliceChange]
  );

  const scroll = (dir: 'left' | 'right') => {
    setThumbOffset((prev) =>
      dir === 'left' ? Math.max(0, prev - VISIBLE_COUNT) : Math.min(maxOffset, prev + VISIBLE_COUNT)
    );
  };

  if (total === 0) return null;

  const visibleSlices = imageIds.slice(thumbOffset, thumbOffset + VISIBLE_COUNT);

  return (
    <div className="bg-gray-900 border-t border-gray-700 flex items-center gap-1 px-2 py-1.5 h-[76px] flex-shrink-0">
      {/* Prev button */}
      <button
        onClick={() => scroll('left')}
        disabled={thumbOffset === 0}
        className="flex-shrink-0 text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
        title="Scroll left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Thumbnail strip */}
      <div ref={stripRef} className="flex gap-1 flex-1 overflow-hidden">
        {visibleSlices.map((imageId, i) => {
          const absoluteIndex = thumbOffset + i;
          const isActive = absoluteIndex === currentIndex;
          const isKey = keyImages.has(absoluteIndex);

          return (
            <button
              key={imageId}
              onClick={() => handleSliceClick(absoluteIndex)}
              className={`relative flex-shrink-0 rounded overflow-hidden transition-all ${
                isActive
                  ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-900 scale-105'
                  : 'hover:ring-1 hover:ring-gray-500 hover:scale-102'
              }`}
              style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
              title={`Slice ${absoluteIndex + 1}`}
            >
              {/* Placeholder thumbnail — dark gray with slice number */}
              <div
                className={`w-full h-full flex items-end justify-center pb-0.5 text-[9px] font-mono ${
                  isActive ? 'bg-gray-700 text-blue-300' : 'bg-gray-800 text-gray-500'
                }`}
              >
                <SliceThumbnail imageId={imageId} index={absoluteIndex} />
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-mono leading-none z-10">
                  {absoluteIndex + 1}
                </span>
              </div>

              {/* Key image indicator */}
              {isKey && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-yellow-400 border border-gray-900" />
              )}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <button
        onClick={() => scroll('right')}
        disabled={thumbOffset + VISIBLE_COUNT >= total}
        className="flex-shrink-0 text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
        title="Scroll right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Slice counter */}
      <div className="flex-shrink-0 text-xs text-gray-500 font-mono min-w-[52px] text-right">
        {currentIndex + 1}/{total}
      </div>
    </div>
  );
}

// Mini canvas-based thumbnail — draws the slice number as a placeholder
// In a real deployment this would use cornerstone to render a thumbnail
function SliceThumbnail({ imageId, index }: { imageId: string; index: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw placeholder gradient
    const gradient = ctx.createLinearGradient(0, 0, THUMB_WIDTH, THUMB_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0d0d1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, THUMB_WIDTH, THUMB_HEIGHT);

    // Draw slice index as text
    ctx.fillStyle = '#4a5568';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${index + 1}`, THUMB_WIDTH / 2, THUMB_HEIGHT / 2 - 4);
  }, [imageId, index]);

  return (
    <canvas
      ref={canvasRef}
      width={THUMB_WIDTH}
      height={THUMB_HEIGHT}
      className="absolute inset-0"
    />
  );
}
