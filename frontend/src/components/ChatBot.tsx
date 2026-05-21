import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';

interface Message {
  id: number;
  text: string;
  sender: 'bot' | 'user';
}

const fetchOrdersText = async (): Promise<string> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return 'Siparişlerinizi görmek için lütfen giriş yapın.';
    const res = await axios.get(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const orders = res.data as any[];
    if (!orders.length) return 'Henüz hiç siparişiniz bulunmuyor.';
    const lines = orders.map((o: any) => {
      const statusMap: Record<string, string> = {
        'Tamamlandı': '✅ Teslim Edildi',
        'İptal Edildi': '❌ İptal Edildi',
      };
      const status = statusMap[o.status] ?? '🔄 İşleniyor';
      return `• ${o.items?.[0]?.name ?? 'Etkinlik'} — ₺${o.total} — ${status}`;
    });
    return `Son siparişleriniz:\n\n${lines.join('\n')}\n\nDetaylar için "Siparişlerim" sayfasını ziyaret edebilirsiniz.`;
  } catch {
    return 'Siparişlerinize şu an ulaşılamıyor. Lütfen "Siparişlerim" sayfasını kontrol edin.';
  }
};

const getBotResponse = (input: string): string => {
  const msg = input.toLowerCase().trim();

  // Şifre değiştirme
  if (
    msg.includes('şifre') ||
    msg.includes('parola') ||
    msg.includes('password')
  ) {
    return `Şifrenizi değiştirmek için şu adımları izleyin:\n\n1. Sağ üst köşedeki profil menüsüne tıklayın.\n2. "Hesap Ayarları" veya "Profil" seçeneğini seçin.\n3. "Şifre Değiştir" bölümüne gidin.\n4. Mevcut şifrenizi girin.\n5. Yeni şifrenizi iki kez girin.\n6. "Kaydet" butonuna tıklayın.\n\nBaşka bir konuda yardımcı olabilir miyim?`;
  }

  // Bilet alma
  if (
    msg.includes('bilet') ||
    msg.includes('nasıl alınır') ||
    msg.includes('satın al') ||
    msg.includes('ticket')
  ) {
    return `Bilet almak çok kolay! İşte adımlar:\n\n1. Üst menüden "Etkinlikler" sayfasına gidin.\n2. İlginizi çeken etkinliği seçin.\n3. "Bilet Al" veya "Sepete Ekle" butonuna tıklayın.\n4. Sepet sayfasında miktarı düzenleyin.\n5. Ödeme bilgilerinizi girerek işlemi tamamlayın.\n\nBiletlerinizi "Siparişlerim" sayfasından takip edebilirsiniz.`;
  }

  // İndirim / kampanya
  if (
    msg.includes('indirim') ||
    msg.includes('kampanya') ||
    msg.includes('kupon') ||
    msg.includes('promosyon') ||
    msg.includes('fırsat')
  ) {
    return `Aktif kampanya ve indirimlerden yararlanmak için:\n\n• Sepet sayfasında "İndirim Kodu" alanına geçerli bir kupon kodunuzu girebilirsiniz.\n• Özel üye kampanyaları için e-posta bildirimlerinizi açık tutun.\n• Etkinlik sayfalarında zaman sınırlı erken rezervasyon fırsatlarını takip edin.\n\nŞu an geçerli bir kampanya kodunuz var mı?`;
  }

  // Etkinlik önerileri
  if (
    msg.includes('etkinlik') ||
    msg.includes('öneri') ||
    msg.includes('ne var') ||
    msg.includes('program') ||
    msg.includes('konser') ||
    msg.includes('tiyatro') ||
    msg.includes('film') ||
    msg.includes('spor')
  ) {
    return `Harika seçeneklerimiz var! 🎉\n\nEtkinlikler sayfasını ziyaret ederek:\n• Müzik konserleri\n• Tiyatro gösterileri\n• Spor karşılaşmaları\n• Sanat & kültür etkinlikleri\n\n…gibi kategorileri keşfedebilirsiniz. Hangi tür etkinliklerle ilgileniyorsunuz? Size daha spesifik önerilerde bulunabilirim.`;
  }

  // Mod / ruh hali
  if (
    msg.includes('modum') ||
    msg.includes('nasılsın') ||
    msg.includes('iyi') ||
    msg.includes('kötü') ||
    msg.includes('yorgun') ||
    msg.includes('mutlu') ||
    msg.includes('üzgün') ||
    msg.includes('sıkıldım') ||
    msg.includes('eğlen')
  ) {
    return `Durumunuzu anlıyorum! Size uygun bir etkinlik önerebilirim.\n\nKendinizi nasıl hissediyorsunuz?\n• 🎵 Müzik dinlemek ister misiniz?\n• 🎭 Tiyatro veya sinema?\n• ⚽ Spor karşılaşması?\n• 🎨 Sanat & sergi?\n\nTercihlerinizi paylaşın, en uygun etkinlikleri birlikte bulalım!`;
  }

  // Sipariş / geçmiş
  if (
    msg.includes('sipariş') ||
    msg.includes('geçmiş') ||
    msg.includes('satın aldım') ||
    msg.includes('aldığım')
  ) {
    return `Geçmiş siparişlerinizi görüntülemek için üst menüden "Siparişlerim" sayfasına gidebilirsiniz. Orada tüm biletlerinizi ve sipariş detaylarınızı bulabilirsiniz.\n\nBir sorun mu yaşıyorsunuz?`;
  }

  // Hesap / giriş
  if (
    msg.includes('giriş') ||
    msg.includes('hesap') ||
    msg.includes('kayıt') ||
    msg.includes('üye')
  ) {
    return `Hesap işlemleri için:\n\n• Yeni hesap oluşturmak → "Kayıt Ol" sayfası\n• Giriş yapmak → "Giriş Yap" sayfası\n• Hesap bilgilerini güncellemek → Profil menüsü\n\nNasıl yardımcı olabilirim?`;
  }

  // Selamlama
  if (
    msg.includes('merhaba') ||
    msg.includes('selam') ||
    msg.includes('hey') ||
    msg.includes('hi') ||
    msg.includes('hello')
  ) {
    return `Merhaba! 👋 Hoş geldiniz! Size nasıl yardımcı olabilirim?\n\nAşağıdaki konularda destek verebilirim:\n• 🎫 Bilet satın alma\n• 🎉 Etkinlik önerileri\n• 🏷️ İndirim & kampanyalar\n• 🔑 Şifre değiştirme\n• 📋 Sipariş takibi`;
  }

  // Teşekkür
  if (
    msg.includes('teşekkür') ||
    msg.includes('sağol') ||
    msg.includes('tamam') ||
    msg.includes('anladım')
  ) {
    return `Rica ederim! 😊 Başka bir konuda yardımcı olabilir miyim?`;
  }

  // Varsayılan yanıt
  return `Anlıyorum! Size şu konularda yardımcı olabilirim:\n\n• 🎫 Bilet nasıl alınır?\n• 🎉 Etkinlik önerileri\n• 🏷️ İndirim & kampanyalar\n• 🔑 Şifre değiştirme\n• 📋 Sipariş geçmişi\n\nHangi konuda bilgi almak istersiniz?`;
};

const ChatBot: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Admin / yönetici panellerinde bilet asistanı butonunu gizle
  if (location.pathname.startsWith('/admin')) {
    return null;
  }
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Bugün size nasıl yardımcı olabilirim? 😊\n\nBilet alma, etkinlik önerileri, kampanyalar veya hesap işlemleri hakkında yardımcı olabilirim.',
      sender: 'bot',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const isOrderQuery = (msg: string) => {
    const m = msg.toLowerCase();
    return m.includes('sipariş') || m.includes('biletlerim') || m.includes('aldıklarım') || m.includes('geçmiş');
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = { id: Date.now(), text: trimmed, sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    let replyText: string;
    if (isOrderQuery(trimmed)) {
      replyText = await fetchOrdersText();
    } else {
      replyText = getBotResponse(trimmed);
    }

    const botReply: Message = { id: Date.now() + 1, text: replyText, sender: 'bot' };
    setMessages((prev) => [...prev, botReply]);
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { sendMessage(); }
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '24px',
            width: '340px',
            height: '480px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            border: '1px solid rgba(45, 212, 191, 0.2)',
            background: '#161b22',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0e7490, #2dd4bf)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0,
              }}
            >
              🎫
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', lineHeight: 1.2 }}>
                Bilet Asistanı
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#4ade80',
                    display: 'inline-block',
                  }}
                />
                Çevrimiçi
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(45,212,191,0.3) transparent',
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.sender === 'bot' && (
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0e7490, #2dd4bf)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      marginRight: '7px',
                      flexShrink: 0,
                      alignSelf: 'flex-end',
                    }}
                  >
                    🎫
                  </div>
                )}
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '9px 12px',
                    borderRadius: msg.sender === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background:
                      msg.sender === 'user'
                        ? 'linear-gradient(135deg, #0e7490, #2dd4bf)'
                        : 'rgba(255,255,255,0.07)',
                    color: msg.sender === 'user' ? '#fff' : '#e2e8f0',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-line',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0e7490, #2dd4bf)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    flexShrink: 0,
                  }}
                >
                  🎫
                </div>
                <div
                  style={{
                    padding: '9px 14px',
                    borderRadius: '14px 14px 14px 4px',
                    background: 'rgba(255,255,255,0.07)',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#2dd4bf',
                        display: 'inline-block',
                        animation: 'chatbotBounce 1.2s infinite',
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '10px 12px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              gap: '8px',
              flexShrink: 0,
              background: '#0d1117',
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mesajınızı yazın..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(45,212,191,0.2)',
                borderRadius: '10px',
                padding: '9px 12px',
                color: '#f0f6fc',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              style={{
                background: input.trim()
                  ? 'linear-gradient(135deg, #0e7490, #2dd4bf)'
                  : 'rgba(255,255,255,0.07)',
                border: 'none',
                borderRadius: '10px',
                width: '38px',
                height: '38px',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title="Dijital Asistan"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: isOpen
            ? 'linear-gradient(135deg, #0e7490, #2dd4bf)'
            : 'linear-gradient(135deg, #0e7490, #2dd4bf)',
          border: 'none',
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(14, 116, 144, 0.5)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(14,116,144,0.7)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(14, 116, 144, 0.5)';
        }}
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="10" r="1" fill="white"/>
            <circle cx="12" cy="10" r="1" fill="white"/>
            <circle cx="15" cy="10" r="1" fill="white"/>
          </svg>
        )}
      </button>

      {/* Typing animation keyframes */}
      <style>{`
        @keyframes chatbotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default ChatBot;
