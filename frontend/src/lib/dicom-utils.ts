/**
 * DICOM utility functions for the RadLink viewer.
 * These are pure functions with no external dependencies
 * so they can be used in both browser and test environments.
 */

// ─── DICOM tag constants ─────────────────────────────────────────────────────

export const DICOM_TAGS = {
  PATIENT_NAME:        '00100010',
  PATIENT_ID:          '00100020',
  PATIENT_BIRTH_DATE:  '00100030',
  PATIENT_SEX:         '00100040',
  STUDY_DATE:          '00080020',
  STUDY_TIME:          '00080030',
  MODALITY:            '00080060',
  STUDY_DESCRIPTION:   '00081030',
  SERIES_DESCRIPTION:  '0008103E',
  INSTANCE_NUMBER:     '00200013',
  ROWS:                '00280010',
  COLUMNS:             '00280011',
  PIXEL_SPACING:       '00280030',
  BITS_ALLOCATED:      '00280100',
  BITS_STORED:         '00280101',
  WINDOW_CENTER:       '00281050',
  WINDOW_WIDTH:        '00281051',
  SLICE_LOCATION:      '00201041',
  SLICE_THICKNESS:     '00500088',
  IMAGE_POSITION:      '00200032',
  IMAGE_ORIENTATION:   '00200037',
  STUDY_INSTANCE_UID:  '0020000D',
  SERIES_INSTANCE_UID: '0020000E',
  SOP_INSTANCE_UID:    '00080018',
  SOP_CLASS_UID:       '00080016',
  ACCESSION_NUMBER:    '00080050',
  REFERRING_PHYSICIAN: '00080090',
  INSTITUTION_NAME:    '00080080',
} as const;

// ─── Formatting helpers ──────────────────────────────────────────────────────

/**
 * Format a DICOM patient name (caret-delimited) to a readable string.
 * DICOM format: "FamilyName^GivenName^MiddleName^Prefix^Suffix"
 */
export function formatPatientName(dicomName: string | undefined | null): string {
  if (!dicomName) return 'Unknown Patient';
  // Replace carets with spaces, collapse multiple spaces
  return dicomName
    .replace(/\^/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Unknown Patient';
}

/**
 * Format a DICOM date string (YYYYMMDD) to ISO date (YYYY-MM-DD).
 */
export function formatDicomDate(dicomDate: string | undefined | null): string {
  if (!dicomDate) return '';
  const s = dicomDate.replace(/\D/g, '');
  if (s.length !== 8) return dicomDate;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

/**
 * Format a DICOM time string (HHMMSS.FFFFFF) to HH:MM:SS.
 */
export function formatDicomTime(dicomTime: string | undefined | null): string {
  if (!dicomTime) return '';
  const s = dicomTime.split('.')[0].replace(/\D/g, '');
  if (s.length < 4) return dicomTime;
  const hh = s.slice(0, 2);
  const mm = s.slice(2, 4);
  const ss = s.slice(4, 6) || '00';
  return `${hh}:${mm}:${ss}`;
}

/**
 * Format storage size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ─── Window / Level presets ──────────────────────────────────────────────────

export interface WindowPreset {
  name: string;
  windowCenter: number;
  windowWidth: number;
}

/** Standard radiological window/level presets. */
export const WINDOW_PRESETS: Record<string, WindowPreset[]> = {
  CT: [
    { name: 'Abdomen',    windowCenter: 60,    windowWidth: 400  },
    { name: 'Lung',       windowCenter: -600,  windowWidth: 1500 },
    { name: 'Bone',       windowCenter: 400,   windowWidth: 1800 },
    { name: 'Brain',      windowCenter: 40,    windowWidth: 80   },
    { name: 'Liver',      windowCenter: 60,    windowWidth: 160  },
    { name: 'Mediastinum',windowCenter: 50,    windowWidth: 350  },
    { name: 'Spine',      windowCenter: 300,   windowWidth: 1500 },
    { name: 'Angio',      windowCenter: 300,   windowWidth: 600  },
  ],
  MR: [
    { name: 'Brain T1',   windowCenter: 500,   windowWidth: 1000 },
    { name: 'Brain T2',   windowCenter: 700,   windowWidth: 1400 },
    { name: 'Spine',      windowCenter: 600,   windowWidth: 1200 },
  ],
  CR: [
    { name: 'Chest',      windowCenter: 2048,  windowWidth: 4096 },
    { name: 'Bone',       windowCenter: 1024,  windowWidth: 2048 },
  ],
  DX: [
    { name: 'Chest',      windowCenter: 2048,  windowWidth: 4096 },
    { name: 'Bone',       windowCenter: 1024,  windowWidth: 2048 },
  ],
  DEFAULT: [
    { name: 'Default',    windowCenter: 128,   windowWidth: 256  },
  ],
};

export function getWindowPresets(modality: string): WindowPreset[] {
  return WINDOW_PRESETS[modality] ?? WINDOW_PRESETS.DEFAULT;
}

export function getDefaultWindowLevel(modality: string): WindowPreset {
  const presets = getWindowPresets(modality);
  return presets[0];
}

// ─── Measurement utilities ───────────────────────────────────────────────────

/**
 * Convert pixel distance to millimeters using pixel spacing.
 * @param pixelDistance  Distance in pixels
 * @param pixelSpacingMm Pixel spacing in mm/pixel (row or col)
 */
export function pixelToMm(pixelDistance: number, pixelSpacingMm: number): number {
  return pixelDistance * pixelSpacingMm;
}

/**
 * Calculate pixel area to mm² using row and column spacing.
 */
export function pixelAreaToMm2(
  pixelArea: number,
  pixelSpacingRow: number,
  pixelSpacingCol: number
): number {
  return pixelArea * pixelSpacingRow * pixelSpacingCol;
}

// ─── WADO URL builders ───────────────────────────────────────────────────────

/**
 * Build a WADO-URI request URL.
 */
export function buildWadoUri(
  baseUrl: string,
  studyUID: string,
  seriesUID: string,
  objectUID: string,
  token?: string
): string {
  const params = new URLSearchParams({
    requestType: 'WADO',
    studyUID,
    seriesUID,
    objectUID,
    contentType: 'application/dicom',
    ...(token ? { token } : {}),
  });
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Build a Cornerstone3D `wadouri:` image ID from API parameters.
 */
export function buildCornerstoneImageId(
  apiBaseUrl: string,
  studyId: string,
  sopInstanceUid: string,
  token?: string
): string {
  const params = new URLSearchParams({ objectUID: sopInstanceUid });
  if (token) params.set('token', token);
  return `wadouri:${apiBaseUrl}/studies/${studyId}/wado?${params.toString()}`;
}

// ─── Modality helpers ────────────────────────────────────────────────────────

export const MODALITY_LABELS: Record<string, string> = {
  CT:  'Computed Tomography',
  MR:  'Magnetic Resonance Imaging',
  CR:  'Computed Radiography',
  DX:  'Digital Radiography',
  US:  'Ultrasound',
  NM:  'Nuclear Medicine',
  PT:  'Positron Emission Tomography',
  MG:  'Mammography',
  RF:  'Radiofluoroscopy',
  XA:  'X-Ray Angiography',
  OT:  'Other',
};

export function getModalityLabel(modality: string): string {
  return MODALITY_LABELS[modality.toUpperCase()] ?? modality;
}

/** CSS class suffix for modality badge coloring. */
export function getModalityBadgeClass(modality: string): string {
  const classMap: Record<string, string> = {
    CT: 'badge-ct',
    MR: 'badge-mri',
    CR: 'badge-xr',
    DX: 'badge-dx',
    US: 'badge-us',
    NM: 'badge-nm',
    PT: 'badge-pt',
    MG: 'badge-mg',
  };
  return classMap[modality.toUpperCase()] ?? 'badge-muted';
}
