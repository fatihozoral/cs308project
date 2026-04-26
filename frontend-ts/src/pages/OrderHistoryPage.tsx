import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '@/components/Navbar';
import axios from 'axios';
import { getAuthHeader } from '@/services/authService';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';

interface MockOrder {
  id: string;
  rawId?: number;
  eventTitle: string;
  date: string;
  venue: string;
  quantity: number;
  totalPrice: number;
  status: 'processing' | 'in-transit' | 'delivered' | 'cancelled';
  token?: string | null;
}

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
  'cancelled': { label: 'İptal Edildi', dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
};

const CANCELLABLE: MockOrder['status'][] = ['processing', 'in-transit', 'delivered'];

// Map backend status string to frontend status key
const mapStatus = (s: string): MockOrder['status'] => {
  if (s === 'İptal Edildi') return 'cancelled';
  if (s === 'Tamamlandı') return 'delivered';
  if (s === 'Yolda') return 'in-transit';
  return 'processing';
};

const OrderHistoryPage: React.FC = () => {
  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const downloadPDF = async (order: MockOrder) => {
    const qrData = order.token ?? JSON.stringify({
      ticketId: order.id, event: order.eventTitle,
      date: order.date, venue: order.venue, quantity: order.quantity,
    });
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const W = pdf.internal.pageSize.getWidth();

    // Background
    pdf.setFillColor(22, 27, 34);
    pdf.rect(0, 0, W, 210, 'F');

    // Header bar
    pdf.setFillColor(14, 116, 144);
    pdf.rect(0, 0, W, 18, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TicketHub - E-Bilet', W / 2, 11, { align: 'center' });

    // Event name
    pdf.setTextColor(240, 246, 252);
    pdf.setFontSize(16);
    pdf.text(order.eventTitle, W / 2, 35, { align: 'center' });

    // Divider
    pdf.setDrawColor(45, 212, 191);
    pdf.setLineWidth(0.3);
    pdf.line(15, 40, W - 15, 40);

    // Details
    pdf.setFontSize(9);
    pdf.setTextColor(139, 148, 158);
    pdf.setFont('helvetica', 'normal');
    const details = [
      ['Tarih', order.date],
      ['Mekan', order.venue],
      ['Bilet Adedi', `${order.quantity} bilet`],
      ['Tutar', `${order.totalPrice} TL`],
      ['Siparis No', order.id],
    ];
    details.forEach(([label, value], idx) => {
      const y = 50 + idx * 9;
      pdf.setTextColor(100, 116, 139);
      pdf.text(label + ':', 15, y);
      pdf.setTextColor(240, 246, 252);
      pdf.text(value, 60, y);
    });

    // QR Code
    pdf.addImage(qrDataUrl, 'PNG', W / 2 - 25, 100, 50, 50);
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Bu QR kodu etkinlik girisinde taratiniz', W / 2, 155, { align: 'center' });

    // Footer
    pdf.setFillColor(14, 116, 144);
    pdf.rect(0, 195, W, 15, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.text('tickethub.com', W / 2, 204, { align: 'center' });

    pdf.save(`bilet-${order.id}.pdf`);
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${API_URL}/orders`, { headers: getAuthHeader() });
        const backendOrders: MockOrder[] = (res.data as any[]).map((o: any) => ({
          id: o.id,
          rawId: o.raw_id,
          eventTitle: o.items?.[0]?.name ?? 'Etkinlik',
          date: o.items?.[0]?.date ?? o.date,
          venue: o.items?.[0]?.venue ?? '',
          quantity: o.items?.reduce((s: number, i: any) => s + i.quantity, 0) ?? 1,
          totalPrice: o.total,
          status: mapStatus(o.status),
          token: null,
        }));
        setOrders(backendOrders.length > 0 ? backendOrders : mockOrders);
      } catch {
        // Backend offline — fall back to localStorage + mock
        let cancelledIds: string[] = [];
        try { cancelledIds = JSON.parse(localStorage.getItem('cancelledOrders') || '[]'); } catch { /* noop */ }

        try {
          const stored = JSON.parse(localStorage.getItem('tickets') || '[]') as Array<{
            ticketId: string; orderId: string; eventName: string; date: string; venue: string; quantity: number; totalPrice: number; token?: string | null;
          }>;
          const applyCancel = (o: MockOrder): MockOrder =>
            cancelledIds.includes(o.id) ? { ...o, status: 'cancelled' } : o;

          if (stored.length === 0) {
            setOrders(mockOrders.map(applyCancel));
          } else {
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
            setOrders([...realOrders, ...mockOrders].map(applyCancel));
          }
        } catch {
          setOrders(mockOrders);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleCancel = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    setCancelLoading(true);

    // Try backend cancel
    if (order.rawId) {
      try {
        await axios.patch(`${API_URL}/orders/${order.rawId}/cancel`, {}, { headers: getAuthHeader() });
      } catch {
        // Backend offline — fall back to localStorage
        try {
          const existing: string[] = JSON.parse(localStorage.getItem('cancelledOrders') || '[]');
          if (!existing.includes(orderId)) {
            localStorage.setItem('cancelledOrders', JSON.stringify([...existing, orderId]));
          }
        } catch { /* noop */ }
      }
    } else {
      // No rawId (mock/localStorage order) — persist locally
      try {
        const existing: string[] = JSON.parse(localStorage.getItem('cancelledOrders') || '[]');
        if (!existing.includes(orderId)) {
          localStorage.setItem('cancelledOrders', JSON.stringify([...existing, orderId]));
        }
      } catch { /* noop */ }
    }

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    setCancelLoading(false);
    setConfirmId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh pt-20 flex items-center justify-center">
        <Navbar />
        <svg className="animate-spin h-10 w-10 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

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
    <>
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
              const sc = statusCfg[order.status] ?? statusCfg['processing'];
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
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill border text-xs font-semibold ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-0.5">Toplam</p>
                        <p className="font-black text-fg">₺{order.totalPrice}</p>
                      </div>
                      {order.status !== 'cancelled' && (
                        <button
                          onClick={() => downloadPDF(order)}
                          className="text-xs font-semibold text-teal-400 hover:text-teal-300 border border-teal-500/30 hover:border-teal-400/50 px-3 py-1 rounded-pill transition-colors flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          PDF
                        </button>
                      )}
                      {CANCELLABLE.includes(order.status) && (
                        <button
                          onClick={() => setConfirmId(order.id)}
                          className="text-xs font-semibold text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-3 py-1 rounded-pill transition-colors">
                          İptal Et
                        </button>
                      )}
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

                  {/* QR Code — only for non-cancelled orders */}
                  {order.status !== 'cancelled' && (
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
                  )}

                  {/* Bekleyen Geri Ödeme */}
                  {order.status === 'cancelled' && (
                    <div className="mx-6 mb-5 flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3">
                      <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-xs font-bold text-amber-400">Bekleyen Geri Ödeme</p>
                        <p className="text-xs text-muted mt-0.5">₺{order.totalPrice} tutarındaki geri ödeme 3–5 iş günü içinde hesabınıza aktarılacaktır.</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Onay Modalı */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full mx-4">
            <h3 className="text-lg font-black text-fg mb-2">Siparişi iptal et?</h3>
            <p className="text-sm text-muted mb-6">Bu işlem geri alınamaz. Ödeme tutarı 3–5 iş günü içinde iade edilecektir.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)} disabled={cancelLoading}
                className="flex-1 btn-ghost py-2.5 text-sm font-semibold">Vazgeç</button>
              <button onClick={() => handleCancel(confirmId)} disabled={cancelLoading}
                className="flex-1 py-2.5 text-sm font-bold rounded-pill bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-60">
                {cancelLoading ? 'İptal ediliyor...' : 'Evet, İptal Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderHistoryPage;
