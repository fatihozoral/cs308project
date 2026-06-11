import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  const cart = (() => {
    try {
      return JSON.parse(localStorage.getItem('cart') || '[]');
    } catch {
      return [];
    }
  })();
  const cartCount = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-mesh pt-20">
      <Navbar cartCount={cartCount} />
      
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="mb-12 animate-fade-up">
          <h1 className="text-5xl font-black text-fg tracking-tight mb-3">Profilim</h1>
          <p className="text-muted text-lg">Hesap ve teslimat bilgilerinizi görüntüleyin</p>
        </div>

        {user && (
          <div className="glass-strong rounded-3xl p-8 border border-white/5 animate-fade-up shadow-2xl relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-20%] w-80 h-80 bg-teal-DEFAULT/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <h3 className="text-xl font-bold text-fg mb-8 flex items-center gap-3 border-b border-white/10 pb-4">
              <span className="text-2xl">👤</span> Hesap Bilgileri
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl space-y-1 hover:bg-white/[0.05] transition-colors">
                <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Kullanıcı ID</p>
                <p className="text-fg font-mono truncate" title={user.id}>{user.id || 'Yükleniyor...'}</p>
              </div>
              <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl space-y-1 hover:bg-white/[0.05] transition-colors">
                <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Ad Soyad</p>
                <p className="text-fg font-semibold text-base">{user.name || 'Yükleniyor...'}</p>
              </div>
              <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl space-y-1 hover:bg-white/[0.05] transition-colors">
                <p className="text-[10px] text-muted uppercase font-bold tracking-wider">E-posta Adresi</p>
                <p className="text-fg font-semibold text-base">{user.email || 'Yükleniyor...'}</p>
              </div>
              <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl space-y-1 hover:bg-white/[0.05] transition-colors">
                <p className="text-[10px] text-muted uppercase font-bold tracking-wider">TC Kimlik / Vergi No</p>
                <p className="text-fg font-mono text-base">{user.tax_id || '12345678901'}</p>
              </div>
              <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl space-y-1 hover:bg-white/[0.05] transition-colors">
                <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Şifre Güvenliği</p>
                <p className="text-teal-DEFAULT font-semibold text-base">🔒 Hashlenmiş (Bcrypt - Supabase Auth)</p>
              </div>
              <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl space-y-1 hover:bg-white/[0.05] transition-colors">
                <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Hesap Rolü</p>
                <div>
                  <span className="inline-block glass px-3.5 py-1 rounded-pill text-xs text-teal-DEFAULT font-black border border-teal-DEFAULT/20 uppercase tracking-widest">
                    {user.role || 'customer'}
                  </span>
                </div>
              </div>
              <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl space-y-1 col-span-1 md:col-span-2 hover:bg-white/[0.05] transition-colors">
                <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Kayıtlı Teslimat Adresi</p>
                <p className="text-fg leading-relaxed text-base">{user.home_address || 'Adres girilmemiş'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
