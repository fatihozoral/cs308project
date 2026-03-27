/**
 * Admin Products Page
 * CS 308 Online Ticketing Project - TypeScript
 */

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminProductsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ürün Yönetimi</h1>
              <p className="text-sm text-gray-600 mt-1">Product Manager Paneli</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Hoş geldiniz, {user?.name}</p>
                <p className="text-xs text-gray-500">Rol: Product Manager</p>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="bg-white shadow rounded-lg p-8">
          <div className="text-center py-12">
            <svg
              className="mx-auto h-24 w-24 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Ürün Yöneticisi Paneli</h2>
            <p className="mt-2 text-gray-600">
              Ürün tanımlama ve fiyatlandırma sayfasına hoş geldiniz.
            </p>
            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm text-purple-800">
                <strong>Yönetici Bilgileri:</strong>
              </p>
              <div className="mt-2 text-left text-sm text-purple-700">
                <p>• E-posta: {user?.email}</p>
                <p>• Rol: Product Manager</p>
                <p>• ID: {user?.id}</p>
              </div>
            </div>
            <p className="mt-6 text-gray-500 text-sm">
              Bu sayfa ileride ürün ekleme, güncelleme ve silme özellikleri içerecektir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProductsPage;
