import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '@/components/Navbar';
import axios from 'axios';
import { getAuthHeader } from '@/services/authService';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';

interface OrderItem {
  id: number | string;
  name: string;
  date: string;
  venue: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  rawId?: number;
  date: string;
  total: number;
  status: string;
  items: OrderItem[];
}

const statusCfg: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  processing: {
    label: 'İşleniyor',
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  'in-transit': {
    label: 'Yolda',
    dot: 'bg-blue-400',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
  },
  delivered: {
    label: 'Teslim Edildi',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  cancelled: {
    label: 'İptal Edildi',
    dot: 'bg-red-400',
    text: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
  },
};

const CANCELLABLE_STATUSES = ['processing', 'in-transit', 'delivered'];

const mapStatus = (status: string): string => {
  if (status === 'İptal Edildi' || status === 'cancelled') return 'cancelled';
  if (status === 'Yolda' || status === 'in-transit') return 'in-transit';
  if (status === 'Tamamlandı' || status === 'delivered') return 'delivered';
  return 'processing';
};

const OrderHistoryPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSuccessId, setCancelSuccessId] = useState<string | null>(null);

  const downloadPDF = async (order: Order) => {
    const qrData = JSON.stringify({
      orderId: order.id,
      date: order.date,
      total: order.total,
      items: order.items.map(item => ({ name: item.name, quantity: item.quantity })),
    });
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });
    const firstItem = order.items[0];

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const W = pdf.internal.pageSize.getWidth();

    pdf.setFillColor(22, 27, 34);
    pdf.rect(0, 0, W, 210, 'F');
    pdf.setFillColor(14, 116, 144);
    pdf.rect(0, 0, W, 18, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TicketHub - E-Bilet', W / 2, 11, { align: 'center' });

    const tr = (s: string) => s
      .replace(/ş/g,'s').replace(/Ş/g,'S')
      .replace(/ı/g,'i').replace(/İ/g,'I')
      .replace(/ğ/g,'g').replace(/Ğ/g,'G')
      .replace(/ü/g,'u').replace(/Ü/g,'U')
      .replace(/ö/g,'o').replace(/Ö/g,'O')
      .replace(/ç/g,'c').replace(/Ç/g,'C')
      .replace(/₺/g,'TL');

    pdf.setTextColor(240, 246, 252);
    pdf.setFontSize(16);
    pdf.text(tr(firstItem?.name || 'Siparis'), W / 2, 35, { align: 'center' });
    pdf.setDrawColor(45, 212, 191);
    pdf.setLineWidth(0.3);
    pdf.line(15, 40, W - 15, 40);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const details = [
      ['Tarih', firstItem?.date || order.date],
      ['Mekan', tr(firstItem?.venue || '-')],
      ['Bilet Adedi', `${order.items.reduce((sum, item) => sum + item.quantity, 0)} bilet`],
      ['Tutar', `${order.total} TL`],
      ['Siparis No', order.id],
    ];
    details.forEach(([label, value], idx) => {
      const y = 50 + idx * 9;
      pdf.setTextColor(100, 116, 139);
      pdf.text(`${label}:`, 15, y);
      pdf.setTextColor(240, 246, 252);
      pdf.text(value, 60, y);
    });

    pdf.addImage(qrDataUrl, 'PNG', W / 2 - 25, 100, 50, 50);
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Bu QR kodu etkinlik girisinde taratiniz', W / 2, 155, { align: 'center' });
    pdf.setFillColor(14, 116, 144);
    pdf.rect(0, 195, W, 15, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text('tickethub.com', W / 2, 204, { align: 'center' });
    pdf.save(`bilet-${order.id}.pdf`);
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setError('');
        const res = await axios.get(`${API_URL}/orders`, { headers: getAuthHeader() });
        const backendOrders: Order[] = (res.data as any[]).map((order: any) => ({
          id: order.id,
          rawId: order.raw_id,
          date: order.date,
          total: Number(order.total ?? 0),
          status: mapStatus(order.status),
          items: (order.items || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            date: item.date,
            venue: item.venue,
            quantity: Number(item.quantity ?? 0),
            price: Number(item.price ?? 0),
          })),
        }));
        setOrders(backendOrders);
      } catch (err) {
        console.error('Siparişler yüklenemedi:', err);
        setOrders([]);
        setError('Siparişler veritabanından yüklenemedi. Lütfen tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleCancel = async (orderId: string) => {
    const order = orders.find((o: Order) => o.id === orderId);
    setCancelLoading(true);
    try {
      if (order?.rawId) {
        await axios.patch(`${API_URL}/orders/${order.rawId}/cancel`, {}, { headers: getAuthHeader() });
      }
    } catch (err) {
      console.error('Sipariş iptal isteği gönderilemedi:', err);
    } finally {
      setOrders((prev: Order[]) => prev.map((o: Order) => o.id === orderId ? { ...o, status: 'cancelled' } : o));
      setConfirmId(null);
      setCancelSuccessId(orderId);
      setCancelLoading(false);
    }
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
            <p className="text-muted mb-8">{error || 'İlk biletinizi alarak başlayın'}</p>
            <Link to="/events" className="btn-gradient inline-block px-8 py-3.5 text-sm font-bold">
              Etkinliklere Göz At
            </Link>
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
              const sc = statusCfg[order.status] ?? statusCfg.processing;
              const isCancellable = CANCELLABLE_STATUSES.includes(order.status);

              return (
                <div
                  key={order.id}
                  className="glass hover:glass-strong rounded-3xl overflow-hidden transition-all animate-fade-up"
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-0.5">Sipariş No</p>
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
                        <p className="font-black text-fg">₺{order.total}</p>
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
                      {isCancellable && (
                        <button
                          onClick={() => setConfirmId(order.id)}
                          className="text-xs font-semibold text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-3 py-1 rounded-pill transition-colors ml-2"
                        >
                          İptal Et
                        </button>
                      )}
                    </div>
                  </div>

                  {order.items.map(item => (
                    <div key={item.id} className="px-6 py-5 flex flex-col md:flex-row items-center gap-4 border-b border-border/50 last:border-0">
                      <div className="w-10 h-10 rounded-xl bg-teal-dim border border-teal-DEFAULT/20 flex flex-shrink-0 items-center justify-center">
                        <svg className="w-5 h-5 text-teal-DEFAULT" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col md:flex-row w-full justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-fg">{item.name}</p>
                          <p className="text-xs text-muted mt-0.5">{item.date} · {item.venue}</p>
                        </div>

                        <div className="flex gap-4 items-center pl-2 md:pl-0 md:justify-end text-right w-full md:w-auto">
                          {order.status !== 'cancelled' && (
                            <div className="bg-white rounded-xl p-1 flex-shrink-0">
                              <QRCodeSVG
                                value={JSON.stringify({ order_id: order.id, item_id: item.id, item_name: item.name })}
                                size={60}
                                level="L"
                              />
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted">{item.quantity} bilet</p>
                            <p className="font-bold text-fg">₺{item.price * item.quantity}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {order.status === 'cancelled' && (
                    <div className="mx-6 mb-5 flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3">
                      <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-xs font-bold text-amber-400">Bekleyen Geri Ödeme</p>
                        <p className="text-xs text-muted mt-0.5">₺{order.total} tutarındaki geri ödeme 3-5 iş günü içinde hesabınıza aktarılacaktır.</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full mx-4">
            <h3 className="text-lg font-black text-fg mb-2">Siparişi iptal et?</h3>
            <p className="text-sm text-muted mb-6">
              İptal talebiniz alındıktan sonra 2-3 iş günü içerisinde size iletilecektir.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)} disabled={cancelLoading} className="flex-1 btn-ghost py-2.5 text-sm font-semibold">Vazgeç</button>
              <button
                onClick={() => handleCancel(confirmId)}
                disabled={cancelLoading}
                className="flex-1 py-2.5 text-sm font-bold rounded-pill bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-60">
                {cancelLoading ? 'Gönderiliyor...' : 'Evet, İptal Et'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelSuccessId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm mx-4">
          <div className="glass-strong rounded-2xl px-5 py-4 flex items-start gap-3 border border-teal-500/30">
            <svg className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-bold text-teal-400">İptal Talebiniz Alındı</p>
              <p className="text-xs text-muted mt-0.5">2-3 iş günü içerisinde iptal işleminiz tarafınıza iletilecektir.</p>
            </div>
            <button onClick={() => setCancelSuccessId(null)} className="text-muted hover:text-fg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderHistoryPage;
