import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { getAuthHeader } from '@/services/authService';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';

interface CartItem { id: number; cartItemId?: string | number; name: string; price: number; date: string; venue: string; quantity: number; category?: string; }

interface OrderResult { id: string; date: string; total: number; invoiceEmailSent?: boolean; }

interface CardLogoProps {
  type: string | null;
  className?: string;
}

const CardLogo: React.FC<CardLogoProps> = ({ type, className = "" }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [type]);

  if (!type) {
    return <span className={`font-black italic text-white/90 drop-shadow-md ${className}`}>TICKET</span>;
  }

  if (hasError) {
    return <span className={`font-black italic text-white/90 drop-shadow-md ${className}`}>{type}</span>;
  }

  return (
    <img 
      src={`/cards/${type.toLowerCase()}.png`} 
      alt={`${type} Logo`} 
      className={`object-contain ${className}`}
      onError={() => setHasError(true)}
    />
  );
};

const CartPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>(() => { try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; } });
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState(user?.name || '');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});
  const [isFlipped, setIsFlipped] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<CartItem[]>([]);

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const updateQty = (uid: string | number, d: number) => setCart(prev => prev.map(i => (i.cartItemId || i.id) === uid ? { ...i, quantity: i.quantity + d } : i).filter(i => i.quantity > 0));
  const remove = (uid: string | number) => setCart(prev => prev.filter(i => (i.cartItemId || i.id) !== uid));
  const fmtCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const fmtExpiry = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length >= 3 ? d.slice(0, 2) + '/' + d.slice(2) : d; };

  const getCardType = (numStr: string) => {
    const num = numStr.replace(/\D/g, '');
    if (/^4/.test(num)) return 'Visa';
    if (/^5[1-5]/.test(num) || /^2(?:2(?:2[1-9]|[3-9]\d)|[3-6]\d\d|7(?:[01]\d|20))/.test(num)) return 'Mastercard';
    if (/^3[47]/.test(num)) return 'Amex';
    if (/^9792/.test(num)) return 'Troy';
    return null;
  };

  const luhnCheck = (val: string) => {
    let sum = 0;
    for (let i = 0; i < val.length; i++) {
      let intVal = parseInt(val.substr(i, 1));
      if (i % 2 === val.length % 2) {
        intVal *= 2;
        if (intVal > 9) intVal = 1 + (intVal % 10);
      }
      sum += intVal;
    }
    return (sum % 10) === 0;
  };

  const validatePayment = () => {
    const errs: Record<string, string> = {};
    const num = cardNumber.replace(/\D/g, '');
    
    if (!/^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/.test(cardName) || cardName.trim().length < 3) {
      errs.cardName = 'Geçerli bir isim giriniz (sadece harf).';
    }

    if (num.length < 15 || num.length > 16 || !luhnCheck(num)) {
      errs.cardNumber = 'Geçerli bir kart numarası giriniz.';
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      errs.expiry = 'Geçerli AA/YY giriniz.';
    } else {
      const [mm, yy] = expiry.split('/');
      const month = parseInt(mm, 10);
      const year = parseInt('20' + yy, 10);
      const now = new Date();
      if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
        errs.expiry = 'Tarih geçmiş olamaz.';
      }
    }

    const isAmex = getCardType(cardNumber) === 'Amex';
    const cvvLength = isAmex ? 4 : 3;
    if (cvv.length !== cvvLength || cvv === '000' || cvv === '0000') {
      errs.cvv = `Geçersiz CVV (${cvvLength} hane).`;
    }

    setPaymentErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePayment()) return;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent('/cart')}`);
      return;
    }
    setLoading(true);
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
      setPurchasedItems([...cart]);
      setOrderResult({ id: res.data.id, date: res.data.date, total: subtotal, invoiceEmailSent: res.data.invoice_email_sent });
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

  const inputCls = (err?: string) => `w-full px-4 py-3.5 rounded-2xl glass text-fg text-sm placeholder-muted focus:outline-none transition-all ${err ? 'border border-red-500/40' : 'focus:border-teal-accent'}`;

  const tr = (s: string) => s
    .replace(/ş/g,'s').replace(/Ş/g,'S')
    .replace(/ı/g,'i').replace(/İ/g,'I')
    .replace(/ğ/g,'g').replace(/Ğ/g,'G')
    .replace(/ü/g,'u').replace(/Ü/g,'U')
    .replace(/ö/g,'o').replace(/Ö/g,'O')
    .replace(/ç/g,'c').replace(/Ç/g,'C')
    .replace(/₺/g,'TL');

  const downloadInvoicePDF = async () => {
    if (!orderResult || purchasedItems.length === 0) return;
    const qrData = JSON.stringify({ orderId: orderResult.id, date: orderResult.date, total: orderResult.total });
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const W = pdf.internal.pageSize.getWidth();
    pdf.setFillColor(22, 27, 34);
    pdf.rect(0, 0, W, 210, 'F');
    pdf.setFillColor(14, 116, 144);
    pdf.rect(0, 0, W, 18, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TicketHub - Fatura', W / 2, 11, { align: 'center' });
    pdf.setTextColor(240, 246, 252);
    pdf.setFontSize(13);
    pdf.text('Siparis Faturasi', W / 2, 30, { align: 'center' });
    pdf.setDrawColor(45, 212, 191);
    pdf.setLineWidth(0.3);
    pdf.line(15, 35, W - 15, 35);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    let y = 44;
    purchasedItems.forEach(item => {
      pdf.setTextColor(100, 116, 139);
      pdf.text(tr(item.name), 15, y);
      pdf.setTextColor(240, 246, 252);
      pdf.text(`${item.quantity} x TL${item.price} = TL${item.quantity * item.price}`, W - 15, y, { align: 'right' });
      y += 8;
    });
    pdf.setDrawColor(45, 212, 191);
    pdf.line(15, y, W - 15, y);
    y += 7;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(45, 212, 191);
    pdf.text('TOPLAM:', 15, y);
    pdf.text(`TL${orderResult.total}`, W - 15, y, { align: 'right' });
    y += 12;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Siparis No: ${orderResult.id}`, 15, y);
    pdf.text(`Tarih: ${orderResult.date}`, W - 15, y, { align: 'right' });
    y += 7;
    if (user?.email) { pdf.text(`Musteri: ${user.email}`, 15, y); y += 7; }
    pdf.addImage(qrDataUrl, 'PNG', W / 2 - 22, y + 5, 44, 44);
    pdf.setFillColor(14, 116, 144);
    pdf.rect(0, 195, W, 15, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.text('tickethub.com', W / 2, 204, { align: 'center' });
    pdf.save(`fatura-${orderResult.id}.pdf`);
  };

  if (success) return (
    <div className="min-h-screen bg-mesh pt-20">
      <Navbar cartCount={0}/>
      <div className="max-w-xl mx-auto px-8 py-16 animate-fade-up">
        <div className="glass-strong rounded-3xl overflow-hidden">
          {/* Header */}
          <div className="bg-teal-DEFAULT/20 border-b border-teal-DEFAULT/20 px-8 py-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-dim border border-teal-DEFAULT/40 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-teal-DEFAULT" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-fg">Ödeme Başarılı!</h2>
              <p className="text-teal-DEFAULT text-sm font-semibold">Siparişiniz alındı</p>
            </div>
          </div>

          {/* Invoice body */}
          <div className="px-8 py-6 space-y-1">
            <div className="flex justify-between text-xs text-muted mb-4">
              <span>Sipariş No: <span className="text-fg font-bold">{orderResult?.id}</span></span>
              <span>{orderResult?.date}</span>
            </div>

            <div className="space-y-3">
              {purchasedItems.map(item => (
                <div key={item.cartItemId || item.id} className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-semibold text-fg text-sm">{item.name}</p>
                    <p className="text-xs text-muted">{item.date} · {item.venue}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-muted">{item.quantity} bilet × ₺{item.price}</p>
                    <p className="font-black text-fg">₺{item.quantity * item.price}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4">
              <span className="font-black text-fg text-lg">Toplam</span>
              <span className="font-black text-teal-DEFAULT text-2xl">₺{orderResult?.total}</span>
            </div>

            {orderResult?.invoiceEmailSent ? (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted bg-teal-DEFAULT/5 border border-teal-DEFAULT/20 rounded-2xl px-4 py-3">
                <svg className="w-4 h-4 text-teal-DEFAULT flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                Fatura PDF'i <strong className="text-fg mx-1">{user?.email}</strong> adresine gönderildi.
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted bg-amber-500/5 border border-amber-500/20 rounded-2xl px-4 py-3">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Faturanızı aşağıdaki butondan PDF olarak indirebilirsiniz.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-8 py-6 border-t border-border flex flex-col sm:flex-row gap-3">
            <button onClick={downloadInvoicePDF} className="btn-gradient px-6 py-3 text-sm font-bold flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              PDF Fatura İndir
            </button>
            <Link to="/orders" className="btn-ghost px-6 py-3 text-sm font-semibold text-center">Siparişlerimi Gör</Link>
            <Link to="/events" className="btn-ghost px-6 py-3 text-sm font-semibold text-center">Alışverişe Devam</Link>
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
            {user ? (
            <form onSubmit={handleSubmit} className="glass-strong rounded-3xl p-6 space-y-4">
              <h2 className="font-bold text-fg mb-2">Ödeme Bilgileri</h2>

              <div style={{ perspective: '1000px' }} className="relative w-full h-48 sm:h-56 rounded-2xl mb-8 mt-2 group">
                <div style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }} className="w-full h-full relative transition-transform duration-700 ease-in-out">
                  {/* Front */}
                  <div style={{ backfaceVisibility: 'hidden' }} className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-teal-900 via-slate-900 to-teal-800 p-6 flex flex-col justify-between overflow-hidden shadow-2xl border border-teal-DEFAULT/30">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
                    <div className="absolute top-[-50%] right-[-20%] w-64 h-64 bg-teal-DEFAULT/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-[-20%] left-[-20%] w-48 h-48 bg-teal-accent/10 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start relative z-10">
                      <svg className="w-10 h-10 text-amber-300/80 drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h3v3H8V8zm5 0h3v3h-3V8zm-5 5h3v3H8v-3zm5 0h3v3h-3v-3z"/>
                      </svg>
                      <CardLogo type={getCardType(cardNumber)} className="h-8 text-2xl" />
                    </div>
                    <div className="relative z-10 mt-auto">
                      <p className="font-mono text-xl sm:text-2xl text-white tracking-widest drop-shadow-md mb-3">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </p>
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-white/50 uppercase tracking-widest font-semibold mb-0.5">Kart Sahibi</span>
                          <span className="text-sm font-semibold text-white uppercase tracking-wider truncate max-w-[160px]">
                            {cardName || 'AD SOYAD'}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] text-white/50 uppercase tracking-widest font-semibold mb-0.5">Son Kullanma</span>
                          <span className="text-sm font-semibold text-white tracking-widest">
                            {expiry || 'AA/YY'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Back */}
                  <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-slate-900 to-gray-900 flex flex-col overflow-hidden shadow-2xl border border-white/10">
                    <div className="w-full h-10 sm:h-12 bg-black/80 mt-6 shadow-inner"></div>
                    <div className="px-6 mt-4">
                      <div className="w-full h-10 bg-white/10 rounded-lg flex items-center justify-end px-4 backdrop-blur-md border border-white/5">
                        <span className="font-mono text-white text-lg tracking-widest">{cvv || '•••'}</span>
                      </div>
                    </div>
                    <div className="px-6 mt-auto mb-4 text-white/30 text-[8px] uppercase tracking-widest text-center leading-relaxed">
                      Yetkisiz kullanım yasadışıdır.<br/>Bu kart TicketHub test ortamı için sağlanmıştır.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-widest">Kart Sahibi</label>
                <input type="text" value={cardName} onChange={e => { setCardName(e.target.value); setPaymentErrors(p => ({ ...p, cardName: '' })); }} required placeholder="Ad Soyad" className={inputCls(paymentErrors.cardName)}/>
                {paymentErrors.cardName && <p className="text-xs text-red-400">{paymentErrors.cardName}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-widest">Kart Numarası</label>
                <div className="relative">
                  <input type="text" value={cardNumber} onChange={e => { setCardNumber(fmtCard(e.target.value)); setPaymentErrors(p => ({ ...p, cardNumber: '' })); }} maxLength={19} required placeholder="0000 0000 0000 0000" className={inputCls(paymentErrors.cardNumber) + ' font-mono tracking-wider pr-16'}/>
                  {getCardType(cardNumber) && (
                    <div className="absolute right-3 top-2.5 flex items-center justify-center pointer-events-none">
                      <CardLogo type={getCardType(cardNumber)} className="h-6 text-teal-DEFAULT text-lg" />
                    </div>
                  )}
                </div>
                {paymentErrors.cardNumber && <p className="text-xs text-red-400">{paymentErrors.cardNumber}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">Son Kullanma</label>
                  <input type="text" value={expiry} onChange={e => { setExpiry(fmtExpiry(e.target.value)); setPaymentErrors(p => ({ ...p, expiry: '' })); }} maxLength={5} required placeholder="AA/YY" className={inputCls(paymentErrors.expiry)}/>
                  {paymentErrors.expiry && <p className="text-xs text-red-400">{paymentErrors.expiry}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">CVV</label>
                  <input type="text" value={cvv} onChange={e => { setCvv(e.target.value.replace(/\D/g, '').slice(0, getCardType(cardNumber) === 'Amex' ? 4 : 3)); setPaymentErrors(p => ({ ...p, cvv: '' })); }} onFocus={() => setIsFlipped(true)} onBlur={() => setIsFlipped(false)} maxLength={getCardType(cardNumber) === 'Amex' ? 4 : 3} required placeholder={getCardType(cardNumber) === 'Amex' ? "••••" : "•••"} className={inputCls(paymentErrors.cvv)}/>
                  {paymentErrors.cvv && <p className="text-xs text-red-400">{paymentErrors.cvv}</p>}
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
            ) : (
              <div className="glass-strong rounded-3xl p-6 space-y-4">
                <h2 className="font-bold text-fg">Ödemeye Devam Et</h2>
                <p className="text-sm text-muted leading-relaxed">
                  Sepetini giriş yapmadan hazırlayabilirsin. Ödeme ve sipariş oluşturma aşamasında hesabına giriş yapman gerekiyor.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/login?redirect=${encodeURIComponent('/cart')}`)}
                  className="btn-gradient w-full px-6 py-3.5 text-sm font-bold">
                  Giriş Yap ve Checkout'a Devam Et
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
