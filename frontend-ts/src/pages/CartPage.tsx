import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { getAuthHeader } from '@/services/authService';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';


interface CartItem { id: number; cartItemId?: string | number; name: string; price: number; date: string; venue: string; quantity: number; category?: string; }

const CartPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>(() => { try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; } });
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState(user?.name || '');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const updateQty = (uid: string | number, d: number) => setCart(prev => prev.map(i => (i.cartItemId || i.id) === uid ? { ...i, quantity: i.quantity + d } : i).filter(i => i.quantity > 0));
  const remove = (uid: string | number) => setCart(prev => prev.filter(i => (i.cartItemId || i.id) !== uid));
  const fmtCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const fmtExpiry = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length >= 3 ? d.slice(0, 2) + '/' + d.slice(2) : d; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const orderId = `ORD-${Date.now()}`;

      // Generate a ticket entry per cart item
      const tickets = cart.map(item => ({
        ticketId: crypto.randomUUID(),
        orderId,
        eventName: item.name,
        date: item.date,
        venue: item.venue,
        quantity: item.quantity,
        totalPrice: item.price * item.quantity,
        token: null as string | null,
      }));

      // Save locally first (fallback if backend is offline)
      const existing = JSON.parse(localStorage.getItem('tickets') || '[]');
      localStorage.setItem('tickets', JSON.stringify([...tickets, ...existing]));

      // Try to persist to backend; ignore errors (backend may be offline)
      try {
        const items = cart.map(item => ({
          event_id: item.id,
          event_name: item.name,
          event_date: item.date,
          venue: item.venue,
          quantity: item.quantity,
          price: item.price,
          category: item.category
        }));
        const res = await axios.post(`${API_URL}/orders`, { items, total: subtotal }, { headers: getAuthHeader() });
        const backendTokens: string[] = res.data.tokens || [];

        // Overwrite tickets with real backend tokens
        const ticketsWithTokens = tickets.map((t, i) => ({
          ...t,
          token: backendTokens[i] ?? null,
        }));
        const existing = JSON.parse(localStorage.getItem('tickets') || '[]');
        localStorage.setItem('tickets', JSON.stringify([...ticketsWithTokens, ...existing]));
      } catch {
        // backend offline — tickets already saved locally without tokens
      }

      localStorage.removeItem('cart');
      setCart([]);
      setSuccess(true);
    } catch (error) {
      console.error('Sipariş oluşturulamadı:', error);
      alert('Sipariş oluşturulamadı, lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-3.5 rounded-2xl glass text-fg text-sm placeholder-muted focus:outline-none focus:border-teal-accent transition-all';

  if (success) return (
    <div className="min-h-screen bg-mesh pt-20">
      <Navbar cartCount={0}/>
      <div className="max-w-lg mx-auto px-8 py-24 text-center animate-fade-up">
        <div className="glass-strong rounded-3xl p-12">
          <div className="w-16 h-16 rounded-full bg-teal-dim border border-teal-DEFAULT/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-teal-DEFAULT" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 className="text-3xl font-black text-fg mb-2">Sipariş Tamamlandı!</h2>
          <p className="text-muted mb-10">Biletleriniz e-posta adresinize gönderildi.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/orders" className="btn-gradient px-6 py-3 text-sm font-bold">Siparişlerimi Gör</Link>
            <Link to="/events" className="btn-ghost px-6 py-3 text-sm font-semibold">Alışverişe Devam</Link>
          </div>
        </div>
      </div>
    </div>
  );

  if (cart.length === 0) return (
    <div className="min-h-screen bg-mesh pt-20">
      <Navbar cartCount={0}/>
      <div className="max-w-lg mx-auto px-8 py-24 text-center animate-fade-up">
        <div className="glass-strong rounded-3xl p-12">
          <p className="text-6xl mb-5">🛒</p>
          <h2 className="text-2xl font-black text-fg mb-2">Sepetiniz boş</h2>
          <p className="text-muted mb-8">Etkinliklere göz atarak sepetinize ekleyin</p>
          <Link to="/events" className="btn-gradient inline-block px-8 py-3.5 text-sm font-bold">Etkinliklere Göz At</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-mesh pt-20">
      <Navbar cartCount={cartCount}/>
      <div className="max-w-7xl mx-auto px-8 py-12">
        <h1 className="text-5xl font-black text-fg tracking-tight mb-12 animate-fade-up">Sepetim</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item, i) => (
              <div key={item.cartItemId || item.id}
                className="glass hover:glass-strong rounded-3xl p-5 flex items-center gap-4 transition-all animate-fade-up"
                style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="w-12 h-12 rounded-2xl bg-teal-dim border border-teal-DEFAULT/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-teal-DEFAULT" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-fg truncate">{item.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{item.date} · {item.venue}</p>
                  <p className="text-xs text-teal-DEFAULT font-semibold mt-0.5">₺{item.price} / bilet</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.cartItemId || item.id, -1)} className="btn-ghost w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold p-0">−</button>
                  <span className="w-6 text-center font-bold text-fg">{item.quantity}</span>
                  <button onClick={() => updateQty(item.cartItemId || item.id, 1)} className="btn-ghost w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold p-0">+</button>
                </div>
                <div className="text-right ml-2">
                  <p className="font-black text-fg">₺{item.price * item.quantity}</p>
                  <button onClick={() => remove(item.cartItemId || item.id)} className="text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-full transition-colors mt-2">Kaldır</button>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Summary */}
            <div className="glass-strong rounded-3xl p-6">
              <h2 className="font-bold text-fg mb-5">Sipariş Özeti</h2>
              <div className="space-y-2.5">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between text-sm text-muted">
                    <span className="truncate pr-2">{item.name} ×{item.quantity}</span>
                    <span className="font-semibold text-fg flex-shrink-0">₺{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-5 pt-5 flex justify-between font-black text-fg">
                <span>Toplam</span>
                <span>₺{subtotal}</span>
              </div>
            </div>

            {/* Checkout */}
            <form onSubmit={handleSubmit} className="glass-strong rounded-3xl p-6 space-y-4">
              <h2 className="font-bold text-fg">Ödeme Bilgileri</h2>

              {[
                { label: 'Kart Sahibi', el: <input type="text" value={cardName} onChange={e => setCardName(e.target.value)} required placeholder="Ad Soyad" className={inputCls}/> },
                { label: 'Kart Numarası', el: <input type="text" value={cardNumber} onChange={e => setCardNumber(fmtCard(e.target.value))} maxLength={19} required placeholder="0000 0000 0000 0000" className={inputCls + ' font-mono tracking-wider'}/> },
              ].map(({ label, el }) => (
                <div key={label} className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">{label}</label>
                  {el}
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">Son Kullanma</label>
                  <input type="text" value={expiry} onChange={e => setExpiry(fmtExpiry(e.target.value))} maxLength={5} required placeholder="AA/YY" className={inputCls}/>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">CVV</label>
                  <input type="text" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))} maxLength={3} required placeholder="•••" className={inputCls}/>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="btn-gradient w-full px-6 py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
                {loading
                  ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>İşleniyor...</>
                  : <>Öde — ₺{subtotal}</>
                }
              </button>

              <p className="text-xs text-center text-muted">🔒 256-bit SSL ile güvenli ödeme</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
