/**
 * Frontend Validation Utilities
 * CS 308 Online Ticketing Project - TypeScript
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface FormErrors {
  [key: string]: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email alanı zorunludur.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Geçerli bir e-posta adresi giriniz.' };
  }

  return { isValid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || password === '') {
    return { isValid: false, error: 'Şifre alanı zorunludur.' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Şifre en az 8 karakter olmalı.' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Şifre en az bir büyük harf içermelidir.' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Şifre en az bir rakam içermelidir.' };
  }

  return { isValid: true };
}

/**
 * Validate name
 */
export function validateName(name: string): ValidationResult {
  if (!name || name.trim() === '') {
    return { isValid: false, error: 'Ad Soyad alanı zorunludur.' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'Ad Soyad en az 2 karakter olmalı.' };
  }

  return { isValid: true };
}

/**
 * Validate Turkish tax ID (TC Kimlik/Vergi No)
 */
export function validateTaxId(taxId: string): ValidationResult {
  if (!taxId || taxId.trim() === '') {
    return { isValid: false, error: 'TC Kimlik/Vergi No zorunludur.' };
  }

  const cleanTaxId = taxId.replace(/\s/g, '');

  if (cleanTaxId.length !== 11) {
    return { isValid: false, error: 'TC Kimlik/Vergi No 11 hane olmalıdır.' };
  }

  if (!/^[0-9]+$/.test(cleanTaxId)) {
    return { isValid: false, error: 'TC Kimlik/Vergi No sadece rakamlardan oluşmalıdır.' };
  }

  return { isValid: true };
}

/**
 * Validate address
 */
export function validateAddress(address: string): ValidationResult {
  if (!address || address.trim() === '') {
    return { isValid: false, error: 'Ev Adresi zorunludur.' };
  }

  return { isValid: true };
}

/**
 * Validate password confirmation match
 */
export function validatePasswordMatch(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword || confirmPassword === '') {
    return { isValid: false, error: 'Şifre tekrar alanı zorunludur.' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Şifreler eşleşmiyor.' };
  }

  return { isValid: true };
}

/**
 * Calculate password strength (0-4)
 */
export function getPasswordStrength(password: string): number {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  return Math.min(strength, 4);
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(strength: number): string {
  const labels = ['Çok zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok güçlü'];
  return labels[strength] || 'Çok zayıf';
}

/**
 * Get password strength color
 */
export function getPasswordStrengthColor(strength: number): string {
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];
  return colors[strength] || 'bg-red-500';
}
