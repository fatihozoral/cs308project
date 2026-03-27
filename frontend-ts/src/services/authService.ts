/**
 * Auth Service
 * CS 308 Online Ticketing Project - TypeScript
 *
 * API calls for authentication endpoints
 */

import axios, { AxiosError } from 'axios';
import type { LoginCredentials, RegisterData, LoginResponse, RegisterResponse, ApiError } from '@/types/auth.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/auth';

/**
 * Register a new customer account
 */
export async function register(userData: RegisterData): Promise<RegisterResponse> {
  try {
    const response = await axios.post<RegisterResponse>(`${API_URL}/register`, userData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>;
    if (axiosError.response?.data?.error) {
      throw new Error(axiosError.response.data.error);
    }
    throw new Error('Sunucu ile bağlantı kurulamadı.');
  }
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  try {
    const response = await axios.post<LoginResponse>(`${API_URL}/login`, credentials);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>;
    if (axiosError.response?.data?.error) {
      throw new Error(axiosError.response.data.error);
    }
    throw new Error('Sunucu ile bağlantı kurulamadı.');
  }
}

/**
 * Get authorization header with JWT token
 */
export function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/**
 * Set axios default authorization header
 */
export function setAuthToken(token: string | null): void {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
}
