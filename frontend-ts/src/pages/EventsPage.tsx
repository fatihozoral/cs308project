import React, { useState, useEffect, useRef } from 'react';
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
  remaining_capacity?: number;
}

interface CartItem { id: number; name: string; price: number; date: string; venue: string; quantity: number; }

import axios from 'axios';
import { getAuthHeader } from '@/services/authService';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';

const ACCENTS = [
  'from-violet-500/20 to-purple-600/20',
  'from-amber-500/20 to-orange-600/20',
  'from-blue-500/20 to-indigo-600/20',
  'from-teal-500/20 to-green-600/20',
  'from-rose-500/20 to-pink-600/20',
  'from-orange-500/20 to-red-600/20',
  'from-cyan-500/20 to-blue-600/20',
  'from-red-500/20 to-rose-600/20',
  'from-indigo-500/20 to-violet-600/20',
  'from-slate-500/20 to-gray-600/20',
];

const CATEGORIES = ['Tümü', 'Konser', 'Spor', 'Tiyatro', 'Festival'] as const;

const EventsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('Tümü');
  const [sort, setSort] = useState<'date' | 'price-asc' | 'price-desc'>('date');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => { try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; } });
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${API_URL}/events`, {
          headers: getAuthHeader(),
          params: { search: search || undefined, category: cat === 'Tümü' ? undefined : cat }
        });
        const data = response.data.map((e: any, i: number) => ({
          ...e,
          accent: ACCENTS[i % ACCENTS.length]
        }));
        setEvents(data);
      } catch (error) {
        console.error("Failed to fetch events from DB", error);
        setEvents([]);
      }
    };
    
    // We optionally debounce this if we want, but calling every time search changes is fine for now
    const timeout = setTimeout(() => fetchEvents(), 300);
    return () => clearTimeout(timeout);
  }, [search, cat]);

  const filtered = events.filter(e => {
    const matchesCat = cat === 'Tümü' || e.category === cat;
    const s = search.toLowerCase();
    const matchesSearch = !s || e.name.toLowerCase().includes(s) || e.city.toLowerCase().includes(s);
    return matchesCat && matchesSearch;
  }).sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    return a.date.localeCompare(b.date);
  });


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
            <div className="relative" ref={sortRef}>
              <button onClick={() => setSortOpen(o => !o)}
                className="flex items-center gap-2 px-5 py-2 rounded-pill text-sm font-medium btn-ghost">
                {{ date: 'Tarihe Göre', 'price-asc': 'Fiyat: Düşük → Yüksek', 'price-desc': 'Fiyat: Yüksek → Düşük' }[sort]}
                <svg className={`w-3.5 h-3.5 text-muted transition-transform ${sortOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-2 glass-strong rounded-2xl overflow-hidden z-50 min-w-[200px] py-1 shadow-xl">
                  {([['date', 'Tarihe Göre'], ['price-asc', 'Fiyat: Düşük → Yüksek'], ['price-desc', 'Fiyat: Yüksek → Düşük']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => { setSort(val); setSortOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${sort === val ? 'text-teal-DEFAULT font-semibold' : 'text-fg'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
            {filtered.map((event, i) => {
              const isSoldOut = event.remaining_capacity === 0;
              return (
              <div key={event.id}
                className={`glass rounded-3xl overflow-hidden flex flex-col transition-all group animate-fade-up ${isSoldOut ? 'opacity-70 grayscale' : 'hover:glass-strong hover:scale-[1.02]'}`}
                style={{ animationDelay: `${i * 0.05}s` }}>
                {/* Cover */}
                <div className={`h-32 bg-gradient-to-br ${event.accent} flex items-center justify-center text-5xl relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)' }}/>
                  {event.emoji}
                  {isSoldOut && (
                    <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center backdrop-blur-sm z-10">
                      <span className="text-white font-black text-xl tracking-widest drop-shadow-md">TÜKENDİ</span>
                    </div>
                  )}
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
                    {isSoldOut ? (
                      <span className="font-black text-red-500 text-sm ml-auto mr-auto w-full text-center">TÜKENDİ</span>
                    ) : (
                      <>
                        <span className="font-black text-fg">₺{event.price}</span>
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/events/${event.id}`); }}
                          className="px-6 py-2 rounded-pill text-xs font-bold transition-all btn-gradient">
                          Bilet Bak
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )})}
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
