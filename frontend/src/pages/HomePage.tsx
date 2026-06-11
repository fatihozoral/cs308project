import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-mesh">
      {/* Simple top bar for home (no full navbar needed) */}
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-cta flex items-center justify-center">
            <svg className="w-4 h-4 text-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
            </svg>
          </div>
          <span className="font-bold text-fg">TicketHub</span>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="btn-ghost px-4 py-1.5 text-xs font-medium">
          Çıkış
        </button>
      </header>

      {/* Hero section */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-24 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-teal-DEFAULT opacity-8 blur-[120px] pointer-events-none animate-glow-pulse"/>

        <div className="animate-fade-up max-w-2xl">
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-pill text-xs text-teal-DEFAULT font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-DEFAULT animate-glow-pulse"/>
            Hoş geldiniz
          </div>

          <h1 className="text-6xl font-black leading-none tracking-tight mb-6">
            Merhaba,{' '}
            <em className="not-italic text-teal-glow">{user?.name?.split(' ')[0]}</em>
            <br />
            <span className="text-fg">Bugün ne izlemek</span><br />
            <span className="text-muted">istersin?</span>
          </h1>

          <p className="text-muted text-lg mb-10 max-w-lg leading-relaxed">
            Etkinlikleri keşfet, biletini al ve unutulmaz anlar yaşa.
          </p>

          <div className="flex items-center gap-4">
            <Link to="/events" className="btn-gradient px-8 py-4 text-sm font-bold flex items-center gap-2">
              Etkinlikleri Keşfet
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </Link>
            <Link to="/orders" className="btn-ghost px-8 py-4 text-sm font-semibold">
              Siparişlerim
            </Link>
          </div>
        </div>
      </section>

      {/* Quick access cards */}
      <section className="max-w-7xl mx-auto px-8 pb-24">
        <h2 className="text-2xl font-bold text-fg mb-8">Hızlı Erişim</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              to: '/events',
              title: 'Etkinlikler',
              desc: 'Konser, spor, tiyatro ve daha fazlası',
              cta: 'Keşfet',
              icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>,
              accent: 'text-teal-DEFAULT',
            },
            {
              to: '/cart',
              title: 'Sepetim',
              desc: 'Seçtiğin biletleri incele ve öde',
              cta: 'Görüntüle',
              icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
              accent: 'text-amber-warm',
            },
            {
              to: '/orders',
              title: 'Siparişlerim',
              desc: 'Geçmiş bilet alımlarını görüntüle',
              cta: 'Geçmiş',
              icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
              accent: 'text-teal-DEFAULT',
            },
          ].map(({ to, title, desc, cta, icon, accent }) => (
            <Link key={to} to={to}
              className="glass hover:glass-strong rounded-3xl p-7 flex flex-col gap-5 transition-all hover:scale-[1.01] group">
              <div className={`${accent} opacity-70 group-hover:opacity-100 transition-opacity`}>{icon}</div>
              <div>
                <h3 className="font-bold text-fg text-lg mb-1">{title}</h3>
                <p className="text-muted text-sm leading-relaxed">{desc}</p>
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${accent}`}>
                {cta}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
};

export default HomePage;
