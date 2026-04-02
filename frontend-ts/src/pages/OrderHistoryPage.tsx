import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';

interface OrderItem { id: number; name: string; price: number; date: string; venue: string; quantity: number; }
interface Order { id: string; date: string; items: OrderItem[]; total: number; status: 'Tamamlandı' | 'İptal Edildi' | 'Beklemede'; }

const MOCK_ORDERS: Order[] = [
  { id: 'TH-20260320', date: '20.03.2026', items: [{ id: 1, name: 'Tarkan Konseri', price: 450, date: '15 Nis 2026', venue: 'Volkswagen Arena', quantity: 2 }], total: 900, status: 'Tamamlandı' },
  { id: 'TH-20260310', date: '10.03.2026', items: [{ id: 2, name: 'Galatasaray - Fenerbahçe', price: 250, date: '20 Nis 2026', venue: 'NEF Stadyumu', quantity: 3 }], total: 750, status: 'Tamamlandı' },
  { id: 'TH-20260228', date: '28.02.2026', items: [{ id: 3, name: 'Rock Festivali 2026', price: 500, date: '20 May 2026', venue: 'İTÜ Stadyumu', quantity: 1 }], total: 500, status: 'İptal Edildi' },
];

const statusCfg = {
  'Tamamlandı': { dot: 'bg-teal-DEFAULT', text: 'text-teal-DEFAULT', bg: 'bg-teal-dim border-teal-DEFAULT/30' },
  'İptal Edildi': { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  'Beklemede': { dot: 'bg-amber-warm', text: 'text-amber-warm', bg: 'bg-amber-500/10 border-amber-500/30' },
};

const OrderHistoryPage: React.FC = () => {
  const [orders] = useState<Order[]>(() => {
    try { const s = JSON.parse(localStorage.getItem('orders') || '[]'); return s.length > 0 ? s : MOCK_ORDERS; } catch { return MOCK_ORDERS; }
  });

  if (orders.length === 0) return (
    <div className="min-h-screen bg-mesh pt-20">
      <Navbar/>
      <div className="max-w-lg mx-auto px-8 py-24 text-center animate-fade-up">
        <div className="glass-strong rounded-3xl p-12">
          <p className="text-6xl mb-5">📋</p>
          <h2 className="text-2xl font-black text-fg mb-2">Henüz siparişiniz yok</h2>
          <p className="text-muted mb-8">İlk biletinizi alarak başlayın</p>
          <Link to="/events" className="btn-gradient inline-block px-8 py-3.5 text-sm font-bold">Etkinliklere Göz At</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-mesh pt-20">
      <Navbar/>
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="flex items-end justify-between mb-12 animate-fade-up">
          <div>
            <h1 className="text-5xl font-black text-fg tracking-tight">Siparişlerim</h1>
            <p className="text-muted mt-2">{orders.length} sipariş</p>
          </div>
          <Link to="/events" className="btn-ghost px-5 py-2.5 text-sm font-semibold hidden sm:block">
            + Yeni Bilet Al
          </Link>
        </div>

        <div className="space-y-4">
          {orders.map((order, i) => {
            const sc = statusCfg[order.status] || statusCfg['Beklemede'];
            return (
              <div key={order.id}
                className="glass hover:glass-strong rounded-3xl overflow-hidden transition-all animate-fade-up"
                style={{ animationDelay: `${i * 0.07}s` }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-0.5">Sipariş</p>
                      <p className="font-mono font-bold text-fg text-sm">{order.id}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-0.5">Tarih</p>
                      <p className="text-sm text-fg">{order.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill border text-xs font-semibold ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>
                      {order.status}
                    </span>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-0.5">Toplam</p>
                      <p className="font-black text-fg">₺{order.total}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="px-6 py-5 space-y-4">
                  {order.items.map(item => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-teal-dim border border-teal-DEFAULT/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-teal-DEFAULT" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-fg truncate">{item.name}</p>
                        <p className="text-xs text-muted mt-0.5">{item.date} · {item.venue}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted">{item.quantity} bilet</p>
                        <p className="font-bold text-fg">₺{item.price * item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderHistoryPage;
