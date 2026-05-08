/**
 * Admin Sales Page
 * CS 308 Online Ticketing Project - TypeScript
 * Sales Manager Dashboard - Revenue chart + Invoice list
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeader } from '@/services/authService';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';

const CHART_WIDTH = 900;
const CHART_HEIGHT = 260;
const CHART_PAD = { top: 28, right: 28, bottom: 46, left: 70 };

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  date: string;
  venue: string;
}

interface Order {
  id: string;
  raw_id?: number;
  date: string;
  total: number;
  status: string;
  items: OrderItem[];
  user_email?: string;
  user_name?: string;
}

const AdminSalesPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/orders/all`, { headers: getAuthHeader() });
      setOrders(res.data);
    } catch (e) {
      console.error('Satış siparişleri yüklenemedi:', e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (dateStr: string): Date => {
    // handles "DD.MM.YYYY" and "YYYY-MM-DD"
    if (dateStr.includes('.')) {
      const [d, m, y] = dateStr.split('.');
      return new Date(`${y}-${m}-${d}`);
    }
    return new Date(dateStr);
  };

  const filtered = orders.filter(o => {
    const d = parseDate(o.date);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate)) return false;
    return true;
  });

  const normalizeStatus = (status: string): 'processing' | 'in-transit' | 'delivered' | 'cancelled' => {
    if (status === 'İptal Edildi' || status === 'cancelled') return 'cancelled';
    if (status === 'Yolda' || status === 'in-transit') return 'in-transit';
    if (status === 'Tamamlandı' || status === 'delivered') return 'delivered';
    return 'processing';
  };

  const getNextDeliveryStatus = (status: string): { next: 'in-transit' | 'delivered'; label: string } | null => {
    const normalized = normalizeStatus(status);
    if (normalized === 'processing') return { next: 'in-transit', label: 'Yola Çıkar' };
    if (normalized === 'in-transit') return { next: 'delivered', label: 'Teslim Edildi Yap' };
    return null;
  };

  const updateOrderStatus = async (order: Order, nextStatus: 'in-transit' | 'delivered') => {
    setUpdatingStatusId(order.id);
    try {
      const orderId = order.raw_id ?? order.id;
      await axios.patch(`${API_URL}/orders/${orderId}/status`, { status: nextStatus }, { headers: getAuthHeader() });
      setOrders(prev => prev.map(item => item.id === order.id ? { ...item, status: nextStatus } : item));
    } catch (error) {
      console.error('Sipariş durumu güncellenemedi:', error);
      alert('Sipariş durumu güncellenemedi.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const revenueOrders = filtered.filter(o => normalizeStatus(o.status) !== 'cancelled');
  const completedOrders = filtered.filter(o => normalizeStatus(o.status) === 'delivered');
  const cancelledOrders = filtered.filter(o => normalizeStatus(o.status) === 'cancelled');
  const completedRevenue = revenueOrders.reduce((s, o) => s + Number(o.total), 0);

  // Build chart data — group by date
  const revenueByDate: Record<string, number> = {};
  revenueOrders.forEach(o => {
    const key = o.date;
    revenueByDate[key] = (revenueByDate[key] || 0) + Number(o.total);
  });
  const chartData = Object.entries(revenueByDate)
    .sort(([a], [b]) => parseDate(a).getTime() - parseDate(b).getTime())
    .slice(-14)
    .map(([date, revenue]) => ({
      date,
      revenue,
      label: date.includes('.') ? date.slice(0, 5) : date.slice(5),
    }));

  const maxVal = Math.max(...chartData.map(point => point.revenue), 1);
  const plotWidth = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const plotHeight = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const getX = (index: number) => CHART_PAD.left + (chartData.length === 1 ? plotWidth / 2 : (index / (chartData.length - 1)) * plotWidth);
  const getY = (value: number) => CHART_PAD.top + plotHeight - (value / maxVal) * plotHeight;
  const linePoints = chartData.map((point, index) => `${getX(index)},${getY(point.revenue)}`).join(' ');
  const areaPath = chartData.length > 0
    ? `M ${getX(0)} ${CHART_PAD.top + plotHeight} L ${chartData.map((point, index) => `${getX(index)} ${getY(point.revenue)}`).join(' L ')} L ${getX(chartData.length - 1)} ${CHART_PAD.top + plotHeight} Z`
    : '';
  const yTicks = [1, 0.75, 0.5, 0.25, 0].map(ratio => ({
    y: CHART_PAD.top + plotHeight * (1 - ratio),
    value: Math.round(maxVal * ratio),
  }));

  const inputCls = 'px-4 py-2.5 rounded-xl glass text-fg text-sm placeholder-muted focus:outline-none transition-all';

  const statusCfg: Record<string, { label: string; dot: string; text: string; bg: string }> = {
    processing: { label: 'processing', dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
    'in-transit': { label: 'in-transit', dot: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
    delivered: { label: 'delivered', dot: 'bg-teal-DEFAULT', text: 'text-teal-DEFAULT', bg: 'bg-teal-dim border-teal-DEFAULT/30' },
    cancelled: { label: 'cancelled', dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  };

  return (
    <div className="min-h-screen bg-mesh">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-cta flex items-center justify-center">
            <svg className="w-4 h-4 text-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div>
            <span className="font-bold text-fg">TicketHub</span>
            <span className="text-muted text-xs ml-2">/ Satış Yönetimi</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-fg">{user?.name}</p>
            <p className="text-xs text-muted">Sales Manager</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="btn-ghost px-4 py-1.5 text-xs font-medium">
            Çıkış
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-12 space-y-8">

        {/* Page title */}
        <div className="animate-fade-up">
          <h1 className="text-4xl font-black text-fg tracking-tight">Satış Paneli</h1>
          <p className="text-muted mt-1">Gelir analizi ve fatura yönetimi</p>
        </div>

        {/* Date filter */}
        <div className="glass rounded-2xl px-6 py-4 flex flex-wrap items-center gap-4 animate-fade-up">
          <span className="text-sm font-semibold text-muted">Tarih Aralığı:</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
          <span className="text-muted text-sm">—</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-teal-DEFAULT hover:underline font-medium">
              Temizle
            </button>
          )}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
          {[
            { label: 'Toplam Gelir', value: `₺${completedRevenue.toLocaleString('tr-TR')}`, icon: '💰', accent: 'text-teal-DEFAULT' },
            { label: 'Toplam Sipariş', value: filtered.length, icon: '🎟️', accent: 'text-fg' },
            { label: 'Tamamlanan', value: completedOrders.length, icon: '✅', accent: 'text-teal-DEFAULT' },
            { label: 'İptal Edilen', value: cancelledOrders.length, icon: '❌', accent: 'text-red-400' },
          ].map(({ label, value, icon, accent }) => (
            <div key={label} className="glass-strong rounded-2xl p-5">
              <p className="text-2xl mb-2">{icon}</p>
              <p className={`text-2xl font-black ${accent}`}>{value}</p>
              <p className="text-xs text-muted mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        {chartData.length > 0 && (
          <div className="glass-strong rounded-3xl p-6 animate-fade-up">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="font-bold text-fg">Günlük Gelir Grafiği</h2>
                <p className="text-xs text-muted mt-1">İptal edilmeyen siparişlerden günlük gelir dağılımı</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">Tepe Gün</p>
                <p className="text-sm font-black text-teal-DEFAULT">₺{maxVal.toLocaleString('tr-TR')}</p>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="min-w-[760px] w-full h-[300px]" role="img" aria-label="Günlük gelir grafiği">
                <defs>
                  <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(45, 212, 191)" stopOpacity="0.36" />
                    <stop offset="100%" stopColor="rgb(45, 212, 191)" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="revenueLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgb(94, 234, 212)" />
                    <stop offset="100%" stopColor="rgb(250, 204, 21)" />
                  </linearGradient>
                </defs>

                {yTicks.map(tick => (
                  <g key={tick.y}>
                    <line
                      x1={CHART_PAD.left}
                      x2={CHART_WIDTH - CHART_PAD.right}
                      y1={tick.y}
                      y2={tick.y}
                      stroke="rgba(148, 163, 184, 0.14)"
                      strokeWidth="1"
                    />
                    <text x={CHART_PAD.left - 12} y={tick.y + 4} textAnchor="end" className="fill-slate-500 text-[11px]">
                      ₺{tick.value.toLocaleString('tr-TR')}
                    </text>
                  </g>
                ))}

                <line
                  x1={CHART_PAD.left}
                  x2={CHART_PAD.left}
                  y1={CHART_PAD.top}
                  y2={CHART_PAD.top + plotHeight}
                  stroke="rgba(148, 163, 184, 0.2)"
                />
                <line
                  x1={CHART_PAD.left}
                  x2={CHART_WIDTH - CHART_PAD.right}
                  y1={CHART_PAD.top + plotHeight}
                  y2={CHART_PAD.top + plotHeight}
                  stroke="rgba(148, 163, 184, 0.2)"
                />

                <path d={areaPath} fill="url(#revenueArea)" />
                {chartData.length > 1 ? (
                  <polyline points={linePoints} fill="none" stroke="url(#revenueLine)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <line
                    x1={CHART_PAD.left + plotWidth * 0.35}
                    x2={CHART_PAD.left + plotWidth * 0.65}
                    y1={getY(chartData[0].revenue)}
                    y2={getY(chartData[0].revenue)}
                    stroke="url(#revenueLine)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                )}

                {chartData.map((point, index) => {
                  const x = getX(index);
                  const y = getY(point.revenue);
                  return (
                    <g key={point.date}>
                      <line
                        x1={x}
                        x2={x}
                        y1={y}
                        y2={CHART_PAD.top + plotHeight}
                        stroke="rgba(45, 212, 191, 0.16)"
                        strokeDasharray="4 5"
                      />
                      <circle cx={x} cy={y} r="7" fill="rgb(17, 24, 39)" stroke="rgb(45, 212, 191)" strokeWidth="3" />
                      <circle cx={x} cy={y} r="3" fill="rgb(250, 204, 21)" />
                      <text x={x} y={y - 14} textAnchor="middle" className="fill-teal-300 text-[12px] font-bold">
                        ₺{point.revenue.toLocaleString('tr-TR')}
                      </text>
                      <text x={x} y={CHART_HEIGHT - 16} textAnchor="middle" className="fill-slate-400 text-[11px]">
                        {point.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* Invoice list */}
        <div className="animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-fg">Fatura Listesi</h2>
            <span className="text-xs text-muted">{filtered.length} sipariş</span>
          </div>

          {loading ? (
            <div className="glass rounded-2xl p-12 text-center text-muted">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-muted">Bu tarih aralığında sipariş bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((order, i) => {
                const normalizedStatus = normalizeStatus(order.status);
                const sc = statusCfg[normalizedStatus] || statusCfg.processing;
                const isExpanded = expandedId === order.id;
                const nextDeliveryStatus = getNextDeliveryStatus(order.status);
                return (
                  <div key={order.id}
                    className="glass hover:glass-strong rounded-2xl overflow-hidden transition-all animate-fade-up"
                    style={{ animationDelay: `${i * 0.04}s` }}>
                    {/* Row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left">
                      <div className="flex items-center gap-6">
                        <p className="font-mono font-bold text-fg text-sm">{order.id}</p>
                        <p className="text-sm text-muted hidden sm:block">{order.date}</p>
                        {order.user_name && (
                          <p className="text-sm text-muted hidden md:block">{order.user_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill border text-xs font-semibold ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>
                          {sc.label}
                        </span>
                        {nextDeliveryStatus && (
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              updateOrderStatus(order, nextDeliveryStatus.next);
                            }}
                            disabled={updatingStatusId === order.id}
                            className="px-3 py-1 rounded-pill text-xs font-bold btn-gradient disabled:opacity-60">
                            {updatingStatusId === order.id ? 'Güncelleniyor...' : nextDeliveryStatus.label}
                          </button>
                        )}
                        <p className="font-black text-fg">₺{Number(order.total).toLocaleString('tr-TR')}</p>
                        <svg
                          className={`w-4 h-4 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>
                    </button>

                    {/* Expanded items */}
                    {isExpanded && (
                      <div className="border-t border-border px-6 py-4 space-y-3">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div>
                              <p className="font-semibold text-fg">{item.name}</p>
                              <p className="text-xs text-muted">{item.date} · {item.venue}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted">{item.quantity} bilet</p>
                              <p className="font-bold text-fg">₺{item.price * item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminSalesPage;
