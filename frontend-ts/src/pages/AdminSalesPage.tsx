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

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/orders/all`, { headers: getAuthHeader() });
      setOrders(res.data);
    } catch (e) {
      // fallback: fetch own orders if /all not available yet
      try {
        const res = await axios.get(`${API_URL}/orders`, { headers: getAuthHeader() });
        setOrders(res.data);
      } catch {
        setOrders([]);
      }
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

  const totalRevenue = filtered.reduce((s, o) => s + Number(o.total), 0);
  const completedOrders = filtered.filter(o => o.status === 'Tamamlandı');
  const cancelledOrders = filtered.filter(o => o.status === 'İptal Edildi');
  const completedRevenue = completedOrders.reduce((s, o) => s + Number(o.total), 0);

  // Build chart data — group by date
  const revenueByDate: Record<string, number> = {};
  filtered.forEach(o => {
    const key = o.date;
    revenueByDate[key] = (revenueByDate[key] || 0) + Number(o.total);
  });
  const chartData = Object.entries(revenueByDate)
    .sort(([a], [b]) => parseDate(a).getTime() - parseDate(b).getTime())
    .slice(-14); // last 14 days

  const maxVal = Math.max(...chartData.map(([, v]) => v), 1);

  const inputCls = 'px-4 py-2.5 rounded-xl glass text-fg text-sm placeholder-muted focus:outline-none transition-all';

  const statusCfg: Record<string, { dot: string; text: string; bg: string }> = {
    'Tamamlandı': { dot: 'bg-teal-DEFAULT', text: 'text-teal-DEFAULT', bg: 'bg-teal-dim border-teal-DEFAULT/30' },
    'İptal Edildi': { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
    'Beklemede':   { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
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
            <h2 className="font-bold text-fg mb-6">Günlük Gelir Grafiği</h2>
            <div className="flex items-end gap-2 h-40">
              {chartData.map(([date, val]) => (
                <div key={date} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-[10px] text-teal-DEFAULT font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    ₺{val.toLocaleString('tr-TR')}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-teal-DEFAULT/60 to-teal-DEFAULT transition-all group-hover:from-teal-DEFAULT/80 group-hover:to-teal-DEFAULT"
                    style={{ height: `${Math.max((val / maxVal) * 100, 4)}%` }}
                  />
                  <span className="text-[9px] text-muted rotate-45 origin-left mt-1 w-8 truncate">
                    {date.slice(0, 5)}
                  </span>
                </div>
              ))}
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
                const sc = statusCfg[order.status] || statusCfg['Beklemede'];
                const isExpanded = expandedId === order.id;
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
                          {order.status}
                        </span>
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
