'use client';

import { useViewerStore, ViewerTool } from '@/store/viewerStore';
import {
  MousePointer2,
  ZoomIn,
  Hand,
  Ruler,
  Triangle,
  Circle,
  Square,
  FlipHorizontal,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Minus,
  Plus,
} from 'lucide-react';

interface ToolConfig {
  id: ViewerTool;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
}

const TOOLS: ToolConfig[] = [
  { id: 'WindowLevel', label: 'W/L', icon: <MousePointer2 size={16} />, shortcut: 'W' },
  { id: 'Zoom', label: 'Zoom', icon: <ZoomIn size={16} />, shortcut: 'Z' },
  { id: 'Pan', label: 'Pan', icon: <Hand size={16} />, shortcut: 'P' },
  { id: 'Length', label: 'Length', icon: <Ruler size={16} />, shortcut: 'L' },
  { id: 'Angle', label: 'Angle', icon: <Triangle size={16} />, shortcut: 'A' },
  { id: 'EllipticalROI', label: 'Ellipse', icon: <Circle size={16} /> },
  { id: 'RectangleROI', label: 'Rect', icon: <Square size={16} /> },
];

interface ViewerToolbarProps {
  onToolChange?: (tool: ViewerTool) => void;
  onInvert?: () => void;
  onReset?: () => void;
  onRotate?: (degrees: number) => void;
}

export default function ViewerToolbar({
  onToolChange,
  onInvert,
  onReset,
  onRotate,
}: ViewerToolbarProps) {
  const {
    activeTool,
    setActiveTool,
    windowCenter,
    windowWidth,
    currentInstanceIndex,
    instances,
    isInverted,
    toggleInvert,
    rotation,
    rotateBy,
    resetViewport,
  } = useViewerStore();

  function handleToolClick(tool: ViewerTool) {
    setActiveTool(tool);
    onToolChange?.(tool);
  }

  function handleInvert() {
    toggleInvert();
    onInvert?.();
  }

  function handleReset() {
    resetViewport();
    onReset?.();
  }

  function handleRotateCW() {
    rotateBy(90);
    onRotate?.(90);
  }

  function handleRotateCCW() {
    rotateBy(-90);
    onRotate?.(-90);
  }

  const totalSlices = instances.length;
  const currentSlice = totalSlices > 0 ? currentInstanceIndex + 1 : 0;

  return (
    <div className="flex items-center justify-between bg-rad-surface border-b border-rad-border px-4 py-2 gap-4 overflow-x-auto">
      {/* Tool group */}
      <div className="flex items-center gap-1">
        {TOOLS.map((tool) => {
          const active = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all
                ${
                  active
                    ? 'bg-rad-cyan-500 text-white shadow-sm shadow-rad-cyan-500/30'
                    : 'text-rad-text-secondary hover:text-rad-text-primary hover:bg-rad-card'
                }
              `}
            >
              {tool.icon}
              <span className="hidden sm:inline">{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-rad-border flex-shrink-0" />

      {/* Utility buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleInvert}
          title="Invert (I)"
          className={`
            flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all
            ${
              isInverted
                ? 'bg-rad-cyan-500/20 text-rad-cyan-500 border border-rad-cyan-500/40'
                : 'text-rad-text-secondary hover:text-rad-text-primary hover:bg-rad-card'
            }
          `}
        >
          <FlipHorizontal size={16} />
          <span className="hidden sm:inline">Invert</span>
        </button>

        <button
          onClick={handleRotateCCW}
          title="Rotate CCW"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-rad-text-secondary hover:text-rad-text-primary hover:bg-rad-card transition-all"
        >
          <RotateCcw size={16} />
        </button>

        <button
          onClick={handleRotateCW}
          title="Rotate CW"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-rad-text-secondary hover:text-rad-text-primary hover:bg-rad-card transition-all"
        >
          <RotateCw size={16} />
        </button>

        <button
          onClick={handleReset}
          title="Reset viewport (R)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-rad-text-secondary hover:text-rad-text-primary hover:bg-rad-card transition-all"
        >
          <RefreshCw size={16} />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-rad-border flex-shrink-0" />

      {/* WW/WL display */}
      <div className="flex items-center gap-3 text-xs text-rad-text-secondary flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-rad-text-secondary">WW</span>
          <span className="text-rad-text-primary font-mono font-medium bg-rad-card px-2 py-0.5 rounded min-w-[48px] text-center">
            {Math.round(windowWidth)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-rad-text-secondary">WL</span>
          <span className="text-rad-text-primary font-mono font-medium bg-rad-card px-2 py-0.5 rounded min-w-[48px] text-center">
            {Math.round(windowCenter)}
          </span>
        </div>

        {rotation !== 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-rad-text-secondary">ROT</span>
            <span className="text-rad-cyan-500 font-mono font-medium">{rotation}&deg;</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-rad-border flex-shrink-0" />

      {/* Slice indicator */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-rad-text-secondary">Slice</span>
        <span className="text-xs text-rad-text-primary font-mono font-medium bg-rad-card px-2 py-0.5 rounded">
          {currentSlice} / {totalSlices}
        </span>
      </div>
    </div>
  );
}
