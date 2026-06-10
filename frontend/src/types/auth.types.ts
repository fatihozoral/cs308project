/**
 * Authentication Types
 * CS 308 Online Ticketing Project - TypeScript
 */

export type UserRole = 'customer' | 'sales_manager' | 'product_manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tax_id?: string;
  home_address?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  tax_id: string;
  home_address: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  getRedirectPath: (role: UserRole) => string;
}

export interface ApiError {
  error?: string;
  detail?: string;
}
