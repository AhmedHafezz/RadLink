import { create } from 'zustand';
import { Report, KeyImage, UpdateReportDto } from '@/types/report';

// ─── Store interface ─────────────────────────────────────────────────────────

interface ReportStore {
  currentReport: Report | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  autoSaveEnabled: boolean;

  // Draft field values (separate from the persisted report for performance)
  draftContent: string;
  draftFindings: string;
  draftImpression: string;
  draftRecommendation: string;

  // Key image selection
  pendingKeyImage: Omit<KeyImage, 'id' | 'reportId'> | null;

  // ─── Actions ───────────────────────────────────────────────────────────────
  setReport: (report: Report) => void;
  clearReport: () => void;

  updateDraftContent: (content: string) => void;
  updateDraftFindings: (findings: string) => void;
  updateDraftImpression: (impression: string) => void;
  updateDraftRecommendation: (recommendation: string) => void;

  getDraftAsUpdateDto: () => UpdateReportDto;

  setPendingKeyImage: (image: Omit<KeyImage, 'id' | 'reportId'> | null) => void;
  addKeyImageToReport: (image: KeyImage) => void;
  removeKeyImage: (imageId: string) => void;

  setIsSaving: (saving: boolean) => void;
  markSaved: () => void;
  setAutoSaveEnabled: (enabled: boolean) => void;

  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useReportStore = create<ReportStore>((set, get) => ({
  currentReport: null,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  autoSaveEnabled: true,

  draftContent: '',
  draftFindings: '',
  draftImpression: '',
  draftRecommendation: '',

  pendingKeyImage: null,

  // ─── Report loading ──────────────────────────────────────────────────────────
  setReport: (report) =>
    set({
      currentReport: report,
      isDirty: false,
      draftContent: report.content ?? '',
      draftFindings: report.findings ?? '',
      draftImpression: report.impression ?? '',
      draftRecommendation: report.recommendation ?? '',
    }),

  clearReport: () =>
    set({
      currentReport: null,
      isDirty: false,
      draftContent: '',
      draftFindings: '',
      draftImpression: '',
      draftRecommendation: '',
    }),

  // ─── Draft field updates ─────────────────────────────────────────────────────
  updateDraftContent: (draftContent) => set({ draftContent, isDirty: true }),
  updateDraftFindings: (draftFindings) => set({ draftFindings, isDirty: true }),
  updateDraftImpression: (draftImpression) => set({ draftImpression, isDirty: true }),
  updateDraftRecommendation: (draftRecommendation) => set({ draftRecommendation, isDirty: true }),

  getDraftAsUpdateDto: () => {
    const { draftContent, draftFindings, draftImpression, draftRecommendation } = get();
    return {
      content: draftContent,
      findings: draftFindings,
      impression: draftImpression,
      recommendation: draftRecommendation || undefined,
    };
  },

  // ─── Key images ──────────────────────────────────────────────────────────────
  setPendingKeyImage: (pendingKeyImage) => set({ pendingKeyImage }),

  addKeyImageToReport: (image) =>
    set((state) => {
      if (!state.currentReport) return state;
      return {
        currentReport: {
          ...state.currentReport,
          keyImages: [...(state.currentReport.keyImages ?? []), image],
        },
        isDirty: true,
        pendingKeyImage: null,
      };
    }),

  removeKeyImage: (imageId) =>
    set((state) => {
      if (!state.currentReport) return state;
      return {
        currentReport: {
          ...state.currentReport,
          keyImages: (state.currentReport.keyImages ?? []).filter((k) => k.id !== imageId),
        },
        isDirty: true,
      };
    }),

  // ─── Save state ──────────────────────────────────────────────────────────────
  setIsSaving: (isSaving) => set({ isSaving }),

  markSaved: () =>
    set((state) => {
      if (!state.currentReport) return state;
      return {
        isDirty: false,
        isSaving: false,
        lastSavedAt: new Date().toISOString(),
        currentReport: {
          ...state.currentReport,
          content: state.draftContent,
          findings: state.draftFindings,
          impression: state.draftImpression,
          recommendation: state.draftRecommendation,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  setAutoSaveEnabled: (autoSaveEnabled) => set({ autoSaveEnabled }),

  // ─── Reset ───────────────────────────────────────────────────────────────────
  reset: () =>
    set({
      currentReport: null,
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      draftContent: '',
      draftFindings: '',
      draftImpression: '',
      draftRecommendation: '',
      pendingKeyImage: null,
    }),
}));
