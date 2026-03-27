/**
 * Register Page
 * CS 308 Online Ticketing Project - TypeScript + Tailwind CSS
 */

import React, { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerAPI } from '@/services/authService';
import {
  validateName,
  validateEmail,
  validatePassword,
  validateTaxId,
  validateAddress,
  validatePasswordMatch,
  getPasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor
} from '@/utils/validators';
import type { RegisterData } from '@/types/auth.types';

interface RegisterFormData extends RegisterData {
  confirmPassword: string;
}

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    tax_id: '',
    home_address: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const [serverError, setServerError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const navigate = useNavigate();

  const passwordStrength = getPasswordStrength(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name as keyof RegisterFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RegisterFormData, string>> = {};

    const nameValidation = validateName(formData.name);
    if (!nameValidation.isValid) newErrors.name = nameValidation.error;

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) newErrors.email = emailValidation.error;

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) newErrors.password = passwordValidation.error;

    const passwordMatchValidation = validatePasswordMatch(formData.password, formData.confirmPassword);
    if (!passwordMatchValidation.isValid) newErrors.confirmPassword = passwordMatchValidation.error;

    const taxIdValidation = validateTaxId(formData.tax_id);
    if (!taxIdValidation.isValid) newErrors.tax_id = taxIdValidation.error;

    const addressValidation = validateAddress(formData.home_address);
    if (!addressValidation.isValid) newErrors.home_address = addressValidation.error;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...dataToSubmit } = formData;
      await registerAPI(dataToSubmit);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Kayıt Başarılı!</h3>
          <p className="mt-2 text-sm text-gray-500">Giriş sayfasına yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL - Hero Section (identical to login) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-12 flex-col justify-between overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center space-x-2">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <span className="text-3xl font-bold text-white tracking-tight">TicketHub</span>
          </div>
          <div className="mt-8">
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              Aramıza Katıl
            </h1>
            <p className="mt-3 text-lg text-purple-100">
              Etkinliklere kolayca erişin, biletlerinizi anında alın
            </p>
          </div>
        </div>

        {/* Decorative Elements & Social Proof */}
        <div className="relative z-10">
          <div className="flex items-center space-x-6 text-white/90">
            <div className="flex -space-x-2">
              <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white backdrop-blur-sm"></div>
              <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white backdrop-blur-sm"></div>
              <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white backdrop-blur-sm"></div>
            </div>
            <div>
              <p className="text-sm font-semibold">50,000+ mutlu kullanıcı</p>
              <p className="text-xs text-purple-200">Güvenle bilet alın</p>
            </div>
          </div>

          {/* Decorative circles */}
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full -mb-32 -mr-32"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/5 rounded-full"></div>
        </div>
      </div>

      {/* RIGHT PANEL - Register Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-gray-50">
        <div className="max-w-xl w-full">
          {/* Card Container */}
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Hesap Oluştur
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Bilgilerinizi girerek hemen başlayın
              </p>
            </div>

            {/* Register Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field - Full Width */}
              <div className="relative">
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder=" "
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`peer w-full px-4 py-3 border-2 ${
                    errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                  } rounded-xl focus:outline-none transition-all`}
                />
                <label
                  htmlFor="name"
                  className="absolute left-3 -top-2.5 bg-white px-2 text-sm font-medium text-gray-600 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-indigo-600"
                >
                  Ad Soyad
                </label>
                {errors.name && <p className="mt-1.5 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Email Field - Full Width */}
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder=" "
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`peer w-full px-4 py-3 border-2 ${
                    errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                  } rounded-xl focus:outline-none transition-all`}
                />
                <label
                  htmlFor="email"
                  className="absolute left-3 -top-2.5 bg-white px-2 text-sm font-medium text-gray-600 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-indigo-600"
                >
                  E-posta Adresiniz
                </label>
                {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
              </div>

              {/* Password Fields - Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password Field */}
                <div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder=" "
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`peer w-full px-4 py-3 border-2 ${
                        errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                      } rounded-xl focus:outline-none transition-all pr-11`}
                    />
                    <label
                      htmlFor="password"
                      className="absolute left-3 -top-2.5 bg-white px-2 text-sm font-medium text-gray-600 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-indigo-600"
                    >
                      Şifre
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>}

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Şifre Gücü:</span>
                        <span className="font-medium text-gray-700">{getPasswordStrengthLabel(passwordStrength)}</span>
                      </div>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              level <= passwordStrength ? getPasswordStrengthColor(passwordStrength) : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder=" "
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`peer w-full px-4 py-3 border-2 ${
                      errors.confirmPassword ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                    } rounded-xl focus:outline-none transition-all pr-11`}
                  />
                  <label
                    htmlFor="confirmPassword"
                    className="absolute left-3 -top-2.5 bg-white px-2 text-sm font-medium text-gray-600 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-indigo-600"
                  >
                    Şifre Tekrar
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  {errors.confirmPassword && <p className="mt-1.5 text-sm text-red-600">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* Tax ID Field - Full Width */}
              <div className="relative">
                <input
                  id="tax_id"
                  name="tax_id"
                  type="text"
                  placeholder=" "
                  value={formData.tax_id}
                  onChange={handleChange}
                  maxLength={11}
                  className={`peer w-full px-4 py-3 border-2 ${
                    errors.tax_id ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                  } rounded-xl focus:outline-none transition-all`}
                />
                <label
                  htmlFor="tax_id"
                  className="absolute left-3 -top-2.5 bg-white px-2 text-sm font-medium text-gray-600 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-indigo-600"
                >
                  TC Kimlik / Vergi No
                </label>
                {errors.tax_id && <p className="mt-1.5 text-sm text-red-600">{errors.tax_id}</p>}
              </div>

              {/* Address Field - Full Width */}
              <div className="relative">
                <textarea
                  id="home_address"
                  name="home_address"
                  rows={3}
                  placeholder=" "
                  autoComplete="street-address"
                  value={formData.home_address}
                  onChange={handleChange}
                  className={`peer w-full px-4 py-3 border-2 ${
                    errors.home_address ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                  } rounded-xl focus:outline-none transition-all resize-none`}
                />
                <label
                  htmlFor="home_address"
                  className="absolute left-3 -top-2.5 bg-white px-2 text-sm font-medium text-gray-600 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-indigo-600"
                >
                  Ev Adresi
                </label>
                {errors.home_address && <p className="mt-1.5 text-sm text-red-600">{errors.home_address}</p>}
              </div>

              {/* Server Error */}
              {serverError && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
                  <p className="text-sm font-medium">{serverError}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Kayıt yapılıyor...</span>
                  </>
                ) : (
                  <>
                    <span>Kayıt Ol</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>

              {/* Login Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-gray-600">
                  Zaten hesabınız var mı?{' '}
                  <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                    Giriş Yap
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Mobile Logo */}
          <div className="lg:hidden text-center mt-8">
            <div className="inline-flex items-center space-x-2">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span className="text-2xl font-bold text-gray-900">TicketHub</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
