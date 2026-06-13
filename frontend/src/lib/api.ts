import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('radlink_token') : null;
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('radlink_token');
            localStorage.removeItem('radlink_refresh_token');
            window.location.href = '/';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  async uploadFile<T>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> {
    const response = await this.client.post<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  }

  getWadoUrl(studyUID: string, seriesUID: string, objectUID: string): string {
    const token = typeof window !== 'undefined' ? localStorage.getItem('radlink_token') : null;
    return `${API_BASE_URL}/studies/${studyUID}/wado?seriesUID=${seriesUID}&objectUID=${objectUID}&token=${token}`;
  }
}

export const api = new ApiClient();

// ─── Auth API ───────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string, tenantSubdomain?: string) =>
    api.post('/auth/login', { email, password, tenantSubdomain }),
  registerTenant: (data: unknown) => api.post('/auth/register-tenant', data),
  refreshToken: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
};

// ─── Studies API ────────────────────────────────────────────────────────────

export const studiesApi = {
  list: (params?: {
    page?: number;
    pageSize?: number;
    patientName?: string;
    modality?: string;
    dateFrom?: string;
    dateTo?: string;
    reportStatus?: string;
  }) => api.get('/studies', { params }),

  get: (studyId: string) => api.get(`/studies/${studyId}`),
  getSeries: (studyId: string) => api.get(`/studies/${studyId}/series`),
  getInstances: (studyId: string) => api.get(`/studies/${studyId}/instances`),
  getStats: () => api.get('/studies/stats'),

  generateShareToken: (studyId: string, expiryDays?: number) =>
    api.post(`/studies/${studyId}/share`, { expiryDays: expiryDays ?? 7 }),

  revokeShareToken: (studyId: string) => api.delete(`/studies/${studyId}/share`),
  delete: (studyId: string) => api.delete(`/studies/${studyId}`),
};

// ─── Reports API ────────────────────────────────────────────────────────────

export const reportsApi = {
  list: (params?: {
    studyId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) => api.get('/reports', { params }),

  get: (reportId: string) => api.get(`/reports/${reportId}`),
  getByStudy: (studyId: string) => api.get(`/studies/${studyId}/report`),

  create: (data: unknown) => api.post('/reports', data),
  update: (reportId: string, data: unknown) => api.put(`/reports/${reportId}`, data),

  finalize: (reportId: string, signature?: string) =>
    api.post(`/reports/${reportId}/finalize`, { signature }),

  amend: (reportId: string, data: unknown) => api.post(`/reports/${reportId}/amend`, data),

  getPdf: (reportId: string): string => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('radlink_token') : '';
    return `${API_BASE_URL}/reports/${reportId}/pdf?token=${token}`;
  },

  getTemplates: () => api.get('/reports/templates'),
};

// ─── Upload API ─────────────────────────────────────────────────────────────

export const uploadApi = {
  uploadStudy: (formData: FormData, onProgress?: (progress: number) => void) =>
    api.uploadFile('/upload/study', formData, onProgress),

  getUploadStatus: (uploadId: string) => api.get(`/upload/${uploadId}/status`),
};

// ─── Tenant / Admin API ──────────────────────────────────────────────────────

export const tenantApi = {
  getSubscription: () => api.get('/tenants/me'),
  getStorageUsage: () => api.get('/tenants/me/storage'),
  updateSettings: (data: unknown) => api.put('/tenants/me/settings', data),

  getUsers: (params?: { page?: number; pageSize?: number }) =>
    api.get('/tenants/me/users', { params }),

  inviteUser: (data: unknown) => api.post('/tenants/me/users', data),
  updateUser: (userId: string, data: unknown) => api.put(`/tenants/me/users/${userId}`, data),
  deleteUser: (userId: string) => api.delete(`/tenants/me/users/${userId}`),

  getAuditLog: (params?: { page?: number; pageSize?: number }) =>
    api.get('/tenants/me/audit', { params }),
};

// ─── Public share API (no auth required) ────────────────────────────────────

export const shareApi = {
  getStudy: (token: string) => api.get(`/share/${token}`),
  getReport: (token: string) => api.get(`/share/${token}/report`),
};
