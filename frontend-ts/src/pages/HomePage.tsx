/**
 * Home Page
 * CS 308 Online Ticketing Project - TypeScript
 */

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
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
              <h1 className="text-2xl font-bold text-gray-900">CS 308 Online Biletleme</h1>
              <p className="text-sm text-gray-600 mt-1">Müşteri Paneli</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Hoş geldiniz, {user?.name}</p>
                <p className="text-xs text-gray-500">Rol: {user?.role}</p>
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
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Müşteri Anasayfası</h2>
            <p className="mt-2 text-gray-600">
              Biletleme sistemi ana sayfasına hoş geldiniz.
            </p>
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm text-blue-800">
                <strong>Kullanıcı Bilgileri:</strong>
              </p>
              <div className="mt-2 text-left text-sm text-blue-700">
                <p>• E-posta: {user?.email}</p>
                <p>• Rol: {user?.role === 'customer' ? 'Müşteri' : user?.role}</p>
                <p>• ID: {user?.id}</p>
              </div>
            </div>
            <p className="mt-6 text-gray-500 text-sm">
              Bu sayfa ileride bilet arama ve satın alma özellikleri içerecektir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
