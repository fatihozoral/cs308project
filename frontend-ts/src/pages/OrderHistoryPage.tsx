import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '@/components/Navbar';

interface MockOrder {
  id: string;
  eventTitle: string;
  date: string;
  venue: string;
  quantity: number;
  totalPrice: number;
  status: 'processing' | 'in-transit' | 'delivered';
  token?: string | null;
}

// TEMPORARY: Mock orders — remove when backend is connected
const mockOrders: MockOrder[] = [
  {
    id: 'ORD-001',
    eventTitle: 'Coldplay Istanbul',
    date: '2026-05-15',
    venue: 'Atatürk Olimpiyat Stadı',
    quantity: 2,
    totalPrice: 1700,
    status: 'processing',
  },
  {
    id: 'ORD-002',
    eventTitle: 'Jolly Joker Festival',
    date: '2026-06-01',
    venue: 'Harbiye Açıkhava',
    quantity: 1,
    totalPrice: 450,
    status: 'in-transit',
  },
  {
    id: 'ORD-003',
    eventTitle: 'Manga Konseri',
    date: '2026-05-20',
    venue: 'KüçükÇiftlik Park',
    quantity: 3,
    totalPrice: 1050,
    status: 'delivered',
  },
];

const statusCfg = {
  'processing': { label: 'İşleniyor', dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  'in-transit': { label: 'Yolda', dot: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  'delivered': { label: 'Teslim Edildi', dot: 'bg-teal-400', text: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/30' },
};

const OrderHistoryPage: React.FC = () => {
  const [orders] = useState<MockOrder[]>(() => {
    // Merge real purchased tickets from localStorage with mock orders
    try {
      const stored = JSON.parse(localStorage.getItem('tickets') || '[]') as Array<{
        ticketId: string; orderId: string; eventName: string; date: string; venue: string; quantity: number; totalPrice: number;
      }>;
      if (stored.length === 0) return mockOrders;
      const realOrders: MockOrder[] = stored.map(t => ({
        id: t.orderId,
        eventTitle: t.eventName,
        date: t.date,
        venue: t.venue,
        quantity: t.quantity,
        totalPrice: t.totalPrice,
        status: 'delivered' as const,
        token: t.token ?? null,
      }));
      return [...realOrders, ...mockOrders];
    } catch {
      return mockOrders;
    }
  });

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-mesh pt-20">
        <Navbar />
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
  }

  return (
    <div className="min-h-screen bg-mesh pt-20">
      <Navbar />
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
            const sc = statusCfg[order.status];
            const qrData = order.token ?? JSON.stringify({
              ticketId: order.id,
              event: order.eventTitle,
              date: order.date,
              venue: order.venue,
              quantity: order.quantity,
            });

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
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-0.5">Toplam</p>
                      <p className="font-black text-fg">₺{order.totalPrice}</p>
                    </div>
                  </div>
                </div>

                {/* Ticket row */}
                <div className="px-6 py-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-dim border border-teal-DEFAULT/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-teal-DEFAULT" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-fg truncate">{order.eventTitle}</p>
                    <p className="text-xs text-muted mt-0.5">{order.date} · {order.venue}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted">{order.quantity} bilet</p>
                    <p className="font-bold text-fg">₺{order.totalPrice}</p>
                  </div>
                </div>

                {/* QR Code */}
                <div className="mx-6 mb-5 flex items-center gap-5 glass rounded-2xl px-5 py-4 border border-border">
                  <div className="bg-white rounded-xl p-2 flex-shrink-0">
                    <QRCodeSVG value={qrData} size={100} level="M" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-fg mb-1">Bilet QR Kodu</p>
                    <p className="text-xs text-muted leading-relaxed">Bu QR kodu etkinlik girişinde taratın. Her bilet için geçerlidir.</p>
                    <p className="font-mono text-[10px] text-muted mt-2 opacity-60">{order.id}</p>
                  </div>
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
