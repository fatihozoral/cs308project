/**
 * Auth Service
 * CS 308 Online Ticketing Project - TypeScript
 *
 * API calls for authentication endpoints
 */

import axios, { AxiosError } from 'axios';
import type { LoginCredentials, RegisterData, LoginResponse, RegisterResponse, ApiError } from '@/types/auth.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const API_URL = API_BASE.endsWith('/auth') ? API_BASE : `${API_BASE}/auth`;

/**
 * Register a new customer account
 */
export async function register(userData: RegisterData): Promise<RegisterResponse> {
  try {
    const response = await axios.post<RegisterResponse>(`${API_URL}/register`, userData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>;
    const message = axiosError.response?.data?.detail || axiosError.response?.data?.error;
    if (message) throw new Error(message);
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
    const message = axiosError.response?.data?.detail || axiosError.response?.data?.error;
    if (message) throw new Error(message);
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

/**
 * Update user profile details
 */
export async function updateProfile(userData: { name?: string; email?: string; password?: string; home_address?: string }): Promise<{ message: string; user: User }> {
  try {
    const response = await axios.put<{ message: string; user: User }>(`${API_URL}/update`, userData, {
      headers: getAuthHeader()
    });
    // If a new email is verified or changed, we might want to update local storage user token if a token was returned.
    // In this case, we just update the user object.
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>;
    const message = axiosError.response?.data?.detail || axiosError.response?.data?.error;
    if (message) throw new Error(message);
    throw new Error('Profil güncellenemedi.');
  }
}

