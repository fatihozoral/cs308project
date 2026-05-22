/**
 * Events Page
 * CS 308 Online Ticketing Project - TypeScript
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import EventDetailModal from '@/components/EventDetailModal';
import { useAuth } from '@/context/AuthContext';

interface Event {
  id: number;
  name: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  price: number;
  emoji: string;
  image_url?: string;
  accent: string;
  total_capacity?: number;
  remaining_capacity?: number;
  place_id?: string;
  lat?: number;
  lng?: number;
  description?: string;
  featured_names?: string;
  model?: string;
  serial_number?: string;
  warranty_status?: string;
  distributor_info?: string;
  original_price?: number;
  discount_rate?: number;
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
type SortKey = 'date' | 'price-asc' | 'price-desc' | 'popularity';

const SORT_OPTIONS: Array<[SortKey, string]> = [
  ['date', 'Tarihe Göre'],
  ['price-asc', 'Fiyat: Düşük → Yüksek'],
  ['price-desc', 'Fiyat: Yüksek → Düşük'],
  ['popularity', 'Popülerliğe Göre'],
];

const getPopularityScore = (event: Event) => {
  if (event.total_capacity === undefined || event.remaining_capacity === undefined) return 0;
  return Math.max(0, event.total_capacity - event.remaining_capacity);
};

const EventsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('Tümü');
  const [sort, setSort] = useState<SortKey>('date');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => { try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; } });
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedWishlistIds, setSelectedWishlistIds] = useState<Set<number>>(new Set());
  const [savingWishlist, setSavingWishlist] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const wishlistSelectMode = new URLSearchParams(location.search).get('select') === 'wishlist';

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
          params: { search: search || undefined, category: cat === 'Tümü' ? undefined : cat }
        });
        const data = response.data.map((e: any, i: number) => ({
          ...e,
          accent: ACCENTS[i % ACCENTS.length]
        }));
        setEvents(data);
      } catch (error) {
        console.error('Etkinlikler yüklenemedi:', error);
        setEvents([]);
      }
    };
    const timeout = setTimeout(() => fetchEvents(), 300);
    return () => clearTimeout(timeout);
  }, [search, cat]);

  const filtered = events.filter(e => {
    const matchesCat = cat === 'Tümü' || e.category === cat;
    const s = search.toLowerCase();
    const searchable = [
      e.name,
      e.city,
      e.venue,
      e.category,
      e.description,
      e.featured_names,
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !s || searchable.includes(s);
    return matchesCat && matchesSearch;
  }).sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    if (sort === 'popularity') {
      const aSoldOut = (a.remaining_capacity ?? 1) <= 0;
      const bSoldOut = (b.remaining_capacity ?? 1) <= 0;
      if (aSoldOut !== bSoldOut) return aSoldOut ? 1 : -1;
      return getPopularityScore(b) - getPopularityScore(a);
    }
    return a.date.localeCompare(b.date);
  });

  const addToCart = (e: Event) => {
    if ((e.remaining_capacity ?? 1) <= 0) return;
    setCart(prev => { const ex = prev.find(i => i.id === e.id); return ex ? prev.map(i => i.id === e.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { id: e.id, name: e.name, price: e.price, date: e.date, venue: e.venue, quantity: 1 }]; });
    setAddedIds(prev => new Set(prev).add(e.id));
    setTimeout(() => setAddedIds(prev => { const n = new Set(prev); n.delete(e.id); return n; }), 1500);
  };

  const toggleWishlistSelection = (id: number) => {
    setSelectedWishlistIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveWishlistSelection = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent('/events?select=wishlist')}`);
      return;
    }
    if (selectedWishlistIds.size === 0) return;
    setSavingWishlist(true);
    try {
      await Promise.all(
        Array.from(selectedWishlistIds).map(id =>
          axios.post(`${API_URL}/wishlist/${id}`, {}, { headers: getAuthHeader() })
        )
      );
      setSelectedWishlistIds(new Set());
      navigate('/wishlist');
    } catch (error) {
      console.error('İstek listesi güncellenemedi:', error);
      alert('Seçilen etkinlikler istek listesine eklenemedi.');
    } finally {
      setSavingWishlist(false);
    }
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen bg-mesh pt-20">
      <Navbar cartCount={cartCount} />

      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-12 animate-fade-up">
          <h1 className="text-5xl font-black text-fg tracking-tight mb-3">Etkinlikler</h1>
          <p className="text-muted text-lg">
            {wishlistSelectMode ? 'İstek listene eklemek istediğin etkinlikleri seç' : 'Sana en uygun etkinliği bul ve hemen satın al'}
          </p>
        </div>

        {wishlistSelectMode && (
          <div className="glass-strong rounded-2xl px-5 py-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
            <div>
              <p className="font-bold text-fg">Çoklu seçim modu</p>
              <p className="text-sm text-muted mt-0.5">{selectedWishlistIds.size} etkinlik seçildi</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/events')}
                className="btn-ghost px-5 py-2.5 text-sm font-semibold">
                Vazgeç
              </button>
              <button
                type="button"
                onClick={saveWishlistSelection}
                disabled={savingWishlist || selectedWishlistIds.size === 0}
                className="btn-gradient px-5 py-2.5 text-sm font-bold disabled:opacity-60">
                {savingWishlist ? 'Ekleniyor...' : 'Seçilenleri Ekle'}
              </button>
            </div>
          </div>
        )}

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-4 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Etkinlik, açıklama veya şehir ara..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl glass text-fg text-sm placeholder-muted focus:outline-none focus:border-teal-accent transition-all" />
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
                {SORT_OPTIONS.find(([value]) => value === sort)?.[1]}
                <svg className={`w-3.5 h-3.5 text-muted transition-transform ${sortOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-2 glass-strong rounded-2xl overflow-hidden z-50 min-w-[200px] py-1 shadow-xl">
                  {SORT_OPTIONS.map(([val, label]) => (
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
              const soldOut = (event.remaining_capacity ?? 1) <= 0;
              const lastOne = !soldOut && event.remaining_capacity === 1;
              return (
              <div key={event.id}
                onClick={() => wishlistSelectMode ? toggleWishlistSelection(event.id) : setSelectedEvent(event)}
                className={`glass hover:glass-strong rounded-3xl overflow-hidden flex flex-col transition-all hover:scale-[1.02] group animate-fade-up cursor-pointer relative ${selectedWishlistIds.has(event.id) ? 'ring-2 ring-teal-DEFAULT' : ''} ${soldOut ? 'opacity-80' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}>
                {/* Cover */}
                <div className={`h-32 bg-gradient-to-br ${event.accent} flex items-center justify-center text-5xl relative overflow-hidden`}>
                  {event.image_url ? (
                    <img src={event.image_url} alt={event.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : null}
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)' }}/>
                  {!event.image_url && event.emoji}
                  {soldOut && (
                    <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="px-4 py-2 rounded-pill bg-red-500/20 border border-red-400/50 text-red-100 text-xs font-black uppercase tracking-[0.22em] shadow-lg">
                        Tükendi
                      </span>
                    </div>
                  )}
                  {lastOne && (
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-pill bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-black uppercase tracking-[0.18em] shadow-lg">
                        Son 1 Stok!
                      </span>
                    </div>
                  )}
                  {wishlistSelectMode && (
                    <div className={`absolute top-3 right-3 w-8 h-8 rounded-full border flex items-center justify-center transition-all ${selectedWishlistIds.has(event.id) ? 'bg-teal-DEFAULT border-teal-DEFAULT text-bg' : 'glass border-white/30 text-transparent'}`}>
                      {selectedWishlistIds.has(event.id) && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
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
                    {lastOne && (
                      <p className="text-amber-400 font-bold animate-pulse">⚠️ Son 1 bilet kaldı!</p>
                    )}
                    {event.remaining_capacity !== undefined && !soldOut && !lastOne && (
                      <p className="text-teal-DEFAULT font-semibold">Kalan {event.remaining_capacity} bilet</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border gap-2 flex-wrap">
                    <div className="flex flex-col">
                      <span className="font-black text-fg">₺{event.price}</span>
                      {event.discount_rate && event.discount_rate > 0 && event.original_price && (
                        <span className="text-[10px] text-muted line-through">₺{event.original_price}</span>
                      )}
                    </div>
                    {event.discount_rate && event.discount_rate > 0 ? (
                      <span className="text-[9px] font-bold text-rose-400 bg-rose-400/10 border border-rose-400/30 px-1.5 py-0.5 rounded-full shrink-0">
                        %{event.discount_rate} İndirim
                      </span>
                    ) : null}
                    {wishlistSelectMode ? (
                      <span className={`px-4 py-1.5 rounded-pill text-xs font-bold ${selectedWishlistIds.has(event.id) ? 'glass border border-teal-DEFAULT/40 text-teal-DEFAULT' : 'btn-ghost'}`}>
                        {selectedWishlistIds.has(event.id) ? 'Seçildi' : 'Seç'}
                      </span>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); addToCart(event); }}
                        disabled={soldOut}
                        className={`px-4 py-1.5 rounded-pill text-xs font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${soldOut ? 'glass border border-red-400/30 text-red-300' : addedIds.has(event.id) ? 'glass border border-teal-DEFAULT/40 text-teal-DEFAULT' : 'btn-gradient'}`}>
                        {soldOut ? 'Tükendi' : addedIds.has(event.id) ? '✓ Eklendi' : 'Sepete Ekle'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* Floating cart */}
      {cartCount > 0 && (
        <button onClick={() => navigate('/cart')}
          className="fixed bottom-8 right-8 btn-gradient px-6 py-3.5 text-sm font-bold flex items-center gap-2 shadow-2xl animate-fade-up">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Sepete Git ({cartCount})
        </button>
      )}

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onAddToCart={addToCart}
        isInCart={selectedEvent ? cart.some(i => i.id === selectedEvent.id) : false}
      />
    </div>
  );
};

export default EventsPage;
