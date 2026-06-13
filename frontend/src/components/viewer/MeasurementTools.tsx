'use client';

import React from 'react';
import { Ruler, Angle, Circle, Trash2, X } from 'lucide-react';
import { useViewerStore } from '@/store/viewerStore';
import type { Measurement } from '@/store/viewerStore';

interface MeasurementToolsProps {
  pixelSpacingMm?: number; // mm/pixel (from DICOM tag 0028,0030)
  onMeasurementClick?: (measurement: Measurement) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  length: <Ruler className="w-3.5 h-3.5 text-blue-400" />,
  angle: <Angle className="w-3.5 h-3.5 text-yellow-400" />,
  area: <Circle className="w-3.5 h-3.5 text-green-400" />,
  annotation: <span className="text-xs">T</span>,
};

const TYPE_LABELS: Record<string, string> = {
  length: 'Distance',
  angle: 'Angle',
  area: 'Area',
  annotation: 'Annotation',
};

const UNIT_COLORS: Record<string, string> = {
  mm: 'text-blue-300',
  'mm²': 'text-green-300',
  degrees: 'text-yellow-300',
  '°': 'text-yellow-300',
};

function formatValue(value: number, unit: string): string {
  if (unit === 'degrees' || unit === '°') {
    return `${value.toFixed(1)}°`;
  }
  if (unit === 'mm²') {
    return `${value.toFixed(2)} mm²`;
  }
  return `${value.toFixed(2)} mm`;
}

export default function MeasurementTools({
  pixelSpacingMm,
  onMeasurementClick,
}: MeasurementToolsProps) {
  const measurements = useViewerStore((s) => s.measurements);
  const removeMeasurement = useViewerStore((s) => s.removeMeasurement);
  const clearMeasurements = useViewerStore((s) => s.clearMeasurements);

  if (measurements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-600">
        <Ruler className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-xs text-center">
          No measurements yet.
          <br />
          Use the toolbar tools to measure.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
          Measurements ({measurements.length})
        </span>
        {measurements.length > 0 && (
          <button
            onClick={clearMeasurements}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
            title="Clear all measurements"
          >
            <Trash2 className="w-3 h-3" /> Clear All
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 p-2">
        {measurements.map((m, idx) => (
          <MeasurementRow
            key={m.id}
            measurement={m}
            index={idx}
            pixelSpacingMm={pixelSpacingMm}
            onDelete={() => removeMeasurement(m.id)}
            onClick={() => onMeasurementClick?.(m)}
          />
        ))}
      </div>

      {/* Pixel spacing info */}
      {pixelSpacingMm != null && (
        <div className="px-3 py-2 border-t border-gray-700">
          <p className="text-xs text-gray-600">
            Pixel spacing: {pixelSpacingMm.toFixed(4)} mm/px
          </p>
        </div>
      )}
    </div>
  );
}

function MeasurementRow({
  measurement,
  index,
  pixelSpacingMm,
  onDelete,
  onClick,
}: {
  measurement: Measurement;
  index: number;
  pixelSpacingMm?: number;
  onDelete: () => void;
  onClick: () => void;
}) {
  // If the value is in pixels and we have pixel spacing, convert
  const displayValue = measurement.value;
  const displayUnit = measurement.unit;

  return (
    <div
      className="flex items-center gap-2 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/50 rounded-lg px-2.5 py-2 cursor-pointer group transition-colors"
      onClick={onClick}
    >
      {/* Type icon */}
      <div className="flex-shrink-0 w-6 flex items-center justify-center">
        {TYPE_ICONS[measurement.type] ?? <Ruler className="w-3.5 h-3.5 text-gray-400" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">
            {index + 1}. {TYPE_LABELS[measurement.type] ?? measurement.type}
          </span>
          <span className="text-xs text-gray-600">· Slice {measurement.instanceIndex + 1}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`text-sm font-mono font-semibold ${UNIT_COLORS[displayUnit] ?? 'text-white'}`}>
            {formatValue(displayValue, displayUnit)}
          </span>
        </div>
        {measurement.label && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{measurement.label}</p>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
        title="Delete measurement"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
