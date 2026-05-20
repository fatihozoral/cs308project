# PRD — Authentication Module
**CS 308 Online Ticketing Project**
**Version:** 1.0 | **Date:** 2026-03-26 | **Priority:** Sprint 1 — Yarına kadar teslim

---

## 1. Overview

Bu doküman, biletleme sisteminin kimlik doğrulama modülünü (Login & Sign Up) kapsar. Tüm roller (customer, sales manager, product manager) bu ekranlar üzerinden sisteme girer. Frontend, backend ve database katmanları birlikte tanımlanmıştır.

---

## 2. User Stories

| # | Rol | Hikaye |
|---|-----|--------|
| US-01 | Customer | E-posta ve şifremle sisteme giriş yapmak istiyorum. |
| US-02 | Customer | Yeni hesap oluşturmak istiyorum (ad, e-posta, şifre, adres, vergi no). |
| US-03 | Tüm roller | Hatalı giriş yaptığımda anlaşılır bir hata mesajı görmek istiyorum. |
| US-04 | Tüm roller | Şifremi yanlış girersem hesabım kilitlenmeden uyarı almak istiyorum. |
| US-05 | Tüm roller | Giriş yaptıktan sonra rolüme göre doğru sayfaya yönlendirilmek istiyorum. |

---

## 3. Scope

### 3.1 In Scope (Sprint 1)
- Sign Up sayfası (customer kaydı)
- Login sayfası (tüm roller)
- Supabase Session token üretimi ve localStorage'a yazılması
- Rol bazlı yönlendirme (redirect)
- Form validasyonu (frontend + backend Pydantic)
- Şifre güvenliği (Supabase Auth)

### 3.2 Out of Scope
- Şifre sıfırlama / "Şifremi unuttum"
- OAuth / sosyal giriş
- Sales manager ve product manager kaydı (bunlar admin tarafından oluşturulur)
- İki faktörlü doğrulama

---

## 4. Database

### 4.1 Tablo: `Kullanıcılar (Supabase Auth)`

Sistemdeki kullanıcılar Supabase Auth servisi (`auth.users`) ile entegre bir şekilde çalışır. Ekstra profil bilgileri için `public.profiles` veya benzeri bir tablo kullanılabilir.

- Supabase Auth tarafından şifreler otomatik hashlenir ve güvenli saklanır.
- Kayıt sırasında role bilgisi Supabase meta verilerinde veya ilişkili bir tabloda tutulabilir.

### 4.2 Seed — Varsayılan Manager Hesapları

Varsayılan Manager hesapları Supabase arayüzünden veya migration/seed script ile oluşturulabilir:
- **Sales Manager:** `sales@ticketing.com` / `Admin1234!`
- **Product Manager:** `product@ticketing.com` / `Admin1234!`

---

## 5. Backend

### 5.1 Tech Stack
- Runtime: Python 3.10+
- Framework: FastAPI
- Database/Auth: Supabase
- Validation: Pydantic

### 5.2 Endpoints

#### `POST /api/auth/register`

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

**Response 201:**
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

**Hata Durumları:**
| HTTP | Durum | Mesaj |
|------|-------|-------|
| 400 | Eksik alan | `"Email alanı zorunludur."` |
| 409 | E-posta zaten kayıtlı | `"Bu e-posta adresi kullanılıyor."` |
| 422 | Zayıf şifre/Pydantic Error | `"Şifre en az 8 karakter olmalı."` |

---

#### `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "ahmet@example.com",
  "password": "Sifre1234!"
}
```

**Response 200:**
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

**Hata Durumları:**
| HTTP | Durum | Mesaj |
|------|-------|-------|
| 400 | Eksik alan | `"Email ve şifre zorunludur."` |
| 401 | Yanlış kimlik | `"E-posta veya şifre hatalı."` |
| 403 | Pasif hesap | `"Hesabınız devre dışı bırakılmıştır."` |

---

### 5.3 JWT Yapısı

Supabase Auth tarafından oluşturulan güvenli token (JWT) yapısı kullanılır.

### 5.4 FastAPI Dependencies (Middleware)

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.supabase_service import supabase

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user = supabase.auth.get_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user
```

### 5.5 Klasör Yapısı (Backend Auth)

```
app/
├── api/
│   └── auth.py             # FastAPI router (/register, /login)
├── core/
│   └── security.py         # Dependencies and JWT checks
├── schemas/
│   └── user.py             # Pydantic models
└── services/
    └── supabase_service.py # Supabase client initialization
```

---

## 6. Frontend

### 6.1 Tech Stack
- React 18+ (Vite)
- TypeScript
- Tailwind CSS
- React Router v6
- Axios (API istekleri)
- Context API (Supabase Session state)

### 6.2 Sayfalar ve Route'lar

| Route | Component | Açıklama |
|-------|-----------|----------|
| `/login` | `LoginPage` | Giriş formu |
| `/register` | `RegisterPage` | Kayıt formu |
| `/` | `HomePage` | Giriş sonrası anasayfa |
| `/admin` | `AdminDashboard` | Sadece manager rolleri |

### 6.3 Login Formu — Alanlar

| Alan | Tip | Validasyon |
|------|-----|------------|
| E-posta | `email` | Zorunlu, geçerli format |
| Şifre | `password` | Zorunlu, min 8 karakter |
| Giriş Yap | `submit button` | — |
| "Hesabın yok mu? Kayıt ol" | link | `/register`'a yönlendirir |

### 6.4 Sign Up Formu — Alanlar

| Alan | Tip | Validasyon |
|------|-----|------------|
| Ad Soyad | `text` | Zorunlu, min 2 karakter |
| E-posta | `email` | Zorunlu, geçerli format |
| Şifre | `password` | Zorunlu, min 8 karakter, büyük harf + rakam |
| Şifre Tekrar | `password` | Şifreyle eşleşmeli |
| TC Kimlik / Vergi No | `text` | Zorunlu, 11 hane |
| Ev Adresi | `textarea` | Zorunlu |
| Kayıt Ol | `submit button` | — |
| "Zaten hesabın var mı? Giriş yap" | link | `/login`'e yönlendirir |

### 6.5 Auth Context

```tsx
// src/context/AuthContext.tsx
import { createContext, useState } from 'react';

export const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState(null);

  const login = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 6.6 Rol Bazlı Yönlendirme (Login Sonrası)

```tsx
const redirectByRole = (role: string) => {
  switch (role) {
    case 'sales_manager':    return '/admin/sales';
    case 'product_manager':  return '/admin/products';
    default:                 return '/';  // customer
  }
};
```

### 6.7 Klasör Yapısı (Frontend Auth)

```
src/
├── pages/
│   ├── LoginPage.tsx
│   └── RegisterPage.tsx
├── components/
│   └── auth/
│       ├── LoginForm.tsx
│       └── RegisterForm.tsx
├── context/
│   └── AuthContext.tsx
├── services/
│   └── authService.ts      # API çağrıları
└── utils/
    └── validators.ts       # Frontend validasyon helpers
```

---

## 7. Güvenlik Gereksinimleri (Req 16)

- Şifreler Supabase Auth tarafından yönetilmeli, düz metin saklanmamalı.
- Supabase Key'leri `.env` dosyasında tutulmalı, repoya commit edilmemeli (`.gitignore`).
- API, e-posta var/yok bilgisini ayırt eden mesaj dönmemeli (brute-force önlemi) — her zaman `"E-posta veya şifre hatalı."` dön.
- HTTPS zorunlu (production). Development'ta HTTP kabul edilir.

---

## 8. Acceptance Criteria

| # | Kriter | Test Yöntemi |
|---|--------|--------------|
| AC-01 | Geçerli bilgilerle kayıt olunca 201 dönmeli | Pytest / Postman |
| AC-02 | Var olan e-postayla kayıt 409 dönmeli | Pytest |
| AC-03 | Doğru kimlikle giriş yapınca JWT token dönmeli | Pytest / Postman |
| AC-04 | Yanlış şifreyle giriş 401 dönmeli | Pytest |
| AC-05 | Login sonrası customer `/`'e, manager `/admin`'e gitmeli | Cypress / Manuel |
| AC-06 | Boş form submit edilince frontend hataları göstermeli | Manuel |
| AC-07 | Şifre Supabase'de güvenle saklanmalı | - |
| AC-08 | Yetkisiz olarak korumalı route'a gidince 401 dönmeli | Pytest |

---

## 9. Definition of Done

- [ ] `POST /api/auth/register` ve `POST /api/auth/login` çalışıyor
- [ ] Kullanıcılar Supabase üzerinde tutuluyor
- [ ] Şifreler güvenle yönetiliyor
- [ ] Frontend'de LoginPage ve RegisterPage render oluyor
- [ ] Form validasyonu hem client hem server (Pydantic) tarafta çalışıyor
- [ ] Rol bazlı redirect çalışıyor
- [ ] Unit test yazılmış
- [ ] `.env.example` dosyası repoya eklenmiş
- [ ] Kod review'dan geçmiş, PR merge edilmiş

---

*Bu PRD CS 308 Software Engineering dersi kapsamında hazırlanmıştır — Sabancı Üniversitesi, 2026*