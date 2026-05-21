/**
 * Admin Products Page
 * CS 308 Online Ticketing Project - TypeScript
 * Product Manager Dashboard - Event/Product management + Comment moderation
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeader } from '@/services/authService';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';
const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;

interface Event {
  id: number;
  name: string;
  category: string;
  emoji: string;
  image_url?: string;
  price: number;
  remaining_capacity: number;
  total_capacity?: number;
  is_active: boolean;
  venue: string;
  city: string;
  event_date: string;
  event_time: string;
  place_id?: string;
}

interface Comment {
  id: number;
  event_id: number;
  event_name?: string;
  user_name: string;
  content: string;
  rating: number;
  status: string;
  created_at: string;
}

const CATEGORIES = ['Konser', 'Spor', 'Tiyatro', 'Festival'];

const AdminProductsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'products' | 'comments' | 'deliveries'>('products');
  const [events, setEvents] = useState<Event[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingStock, setEditingStock] = useState<{ id: number; value: string } | null>(null);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', featured_names: '', category: 'Konser', emoji: '🎵', price: '',
    remaining_capacity: '', venue: '', city: '', event_date: '', event_time: '',
    place_id: '', image_url: '', lat: null as number | null, lng: null as number | null
  });

  const placeInputRef = React.useRef<HTMLInputElement>(null);
  const autocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    fetchEvents();
    fetchComments();
    fetchDeliveries();

    if (!GOOGLE_MAPS_API_KEY) return;

    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      setIsGoogleLoaded(true);
      return;
    }

    let existingScript = document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement;
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsGoogleLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsGoogleLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (showModal && isGoogleLoaded && placeInputRef.current) {
      autocompleteRef.current = new google.maps.places.Autocomplete(placeInputRef.current, {
        types: ['establishment', 'geocode'],
      });

      const listener = autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place) {
          let locality = '';
          if (place.address_components) {
            let locComp = place.address_components.find((c: any) => c.types.includes('locality'));
            if (!locComp) {
              locComp = place.address_components.find((c: any) => c.types.includes('administrative_area_level_1'));
            }
            if (locComp) {
              locality = locComp.long_name;
            }
          }
          setForm(p => ({
            ...p,
            venue: place.name || p.venue,
            city: locality || p.city,
            place_id: place.place_id || '',
            lat: place.geometry?.location?.lat() || null,
            lng: place.geometry?.location?.lng() || null,
          }));
        }
      });

      return () => {
        if (listener && typeof google !== 'undefined' && google.maps && google.maps.event) {
          google.maps.event.removeListener(listener);
        }
      };
    }
  }, [showModal, isGoogleLoaded]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/events`, { headers: getAuthHeader() });
      setEvents(res.data);
    } catch {
      setEvents([]);
    } finally { setLoading(false); }
  };

  const fetchComments = async () => {
    try {
      const res = await axios.get(`${API_URL}/comments/pending`, { headers: getAuthHeader() });
      setComments(res.data);
    } catch { setComments([]); }
  };

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/orders/all`, { headers: getAuthHeader() });
      setDeliveries(res.data);
    } catch {
      setDeliveries([]);
    } finally { setLoading(false); }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: 'in-transit' | 'delivered') => {
    try {
      await axios.patch(`${API_URL}/orders/${orderId}/status`, { status: nextStatus }, { headers: getAuthHeader() });
      setDeliveries(prev => prev.map(d => d.id === orderId ? { ...d, status: nextStatus } : d));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Teslimat durumu güncellenemedi.');
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (Number(form.price) < 0) return alert('Fiyat negatif olamaz.');
    if (Number(form.remaining_capacity) < 0) return alert('Stok negatif olamaz.');
    
    const eventDate = new Date(`${form.event_date}T${form.event_time}`);
    if (eventDate < new Date()) return alert('Geçmiş tarihe etkinlik eklenemez.');

    try {
      const capacity = Number(form.remaining_capacity);
      await axios.post(`${API_URL}/admin/events`, {
        ...form,
        price: Number(form.price),
        total_capacity: capacity,
        remaining_capacity: capacity
      }, { headers: getAuthHeader() });
      setShowModal(false);
      setForm({ name: '', description: '', featured_names: '', category: 'Konser', emoji: '🎵', price: '', remaining_capacity: '', venue: '', city: '', event_date: '', event_time: '', place_id: '', image_url: '', lat: null, lng: null });
      fetchEvents();
    } catch { alert('Etkinlik eklenemedi.'); }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/admin/events/${id}`, { headers: getAuthHeader() });
      setEvents(prev => prev.filter(e => e.id !== id));
      setDeleteConfirmId(null);
    } catch { alert('Silinemedi.'); }
  };

  const handleStockSave = async (id: number) => {
    if (!editingStock) return;
    if (Number(editingStock.value) < 0) return alert('Stok negatif olamaz.');
    try {
      await axios.patch(`${API_URL}/admin/events/${id}`, { remaining_capacity: Number(editingStock.value) }, { headers: getAuthHeader() });
      setEvents(prev => prev.map(e => e.id === id ? { ...e, remaining_capacity: Number(editingStock.value) } : e));
      setEditingStock(null);
    } catch { alert('Stok güncellenemedi.'); }
  };

  const handleCommentAction = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await axios.patch(`${API_URL}/comments/${id}`, { status }, { headers: getAuthHeader() });
      setComments(prev => prev.filter(c => c.id !== id));
    } catch { alert('İşlem başarısız.'); }
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl glass text-fg text-sm placeholder-muted focus:outline-none transition-all';

  return (
    <div className="min-h-screen bg-mesh">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-cta flex items-center justify-center">
            <svg className="w-4 h-4 text-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-fg">TicketHub</span>
            <span className="text-muted text-xs ml-2">/ Ürün Yönetimi</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-fg">{user?.name}</p>
            <p className="text-xs text-muted">Product Manager</p>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="btn-ghost px-4 py-1.5 text-xs font-medium">Çıkış</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-12 space-y-8">
        {/* Title */}
        <div className="animate-fade-up">
          <h1 className="text-4xl font-black text-fg tracking-tight">Ürün Yönetimi</h1>
          <p className="text-muted mt-1">Etkinlik yönetimi ve yorum moderasyonu</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'products', label: '🎟️ Etkinlikler' },
            { key: 'comments', label: `💬 Yorum Onaylama ${comments.length > 0 ? `(${comments.length})` : ''}` },
            { key: 'deliveries', label: '🚚 Teslimat Yönetimi' }
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-5 py-2.5 rounded-pill text-sm font-semibold transition-all ${tab === t.key ? 'btn-gradient' : 'btn-ghost'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* PRODUCTS TAB */}
        {tab === 'products' && (
          <div className="animate-fade-up space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{events.length} etkinlik</span>
              <button onClick={() => setShowModal(true)} className="btn-gradient px-5 py-2.5 text-sm font-bold flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Yeni Etkinlik Ekle
              </button>
            </div>

            {loading ? (
              <div className="glass rounded-2xl p-12 text-center text-muted">Yükleniyor...</div>
            ) : events.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-4xl mb-3">🎟️</p>
                <p className="text-muted">Henüz etkinlik yok</p>
              </div>
            ) : (
              <div className="glass-strong rounded-3xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['Etkinlik', 'Kategori', 'Fiyat', 'Stok', 'Durum', 'İşlem'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-muted uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {events.map((event, i) => (
                      <tr key={event.id} className="hover:bg-white/5 transition-colors animate-fade-up" style={{ animationDelay: `${i * 0.03}s` }}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {event.image_url ? (
                              <img src={event.image_url} alt={event.name} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                            ) : (
                              <span className="text-2xl">{event.emoji}</span>
                            )}
                            <div>
                              <p className="font-semibold text-fg text-sm">{event.name}</p>
                              <p className="text-xs text-muted">{event.venue}, {event.city}</p>
                              {event.place_id && GOOGLE_MAPS_API_KEY && (
                                <div className="mt-2">
                                  <iframe
                                    width="200"
                                    height="120"
                                    style={{ border: 0, borderRadius: '8px' }}
                                    loading="lazy"
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=place_id:${event.place_id}`}
                                  ></iframe>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="glass px-2.5 py-1 rounded-pill text-xs font-medium text-teal-DEFAULT border border-teal-DEFAULT/20">
                            {event.category}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-fg">₺{event.price}</td>
                        <td className="px-5 py-4">
                          {editingStock?.id === event.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={editingStock.value}
                                onChange={e => setEditingStock({ id: event.id, value: e.target.value })}
                                onKeyDown={e => { if (e.key === 'Enter') handleStockSave(event.id); if (e.key === 'Escape') setEditingStock(null); }}
                                className="w-20 px-2 py-1 rounded-lg glass text-fg text-sm focus:outline-none"
                                autoFocus
                              />
                              <button onClick={() => handleStockSave(event.id)} className="text-teal-DEFAULT text-xs font-bold">✓</button>
                            </div>
                          ) : (
                            <button onClick={() => setEditingStock({ id: event.id, value: String(event.remaining_capacity ?? 0) })}
                              className="text-sm text-fg hover:text-teal-DEFAULT transition-colors font-medium">
                              {event.remaining_capacity ?? 0}
                              <span className="text-xs text-muted ml-1">✎</span>
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill border text-xs font-semibold ${event.is_active !== false ? 'bg-teal-dim border-teal-DEFAULT/30 text-teal-DEFAULT' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${event.is_active !== false ? 'bg-teal-DEFAULT' : 'bg-red-400'}`} />
                            {event.is_active !== false ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button onClick={() => setDeleteConfirmId(event.id)}
                            className="text-xs font-semibold text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-3 py-1 rounded-pill transition-colors">
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* COMMENTS TAB */}
        {tab === 'comments' && (
          <div className="animate-fade-up space-y-4">
            {comments.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-muted">Bekleyen yorum yok</p>
              </div>
            ) : (
              comments.map((comment, i) => (
                <div key={comment.id} className="glass hover:glass-strong rounded-2xl p-6 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-teal-dim border border-teal-DEFAULT/30 flex items-center justify-center">
                          <span className="text-xs font-bold text-teal-DEFAULT">{comment.user_name?.[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-fg">{comment.user_name}</p>
                          {comment.event_name && <p className="text-xs text-muted">{comment.event_name}</p>}
                        </div>
                        <div className="flex gap-0.5 ml-2">
                          {[1, 2, 3, 4, 5].map(s => (
                            <span key={s} className={`text-sm ${s <= comment.rating ? 'text-amber-400' : 'text-muted'}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-fg leading-relaxed">{comment.content}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleCommentAction(comment.id, 'approved')}
                        className="btn-gradient px-4 py-2 text-xs font-bold">
                        Onayla
                      </button>
                      <button onClick={() => handleCommentAction(comment.id, 'rejected')}
                        className="px-4 py-2 text-xs font-bold rounded-pill bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors">
                        Reddet
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* DELIVERIES TAB */}
        {tab === 'deliveries' && (
          <div className="animate-fade-up space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{deliveries.length} teslimat / sipariş</span>
              <button onClick={fetchDeliveries} className="btn-ghost px-4 py-2 text-xs font-semibold flex items-center gap-2">
                🔄 Yenile
              </button>
            </div>

            {loading ? (
              <div className="glass rounded-2xl p-12 text-center text-muted">Yükleniyor...</div>
            ) : deliveries.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center animate-fade-up">
                <p className="text-4xl mb-3">🚚</p>
                <p className="text-muted">Henüz teslimat bulunmuyor.</p>
              </div>
            ) : (
              <div className="glass-strong rounded-3xl overflow-hidden animate-fade-up">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border">
                        {[
                          'Sipariş ID',
                          'Müşteri Bilgisi',
                          'Adres / Vergi No',
                          'Satın Alınan Ürünler',
                          'Toplam Tutar',
                          'Durum',
                          'İşlemler'
                        ].map(h => (
                          <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-muted uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {deliveries.map((del, i) => (
                        <tr key={del.id} className="hover:bg-white/5 transition-colors animate-fade-up" style={{ animationDelay: `${i * 0.03}s` }}>
                          {/* Sipariş ID */}
                          <td className="px-5 py-4 font-mono font-bold text-fg">
                            {del.id}
                          </td>
                          {/* Müşteri Bilgisi */}
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-semibold text-fg">{del.user_name || 'Bilinmeyen Müşteri'}</p>
                              <p className="text-xs text-muted font-mono">{del.user_email || 'E-posta yok'}</p>
                              <p className="text-xs text-muted-2 mt-1">ID: {del.user_id}</p>
                            </div>
                          </td>
                          {/* Adres / Vergi No */}
                          <td className="px-5 py-4 max-w-xs">
                            <p className="text-xs text-fg break-words line-clamp-2" title={del.home_address}>
                              {del.home_address || <span className="text-muted italic">Adres girilmemiş</span>}
                            </p>
                            {del.tax_id && (
                              <p className="text-xs text-teal-accent font-semibold mt-1">
                                TC/Vergi No: {del.tax_id}
                              </p>
                            )}
                          </td>
                          {/* Satın Alınan Ürünler */}
                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              {del.items && del.items.map((item: any) => (
                                <div key={item.id} className="text-xs text-fg flex items-center gap-1.5">
                                  <span className="inline-block w-4 h-4 rounded bg-teal-dim border border-teal-DEFAULT/20 text-[10px] text-teal-DEFAULT text-center font-bold">
                                    {item.quantity}
                                  </span>
                                  <span className="font-medium text-fg truncate max-w-[150px]">{item.name}</span>
                                  <span className="text-muted-2">({item.venue})</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          {/* Toplam Tutar */}
                          <td className="px-5 py-4 font-bold text-fg">
                            ₺{del.total}
                          </td>
                          {/* Durum */}
                          <td className="px-5 py-4">
                            {del.status === 'delivered' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-teal-dim border border-teal-DEFAULT/30 text-teal-DEFAULT text-xs font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-DEFAULT" />
                                Teslim Edildi
                              </span>
                            ) : del.status === 'in-transit' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                Yolda
                              </span>
                            ) : del.status === 'processing' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                Hazırlanıyor
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                {del.status || 'Bilinmiyor'}
                              </span>
                            )}
                          </td>
                          {/* İşlemler */}
                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              {del.status === 'processing' && (
                                <button
                                  onClick={() => handleUpdateStatus(del.id, 'in-transit')}
                                  className="btn-gradient px-3 py-1.5 text-xs font-bold whitespace-nowrap shadow-teal/20"
                                >
                                  🚚 Yola Çıkar
                                </button>
                              )}
                              {del.status === 'in-transit' && (
                                <button
                                  onClick={() => handleUpdateStatus(del.id, 'delivered')}
                                  className="px-3 py-1.5 text-xs font-bold rounded-pill bg-teal-DEFAULT hover:bg-teal-glow text-bg transition-all whitespace-nowrap"
                                >
                                  ✅ Teslim Et
                                </button>
                              )}
                              {(del.status === 'delivered' || del.status === 'cancelled') && (
                                <span className="text-xs text-muted italic">İşlem yok</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="glass-strong rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black text-fg mb-6">Yeni Etkinlik Ekle</h2>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">Etkinlik Adı</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Etkinlik adı" className={inputCls} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">Etkinlik Açıklaması</label>
                  <textarea required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Etkinlik hakkında detaylar" className={`${inputCls} min-h-[80px] resize-y`}></textarea>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">Kategori</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">
                    {form.category === 'Konser' ? 'Sanatçı Adı' : form.category === 'Spor' ? 'Takımlar' : form.category === 'Tiyatro' ? 'Oyuncu / Yönetmen' : form.category === 'Festival' ? 'Başlıca İsimler' : 'Öne Çıkan İsimler'}
                  </label>
                  <input required value={form.featured_names} onChange={e => setForm(p => ({ ...p, featured_names: e.target.value }))} placeholder="Örn: Tarkan, Galatasaray..." className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">Fiyat (₺)</label>
                  <input required type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="250" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">Stok</label>
                  <input required type="number" value={form.remaining_capacity} onChange={e => setForm(p => ({ ...p, remaining_capacity: e.target.value }))} placeholder="100" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">Mekan</label>
                  <input ref={placeInputRef} required value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} placeholder="Zorlu PSM" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">Şehir</label>
                  <input required value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="İstanbul" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">Tarih</label>
                  <input required type="date" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">Saat</label>
                  <input required type="time" value={form.event_time} onChange={e => setForm(p => ({ ...p, event_time: e.target.value }))} className={inputCls} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">Görsel URL</label>
                  <input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://.../event-images/gorsel.jpg" className={inputCls} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest">Emoji</label>
                  <input value={form.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))} placeholder="🎵" className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-ghost py-3 text-sm font-semibold">İptal</button>
                <button type="submit" className="flex-1 btn-gradient py-3 text-sm font-bold">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full mx-4">
            <h3 className="text-lg font-black text-fg mb-2">Etkinliği sil?</h3>
            <p className="text-sm text-muted mb-6">Bu işlem geri alınamaz.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 btn-ghost py-2.5 text-sm font-semibold">Vazgeç</button>
              <button onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2.5 text-sm font-bold rounded-pill bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors">
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductsPage;
