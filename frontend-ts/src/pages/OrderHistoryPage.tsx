import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '@/components/Navbar';
import axios from 'axios';
import { getAuthHeader } from '@/services/authService';

interface OrderItem {
  id: number;
  event_id: number;
  name: string;
  date: string;
  venue: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  date: string;
  total: number;
  status: string;
  items: OrderItem[];
}

const statusCfg: Record<string, any> = {
  'Tamamlandı': {
    label: 'Tamamlandı',
    dot: 'bg-teal-400',
    text: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/30',
  },
  'processing': {
    label: 'İşleniyor',
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  'cancelled': {
    label: 'İptal Edildi',
    dot: 'bg-red-400',
    text: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
  },
};

const CANCELLABLE_STATUSES = ['Tamamlandı', 'processing'];

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';

const OrderHistoryPage: React.FC = () => {
  const [orders, setOrders] = useState<MockOrder[]>(() => {
    // Load cancelled IDs from localStorage
    let cancelledIds: string[] = [];
    try { cancelledIds = JSON.parse(localStorage.getItem('cancelledOrders') || '[]'); } catch { /* noop */ }

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${API_URL}/orders`, {
          headers: getAuthHeader(),
        });
        setOrders(response.data);
      } catch (err) {
        console.error('Siparişler alınırken hata oluştu', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleCancel = async (orderId: string) => {
    try {
      // Eğer backend endpoint'in varsa bunu aç:
      // await axios.patch(
      //   `${API_URL}/orders/${orderId}/cancel`,
      //   {},
      //   { headers: getAuthHeader() }
      // );

      // Şimdilik frontend tarafında state güncelle
      const updatedOrders = orders.map((order) =>
        order.id === orderId ? { ...order, status: 'cancelled' } : order
      );

      setOrders(updatedOrders);
      setConfirmId(null);
    } catch (error) {
      console.error('Sipariş iptal edilirken hata oluştu', error);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-mesh pt-20">
        <Navbar />
        <div className="flex justify-center items-center h-[50vh]">Yükleniyor...</div>
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
            <Link
              to="/events"
              className="btn-gradient inline-block px-8 py-3.5 text-sm font-bold"
            >
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
            <Link
              to="/events"
              className="btn-ghost px-5 py-2.5 text-sm font-semibold hidden sm:block"
            >
              + Yeni Bilet Al
            </Link>
          </div>

          <div className="space-y-4">
            {orders.map((order, i) => {
              const sc = statusCfg[order.status] ?? statusCfg['Tamamlandı'];
              const isCancellable = CANCELLABLE_STATUSES.includes(order.status);

              return (
                <div
                  key={order.id}
                  className="glass hover:glass-strong rounded-3xl overflow-hidden transition-all animate-fade-up"
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-0.5">
                          Sipariş No
                        </p>
                        <p className="font-mono font-bold text-fg text-sm">{order.id}</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-0.5">
                          Tarih
                        </p>
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
                      {CANCELLABLE.includes(order.status) && (
                        <button
                          onClick={() => setConfirmId(order.id)}
                          className="text-xs font-semibold text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-3 py-1 rounded-pill transition-colors">
                          İptal Et
                        </button>
                      )}
                    </div>
                  </div>

                    <div className="flex items-center gap-3 flex-wrap justify-end">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill border text-xs font-semibold ${sc.bg} ${sc.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>

                      <div className="text-right">
                        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-0.5">
                          Toplam
                        </p>
                        <p className="font-black text-fg">₺{order.total}</p>
                      </div>

                      {isCancellable && (
                        <button
                          onClick={() => setConfirmId(order.id)}
                          className="text-xs font-semibold text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-3 py-1 rounded-pill transition-colors"
                        >
                          İptal Et
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="px-6 py-5 flex flex-col md:flex-row items-center gap-4 border-b border-border/50 last:border-0"
                    >
                      <div className="w-10 h-10 rounded-xl bg-teal-dim border border-teal-DEFAULT/20 flex flex-shrink-0 items-center justify-center">
                        <svg
                          className="w-5 h-5 text-teal-DEFAULT"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                          />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col md:flex-row w-full justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-fg">{item.name}</p>
                          <p className="text-xs text-muted mt-0.5">
                            {item.date} · {item.venue}
                          </p>
                        </div>

                        <div className="flex gap-4 items-center pl-2 md:pl-0 md:justify-end text-right w-full md:w-auto">
                          {order.status !== 'cancelled' && (
                            <div className="bg-white rounded-xl p-1 flex-shrink-0">
                              <QRCodeSVG
                                value={JSON.stringify({
                                  order_id: order.id,
                                  item_id: item.id,
                                  item_name: item.name,
                                })}
                                size={60}
                                level="L"
                              />
                            </div>
                          )}

                          <div>
                            <p className="text-xs text-muted">{item.quantity} bilet</p>
                            <p className="font-bold text-fg">
                              ₺{item.price * item.quantity}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Cancelled info */}
                  {order.status === 'cancelled' && (
                    <div className="mx-6 mb-5 flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3">
                      <svg
                        className="w-4 h-4 text-amber-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="text-xs font-bold text-amber-400">Bekleyen Geri Ödeme</p>
                        <p className="text-xs text-muted mt-0.5">
                          ₺{order.total} tutarındaki geri ödeme 3–5 iş günü içinde hesabınıza
                          aktarılacaktır.
                        </p>
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
            <p className="text-sm text-muted mb-6">
              Bu işlem geri alınamaz. Ödeme tutarı 3–5 iş günü içinde iade edilecektir.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 btn-ghost py-2.5 text-sm font-semibold"
              >
                Vazgeç
              </button>
              <button
                onClick={() => handleCancel(confirmId)}
                className="flex-1 py-2.5 text-sm font-bold rounded-pill bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Evet, İptal Et
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderHistoryPage;