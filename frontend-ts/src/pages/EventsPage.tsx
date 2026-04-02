import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';

interface Event {
  id: number;
  name: string;
  category: 'Konser' | 'Spor' | 'Tiyatro' | 'Festival';
  date: string;
  time: string;
  venue: string;
  city: string;
  price: number;
  emoji: string;
  accent: string;
}

interface CartItem { id: number; name: string; price: number; date: string; venue: string; quantity: number; }

const MOCK_EVENTS: Event[] = [
  { id: 1, name: 'Tarkan Konseri', category: 'Konser', date: '15 Nis 2026', time: '21:00', venue: 'Volkswagen Arena', city: 'İstanbul', price: 450, emoji: '🎤', accent: 'from-violet-500/20 to-purple-600/20' },
  { id: 2, name: 'Galatasaray - Fenerbahçe', category: 'Spor', date: '20 Nis 2026', time: '20:00', venue: 'NEF Stadyumu', city: 'İstanbul', price: 250, emoji: '⚽', accent: 'from-amber-500/20 to-orange-600/20' },
  { id: 3, name: 'Hamlet - Devlet Tiyatrosu', category: 'Tiyatro', date: '22 Nis 2026', time: '19:30', venue: 'Ankara Devlet Tiyatrosu', city: 'Ankara', price: 120, emoji: '🎭', accent: 'from-blue-500/20 to-indigo-600/20' },
  { id: 4, name: 'Jolly Joker Festivali', category: 'Festival', date: '1 May 2026', time: '14:00', venue: 'Küçükçiftlik Park', city: 'İstanbul', price: 350, emoji: '🎪', accent: 'from-teal-500/20 to-green-600/20' },
  { id: 5, name: 'Sertab Erener Konseri', category: 'Konser', date: '5 May 2026', time: '20:00', venue: 'Zorlu PSM', city: 'İstanbul', price: 380, emoji: '🎵', accent: 'from-rose-500/20 to-pink-600/20' },
  { id: 6, name: 'NBA Maçı - Türkiye Turu', category: 'Spor', date: '10 May 2026', time: '19:00', venue: 'Sinan Erdem', city: 'İstanbul', price: 600, emoji: '🏀', accent: 'from-orange-500/20 to-red-600/20' },
  { id: 7, name: 'Karagöz ve Hacivat', category: 'Tiyatro', date: '12 May 2026', time: '15:00', venue: 'Şehir Tiyatroları', city: 'İzmir', price: 80, emoji: '🎬', accent: 'from-cyan-500/20 to-blue-600/20' },
  { id: 8, name: 'Rock Festivali 2026', category: 'Festival', date: '20 May 2026', time: '16:00', venue: 'İTÜ Stadyumu', city: 'İstanbul', price: 500, emoji: '🤘', accent: 'from-red-500/20 to-rose-600/20' },
  { id: 9, name: 'Ceza Konseri', category: 'Konser', date: '25 May 2026', time: '21:00', venue: 'Harbiye Açıkhava', city: 'İstanbul', price: 300, emoji: '🎶', accent: 'from-indigo-500/20 to-violet-600/20' },
  { id: 10, name: 'Beşiktaş - Trabzonspor', category: 'Spor', date: '30 May 2026', time: '18:30', venue: 'Tüpraş Stadyumu', city: 'İstanbul', price: 200, emoji: '🏟️', accent: 'from-slate-500/20 to-gray-600/20' },
];

const CATEGORIES = ['Tümü', 'Konser', 'Spor', 'Tiyatro', 'Festival'] as const;

const EventsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('Tümü');
  const [cart, setCart] = useState<CartItem[]>(() => { try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; } });
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const navigate = useNavigate();

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);

  const filtered = MOCK_EVENTS.filter(e =>
    (e.name.toLowerCase().includes(search.toLowerCase()) || e.city.toLowerCase().includes(search.toLowerCase())) &&
    (cat === 'Tümü' || e.category === cat)
  );

  const addToCart = (e: Event) => {
    setCart(prev => { const ex = prev.find(i => i.id === e.id); return ex ? prev.map(i => i.id === e.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { id: e.id, name: e.name, price: e.price, date: e.date, venue: e.venue, quantity: 1 }]; });
    setAddedIds(prev => new Set(prev).add(e.id));
    setTimeout(() => setAddedIds(prev => { const n = new Set(prev); n.delete(e.id); return n; }), 1500);
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen bg-mesh pt-20">
      <Navbar cartCount={cartCount} />

      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-12 animate-fade-up">
          <h1 className="text-5xl font-black text-fg tracking-tight mb-3">
            Etkinlikler
          </h1>
          <p className="text-muted text-lg">Sana en uygun etkinliği bul ve hemen satın al</p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-4 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" placeholder="Etkinlik veya şehir ara..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl glass text-fg text-sm placeholder-muted focus:outline-none focus:border-teal-accent transition-all"/>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={`px-5 py-2 rounded-pill text-sm font-medium transition-all ${cat === c ? 'btn-gradient' : 'btn-ghost'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <p className="text-muted text-sm mb-6">{filtered.length} etkinlik bulundu</p>

        {filtered.length === 0 ? (
          <div className="text-center py-24 text-muted">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-lg font-medium">Etkinlik bulunamadı</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((event, i) => (
              <div key={event.id}
                className="glass hover:glass-strong rounded-3xl overflow-hidden flex flex-col transition-all hover:scale-[1.02] group animate-fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}>
                {/* Cover */}
                <div className={`h-32 bg-gradient-to-br ${event.accent} flex items-center justify-center text-5xl relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)' }}/>
                  {event.emoji}
                </div>

                <div className="p-5 flex flex-col flex-1 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-teal-DEFAULT uppercase tracking-widest">{event.category}</span>
                    <h3 className="font-bold text-fg mt-1 leading-snug">{event.name}</h3>
                  </div>
                  <div className="space-y-1 text-xs text-muted flex-1">
                    <p>📅 {event.date} · {event.time}</p>
                    <p>📍 {event.venue}, {event.city}</p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="font-black text-fg">₺{event.price}</span>
                    <button onClick={() => addToCart(event)}
                      className={`px-4 py-1.5 rounded-pill text-xs font-bold transition-all ${addedIds.has(event.id) ? 'glass border border-teal-DEFAULT/40 text-teal-DEFAULT' : 'btn-gradient'}`}>
                      {addedIds.has(event.id) ? '✓ Eklendi' : 'Sepete Ekle'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating cart */}
      {cartCount > 0 && (
        <button onClick={() => navigate('/cart')}
          className="fixed bottom-8 right-8 btn-gradient px-6 py-3.5 text-sm font-bold flex items-center gap-2 shadow-2xl animate-fade-up">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          Sepete Git ({cartCount})
        </button>
      )}
    </div>
  );
};

export default EventsPage;
