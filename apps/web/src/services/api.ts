import axios from 'axios';

// Create axios instance
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Clear invalid token
      localStorage.removeItem('authToken');
      delete api.defaults.headers.common['Authorization'];

      // Redirect to login (you might want to use a router hook here)
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (userData: any) => api.post('/auth/register', userData),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};

export const campaignsAPI = {
  getAll: (params?: any) => api.get('/campaigns', { params }),
  getById: (id: string) => api.get(`/campaigns/${id}`),
  create: (data: any) => api.post('/campaigns', data),
  update: (id: string, data: any) => api.put(`/campaigns/${id}`, data),
  delete: (id: string) => api.delete(`/campaigns/${id}`),
  start: (id: string) => api.post(`/campaigns/${id}/start`),
  pause: (id: string) => api.post(`/campaigns/${id}/pause`),
  stop: (id: string) => api.post(`/campaigns/${id}/stop`),
};

export const contactsAPI = {
  getAll: (params?: any) => api.get('/contacts', { params }),
  getById: (id: string) => api.get(`/contacts/${id}`),
  create: (data: any) => api.post('/contacts', data),
  update: (id: string, data: any) => api.put(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
  import: (data: any) => api.post('/contacts/import', data),
  export: (params?: any) => api.get('/contacts/export', { params }),
};

export const analyticsAPI = {
  getDashboardSummary: () => api.get('/analytics/dashboard-summary'),
  getCampaignMetrics: (params?: any) => api.get('/analytics/campaign-metrics', { params }),
  getTimeSeries: (params?: any) => api.get('/analytics/time-series', { params }),
  getSegmentation: (params?: any) => api.get('/analytics/segmentation', { params }),
  getPredictiveInsights: (params?: any) => api.get('/analytics/predictive-insights', { params }),
  exportData: (params?: any) => api.get('/analytics/export', { params }),
};

export const workflowsAPI = {
  getAll: (params?: any) => api.get('/workflows', { params }),
  getById: (id: string) => api.get(`/workflows/${id}`),
  create: (data: any) => api.post('/workflows', data),
  update: (id: string, data: any) => api.put(`/workflows/${id}`, data),
  delete: (id: string) => api.delete(`/workflows/${id}`),
  execute: (id: string, context: any) => api.post(`/workflows/${id}/execute`, { context }),
  getExecutions: (id: string) => api.get(`/workflows/${id}/executions`),
};

export const aiAPI = {
  getContentSuggestions: (data: any) => api.post('/ai/content-suggestions', data),
  getSubjectLines: (data: any) => api.post('/ai/subject-lines', data),
  personalize: (data: any) => api.post('/ai/personalize', data),
  analyzePerformance: (data: any) => api.post('/ai/analyze-performance', data),
};

export const complianceAPI = {
  checkDomainCompliance: (domainId: string) => api.get(`/compliance/domains/${domainId}/compliance`),
  calculateSpamScore: (data: any) => api.post('/compliance/spam-score', data),
};

export const deliverabilityAPI = {
  getMetrics: (domainId: string) => api.get(`/deliverability/domains/${domainId}/metrics`),
  getBlacklistStatus: (domainId: string) => api.get(`/deliverability/domains/${domainId}/blacklist-status`),
  getReputationReport: (domainId: string) => api.get(`/deliverability/domains/${domainId}/reputation-report`),
  getOptimization: (domainId: string) => api.get(`/deliverability/domains/${domainId}/optimize`),
};

export const enterpriseAPI = {
  getOrganizations: () => api.get('/enterprise/organizations'),
  createOrganization: (data: any) => api.post('/enterprise/organizations', data),
  getAuditLogs: () => api.get('/enterprise/security/audit-logs'),
  getActiveSessions: () => api.get('/enterprise/security/active-sessions'),
  terminateSession: (sessionId: string) => api.post(`/enterprise/security/terminate-session/${sessionId}`),
  getEnterpriseAnalytics: () => api.get('/enterprise/analytics/enterprise-overview'),
};
