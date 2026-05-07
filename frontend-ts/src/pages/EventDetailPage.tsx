import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import axios from 'axios';
import { getAuthHeader } from '@/services/authService';
import InteractiveSeatMap from '@/components/InteractiveSeatMap';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';
const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;

interface TicketCategory {
  name: string;
  price: number;
  capacity: number;
  remaining: number;
}

interface EventDetail {
  id: number;
  name: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  price: number;
  emoji: string;
  image_url?: string;
  description?: string;
  total_capacity?: number;
  remaining_capacity?: number;
  ticket_categories?: TicketCategory[] | null;
  place_id?: string;
  lat?: number;
  lng?: number;
  featured_names?: string;
}

const EventDetailPage: React.FC = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; } });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        // Veri doğrudan Backend API ve Supabase'den gelir
        const response = await axios.get(`${API_URL}/events/${eventId}`, { headers: getAuthHeader() });
        setEvent(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (eventId) fetchDetail();
  }, [eventId]);

  const handleAddToCart = () => {
    if (!event) return;

    let rem = event.remaining_capacity;
    let price = event.price;
    let catName: string | undefined = undefined;

    if (event.ticket_categories && event.ticket_categories.length > 0) {
      if (!selectedCategory) {
        alert("Lütfen bir bilet kategorisi seçin");
        return;
      }
      rem = selectedCategory.remaining;
      price = selectedCategory.price;
      catName = selectedCategory.name;
    }

    if (rem !== undefined && rem <= 0) {
      alert('Bu etkinlik için biletler tükendi.');
      return;
    }

    if (rem !== undefined && quantity > rem) {
      alert(`Bu kategori/etkinlik için sadece ${rem} bilet kaldı! Lütfen adedi düşürün.`);
      return;
    }

    const cartItemId = catName ? `${event.id}-${catName}` : event.id;
    let updatedCart = [...cart];

    const exIdx = updatedCart.findIndex(i => (i.cartItemId || i.id) === cartItemId);

    if (exIdx >= 0) {
      // Check if new total quantity exceeds remaining real db constraint
      if (rem !== undefined && (updatedCart[exIdx].quantity + quantity) > rem) {
        alert(`Sepetinizdeki bu bilet miktarı kalan rezerv limitini aşıyor (Kalan: ${rem})`);
        return;
      }
      updatedCart[exIdx].quantity += quantity;
    } else {
      updatedCart.push({
        id: event.id,
        cartItemId,
        name: catName ? `${event.name} (${catName})` : event.name,
        price,
        date: event.date,
        venue: event.venue,
        quantity,
        category: catName
      });
    }

    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    navigate('/cart');
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  if (loading) return <div className="min-h-screen bg-mesh pt-20"><Navbar cartCount={cartCount} /><div className="flex justify-center items-center h-[50vh]">Yükleniyor...</div></div>;
  if (!event) return <div className="min-h-screen bg-mesh pt-20"><Navbar cartCount={cartCount} /><div className="flex justify-center items-center h-[50vh]">Etkinlik bulunamadı.</div></div>;

  const hasCategories = Boolean(event.ticket_categories && event.ticket_categories.length > 0);
  const isInteractive = (event.category === 'Spor' || event.category === 'Konser') && hasCategories;
  const totalRemaining = event.remaining_capacity ?? event.ticket_categories?.reduce((sum, cat) => sum + cat.remaining, 0);
  const soldOut = totalRemaining !== undefined && totalRemaining <= 0;
  const selectedRemaining = hasCategories ? selectedCategory?.remaining : totalRemaining;
  const addDisabled = soldOut || (hasCategories && !selectedCategory) || (selectedRemaining !== undefined && selectedRemaining <= 0);
  const availabilityClass = soldOut
    ? 'bg-red-500/10 border-red-400/40 text-red-300'
    : totalRemaining !== undefined && totalRemaining <= 10
      ? 'bg-amber-500/10 border-amber-400/40 text-amber-300'
      : 'bg-teal-DEFAULT/10 border-teal-DEFAULT/30 text-teal-DEFAULT';

  return (
    <div className="min-h-screen bg-mesh pt-20">
      <Navbar cartCount={cartCount} />
      <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-up">

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row gap-6 items-start mb-8 p-8 glass-strong rounded-3xl border border-white/5 relative overflow-hidden">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center text-4xl shadow-lg border border-white/10 z-10 flex-shrink-0">
            {event.image_url ? (
              <img src={event.image_url} alt={event.name} className="w-full h-full object-cover rounded-2xl" />
            ) : event.emoji}
          </div>
          <div className="flex-1 z-10">
            <span className="text-[10px] font-bold tracking-widest uppercase text-teal-DEFAULT bg-teal-DEFAULT/10 px-3 py-1 rounded-full">{event.category}</span>
            <h1 className="text-4xl font-black text-fg mt-3 mb-2">{event.name}</h1>
            <div className="flex flex-wrap gap-4 text-muted text-sm mt-3">
              <div className="flex items-center gap-2"><span>📅</span> {event.date} · {event.time}</div>
              <div className="flex items-center gap-2"><span>📍</span> {event.venue}, {event.city}</div>
            </div>
            {totalRemaining !== undefined && (
              <div className={`mt-5 inline-flex items-center gap-3 rounded-2xl border px-4 py-3 ${availabilityClass}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${soldOut ? 'bg-red-400' : totalRemaining <= 10 ? 'bg-amber-300' : 'bg-teal-DEFAULT'}`} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Bilet Durumu</p>
                  <p className="text-sm font-black">{soldOut ? 'Tükendi' : `${totalRemaining} bilet kaldı`}</p>
                </div>
              </div>
            )}
            </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Left Cover / Interactive Map */}
          <div className={`overflow-hidden rounded-3xl relative shadow-2xl border border-white/5 bg-slate-950 ${isInteractive ? 'lg:w-7/12' : 'lg:w-1/3'}`}>
            {isInteractive ? (
              <div className="w-full h-[600px]">
                <InteractiveSeatMap
                  categories={event.ticket_categories!}
                  selectedCategoryName={selectedCategory?.name || null}
                  onCategoryClick={(catName) => {
                    if (!catName) {
                      setSelectedCategory(null);
                    } else {
                      const cat = event.ticket_categories?.find(c => c.name === catName);
                      if (cat) setSelectedCategory(cat);
                    }
                  }}
                  eventType={event.category}
                />
              </div>
            ) : (
              <div className="z-10 flex flex-col items-center justify-center p-8 h-full glass-strong">
                {event.image_url ? (
                  <img src={event.image_url} alt={event.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : null}
                {event.image_url && <div className="absolute inset-0 bg-black/45" />}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
                {!event.image_url && <div className="text-8xl drop-shadow-2xl mb-6 scale-125 z-10">{event.emoji}</div>}
                <span className="text-lg font-black tracking-widest uppercase text-teal-DEFAULT opacity-80 z-10">{event.category}</span>
              </div>
            )}
          </div>

          {/* Right / Category & Ticket Form */}
          <div className={`p-8 lg:p-10 glass-strong rounded-3xl shadow-2xl border border-white/5 flex flex-col justify-between ${(isInteractive) ? 'lg:w-5/12' : 'lg:w-2/3'}`}>
            <div>
              {event.description && <p className="text-muted text-sm mb-8 leading-relaxed glass p-4 rounded-xl">{event.description}</p>}

              {event.place_id && GOOGLE_MAPS_API_KEY && (
                <div className="mb-8">
                  <h3 className="font-bold text-lg text-fg mb-4 border-b border-white/10 pb-2">Konum</h3>
                  <iframe
                    width="100%"
                    height="300"
                    style={{ border: 0, borderRadius: '12px' }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=place_id:${event.place_id}`}
                  />
                </div>
              )}

              {hasCategories ? (
                <div className="mb-0">
                  <h3 className="font-bold text-lg text-fg mb-5 border-b border-white/10 pb-3">Lütfen Kategori Seçimi Yapın</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {event.ticket_categories?.map((cat, idx) => {
                      const disabled = cat.remaining === 0;
                      const isSelected = selectedCategory?.name === cat.name;
                      return (
                        <label key={idx} onClick={(e) => {
                          e.preventDefault();
                          if (!disabled) {
                            if (isSelected) setSelectedCategory(null);
                            else setSelectedCategory(cat);
                          }
                        }} className={`flex flex-col justify-between p-5 rounded-2xl border transition-all cursor-pointer ${disabled ? 'opacity-40 grayscale border-border/50 bg-white/5 cursor-not-allowed' :
                          isSelected ? 'border-teal-DEFAULT bg-teal-DEFAULT/15 scale-[1.02] shadow-lg shadow-teal-DEFAULT/20' : 'border-border/50 hover:border-teal-DEFAULT/50 glass hover:bg-white/5'
                          }`}>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <input type="radio" className="accent-teal-DEFAULT w-5 h-5 cursor-pointer mt-0.5" name="ticketType" disabled={disabled}
                                checked={isSelected}
                                readOnly
                              />
                              <div>
                                <div className="font-black text-fg text-lg tracking-tight">{cat.name}</div>
                                <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${disabled ? 'text-red-400' : 'text-teal-400'}`}>
                                  {disabled ? 'Tükendi' : `Son ${cat.remaining} Bilet`}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="font-black text-fg text-2xl pt-2 border-t border-white/10">₺{cat.price}</div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className={`mb-8 flex justify-between items-center glass p-6 rounded-2xl border ${soldOut ? 'border-red-400/25' : 'border-white/5'}`}>
                  <div>
                    <div className="font-bold text-fg text-xl">Standart Bilet</div>
                    {totalRemaining !== undefined && (
                      <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-pill border text-xs font-bold ${availabilityClass}`}>
                        <span className={`w-2 h-2 rounded-full ${soldOut ? 'bg-red-400' : totalRemaining <= 10 ? 'bg-amber-300' : 'bg-teal-DEFAULT'}`} />
                        {soldOut ? 'Tükendi' : `${totalRemaining} bilet kaldı`}
                      </div>
                    )}
                  </div>
                  <div className="font-black text-teal-DEFAULT text-3xl">₺{event.price}</div>
                </div>
              )}
            </div>

            {/* Add functionality - Sticky to bottom mapping */}
            <div className="flex items-end gap-6 sm:flex-row flex-col pt-8 border-t border-white/10 mt-8">
              <div className="flex-1 w-full relative">
                <label className="text-xs font-semibold text-muted uppercase tracking-widest block mb-2">Bilet Adedi</label>
                <div className="flex items-center justify-between glass px-4 py-2 rounded-2xl w-full sm:max-w-[160px] border border-white/5">
                  <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-2xl font-light hover:text-teal-DEFAULT transition-colors w-8 h-8 flex items-center justify-center">−</button>
                  <span className="font-black text-xl text-fg mx-2">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(q => selectedRemaining !== undefined ? Math.min(selectedRemaining, q + 1) : q + 1)} disabled={selectedRemaining !== undefined && quantity >= selectedRemaining} className="text-2xl font-light hover:text-teal-DEFAULT transition-colors w-8 h-8 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={addDisabled}
                className={`px-10 py-4 h-[60px] rounded-2xl font-bold shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed w-full sm:w-auto text-[15px] ${soldOut ? 'glass border border-red-400/30 text-red-300' : 'btn-gradient hover:shadow-teal-DEFAULT/20'}`}
              >
                {soldOut ? 'Tükendi' : `Sepete Ekle (${hasCategories && selectedCategory ? `₺${selectedCategory.price * quantity}` : `₺${event.price * quantity}`})`}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
