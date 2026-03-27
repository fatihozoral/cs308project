/**
 * Admin Sales Page
 * CS 308 Online Ticketing Project - TypeScript
 */

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminSalesPage: React.FC = () => {
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
              <h1 className="text-2xl font-bold text-gray-900">Satış Yönetimi</h1>
              <p className="text-sm text-gray-600 mt-1">Sales Manager Paneli</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Hoş geldiniz, {user?.name}</p>
                <p className="text-xs text-gray-500">Rol: Sales Manager</p>
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Satış Yöneticisi Paneli</h2>
            <p className="mt-2 text-gray-600">
              Satış raporları ve sipariş yönetimi sayfasına hoş geldiniz.
            </p>
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm text-green-800">
                <strong>Yönetici Bilgileri:</strong>
              </p>
              <div className="mt-2 text-left text-sm text-green-700">
                <p>• E-posta: {user?.email}</p>
                <p>• Rol: Sales Manager</p>
                <p>• ID: {user?.id}</p>
              </div>
            </div>
            <p className="mt-6 text-gray-500 text-sm">
              Bu sayfa ileride satış analitikleri ve rapor özellikleri içerecektir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSalesPage;
