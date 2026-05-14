import React, { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getPasswordStrength, getPasswordStrengthLabel } from '@/utils/validators';
import type { RegisterData } from '@/types/auth.types';
import { register as registerAPI } from '@/services/authService';


interface RegisterFormData extends RegisterData { confirmPassword: string; }

const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-teal-DEFAULT', 'bg-teal-DEFAULT'];

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '', email: '', password: '', confirmPassword: '', tax_id: '', home_address: ''
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const strength = getPasswordStrength(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof RegisterFormData]) setErrors(prev => ({ ...prev, [name]: undefined }));
    if (serverError) setServerError('');
  };

  const validate = () => {
    const e: Partial<Record<keyof RegisterFormData, string>> = {};
    if (!formData.name.trim()) e.name = 'Zorunlu alan';
    if (!formData.email.trim()) e.email = 'Zorunlu alan';
    if (formData.password.length < 8) e.password = 'En az 8 karakter';
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Şifreler eşleşmiyor';
    if (!formData.tax_id.trim()) e.tax_id = 'Zorunlu alan';
    if (!formData.home_address.trim()) e.home_address = 'Zorunlu alan';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      // Exclude confirmPassword since registerAPI doesn't expect it
      const { confirmPassword, ...dataToSubmit } = formData;
      await registerAPI(dataToSubmit);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (error: any) {
      setServerError(error.message || 'Kayıt işlemi başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (err?: string) =>
    `w-full px-4 py-3.5 rounded-2xl glass text-fg text-sm placeholder-muted-2 focus:outline-none transition-all ${err ? 'border border-red-500/40' : 'focus:border-teal-accent'}`;

  const EyeBtn = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
    <button type="button" onClick={toggle} className="absolute right-4 top-3.5 text-muted hover:text-fg transition-colors">
      {show
        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
      }
    </button>
  );

  if (success) return (
    <div className="min-h-screen bg-mesh flex items-center justify-center">
      <div className="glass-strong rounded-3xl p-12 text-center max-w-sm w-full animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-teal-dim border border-teal-DEFAULT/30 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-teal-DEFAULT" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-fg">Kayıt Başarılı!</h3>
        <p className="text-muted mt-2 text-sm">Giriş sayfasına yönlendiriliyorsunuz...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-mesh flex">
      {/* Left */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 px-14 py-16 relative overflow-hidden">
        <div className="absolute top-[-60px] right-[-60px] w-[350px] h-[350px] rounded-full bg-teal-DEFAULT opacity-10 blur-[80px] pointer-events-none animate-glow-pulse"/>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-cta flex items-center justify-center">
            <svg className="w-5 h-5 text-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-fg">TicketHub</span>
        </div>

        <div className="space-y-7 animate-fade-up">
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-pill text-xs text-teal-DEFAULT font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-DEFAULT animate-glow-pulse"/>
            Ücretsiz hesap oluştur
          </div>
          <h1 className="text-5xl font-black leading-tight tracking-tight">
            <span className="text-fg">Aramıza</span><br/>
            <em className="not-italic text-teal-glow">Katıl.</em>
          </h1>
          <p className="text-muted leading-relaxed">Binlerce etkinliğe anında erişim. Biletini al, etkinliğin tadını çıkar.</p>
          <div className="space-y-4 pt-2">
            {['Güvenli ödeme altyapısı', 'Anlık bilet teslimatı', '7/24 müşteri desteği'].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm text-muted">
                <div className="w-5 h-5 rounded-full bg-teal-dim border border-teal-DEFAULT/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-teal-DEFAULT" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="w-2 h-2 rounded-full bg-teal-DEFAULT animate-glow-pulse"/>
          50,000+ mutlu kullanıcı
        </div>
      </div>

      {/* Right */}
      <div className="flex-1 flex items-center justify-center px-6 py-16 overflow-y-auto">
        <div className="w-full max-w-lg py-8 animate-fade-up">
          <div className="mb-10">
            <h2 className="text-4xl font-black text-fg tracking-tight">Hesap Oluştur</h2>
            <p className="text-muted mt-2">Bilgilerinizi girerek hemen başlayın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-widest">Ad Soyad</label>
              <input name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Ahmet Yılmaz" className={inputCls(errors.name)}/>
              {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-widest">E-posta</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="ornek@tickethub.com" className={inputCls(errors.email)}/>
              {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-widest">Şifre</label>
                <div className="relative">
                  <input name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} placeholder="••••••••" className={inputCls(errors.password) + ' pr-12'}/>
                  <EyeBtn show={showPassword} toggle={() => setShowPassword(!showPassword)}/>
                </div>
                {formData.password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">{[0,1,2,3,4].map(i => <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColors[strength] : 'bg-muted-2'}`}/>)}</div>
                    <p className="text-xs text-muted">{getPasswordStrengthLabel(strength)}</p>
                  </div>
                )}
                {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-widest">Şifre Tekrar</label>
                <div className="relative">
                  <input name="confirmPassword" type={showConfirm ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className={inputCls(errors.confirmPassword) + ' pr-12'}/>
                  <EyeBtn show={showConfirm} toggle={() => setShowConfirm(!showConfirm)}/>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-widest">TC Kimlik / Vergi No</label>
              <input name="tax_id" type="text" maxLength={11} value={formData.tax_id} onChange={handleChange} placeholder="11 haneli kimlik numarası" className={inputCls(errors.tax_id)}/>
              {errors.tax_id && <p className="text-xs text-red-400">{errors.tax_id}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-widest">Ev Adresi</label>
              <textarea name="home_address" rows={3} value={formData.home_address} onChange={handleChange} placeholder="Tam adresinizi giriniz" className={inputCls(errors.home_address) + ' resize-none'}/>
              {errors.home_address && <p className="text-xs text-red-400">{errors.home_address}</p>}
            </div>

            {serverError && <p className="text-sm text-red-400 glass px-4 py-3 rounded-xl">{serverError}</p>}

            <button type="submit" disabled={loading}
              className="btn-gradient w-full px-6 py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
              {loading
                ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Kayıt yapılıyor...</>
                : <>Kayıt Ol <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg></>
              }
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-muted text-sm mb-4">Zaten hesabınız var mı?</p>
            <Link to="/login" className="btn-ghost block text-center px-6 py-3 text-sm font-semibold">
              Giriş Yap
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
