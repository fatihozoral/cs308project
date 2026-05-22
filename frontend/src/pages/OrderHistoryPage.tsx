import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '@/components/Navbar';
import axios from 'axios';
import { getAuthHeader } from '@/services/authService';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';

interface ReturnInfo {
  status: 'pending' | 'approved' | 'rejected';
  quantity: number;
  price: number;
  reason?: string;
}

interface OrderItem {
  id: number | string;
  name: string;
  date: string;
  venue: string;
  quantity: number;
  price: number;
  return_info?: ReturnInfo;
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

const returnStatusCfg: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  pending: {
    label: 'İade Bekliyor',
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  approved: {
    label: 'İade Edildi',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  rejected: {
    label: 'İade Reddedildi',
    dot: 'bg-red-400',
    text: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
  },
};

const CANCELLABLE_STATUSES = ['processing'];

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

  // Return modal and form states
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [returnItem, setReturnItem] = useState<OrderItem | null>(null);
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnReason, setReturnReason] = useState<string>('');
  const [returnLoading, setReturnLoading] = useState<boolean>(false);
  const [returnSuccess, setReturnSuccess] = useState<boolean>(false);

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
            return_info: item.return_info ? {
              status: item.return_info.status,
              quantity: Number(item.return_info.quantity ?? 0),
              price: Number(item.return_info.price ?? 0),
              reason: item.return_info.reason || '',
            } : undefined,
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

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnOrder || !returnItem) return;

    setReturnLoading(true);
    try {
      await axios.post(
        `${API_URL}/orders/${returnOrder.id}/return`,
        {
          order_item_id: returnItem.id,
          quantity: returnQty,
          reason: returnReason || null,
        },
        { headers: getAuthHeader() }
      );
      setReturnSuccess(true);
      
      // Reload orders to reflect return info changes
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
          return_info: item.return_info ? {
            status: item.return_info.status,
            quantity: Number(item.return_info.quantity ?? 0),
            price: Number(item.return_info.price ?? 0),
            reason: item.return_info.reason || '',
          } : undefined,
        })),
      }));
      setOrders(backendOrders);
      
      // Auto-close modal after delay
      setTimeout(() => {
        setReturnOrder(null);
        setReturnItem(null);
      }, 1800);
    } catch (err: any) {
      console.error('İade talebi gönderilemedi:', err);
      alert(err.response?.data?.detail || 'İade talebi gönderilemedi.');
    } finally {
      setReturnLoading(false);
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

                  {order.items.map(item => {
                    const parseTurkishDate = (dateStr: string): Date => {
                      const parts = dateStr.split('.');
                      if (parts.length === 3) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1;
                        const year = parseInt(parts[2], 10);
                        return new Date(year, month, day);
                      }
                      return new Date(dateStr);
                    };

                    const orderDate = parseTurkishDate(order.date);
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - orderDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const isWithin30Days = diffDays <= 30;

                    return (
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

                          <div className="flex gap-4 items-center pl-2 md:pl-0 md:justify-end text-right w-full md:w-auto flex-wrap sm:flex-nowrap">
                            {order.status !== 'cancelled' && (
                              <div className="bg-white rounded-xl p-1 flex-shrink-0">
                                <QRCodeSVG
                                  value={JSON.stringify({ order_id: order.id, item_id: item.id, item_name: item.name })}
                                  size={60}
                                  level="L"
                                />
                              </div>
                            )}
                            <div className="text-right min-w-[70px]">
                              <p className="text-xs text-muted">{item.quantity} bilet</p>
                              <p className="font-bold text-fg">₺{item.price * item.quantity}</p>
                            </div>

                            {/* Returns Action / Badge */}
                            <div className="flex items-center pl-2">
                              {item.return_info ? (
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill border text-[10px] font-bold ${returnStatusCfg[item.return_info.status]?.bg || ''} ${returnStatusCfg[item.return_info.status]?.text || ''}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${returnStatusCfg[item.return_info.status]?.dot || ''}`} />
                                  {returnStatusCfg[item.return_info.status]?.label} ({item.return_info.quantity} Adet)
                                </span>
                              ) : (
                                order.status !== 'cancelled' && isWithin30Days && (
                                  <button
                                    onClick={() => {
                                      setReturnOrder(order);
                                      setReturnItem(item);
                                      setReturnQty(item.quantity);
                                      setReturnReason('');
                                      setReturnSuccess(false);
                                    }}
                                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-400/50 px-3 py-1 rounded-pill transition-colors whitespace-nowrap"
                                  >
                                    İade Et
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

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

      {/* Return Modal */}
      {returnOrder && returnItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-3xl p-8 max-w-md w-full mx-4 border border-white/10 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-fg">Bilet İade Talebi</h3>
              <button
                onClick={() => { setReturnOrder(null); setReturnItem(null); }}
                className="text-muted hover:text-fg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {returnSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-emerald-400">Talebiniz Alındı</h4>
                <p className="text-xs text-muted leading-relaxed">
                  İade talebiniz başarıyla oluşturulmuştur. Finans birimi inceledikten sonra 3-5 iş günü içinde geri ödeme yapılacaktır.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReturnSubmit} className="space-y-5">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-2">
                  <p className="text-xs text-muted uppercase font-bold tracking-wider">Etkinlik</p>
                  <p className="font-bold text-fg text-sm">{returnItem.name}</p>
                  <p className="text-xs text-muted">{returnItem.date} · {returnItem.venue}</p>
                  <div className="flex justify-between items-center pt-2 border-t border-white/5 mt-2">
                    <span className="text-xs text-muted">Bilet Fiyatı:</span>
                    <span className="font-bold text-fg text-sm">₺{returnItem.price}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted uppercase tracking-widest">İade Edilecek Adet</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max={returnItem.quantity}
                      value={returnQty}
                      onChange={(e) => setReturnQty(Number(e.target.value))}
                      className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-teal-500"
                    />
                    <span className="w-12 text-center py-1.5 rounded-xl bg-white/5 border border-white/10 text-fg text-sm font-bold">
                      {returnQty}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-2">Satın alınan toplam bilet: {returnItem.quantity}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted uppercase tracking-widest">İade Nedeni</label>
                  <textarea
                    required
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="İade etme nedeninizi giriniz..."
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-fg text-sm placeholder-muted focus:outline-none focus:border-teal-500/50 transition-all min-h-[90px] resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setReturnOrder(null); setReturnItem(null); }}
                    className="flex-1 btn-ghost py-3 text-xs font-bold rounded-xl"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={returnLoading}
                    className="flex-1 btn-gradient py-3 text-xs font-bold rounded-xl shadow-teal/20"
                  >
                    {returnLoading ? 'Gönderiliyor...' : 'İade Talebi Oluştur'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default OrderHistoryPage;
