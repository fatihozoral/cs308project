import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';

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
  accent: string;
}

interface CartItem { id: number; name: string; price: number; date: string; venue: string; quantity: number; }

const WishlistPage: React.FC = () => {
  const navigate = useNavigate();

  const [wishlist, setWishlist] = useState<WishlistEvent[]>(() => {
    try { return JSON.parse(localStorage.getItem('wishlist') || '[]'); } catch { return []; }
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
  });

  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const removeFromWishlist = (id: number) => {
    const updated = wishlist.filter(e => e.id !== id);
    setWishlist(updated);
    localStorage.setItem('wishlist', JSON.stringify(updated));
  };

  const addToCart = (event: WishlistEvent) => {
    const updated = cart.find(i => i.id === event.id)
      ? cart.map(i => i.id === event.id ? { ...i, quantity: i.quantity + 1 } : i)
      : [...cart, { id: event.id, name: event.name, price: event.price, date: event.date, venue: event.venue, quantity: 1 }];
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
    setAddedIds(prev => new Set(prev).add(event.id));
    setTimeout(() => setAddedIds(prev => { const n = new Set(prev); n.delete(event.id); return n; }), 1500);
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  if (wishlist.length === 0) return (
    <div className="min-h-screen bg-mesh pt-20">
      <Navbar cartCount={cartCount} />
      <div className="max-w-lg mx-auto px-8 py-24 text-center animate-fade-up">
        <div className="glass-strong rounded-3xl p-12">
          <p className="text-6xl mb-5">🤍</p>
          <h2 className="text-2xl font-black text-fg mb-2">İstek listeniz boş</h2>
          <p className="text-muted mb-8">Beğendiğiniz etkinlikleri kaydedin</p>
          <Link to="/events" className="btn-gradient inline-block px-8 py-3.5 text-sm font-bold">Etkinliklere Göz At</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-mesh pt-20">
      <Navbar cartCount={cartCount} />
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex items-end justify-between mb-12 animate-fade-up">
          <div>
            <h1 className="text-5xl font-black text-fg tracking-tight">İstek Listesi</h1>
            <p className="text-muted mt-2">{wishlist.length} etkinlik kaydedildi</p>
          </div>
          <Link to="/events" className="btn-ghost px-5 py-2.5 text-sm font-semibold hidden sm:block">
            + Etkinlik Ekle
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {wishlist.map((event, i) => (
            <div key={event.id}
              className="glass hover:glass-strong rounded-3xl overflow-hidden flex flex-col transition-all hover:scale-[1.02] animate-fade-up"
              style={{ animationDelay: `${i * 0.05}s` }}>
              <div className={`h-32 bg-gradient-to-br ${event.accent} flex items-center justify-center text-5xl relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
                {event.emoji}
                <button
                  onClick={() => removeFromWishlist(event.id)}
                  className="absolute top-3 right-3 w-8 h-8 glass rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all">
                  ❤️
                </button>
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
                  <button
                    onClick={() => addToCart(event)}
                    className={`px-4 py-1.5 rounded-pill text-xs font-bold transition-all ${addedIds.has(event.id) ? 'glass border border-teal-DEFAULT/40 text-teal-DEFAULT' : 'btn-gradient'}`}>
                    {addedIds.has(event.id) ? '✓ Eklendi' : 'Sepete Ekle'}
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
