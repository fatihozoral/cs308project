/**
 * Admin Sales Page
 * CS 308 Online Ticketing Project - TypeScript
 * Sales Manager Dashboard - Revenue chart + Invoice list + Campaigns & Returns
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeader } from '@/services/authService';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';

const CHART_WIDTH = 900;
const CHART_HEIGHT = 260;
const CHART_PAD = { top: 28, right: 28, bottom: 46, left: 70 };

interface OrderItem {
  id: number;
  event_id?: number;
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
  home_address?: string;
  tax_id?: string;
}

const AdminSalesPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New states for campaigns and returns
  const [activeTab, setActiveTab] = useState<'finance' | 'discounts' | 'returns'>('finance');
  const [events, setEvents] = useState<any[]>([]);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [localDiscounts, setLocalDiscounts] = useState<Record<number, number>>({});
  const [returns, setReturns] = useState<any[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [editingPrice, setEditingPrice] = useState<{ id: number; value: string } | null>(null);

  const tr = (s: string) => s
    .replace(/ş/g,'s').replace(/Ş/g,'S')
    .replace(/ı/g,'i').replace(/İ/g,'I')
    .replace(/ğ/g,'g').replace(/Ğ/g,'G')
    .replace(/ü/g,'u').replace(/Ü/g,'U')
    .replace(/ö/g,'o').replace(/Ö/g,'O')
    .replace(/ç/g,'c').replace(/Ç/g,'C')
    .replace(/₺/g,'TL');

  const downloadInvoicePDF = async (order: Order) => {
    try {
      const qrData = JSON.stringify({ orderId: order.id, date: order.date, total: order.total });
      const qrDataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();
      pdf.setFillColor(14, 116, 144);
      pdf.rect(0, 0, W, 22, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TicketHub - Fatura', 14, 14);

      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      let y = 34;
      pdf.text(`Fatura No: ${order.id}`, 14, y); y += 6;
      pdf.text(`Tarih: ${order.date}`, 14, y); y += 6;
      if (order.user_name) { pdf.text(`Musteri: ${trText(order.user_name)}`, 14, y); y += 6; }
      if (order.user_email) { pdf.text(`E-posta: ${order.user_email}`, 14, y); y += 6; }
      if (order.tax_id) { pdf.text(`Vergi/TC No: ${order.tax_id}`, 14, y); y += 6; }
      if (order.home_address) { pdf.text(`Adres: ${trText(order.home_address)}`, 14, y, { maxWidth: W - 28 }); y += 10; }
      y += 2;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Urun', 14, y);
      pdf.text('Adet', 120, y);
      pdf.text('Birim', 140, y);
      pdf.text('Tutar', W - 14, y, { align: 'right' });
      pdf.setDrawColor(200);
      pdf.line(14, y + 2, W - 14, y + 2);
      y += 8;
      pdf.setFont('helvetica', 'normal');
      order.items.forEach(it => {
        pdf.text(trText(it.name).slice(0, 50), 14, y);
        pdf.text(String(it.quantity), 120, y);
        pdf.text(`TL${it.price}`, 140, y);
        pdf.text(`TL${it.price * it.quantity}`, W - 14, y, { align: 'right' });
        y += 7;
      });
      pdf.setDrawColor(200);
      pdf.line(14, y, W - 14, y);
      y += 9;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('TOPLAM:', 140, y);
      pdf.text(`TL${order.total}`, W - 14, y, { align: 'right' });

      // Add QR Code at the bottom
      y += 15;
      if (y + 40 > 297) {
        pdf.addPage();
        y = 20;
      }
      pdf.addImage(qrDataUrl, 'PNG', W / 2 - 20, y, 40, 40);

      pdf.save(`fatura-${order.id}.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF oluşturulurken hata oluştu.');
    }
  };

  const handlePriceSave = async (id: number) => {
    if (!editingPrice) return;
    const newPrice = Number(editingPrice.value);
    if (newPrice < 0) return alert('Fiyat negatif olamaz.');
    try {
      await axios.patch(`${API_URL}/admin/events/${id}`, { price: newPrice }, { headers: getAuthHeader() });
      setEvents(prev => prev.map(e => e.id === id ? { ...e, price: newPrice, original_price: newPrice } : e));
      setEditingPrice(null);
      alert('Fiyat başarıyla güncellendi!');
      fetchEvents();
    } catch {
      alert('Fiyat güncellenemedi.');
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchEvents();
    fetchReturns();
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

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_URL}/events`);
      setEvents(res.data);
    } catch (err) {
      console.error("Etkinlikler yüklenemedi:", err);
    }
  };

  const fetchReturns = async () => {
    setReturnsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/returns`, { headers: getAuthHeader() });
      setReturns(res.data);
    } catch (err) {
      console.error("İade talepleri yüklenemedi:", err);
      setReturns([]);
    } finally {
      setReturnsLoading(false);
    }
  };

  const handleUpdateDiscount = async (eventId: number, discountRate: number) => {
    setDiscountLoading(true);
    try {
      await axios.patch(`${API_URL}/admin/events/${eventId}/discount`, { discount_rate: discountRate }, { headers: getAuthHeader() });
      setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, discount_rate: discountRate, price: ev.original_price ? ev.original_price * (1 - discountRate/100) : ev.price } : ev));
      alert("İndirim başarıyla güncellendi ve istek listesindeki kullanıcılara bildirim gönderildi!");
      fetchEvents();
    } catch (err: any) {
      alert(err.response?.data?.detail || "İndirim güncellenemedi.");
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleApproveReturn = async (returnId: string) => {
    try {
      await axios.patch(`${API_URL}/admin/returns/${returnId}/approve`, {}, { headers: getAuthHeader() });
      setReturns(prev => prev.map(r => r.id === returnId ? { ...r, status: 'approved' } : r));
      alert("İade talebi onaylandı ve bilet kapasitesi otomatik olarak geri yüklendi!");
      fetchReturns();
    } catch (err: any) {
      alert(err.response?.data?.detail || "İade talebi onaylanamadı.");
    }
  };

  const handleRejectReturn = async (returnId: string) => {
    try {
      await axios.patch(`${API_URL}/admin/returns/${returnId}/reject`, {}, { headers: getAuthHeader() });
      setReturns(prev => prev.map(r => r.id === returnId ? { ...r, status: 'rejected' } : r));
      alert("İade talebi reddedildi.");
      fetchReturns();
    } catch (err: any) {
      alert(err.response?.data?.detail || "İade talebi reddedilemedi.");
    }
  };

  const trText = (s: string) => (s || '')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/₺/g, 'TL');



  const parseDate = (dateStr: string): Date => {
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

  const revenueOrders = filtered.filter(o => normalizeStatus(o.status) !== 'cancelled');
  const cancelledOrders = filtered.filter(o => normalizeStatus(o.status) === 'cancelled');
  const completedRevenue = revenueOrders.reduce((s, o) => s + Number(o.total), 0);

  // Etkinlik birim maliyet haritası (canlı /events verisinden)
  const costById: Record<number, number> = {};
  events.forEach((e: any) => { costById[e.id] = Number(e.cost ?? 0); });
  const orderCogs = (o: Order) =>
    o.items.reduce((s, it) => s + (costById[it.event_id ?? -1] ?? 0) * Number(it.quantity), 0);

  // Onaylanan iadeler (tarih filtresine göre) → gelirden düşülür
  const refundDate = (r: any) => (r.date || '').split(' ')[0];
  const approvedRefunds = returns.filter((r: any) => {
    if (r.status !== 'approved') return false;
    const d = parseDate(refundDate(r));
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate)) return false;
    return true;
  });
  const totalRefunds = approvedRefunds.reduce((s: number, r: any) => s + Number(r.refund_amount || 0), 0);

  const totalCogs = revenueOrders.reduce((s, o) => s + orderCogs(o), 0);
  const netRevenue = completedRevenue - totalRefunds;
  const netProfit = netRevenue - totalCogs; // negatifse zarar

  const revenueByDate: Record<string, number> = {};
  const cogsByDate: Record<string, number> = {};
  const refundByDate: Record<string, number> = {};
  revenueOrders.forEach(o => {
    revenueByDate[o.date] = (revenueByDate[o.date] || 0) + Number(o.total);
    cogsByDate[o.date] = (cogsByDate[o.date] || 0) + orderCogs(o);
  });
  approvedRefunds.forEach((r: any) => {
    const key = refundDate(r);
    refundByDate[key] = (refundByDate[key] || 0) + Number(r.refund_amount || 0);
  });
  const chartData = Object.entries(revenueByDate)
    .sort(([a], [b]) => parseDate(a).getTime() - parseDate(b).getTime())
    .slice(-14)
    .map(([date, revenue]) => ({
      date,
      revenue,
      profit: revenue - (cogsByDate[date] || 0) - (refundByDate[date] || 0),
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
  const profitLinePoints = chartData.map((point, index) => `${getX(index)},${getY(point.profit)}`).join(' ');
  const profitAreaPath = chartData.length > 0
    ? `M ${getX(0)} ${CHART_PAD.top + plotHeight} L ${chartData.map((point, index) => `${getX(index)} ${getY(point.profit)}`).join(' L ')} L ${getX(chartData.length - 1)} ${CHART_PAD.top + plotHeight} Z`
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

      <div className="max-w-7xl mx-auto px-8 py-10 space-y-10">

        {/* Tab Selector */}
        <div className="flex gap-2.5 border-b border-white/10 pb-4 animate-fade-up">
          <button
            onClick={() => setActiveTab('finance')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'finance'
                ? 'bg-gradient-cta text-bg shadow-lg shadow-teal-500/20'
                : 'btn-ghost text-muted hover:text-fg'
            }`}
          >
            📊 Finansal Analiz
          </button>
          <button
            onClick={() => setActiveTab('discounts')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'discounts'
                ? 'bg-gradient-cta text-bg shadow-lg shadow-teal-500/20'
                : 'btn-ghost text-muted hover:text-fg'
            }`}
          >
            🏷️ Kampanyalar & İndirimler
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'returns'
                ? 'bg-gradient-cta text-bg shadow-lg shadow-teal-500/20'
                : 'btn-ghost text-muted hover:text-fg'
            }`}
          >
            🔄 İade Talepleri
          </button>
        </div>

        {/* TAB 1: FINANCE */}
        {activeTab === 'finance' && (
          <div className="space-y-8 animate-fade-up">
            {/* Page title */}
            <div>
              <h1 className="text-4xl font-black text-fg tracking-tight">Satış Paneli</h1>
              <p className="text-muted mt-1">Gelir analizi ve fatura yönetimi</p>
            </div>

            {/* Date filter */}
            <div className="glass rounded-2xl px-6 py-4 flex flex-wrap items-center gap-4">
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Brüt Ciro', value: `₺${completedRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`, icon: '💰', accent: 'text-teal-DEFAULT' },
                { label: 'Toplam Maliyet', value: `₺${totalCogs.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`, icon: '📦', accent: 'text-amber-400' },
                { label: 'İadeler', value: `₺${totalRefunds.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`, icon: '↩️', accent: 'text-red-400' },
                { label: netProfit >= 0 ? 'Net Kar' : 'Net Zarar', value: `₺${netProfit.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`, icon: netProfit >= 0 ? '📈' : '📉', accent: netProfit >= 0 ? 'text-teal-accent' : 'text-red-400' },
                { label: 'Toplam Sipariş', value: filtered.length, icon: '🎟️', accent: 'text-fg' },
                { label: 'İptal Edilen', value: cancelledOrders.length, icon: '❌', accent: 'text-red-400' },
              ].map(({ label, value, icon, accent }) => (
                <div key={label} className="glass-strong rounded-2xl p-5 hover:scale-[1.02] transition-transform duration-200">
                  <p className="text-2xl mb-2">{icon}</p>
                  <p className={`text-xl font-black ${accent} truncate`}>{value}</p>
                  <p className="text-[10px] text-muted uppercase tracking-widest mt-1 font-medium">{label}</p>
                </div>
              ))}
            </div>

            {/* Revenue chart */}
            {chartData.length > 0 && (
              <div className="glass-strong rounded-3xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="font-bold text-fg text-lg">Günlük Finansal Grafik</h2>
                    <p className="text-xs text-muted mt-1">Son 14 günün ciro ve net kar dağılımı</p>
                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-xs text-fg">
                        <span className="w-3 h-1 bg-teal-DEFAULT rounded-full" />
                        <span>Ciro (Gelir)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-fg">
                        <span className="w-3 h-1 bg-violet-400 rounded-full" />
                        <span>Net Kar/Zarar</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right glass px-4 py-2 rounded-xl">
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">Tepe Gün Geliri</p>
                    <p className="text-base font-black text-teal-DEFAULT">₺{maxVal.toLocaleString('tr-TR')}</p>
                  </div>
                </div>

                <div className="w-full overflow-x-auto">
                  <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="min-w-[760px] w-full h-[300px]" role="img" aria-label="Günlük gelir ve kar grafiği">
                    <defs>
                      <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(45, 212, 191)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="rgb(45, 212, 191)" stopOpacity="0.01" />
                      </linearGradient>
                      <linearGradient id="revenueLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgb(45, 212, 191)" />
                        <stop offset="100%" stopColor="rgb(20, 184, 166)" />
                      </linearGradient>
                      <linearGradient id="profitArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0.01" />
                      </linearGradient>
                      <linearGradient id="profitLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgb(167, 139, 250)" />
                        <stop offset="100%" stopColor="rgb(139, 92, 246)" />
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

                    {/* Revenue area & line */}
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

                    {/* Profit area & line */}
                    <path d={profitAreaPath} fill="url(#profitArea)" />
                    {chartData.length > 1 ? (
                      <polyline points={profitLinePoints} fill="none" stroke="url(#profitLine)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <line
                        x1={CHART_PAD.left + plotWidth * 0.35}
                        x2={CHART_PAD.left + plotWidth * 0.65}
                        y1={getY(chartData[0].profit)}
                        y2={getY(chartData[0].profit)}
                        stroke="url(#profitLine)"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    )}

                    {chartData.map((point, index) => {
                      const x = getX(index);
                      const yRev = getY(point.revenue);
                      const yProf = getY(point.profit);
                      return (
                        <g key={point.date}>
                          <line
                            x1={x}
                            x2={x}
                            y1={yRev}
                            y2={CHART_PAD.top + plotHeight}
                            stroke="rgba(45, 212, 191, 0.12)"
                            strokeDasharray="4 5"
                          />
                          
                          {/* Revenue point & label */}
                          <circle cx={x} cy={yRev} r="6" fill="rgb(17, 24, 39)" stroke="rgb(45, 212, 191)" strokeWidth="2.5" />
                          <circle cx={x} cy={yRev} r="2.5" fill="rgb(45, 212, 191)" />
                          <text x={x} y={yRev - 12} textAnchor="middle" className="fill-teal-300 text-[10px] font-bold">
                            ₺{Math.round(point.revenue).toLocaleString('tr-TR')}
                          </text>

                          {/* Profit point & label */}
                          <circle cx={x} cy={yProf} r="6" fill="rgb(17, 24, 39)" stroke="rgb(167, 139, 250)" strokeWidth="2.5" />
                          <circle cx={x} cy={yProf} r="2.5" fill="rgb(167, 139, 250)" />
                          <text x={x} y={yProf + 16} textAnchor="middle" className="fill-violet-300 text-[10px] font-bold">
                            ₺{Math.round(point.profit).toLocaleString('tr-TR')}
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
            <div>
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
                    return (
                      <div key={order.id}
                        className="glass hover:glass-strong rounded-2xl overflow-hidden transition-all"
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
                            {order.status !== 'cancelled' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); downloadInvoicePDF(order); }}
                                className="text-[11px] font-bold text-teal-400 hover:text-teal-300 border border-teal-500/20 hover:border-teal-400/40 px-2.5 py-1 rounded-pill transition-colors flex items-center gap-1 z-10"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                PDF
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
                          <div className="border-t border-border px-6 py-4 space-y-4">
                            {/* Customer & Address Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 rounded-2xl p-4 border border-white/10 text-xs">
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-muted-2 font-semibold">Müşteri Bilgileri</p>
                                <p className="text-fg font-bold mt-1 text-sm">{order.user_name || 'Bilinmeyen Müşteri'}</p>
                                <p className="text-muted font-mono mt-0.5">{order.user_email || 'E-posta adresi yok'}</p>
                                {order.tax_id && (
                                  <p className="text-teal-accent font-semibold mt-1">TC / Vergi No: {order.tax_id}</p>
                                )}
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-muted-2 font-semibold">Teslimat Adresi</p>
                                <p className="text-fg mt-1 leading-relaxed whitespace-pre-wrap">
                                  {order.home_address || 'Adres girilmemiş'}
                                </p>
                              </div>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-3 pt-2">
                              <div className="flex items-center justify-between px-1">
                                <p className="text-[10px] uppercase tracking-widest text-muted-2 font-semibold">Satın Alınan Biletler</p>
                                <button
                                  onClick={() => downloadInvoicePDF(order)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-DEFAULT border border-teal-DEFAULT/30 hover:border-teal-DEFAULT/60 hover:bg-teal-DEFAULT/10 px-3 py-1.5 rounded-pill transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Faturayı PDF indir / yazdır
                                </button>
                              </div>
                              {order.items.map(item => (
                                <div key={item.id} className="flex items-center justify-between text-sm hover:bg-white/5 p-1 rounded-lg transition-colors">
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
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CAMPAIGNS & DISCOUNTS */}
        {activeTab === 'discounts' && (
          <div className="space-y-6 animate-fade-up">
            <div>
              <h2 className="text-2xl font-black text-fg">Kampanya & İndirim Yönetimi</h2>
              <p className="text-xs text-muted mt-1">Ürünler üzerinde indirim oranları belirleyebilir, fiyatları düşürebilirsiniz. İndirime giren ürünler istek listesine eklemiş kullanıcılara anlık bildirilecektir.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((ev) => {
                const origPrice = ev.original_price || ev.price;
                const currentDiscount = localDiscounts[ev.id] !== undefined ? localDiscounts[ev.id] : (ev.discount_rate || 0);
                const finalPrice = Math.round(origPrice * (1 - currentDiscount / 100));

                return (
                  <div key={ev.id} className="glass-strong rounded-3xl p-5 flex flex-col justify-between gap-4 border border-white/5">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-teal-DEFAULT uppercase tracking-widest">{ev.category}</span>
                        {ev.discount_rate > 0 && (
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-400/10 border border-rose-400/30 px-1.5 py-0.5 rounded-full">
                            Aktif: %{ev.discount_rate} İndirim
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-fg text-base mt-2">{ev.name}</h3>
                      <p className="text-xs text-muted mt-1">📍 {ev.venue}, {ev.city}</p>
                    </div>

                    <div className="bg-surface-2/40 border border-border/40 rounded-2xl p-3 space-y-2">
                      <div className="flex justify-between items-center h-8">
                        <span className="text-xs text-muted">Orijinal Fiyat:</span>
                        {editingPrice?.id === ev.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={editingPrice?.value || ''}
                              onChange={e => setEditingPrice({ id: ev.id, value: e.target.value })}
                              onKeyDown={e => { if (e.key === 'Enter') handlePriceSave(ev.id); if (e.key === 'Escape') setEditingPrice(null); }}
                              className="w-16 px-1.5 py-0.5 rounded-lg glass text-fg text-xs focus:outline-none"
                              autoFocus
                            />
                            <button onClick={() => handlePriceSave(ev.id)} className="text-teal-DEFAULT text-xs font-bold">✓</button>
                            <button onClick={() => setEditingPrice(null)} className="text-red-400 text-xs font-bold">✗</button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingPrice({ id: ev.id, value: String(origPrice) })}
                            className="text-sm font-semibold text-fg hover:text-teal-DEFAULT transition-colors flex items-center gap-1"
                            title="Fiyatı Güncelle"
                          >
                            ₺{origPrice} <span className="text-[10px] text-muted">✎</span>
                          </button>
                        )}
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-muted">İndirim Oranı:</span>
                        <span className="text-sm font-black text-rose-400">%{currentDiscount}</span>
                      </div>
                      <div className="flex justify-between items-baseline border-t border-white/5 pt-2">
                        <span className="text-xs text-muted">Yeni Satış Fiyatı:</span>
                        <span className="text-base font-black text-teal-DEFAULT">₺{finalPrice}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted">
                          <span>%0</span>
                          <span>%90</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="90"
                          step="5"
                          value={currentDiscount}
                          onChange={(e) => setLocalDiscounts(prev => ({ ...prev, [ev.id]: Number(e.target.value) }))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                      </div>

                      <button
                        onClick={() => handleUpdateDiscount(ev.id, currentDiscount)}
                        disabled={discountLoading || currentDiscount === ev.discount_rate}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                          currentDiscount === ev.discount_rate
                            ? 'bg-white/5 border border-white/10 text-muted cursor-not-allowed'
                            : 'btn-gradient shadow-md'
                        }`}
                      >
                        {discountLoading ? "Güncelleniyor..." : "İndirimi Uygula"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: RETURN REQUESTS */}
        {activeTab === 'returns' && (
          <div className="space-y-6 animate-fade-up">
            <div>
              <h2 className="text-2xl font-black text-fg">İade Talepleri</h2>
              <p className="text-xs text-muted mt-1">Müşterilerden gelen bilet iade ve geri ödeme (refund) taleplerini onaylayabilir veya reddedebilirsiniz. Onaylanan taleplerin kapasiteleri otomatik olarak ilgili kategoriye geri yüklenir.</p>
            </div>

            {returnsLoading ? (
              <div className="glass rounded-2xl p-12 text-center text-muted">Yükleniyor...</div>
            ) : returns.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center text-muted">
                <p className="text-4xl mb-3">🔄</p>
                <p>Bekleyen veya geçmiş herhangi bir iade talebi bulunmuyor.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {returns.map((ret) => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
                    approved: 'bg-teal-dim border-teal-DEFAULT/30 text-teal-DEFAULT',
                    rejected: 'bg-red-500/10 border-red-500/30 text-red-400'
                  };
                  const statusLabels: Record<string, string> = {
                    pending: 'Bekliyor',
                    approved: 'Onaylandı',
                    rejected: 'Reddedildi'
                  };

                  return (
                    <div key={ret.id} className="glass-strong rounded-3xl p-6 border border-white/5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono font-bold text-fg text-sm">{ret.order_id}</span>
                          <span className="text-xs text-muted">📅 {ret.date}</span>
                          <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${statusColors[ret.status] || 'text-muted'}`}>
                            {statusLabels[ret.status] || ret.status}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted uppercase font-semibold">Geri Ödenecek Tutar</p>
                          <p className="font-black text-rose-400 text-lg">₺{ret.refund_amount}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted uppercase font-semibold">Müşteri</p>
                          <p className="font-bold text-fg">{ret.user_name}</p>
                          <p className="text-muted font-mono">{ret.user_email}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted uppercase font-semibold">Etkinlik & Kategori</p>
                          <p className="font-bold text-fg">{ret.event_name}</p>
                          <p className="text-teal-DEFAULT font-semibold">{ret.category}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted uppercase font-semibold">İade Miktarı & Sebebi</p>
                          <p className="font-bold text-fg">{ret.quantity} bilet (Birim: ₺{ret.price})</p>
                          <p className="text-muted italic">"{ret.reason || 'Sebep belirtilmemiş'}"</p>
                        </div>
                      </div>

                      {ret.status === 'pending' && (
                        <div className="flex gap-3 pt-2 border-t border-white/5">
                          <button
                            onClick={() => handleRejectReturn(ret.id)}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                          >
                            Talebi Reddet
                          </button>
                          <button
                            onClick={() => handleApproveReturn(ret.id)}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold btn-gradient transition-all"
                          >
                            Talebi Onayla & Ücreti İade Et
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminSalesPage;
