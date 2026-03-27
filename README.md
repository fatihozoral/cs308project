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
- Node.js 20+
- Express.js
- PostgreSQL
- JWT (jsonwebtoken)
- bcrypt (şifre hashleme)
- express-validator

### Frontend
- React 18+
- React Router v6
- Axios
- Context API (auth state management)

---

## 📁 Proje Yapısı

```
cs308-project/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── authController.js
│   │   ├── middleware/
│   │   │   └── authMiddleware.js
│   │   ├── routes/
│   │   │   └── authRoutes.js
│   │   ├── validators/
│   │   │   └── authValidators.js
│   │   ├── utils/
│   │   │   └── hashPassword.js
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   │   └── 001_create_users_and_refresh_tokens.sql
│   │   │   └── seeds/
│   │   │       ├── 001_seed_managers.sql
│   │   │       └── seedManagers.js
│   │   ├── app.js
│   │   └── server.js
│   ├── __tests__/
│   │   └── auth.test.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── auth/
│   │   │       ├── LoginForm.jsx
│   │   │       ├── RegisterForm.jsx
│   │   │       └── AuthForms.css
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── AdminSalesPage.jsx
│   │   │   ├── AdminProductsPage.jsx
│   │   │   └── AuthPages.css
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   └── authService.js
│   │   ├── utils/
│   │   │   └── validators.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── .env.example
│
├── prd.md
└── README.md
```

---

## 🚀 Kurulum ve Çalıştırma

### 1. Ön Gereksinimler

- Node.js 20+ ([Node.js İndir](https://nodejs.org/))
- PostgreSQL 14+ ([PostgreSQL İndir](https://www.postgresql.org/download/))
- npm veya yarn

### 2. PostgreSQL Veritabanı Kurulumu

```bash
# PostgreSQL'e bağlan
psql -U postgres

# Yeni veritabanı oluştur
CREATE DATABASE ticketing_db;

# Veritabanına geç
\c ticketing_db
```

### 3. Backend Kurulumu

```bash
# Backend dizinine git
cd backend

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp .env.example .env

# .env dosyasını düzenle (veritabanı bilgileri, JWT secret vb.)
nano .env
```

**.env örneği:**
```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketing_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password

JWT_SECRET=supersecretkey_change_in_production
JWT_EXPIRES_IN=24h

CORS_ORIGIN=http://localhost:3000
```

```bash
# Migration'ı çalıştır (tabloları oluştur)
npm run migrate

# Seed verilerini ekle (varsayılan manager hesapları)
npm run seed

# Sunucuyu başlat
npm run dev
```

Backend şimdi http://localhost:5000 adresinde çalışıyor.

### 4. Frontend Kurulumu

```bash
# Yeni terminal penceresi aç
# Frontend dizinine git
cd frontend

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur (opsiyonel, proxy kullanıyoruz)
cp .env.example .env

# React uygulamasını başlat
npm start
```

Frontend şimdi http://localhost:3000 adresinde çalışıyor.

---

## 🧪 Testleri Çalıştırma

### Backend Testleri (Jest)

```bash
cd backend

# Tüm testleri çalıştır
npm test

# Coverage report ile testleri çalıştır
npm test -- --coverage

# Watch modunda testleri çalıştır
npm run test:watch
```

---

## 🔑 Varsayılan Hesaplar

Seed script çalıştırıldıktan sonra aşağıdaki hesaplar kullanılabilir:

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Sales Manager | sales@ticketing.com | Admin1234! |
| Product Manager | product@ticketing.com | Admin1234! |

Customer hesapları kayıt sayfasından oluşturulabilir.

---

## 📡 API Endpoints

### POST /api/auth/register
Yeni müşteri kaydı oluşturur.

**Request Body:**
```json
{
  "name": "Ahmet Yılmaz",
  "email": "ahmet@example.com",
  "password": "Sifre1234!",
  "tax_id": "12345678901",
  "home_address": "Kadıköy, İstanbul"
}
```

**Response (201):**
```json
{
  "message": "Kayıt başarılı.",
  "user": {
    "id": "uuid",
    "name": "Ahmet Yılmaz",
    "email": "ahmet@example.com",
    "role": "customer"
  }
}
```

### POST /api/auth/login
Kullanıcı girişi yapar.

**Request Body:**
```json
{
  "email": "ahmet@example.com",
  "password": "Sifre1234!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "Ahmet Yılmaz",
    "role": "customer"
  }
}
```

---

## ✅ Acceptance Criteria (Test Coverage)

| # | Kriter | Durum |
|---|--------|-------|
| AC-01 | Geçerli bilgilerle kayıt 201 dönmeli | ✅ |
| AC-02 | Var olan e-postayla kayıt 409 dönmeli | ✅ |
| AC-03 | Doğru kimlikle giriş JWT token dönmeli | ✅ |
| AC-04 | Yanlış şifreyle giriş 401 dönmeli | ✅ |
| AC-05 | Rol bazlı redirect çalışmalı | ✅ |
| AC-06 | Boş form frontend hataları göstermeli | ✅ |
| AC-07 | Şifre DB'de hash olarak saklanmalı | ✅ |
| AC-08 | Token olmadan korumalı route 401 dönmeli | ✅ |

---

## 🔒 Güvenlik Özellikleri

- ✅ Şifreler bcrypt ile hashleniyor (salt rounds: 10)
- ✅ JWT token kullanımı
- ✅ CORS koruması
- ✅ E-posta varlığı bilgisi sızdırmayan hata mesajları
- ✅ Input validasyonu (frontend + backend)
- ✅ SQL injection koruması (parametrized queries)
- ✅ XSS koruması (React'in built-in escaping)

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
- Sales manager ve product manager hesapları sadece seed script ile oluşturulabilir

---

## 🤝 Katkıda Bulunanlar

CS 308 Proje Ekibi - Sabancı Üniversitesi, 2026

---

## 📄 Lisans

Bu proje CS 308 Software Engineering dersi kapsamında eğitim amaçlı geliştirilmiştir.

---

## 📞 İletişim

Sorularınız için proje ekibi ile iletişime geçebilirsiniz.
