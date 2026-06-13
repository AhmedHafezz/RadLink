// ─────────────────────────────────────────────
// Tenant / multi-tenancy domain types
// ─────────────────────────────────────────────

export type SubscriptionTier = 'Free' | 'Basic' | 'Professional' | 'Enterprise';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  subscriptionTier: SubscriptionTier;
  isActive: boolean;
  createdAt: string;
  subscription: Subscription;
  settings: TenantSettings;
}

export interface Subscription {
  id: string;
  tenantId: string;
  tier: SubscriptionTier;
  maxUsers: number;
  maxStorageGB: number;
  maxStudiesPerMonth: number;
  features: string[];
  startDate: string;
  endDate?: string;
  isActive: boolean;
  price: number;
}

export interface TenantSettings {
  logoUrl?: string;
  primaryColor?: string;
  defaultWindowPreset?: string;
  reportHeader?: string;
  reportFooter?: string;
  enableAuditLog: boolean;
  enableHipaaMode: boolean;
}

export interface TenantUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Admin' | 'Radiologist' | 'Technician' | 'Viewer';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface StorageUsage {
  usedBytes: number;
  maxBytes: number;
  usedGB: number;
  maxGB: number;
  percentUsed: number;
  breakdown: StorageBreakdown[];
}

export interface StorageBreakdown {
  modality: string;
  studyCount: number;
  sizeBytes: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  tenantName: string;
  tenantSubdomain: string;
}

// ─── Auth ────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
  tenantSubdomain: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface TokenPayload {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  tenantName: string;
  tenantSubdomain: string;
  iat: number;
  exp: number;
}

// ─── User management ─────────────────────────

export type UserRole = TenantUser['role'];

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PaginatedUserList {
  items: TenantUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Feature flags per tier ──────────────────

export const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  Free: [
    'basic_viewer',
    'manual_report',
  ],
  Basic: [
    'basic_viewer',
    'manual_report',
    'pdf_export',
    'study_sharing',
    'report_templates',
  ],
  Professional: [
    'basic_viewer',
    'advanced_viewer',
    'manual_report',
    'pdf_export',
    'study_sharing',
    'report_templates',
    'key_images',
    'audit_log',
    'multi_user',
    'api_access',
  ],
  Enterprise: [
    'basic_viewer',
    'advanced_viewer',
    'manual_report',
    'pdf_export',
    'study_sharing',
    'report_templates',
    'key_images',
    'audit_log',
    'multi_user',
    'api_access',
    'hipaa_mode',
    'custom_branding',
    'sso',
    'unlimited_storage',
    'priority_support',
    'dicom_router',
  ],
};

export const TIER_LIMITS: Record<
  SubscriptionTier,
  { maxUsers: number; maxStorageGB: number; maxStudiesPerMonth: number; price: number }
> = {
  Free:         { maxUsers: 1,   maxStorageGB: 5,    maxStudiesPerMonth: 20,   price: 0 },
  Basic:        { maxUsers: 3,   maxStorageGB: 50,   maxStudiesPerMonth: 200,  price: 49 },
  Professional: { maxUsers: 10,  maxStorageGB: 500,  maxStudiesPerMonth: 2000, price: 199 },
  Enterprise:   { maxUsers: 999, maxStorageGB: 9999, maxStudiesPerMonth: 99999, price: 0 },
};

// ─── Audit ────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}
