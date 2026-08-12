import axios from 'axios';
import {
  HealthResponse,
  PaginatedResponse,
  ScheduledEmail,
  SentEmail,
  CampaignSummary,
  CreateCampaignPayload,
  User,
} from '../types';

const getApiBaseUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl;
  return 'https://backend-liart-alpha-38.vercel.app/api';
};

export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const fetchHealthStatus = () =>
  api.get<HealthResponse>('/health').then((r) => r.data);

export const fetchMe = () =>
  api.get<{ success: boolean; data: { user: User } }>('/auth/me').then((r) => r.data.data.user);

export const logoutApi = () => api.post('/auth/logout');

export const fetchScheduledEmails = (params: {
  page?: number;
  limit?: number;
  status?: string;
  sort?: 'asc' | 'desc';
}) =>
  api
    .get<PaginatedResponse<ScheduledEmail>>('/emails/scheduled', { params })
    .then((r) => r.data);

export const fetchSentEmails = (params: {
  page?: number;
  limit?: number;
  status?: string;
  sort?: 'asc' | 'desc';
}) =>
  api.get<PaginatedResponse<SentEmail>>('/emails/sent', { params }).then((r) => r.data);

export const createCampaign = (payload: CreateCampaignPayload) =>
  api
    .post<{ success: boolean; data: CampaignSummary }>('/campaigns', payload)
    .then((r) => r.data.data);

export default api;
