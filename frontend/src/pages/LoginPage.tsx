import React, { useState, FormEvent } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { LoginCredentials } from '@/types/auth.types';
import { login as loginAPI } from '@/services/authService';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginCredentials>({ email: '', password: '' });
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = new URLSearchParams(location.search).get('redirect');
  const { login, getRedirectPath } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setServerError('Lütfen e-posta ve şifrenizi girin.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setServerError('Geçerli bir e-posta adresi giriniz.');
      return;
    }
    setLoading(true);
    try {
      const response = await loginAPI(formData);
      login(response.token, response.user);
      navigate(redirectTo || getRedirectPath(response.user.role), { replace: true });
    } catch (error: any) {
      setServerError(error.message || 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex">
      {/* Left — large hero */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 px-16 py-16 relative overflow-hidden">
        {/* Decorative teal orb */}
        <div className="absolute top-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full bg-teal-DEFAULT opacity-10 blur-[100px] pointer-events-none animate-glow-pulse" />

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-cta flex items-center justify-center">
            <svg className="w-5 h-5 text-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-fg">TicketHub</span>
        </div>

        {/* Hero content */}
        <div className="space-y-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-pill text-xs text-teal-DEFAULT font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-DEFAULT animate-glow-pulse" />
            50,000+ mutlu kullanıcı
          </div>

          <div className="space-y-4">
            <h1 className="text-6xl font-black leading-none tracking-tight">
              <span className="text-fg">Etkinliklerin</span><br />
              <em className="not-italic text-teal-glow">Merkezi.</em>
            </h1>
            <p className="text-muted text-lg leading-relaxed max-w-sm">
              Konser, festival, tiyatro ve spor etkinliklerine tek platformdan erişin.
            </p>
          </div>

          <div className="flex items-center gap-8 pt-4">
            {[['500+', 'Etkinlik'], ['50K+', 'Kullanıcı'], ['99%', 'Memnuniyet']].map(([val, label]) => (
              <div key={label}>
                <p className="text-2xl font-black text-fg">{val}</p>
                <p className="text-xs text-muted mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom status */}
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="w-2 h-2 rounded-full bg-teal-DEFAULT animate-glow-pulse" />
          Tüm sistemler aktif
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-xl bg-gradient-cta flex items-center justify-center">
              <svg className="w-4 h-4 text-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <span className="text-base font-bold text-fg">TicketHub</span>
          </div>

          <div className="mb-8">
            <h2 className="text-4xl font-black text-fg tracking-tight">Giriş Yap</h2>
            <p className="text-muted mt-2">Hesabınıza erişin</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-widest">E-posta</label>
              <input
                name="email" type="email" autoComplete="email"
                value={formData.email} onChange={handleChange}
                placeholder="ornek@tickethub.com"
                className="w-full px-4 py-3.5 rounded-2xl glass text-fg text-sm placeholder-muted-2 focus:outline-none focus:border-teal-accent transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-widest">Şifre</label>
              <div className="relative">
                <input
                  name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                  value={formData.password} onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 pr-12 rounded-2xl glass text-fg text-sm placeholder-muted-2 focus:outline-none focus:border-teal-accent transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-muted hover:text-fg transition-colors">
                  {showPassword
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>

            {serverError && (
              <p className="text-sm text-red-400 glass px-4 py-3 rounded-xl">{serverError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="btn-gradient flex-1 px-6 py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                {loading
                  ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Giriş yapılıyor...</>
                  : <>Giriş Yap <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg></>
                }
              </button>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-muted text-sm mb-4">Henüz hesabınız yok mu?</p>
            <Link to="/register" className="btn-ghost block text-center px-6 py-3 text-sm font-semibold">
              Ücretsiz Hesap Oluştur
            </Link>
          </div>

          <p className="text-xs text-muted-2 text-center mt-6">
            Giriş yaparak{' '}
            <a href="#" className="text-teal-DEFAULT hover:underline">Kullanım Şartları</a>
            {' '}ve{' '}
            <a href="#" className="text-teal-DEFAULT hover:underline">Gizlilik Politikası</a>
            'nı kabul edersiniz.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
