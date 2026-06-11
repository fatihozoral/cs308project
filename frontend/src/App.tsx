/**
 * Main App Component
 * CS 308 Online Ticketing Project - TypeScript
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import HomePage from '@/pages/HomePage';
import EventsPage from '@/pages/EventsPage';
import CartPage from '@/pages/CartPage';
import OrderHistoryPage from '@/pages/OrderHistoryPage';
import EventDetailPage from '@/pages/EventDetailPage';
import AdminSalesPage from '@/pages/AdminSalesPage';
import AdminProductsPage from '@/pages/AdminProductsPage';
import WishlistPage from '@/pages/WishlistPage';
import ProfilePage from '@/pages/ProfilePage';
import ChatBot from '@/components/ChatBot';
import type { UserRole } from '@/types/auth.types';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-600 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * Public Route Component
 * Redirects authenticated users to their home page
 */
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, getRedirectPath } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-600 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={getRedirectPath(user.role)} replace />;
  }

  return <>{children}</>;
};

const RoleProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: UserRole[] }> = ({ children, allowedRoles }) => {
  const { user, loading, getRedirectPath } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getRedirectPath(user.role)} replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <HomePage />
            }
          />
          <Route
            path="/events"
            element={
              <EventsPage />
            }
          />
          <Route
            path="/events/:eventId"
            element={
              <EventDetailPage />
            }
          />
          <Route
            path="/cart"
            element={
              <CartPage />
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrderHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <WishlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sales"
            element={
              <RoleProtectedRoute allowedRoles={['sales_manager']}>
                <AdminSalesPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <RoleProtectedRoute allowedRoles={['product_manager']}>
                <AdminProductsPage />
              </RoleProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ChatBot />
      </AuthProvider>
    </Router>
  );
}

export default App;
