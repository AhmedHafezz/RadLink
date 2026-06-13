// ─────────────────────────────────────────────
// DICOM domain types for the RadLink Cloud PACS
// All UIDs are stored as strings (DICOM UID spec).
// ─────────────────────────────────────────────

export interface DicomStudy {
  id: string;
  studyInstanceUid: string;
  patientName: string;
  patientId: string;
  patientBirthDate?: string;
  patientSex?: string;
  studyDate: string;
  studyTime?: string;
  studyDescription?: string;
  accessionNumber?: string;
  modalitiesInStudy: string[];
  numberOfSeries: number;
  numberOfInstances: number;
  series: DicomSeries[];
  tenantId: string;
  uploadedAt: string;
  uploadedBy: string;
  storageSize: number;
  shareToken?: string;
}

export interface DicomSeries {
  id: string;
  seriesInstanceUid: string;
  studyId: string;
  seriesNumber: number;
  seriesDescription?: string;
  modality: string;
  numberOfInstances: number;
  instances: DicomInstance[];
}

export interface DicomInstance {
  id: string;
  sopInstanceUid: string;
  seriesId: string;
  instanceNumber: number;
  rows?: number;
  columns?: number;
  pixelSpacingRow?: number;
  pixelSpacingCol?: number;
  sliceThickness?: number;
  sliceLocation?: number;
  windowCenter?: number;
  windowWidth?: number;
  storagePath: string;
}

export interface WadoImageId {
  studyInstanceUid: string;
  seriesInstanceUid: string;
  sopInstanceUid: string;
  wadoUrl: string;
}

export interface StudyListItem {
  id: string;
  studyInstanceUid: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  studyDescription?: string;
  modalities: string[];
  numberOfInstances: number;
  hasReport: boolean;
  reportStatus?: string;
  uploadedAt: string;
}

export interface StudyStats {
  totalStudies: number;
  pendingReports: number;
  storageUsedGB: number;
  storageMaxGB: number;
  studiesThisMonth: number;
}

// ─── Query / filter types ───────────────────

export interface StudyListParams {
  page?: number;
  pageSize?: number;
  patientName?: string;
  patientId?: string;
  modality?: string;
  dateFrom?: string;
  dateTo?: string;
  reportStatus?: string;
  accessionNumber?: string;
  sortBy?: StudySortField;
  sortOrder?: 'asc' | 'desc';
}

export type StudySortField =
  | 'studyDate'
  | 'patientName'
  | 'patientId'
  | 'uploadedAt'
  | 'modality'
  | 'numberOfInstances';

export interface PaginatedStudyList {
  items: StudyListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Window / Level presets ─────────────────

export interface WindowPreset {
  name: string;
  windowWidth: number;
  windowCenter: number;
  description?: string;
}

// ─── Upload types ───────────────────────────

export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'complete' | 'error';

export interface UploadJob {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: UploadStatus;
  studyId?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

// ─── Sharing ────────────────────────────────

export interface StudyShare {
  studyId: string;
  shareToken: string;
  shareUrl: string;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
  accessCount: number;
  isActive: boolean;
}

// ─── WADO / DICOMweb ────────────────────────

export interface WadoRsMetadata {
  [key: string]: {
    vr: string;
    Value?: unknown[];
    BulkDataURI?: string;
  };
}

export interface DicomTag {
  tag: string;
  vr: string;
  name: string;
  value: string | number | string[] | null;
}

// ─── Viewport state (used by Cornerstone) ───

export interface ViewportState {
  viewportId: string;
  renderingEngineId: string;
  toolGroupId: string;
  imageIds: string[];
  currentImageIndex: number;
  windowWidth: number;
  windowCenter: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  invert: boolean;
}
