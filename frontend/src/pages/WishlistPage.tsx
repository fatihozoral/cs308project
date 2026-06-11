import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { getAuthHeader } from '@/services/authService';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';

interface WishlistEvent {
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
  original_price?: number;
  discount_rate?: number;
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  date: string;
  venue: string;
  quantity: number;
}

const ACCENTS = [
  'from-violet-500/20 to-purple-600/20',
  'from-amber-500/20 to-orange-600/20',
  'from-blue-500/20 to-indigo-600/20',
  'from-teal-500/20 to-green-600/20',
  'from-rose-500/20 to-pink-600/20',
  'from-orange-500/20 to-red-600/20',
  'from-cyan-500/20 to-blue-600/20',
  'from-red-500/20 to-rose-600/20',
];

const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState<WishlistEvent[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
  });
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const fetchWishlist = async () => {
      setLoading(true);
      try {
        setError('');
        const [wishlistRes, eventsRes] = await Promise.all([
          axios.get(`${API_URL}/wishlist`, { headers: getAuthHeader() }),
          axios.get(`${API_URL}/events`),
        ]);
        const ids = new Set((wishlistRes.data || []).map((item: any) => item.event_id));
        const events = (eventsRes.data || [])
          .filter((event: any) => ids.has(event.id))
          .map((event: any, index: number) => ({
            ...event,
            accent: ACCENTS[index % ACCENTS.length],
          }));
        setWishlist(events);
      } catch (err) {
        console.error('İstek listesi yüklenemedi:', err);
        setWishlist([]);
        setError('İstek listesi veritabanından yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, []);

  const removeFromWishlist = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/wishlist/${id}`, { headers: getAuthHeader() });
      setWishlist(prev => prev.filter(event => event.id !== id));
    } catch {
      alert('İstek listesinden çıkarılamadı.');
    }
  };

  const addToCart = (event: WishlistEvent) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === event.id);
      return existing
        ? prev.map(item => item.id === event.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...prev, { id: event.id, name: event.name, price: event.price, date: event.date, venue: event.venue, quantity: 1 }];
    });
    setAddedIds(prev => new Set(prev).add(event.id));
    setTimeout(() => setAddedIds(prev => {
      const next = new Set(prev);
      next.delete(event.id);
      return next;
    }), 1500);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh pt-20 flex items-center justify-center">
        <Navbar cartCount={cartCount} />
        <svg className="animate-spin h-10 w-10 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="min-h-screen bg-mesh pt-20">
        <Navbar cartCount={cartCount} />
        <div className="max-w-lg mx-auto px-8 py-24 text-center animate-fade-up">
          <div className="glass-strong rounded-3xl p-12">
            <div className="w-14 h-14 rounded-2xl bg-teal-dim border border-teal/30 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-fg mb-2">İstek listeniz boş</h2>
            <p className="text-muted mb-8">{error || 'Kaydettiğiniz etkinlikler burada görünecek'}</p>
            <Link to="/events?select=wishlist" className="btn-gradient inline-block px-8 py-3.5 text-sm font-bold">Etkinlik Seç</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh pt-20">
      <Navbar cartCount={cartCount} />
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex items-end justify-between mb-12 animate-fade-up">
          <div>
            <h1 className="text-5xl font-black text-fg tracking-tight">İstek Listesi</h1>
            <p className="text-muted mt-2">{wishlist.length} etkinlik kaydedildi</p>
          </div>
          <Link to="/events?select=wishlist" className="btn-ghost px-5 py-2.5 text-sm font-semibold hidden sm:block">
            Etkinlik Seç
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {wishlist.map((event, i) => (
            <div
              key={event.id}
              className="glass hover:glass-strong rounded-3xl overflow-hidden flex flex-col transition-all hover:scale-[1.02] animate-fade-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={`h-32 bg-gradient-to-br ${event.accent} flex items-center justify-center text-5xl relative overflow-hidden`}>
                {event.image_url ? (
                  <img src={event.image_url} alt={event.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : null}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
                {!event.image_url && event.emoji}
              </div>

              <div className="p-5 flex flex-col flex-1 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-teal uppercase tracking-widest">{event.category}</span>
                  <h3 className="font-bold text-fg mt-1 leading-snug">{event.name}</h3>
                </div>
                <div className="space-y-1 text-xs text-muted flex-1">
                  <p>📅 {event.date} · {event.time}</p>
                  <p>📍 {event.venue}, {event.city}</p>
                </div>
                <div className="flex flex-col gap-2 pt-3 border-t border-border">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex flex-col">
                      <span className="font-black text-fg">₺{event.price}</span>
                      {(event.discount_rate ?? 0) > 0 && event.original_price && (
                        <span className="text-[10px] text-muted line-through">₺{event.original_price}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {(event.discount_rate ?? 0) > 0 && (
                        <span className="text-[9px] font-bold text-rose-400 bg-rose-400/10 border border-rose-400/30 px-1 py-0.5 rounded-full shrink-0">
                          %{event.discount_rate}
                        </span>
                      )}
                      <button
                        onClick={() => addToCart(event)}
                        className={`px-3 py-1.5 rounded-pill text-xs font-bold transition-all ${addedIds.has(event.id) ? 'glass border border-teal/40 text-teal' : 'btn-gradient'} shrink-0`}>
                        {addedIds.has(event.id) ? 'Eklendi' : 'Sepete Ekle'}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromWishlist(event.id)}
                    className="w-full px-4 py-2 rounded-pill text-xs font-bold btn-ghost text-red-400 hover:text-red-300">
                    Listeden Çıkar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {cartCount > 0 && (
        <button onClick={() => navigate('/cart')}
          className="fixed bottom-8 right-8 btn-gradient px-6 py-3.5 text-sm font-bold flex items-center gap-2 shadow-2xl animate-fade-up">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Sepete Git ({cartCount})
        </button>
      )}
    </div>
  );
};

export default WishlistPage;
