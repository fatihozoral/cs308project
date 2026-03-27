/**
 * Auth Context
 * CS 308 Online Ticketing Project - TypeScript
 *
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { setAuthToken } from '@/services/authService';
import type { User, UserRole, AuthContextType } from '@/types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // On mount, check if there's a token and restore user state
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const userData: User = JSON.parse(storedUser);
        setUser(userData);
        setAuthToken(token);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  /**
   * Login user - save token and user data
   */
  const login = (token: string, userData: User): void => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setAuthToken(token);
  };

  /**
   * Logout user - clear token and user data
   */
  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setAuthToken(null);
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = (): boolean => {
    return !!user && !!localStorage.getItem('token');
  };

  /**
   * Get redirect path based on user role
   */
  const getRedirectPath = (role: UserRole): string => {
    switch (role) {
      case 'sales_manager':
        return '/admin/sales';
      case 'product_manager':
        return '/admin/products';
      default:
        return '/';
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated,
    getRedirectPath
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
