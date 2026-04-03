import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
  cartCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ cartCount = 0 }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const links = [
    { to: '/events', label: 'Etkinlikler' },
    { to: '/orders', label: 'Siparişlerim' },
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
            <span className="hidden sm:block text-xs text-muted">{user?.name?.split(' ')[0]}</span>
            <button onClick={handleLogout}
              className="btn-ghost px-4 py-1.5 text-xs font-medium">
              Çıkış
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
