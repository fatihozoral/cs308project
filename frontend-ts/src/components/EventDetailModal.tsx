/**
 * EventDetailModal
 * CS 308 Online Ticketing Project - TypeScript
 * Shows event details, approved comments, and allows adding new comment/rating
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeader } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';

interface Comment {
  id: number;
  user_name: string;
  content: string;
  rating: number;
  created_at: string;
}

interface Event {
  id: number;
  name: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  price: number;
  emoji: string;
  accent: string;
}

interface Props {
  event: Event | null;
  onClose: () => void;
  onAddToCart: (event: Event) => void;
  isInCart: boolean;
}

const StarRating: React.FC<{ value: number; onChange?: (v: number) => void; readonly?: boolean }> = ({ value, onChange, readonly }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(s => (
      <button
        key={s}
        type="button"
        disabled={readonly}
        onClick={() => onChange?.(s)}
        className={`text-xl transition-transform ${!readonly ? 'hover:scale-125 cursor-pointer' : 'cursor-default'} ${s <= value ? 'text-amber-400' : 'text-muted'}`}
      >
        ★
      </button>
    ))}
  </div>
);

const EventDetailModal: React.FC<Props> = ({ event, onClose, onAddToCart, isInCart }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!event) return;
    setLoadingComments(true);
    setSubmitted(false);
    setContent('');
    setRating(5);
    axios.get(`${API_URL}/comments/event/${event.id}`, { headers: getAuthHeader() })
      .then(res => setComments(res.data))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [event]);

  if (!event) return null;

  const avgRating = comments.length
    ? (comments.reduce((s, c) => s + c.rating, 0) / comments.length).toFixed(1)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/comments`, {
        event_id: event.id,
        content: content.trim(),
        rating
      }, { headers: getAuthHeader() });
      setSubmitted(true);
      setContent('');
      setRating(5);
    } catch {
      alert('Yorum gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="glass-strong rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Cover */}
        <div className={`h-40 bg-gradient-to-br ${event.accent} flex items-center justify-center text-7xl relative rounded-t-3xl overflow-hidden`}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 70%)' }}/>
          {event.emoji}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 glass rounded-full flex items-center justify-center text-fg hover:glass-strong transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-7 space-y-6">
          {/* Event info */}
          <div>
            <span className="text-[10px] font-bold text-teal-DEFAULT uppercase tracking-widest">{event.category}</span>
            <h2 className="text-2xl font-black text-fg mt-1">{event.name}</h2>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted">
              <span>📅 {event.date} · {event.time}</span>
              <span>📍 {event.venue}, {event.city}</span>
            </div>
            {avgRating && (
              <div className="flex items-center gap-2 mt-2">
                <StarRating value={Math.round(Number(avgRating))} readonly />
                <span className="text-sm font-bold text-amber-400">{avgRating}</span>
                <span className="text-xs text-muted">({comments.length} yorum)</span>
              </div>
            )}
          </div>

          {/* Price + Add to cart */}
          <div className="flex items-center justify-between glass rounded-2xl px-5 py-4">
            <div>
              <p className="text-xs text-muted font-medium mb-0.5">Bilet Fiyatı</p>
              <p className="text-3xl font-black text-fg">₺{event.price}</p>
            </div>
            <button
              onClick={() => { onAddToCart(event); onClose(); }}
              className={`px-6 py-3 rounded-pill text-sm font-bold transition-all ${isInCart ? 'glass border border-teal-DEFAULT/40 text-teal-DEFAULT' : 'btn-gradient'}`}
            >
              {isInCart ? '✓ Sepette' : 'Sepete Ekle'}
            </button>
          </div>

          {/* Comments */}
          <div>
            <h3 className="font-bold text-fg mb-4">Yorumlar</h3>
            {loadingComments ? (
              <p className="text-muted text-sm">Yükleniyor...</p>
            ) : comments.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-muted text-sm">Henüz onaylanmış yorum yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="glass rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-dim border border-teal-DEFAULT/30 flex items-center justify-center">
                          <span className="text-xs font-bold text-teal-DEFAULT">{c.user_name?.[0]?.toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-semibold text-fg">{c.user_name}</span>
                      </div>
                      <StarRating value={c.rating} readonly />
                    </div>
                    <p className="text-sm text-muted leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add comment */}
          <div className="border-t border-border pt-6">
            <h3 className="font-bold text-fg mb-4">Yorum Yap</h3>
            {submitted ? (
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm text-teal-DEFAULT font-semibold">Yorumunuz incelemeye alındı!</p>
                <p className="text-xs text-muted mt-1">Onaylandıktan sonra görünecek.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest mb-2 block">Puanın</label>
                  <StarRating value={rating} onChange={setRating} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-widest mb-2 block">Yorumun</label>
                  <textarea
                    required
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Bu etkinlik hakkında ne düşünüyorsun?"
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl glass text-fg text-sm placeholder-muted focus:outline-none transition-all resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="btn-gradient w-full py-3 text-sm font-bold disabled:opacity-50"
                >
                  {submitting ? 'Gönderiliyor...' : 'Yorum Gönder'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;
