import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { getAuthHeader } from '@/services/authService';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';

interface NavbarProps {
  cartCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ cartCount = 0 }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_URL}/notifications`, { headers: getAuthHeader() });
      setNotifications(res.data);
    } catch (err) {
      console.error("Bildirimler yüklenemedi:", err);
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    if (!showNotifications) return;
    const handleClose = () => setShowNotifications(false);
    document.addEventListener('click', handleClose);
    return () => document.removeEventListener('click', handleClose);
  }, [showNotifications]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const markAsRead = async (id: string) => {
    try {
      await axios.patch(`${API_URL}/notifications/${id}/read`, {}, { headers: getAuthHeader() });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Bildirim okunamadı:", err);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.patch(`${API_URL}/notifications/read-all`, {}, { headers: getAuthHeader() });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Tüm bildirimler okunamadı:", err);
    }
  };

  const links = [
    { to: '/events', label: 'Etkinlikler' },
    ...(user ? [
      { to: '/wishlist', label: 'İstek Listesi' },
      { to: '/orders', label: 'Siparişlerim' },
    ] : []),
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-3' : 'py-5'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className={`flex items-center justify-between px-5 py-2.5 rounded-pill transition-all duration-300 ${scrolled ? 'glass-strong' : 'glass'}`}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-cta flex items-center justify-center">
              <svg className="w-4 h-4 text-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-fg tracking-tight">TicketHub</span>
          </Link>

          {/* Nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {links.map(({ to, label }) => (
              <Link key={to} to={to}
                className={`px-4 py-1.5 text-sm rounded-pill transition-colors ${location.pathname === to ? 'text-teal-DEFAULT font-semibold' : 'text-muted hover:text-fg'}`}>
                {label}
              </Link>
            ))}
            <Link to="/cart"
              className={`relative px-4 py-1.5 text-sm rounded-pill transition-colors ${location.pathname === '/cart' ? 'text-teal-DEFAULT font-semibold' : 'text-muted hover:text-fg'}`}>
              Sepet
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-cta text-bg text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-full hover:bg-fg/5 text-muted hover:text-fg transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notifications.filter(n => !n.is_read).length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto rounded-2xl glass-strong border border-white/10 shadow-2xl p-4 z-50 animate-fade-in custom-scrollbar">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-2">
                      <span className="text-xs font-bold text-fg">Bildirimler ({notifications.filter(n => !n.is_read).length})</span>
                      {notifications.filter(n => !n.is_read).length > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[10px] text-teal-DEFAULT hover:underline font-semibold"
                        >
                          Tümünü Okundu İşaretle
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted">
                        Bildiriminiz bulunmuyor.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-xl transition-colors border border-white/5 relative group ${
                              n.is_read ? 'bg-white/[0.02] text-muted' : 'bg-white/[0.06] text-fg'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1.5">
                              <h4 className={`text-xs font-bold ${n.is_read ? 'text-fg/70' : 'text-fg'}`}>
                                {n.title}
                              </h4>
                              {!n.is_read && (
                                <button
                                  onClick={() => markAsRead(n.id)}
                                  className="w-4 h-4 rounded-full bg-teal-DEFAULT/20 hover:bg-teal-DEFAULT/40 flex items-center justify-center text-teal-DEFAULT transition-colors shrink-0"
                                  title="Okundu olarak işaretle"
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] mt-1 leading-relaxed">{n.message}</p>
                            <span className="text-[9px] text-muted block mt-1.5">
                              {new Date(n.created_at).toLocaleString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit'
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {user ? (
              <>
                <span className="hidden sm:block text-xs text-muted">{user.name?.split(' ')[0]}</span>
                <button onClick={handleLogout}
                  className="btn-ghost px-4 py-1.5 text-xs font-medium">
                  Çıkış
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-ghost px-4 py-1.5 text-xs font-medium">
                Giriş Yap
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
