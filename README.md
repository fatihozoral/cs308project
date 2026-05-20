# CS 308 Online Ticketing Platform

**Sabancı Üniversitesi - CS 308 Software Engineering Project**

Online biletleme platformu - Kimlik doğrulama modülü (Sprint 1)

---

## 📋 Proje Hakkında

Bu proje, bir online biletleme sistemi için kimlik doğrulama modülünü içerir. Sistem üç farklı kullanıcı rolünü destekler:

- **Customer (Müşteri)**: Bilet satın alabilir
- **Sales Manager (Satış Yöneticisi)**: Satış raporlarını görüntüler
- **Product Manager (Ürün Yöneticisi)**: Etkinlik ve ürün yönetimi yapar

---

## 🏗️ Teknoloji Stack

### Backend
- Python 3.10+
- FastAPI
- Supabase (PostgreSQL)
- Supabase Auth (JWT)
- Pydantic
- Uvicorn

### Frontend
- React 18+ (Vite)
- TypeScript
- Tailwind CSS
- Axios
- Context API / Supabase Session (auth state management)

---

## 📁 Proje Yapısı

```
cs308-project/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── events.py
│   │   │   ├── orders.py
│   │   │   ├── comments.py
│   │   │   ├── wishlist.py
│   │   │   └── admin.py
│   │   ├── core/
│   │   ├── schemas/
│   │   └── services/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
│
├── prd.md
└── README.md
```

---

## 🚀 Kurulum ve Çalıştırma

### 1. Ön Gereksinimler

- Python 3.10+
- Node.js 20+
- Supabase hesabı

### 2. Backend Kurulumu

```bash
# Backend dizinine git
cd backend

# Virtual environment oluştur ve aktif et (macOS/Linux)
python3 -m venv venv
source venv/bin/activate

# Windows için:
# venv\Scripts\activate

# Bağımlılıkları yükle
pip install -r requirements.txt

# .env dosyasını oluştur
cp .env.example .env
```

**.env örneği:**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

```bash
# Sunucuyu başlat
uvicorn main:app --reload
```

Backend şimdi http://localhost:8000 adresinde çalışıyor. Swagger API dökümantasyonuna http://localhost:8000/docs adresinden ulaşabilirsiniz.

### 3. Frontend Kurulumu

```bash
# Yeni terminal penceresi aç
# Frontend dizinine git
cd frontend

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp .env.example .env

# React uygulamasını başlat
npm run dev
```

Frontend şimdi http://localhost:5173 adresinde çalışıyor.

---

## 🧪 Testleri Çalıştırma

### Backend Testleri (Pytest)

```bash
cd backend
source venv/bin/activate

# Tüm testleri çalıştır
pytest
```

---

## 🔑 Varsayılan Hesaplar

Seed script veya Supabase Auth dashboard üzerinden aşağıdaki hesaplar oluşturulabilir:

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Sales Manager | sales@ticketing.com | Admin1234! |
| Product Manager | product@ticketing.com | Admin1234! |

Customer hesapları kayıt sayfasından oluşturulabilir.

---

## 📡 API Endpoints

Detaylı API endpoint'leri ve şemaları için projenin çalıştırılmasının ardından `http://localhost:8000/docs` adresini ziyaret edebilirsiniz (FastAPI Swagger UI).

---

## ✅ Acceptance Criteria (Test Coverage)

| # | Kriter | Durum |
|---|--------|-------|
| AC-01 | Geçerli bilgilerle kayıt başarılı dönmeli | ✅ |
| AC-02 | Var olan e-postayla kayıt hata dönmeli | ✅ |
| AC-03 | Doğru kimlikle giriş Supabase Session dönmeli | ✅ |
| AC-04 | Yanlış şifreyle giriş 401 dönmeli | ✅ |
| AC-05 | Rol bazlı redirect çalışmalı | ✅ |
| AC-06 | Boş form frontend hataları göstermeli | ✅ |
| AC-07 | Şifre DB'de güvenli şekilde saklanmalı | ✅ |
| AC-08 | Yetkisiz rota erişimleri engellenmeli | ✅ |

---

## 🔒 Güvenlik Özellikleri

- ✅ Şifreler Supabase Auth tarafından yönetilir ve hashlenir
- ✅ Supabase JWT token kullanımı
- ✅ CORS koruması
- ✅ Input validasyonu (frontend + Pydantic backend)

---

## 🎯 Rol Bazlı Yönlendirme

Login sonrası kullanıcılar rollerine göre yönlendirilir:

- **customer** → `/` (Ana sayfa)
- **sales_manager** → `/admin/sales` (Satış yönetimi)
- **product_manager** → `/admin/products` (Ürün yönetimi)

---

## 📝 Validation Kuralları

### Kayıt (Register)
- **Ad Soyad**: Min 2 karakter
- **E-posta**: Geçerli e-posta formatı
- **Şifre**: Min 8 karakter, en az 1 büyük harf, en az 1 rakam
- **TC Kimlik/Vergi No**: Tam 11 hane, sadece rakam
- **Ev Adresi**: Boş bırakılamaz

### Giriş (Login)
- **E-posta**: Geçerli e-posta formatı
- **Şifre**: Boş bırakılamaz

---

## 🐛 Bilinen Sorunlar ve Sınırlamalar

- Şifre sıfırlama özelliği henüz eklenmemiştir (Sprint 2)
- OAuth/sosyal giriş desteklenmemektedir
- İki faktörlü doğrulama bulunmamaktadır

---

## 🤝 Katkıda Bulunanlar

CS 308 Proje Ekibi - Sabancı Üniversitesi, 2026

---

## 📄 Lisans

Bu proje CS 308 Software Engineering dersi kapsamında eğitim amaçlı geliştirilmiştir.

---

## 📞 İletişim

Sorularınız için proje ekibi ile iletişime geçebilirsiniz.
