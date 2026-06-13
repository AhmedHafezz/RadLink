// ─────────────────────────────────────────────
// Report domain types for the RadLink Cloud PACS
// ─────────────────────────────────────────────

export type ReportStatus = 'Draft' | 'Finalized' | 'Amended';

export interface Report {
  id: string;
  studyId: string;
  tenantId: string;
  radiologistId: string;
  radiologistName: string;
  content: string;
  status: ReportStatus;
  templateId?: string;
  templateName?: string;
  keyImages: KeyImage[];
  findings: string;
  impression: string;
  recommendation?: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  pdfUrl?: string;
  qrCode?: string;
}

export interface KeyImage {
  id: string;
  reportId: string;
  instanceId: string;
  sopInstanceUid: string;
  sliceIndex: number;
  imageDataUrl: string;
  annotation?: string;
  capturedAt: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  modality: string;
  bodyPart: string;
  content: string;
  findingsTemplate: string;
  impressionTemplate: string;
}

export interface CreateReportDto {
  studyId: string;
  content: string;
  findings: string;
  impression: string;
  recommendation?: string;
  templateId?: string;
}

export interface UpdateReportDto {
  content?: string;
  findings?: string;
  impression?: string;
  recommendation?: string;
}

// ─── Extended / derived types ────────────────

export interface FinalizeReportDto {
  content: string;
  findings: string;
  impression: string;
  recommendation?: string;
  keyImages: Omit<KeyImage, 'id' | 'reportId'>[];
}

export interface AmendReportDto {
  reason: string;
  content: string;
  findings: string;
  impression: string;
  recommendation?: string;
}

export interface ReportAmendment {
  id: string;
  reportId: string;
  reason: string;
  previousContent: string;
  previousFindings: string;
  previousImpression: string;
  amendedBy: string;
  amendedByName: string;
  amendedAt: string;
}

export interface ReportListItem {
  id: string;
  studyId: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  radiologistName: string;
  status: ReportStatus;
  createdAt: string;
  finalizedAt?: string;
}

export interface ReportListParams {
  page?: number;
  pageSize?: number;
  status?: ReportStatus;
  radiologistId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'finalizedAt' | 'patientName' | 'studyDate';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedReportList {
  items: ReportListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── PDF generation payload ──────────────────

export interface ReportPdfOptions {
  includeKeyImages: boolean;
  includeQrCode: boolean;
  headerLogoUrl?: string;
  customHeader?: string;
  customFooter?: string;
  signatureText?: string;
}

// ─── Structured report sections ─────────────

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  isRequired: boolean;
}

// ─── Audit trail ────────────────────────────

export interface ReportAuditEntry {
  id: string;
  reportId: string;
  action: ReportAuditAction;
  performedBy: string;
  performedByName: string;
  performedAt: string;
  details?: string;
  ipAddress?: string;
}

export type ReportAuditAction =
  | 'Created'
  | 'Updated'
  | 'Finalized'
  | 'Amended'
  | 'PdfGenerated'
  | 'Viewed'
  | 'Shared'
  | 'Deleted';
