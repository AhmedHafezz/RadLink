import { create } from 'zustand';
import { DicomStudy, DicomSeries, DicomInstance, ViewportState } from '@/types/dicom';

// ─── Measurement types ───────────────────────────────────────────────────────

export type ViewerTool =
  | 'WindowLevel'
  | 'Zoom'
  | 'Pan'
  | 'Length'
  | 'Angle'
  | 'EllipticalROI'
  | 'RectangleROI'
  | 'Magnify'
  | 'ArrowAnnotate'
  | 'StackScroll'
  | 'None';

export interface Measurement {
  id: string;
  type: 'length' | 'angle' | 'area' | 'annotation';
  value: number;
  unit: string;
  instanceIndex: number;
  label?: string;
  data?: unknown;
  createdAt: string;
}

// ─── Store interface ─────────────────────────────────────────────────────────

interface ViewerStore {
  // Study / series / instance data
  currentStudy: DicomStudy | null;
  currentSeries: DicomSeries | null;
  seriesList: DicomSeries[];
  instances: DicomInstance[];

  // Viewport state
  currentInstanceIndex: number;
  windowCenter: number;
  windowWidth: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  isInverted: boolean;

  // Tool state
  activeTool: ViewerTool;
  measurements: Measurement[];

  // UI state
  isLoading: boolean;
  error: string | null;
  isSplitView: boolean;
  showSeriesPanel: boolean;

  // Cornerstone rendering info (runtime, not serialized)
  viewportId: string;
  renderingEngineId: string;

  // ─── Actions ───────────────────────────────────────────────────────────────
  setStudy: (study: DicomStudy) => void;
  setSeries: (series: DicomSeries) => void;
  setSeriesList: (series: DicomSeries[]) => void;
  setInstances: (instances: DicomInstance[]) => void;

  setCurrentIndex: (index: number) => void;
  incrementIndex: () => void;
  decrementIndex: () => void;

  setWindowLevel: (center: number, width: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setRotation: (rotation: number) => void;
  rotateBy: (degrees: number) => void;
  setFlipHorizontal: (flip: boolean) => void;
  setFlipVertical: (flip: boolean) => void;
  toggleInvert: () => void;

  setActiveTool: (tool: ViewerTool) => void;
  addMeasurement: (measurement: Measurement) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  removeMeasurement: (id: string) => void;
  clearMeasurements: () => void;

  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsSplitView: (split: boolean) => void;
  setShowSeriesPanel: (show: boolean) => void;

  resetViewport: () => void;
  reset: () => void;
}

// ─── Default viewport values ─────────────────────────────────────────────────

const DEFAULT_VIEWPORT: Pick<
  ViewerStore,
  | 'windowCenter' | 'windowWidth' | 'zoom' | 'pan'
  | 'rotation' | 'flipHorizontal' | 'flipVertical' | 'isInverted'
> = {
  windowCenter: 40,
  windowWidth: 400,
  zoom: 1,
  pan: { x: 0, y: 0 },
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  isInverted: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useViewerStore = create<ViewerStore>((set, get) => ({
  // Initial data
  currentStudy: null,
  currentSeries: null,
  seriesList: [],
  instances: [],
  currentInstanceIndex: 0,

  // Viewport defaults
  ...DEFAULT_VIEWPORT,

  // Tool defaults
  activeTool: 'WindowLevel',
  measurements: [],

  // UI defaults
  isLoading: false,
  error: null,
  isSplitView: false,
  showSeriesPanel: true,

  // Cornerstone IDs (generated per study load)
  viewportId: 'radlink-viewport',
  renderingEngineId: 'radlink-rendering-engine',

  // ─── Study / series actions ─────────────────────────────────────────────────
  setStudy: (study) => set({ currentStudy: study }),
  setSeries: (series) => set({ currentSeries: series }),
  setSeriesList: (seriesList) => set({ seriesList }),
  setInstances: (instances) => set({ instances, currentInstanceIndex: 0 }),

  // ─── Navigation ────────────────────────────────────────────────────────────
  setCurrentIndex: (index) => {
    const { instances } = get();
    const clamped = Math.max(0, Math.min(instances.length - 1, index));
    set({ currentInstanceIndex: clamped });
  },
  incrementIndex: () => {
    const { currentInstanceIndex, instances } = get();
    if (currentInstanceIndex < instances.length - 1) {
      set({ currentInstanceIndex: currentInstanceIndex + 1 });
    }
  },
  decrementIndex: () => {
    const { currentInstanceIndex } = get();
    if (currentInstanceIndex > 0) {
      set({ currentInstanceIndex: currentInstanceIndex - 1 });
    }
  },

  // ─── Viewport controls ─────────────────────────────────────────────────────
  setWindowLevel: (windowCenter, windowWidth) => set({ windowCenter, windowWidth }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
  setPan: (pan) => set({ pan }),
  setRotation: (rotation) => set({ rotation: ((rotation % 360) + 360) % 360 }),
  rotateBy: (degrees) => {
    const { rotation } = get();
    const newRotation = ((rotation + degrees) % 360 + 360) % 360;
    set({ rotation: newRotation });
  },
  setFlipHorizontal: (flipHorizontal) => set({ flipHorizontal }),
  setFlipVertical: (flipVertical) => set({ flipVertical }),
  toggleInvert: () => set((state) => ({ isInverted: !state.isInverted })),

  // ─── Tool management ────────────────────────────────────────────────────────
  setActiveTool: (activeTool) => set({ activeTool }),

  addMeasurement: (measurement) =>
    set((state) => ({ measurements: [...state.measurements, measurement] })),

  updateMeasurement: (id, data) =>
    set((state) => ({
      measurements: state.measurements.map((m) => (m.id === id ? { ...m, ...data } : m)),
    })),

  removeMeasurement: (id) =>
    set((state) => ({ measurements: state.measurements.filter((m) => m.id !== id) })),

  clearMeasurements: () => set({ measurements: [] }),

  // ─── UI state ───────────────────────────────────────────────────────────────
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setIsSplitView: (isSplitView) => set({ isSplitView }),
  setShowSeriesPanel: (showSeriesPanel) => set({ showSeriesPanel }),

  // ─── Resets ─────────────────────────────────────────────────────────────────
  resetViewport: () => set({ ...DEFAULT_VIEWPORT, measurements: [] }),

  reset: () =>
    set({
      currentStudy: null,
      currentSeries: null,
      seriesList: [],
      instances: [],
      currentInstanceIndex: 0,
      ...DEFAULT_VIEWPORT,
      activeTool: 'WindowLevel',
      measurements: [],
      isLoading: false,
      error: null,
    }),
}));
