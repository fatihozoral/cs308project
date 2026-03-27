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
- JWT token üretimi ve localStorage'a yazılması
- Rol bazlı yönlendirme (redirect)
- Form validasyonu (frontend + backend)
- Şifre hashleme (bcrypt)

### 3.2 Out of Scope
- Şifre sıfırlama / "Şifremi unuttum"
- OAuth / sosyal giriş
- Sales manager ve product manager kaydı (bunlar admin tarafından oluşturulur)
- İki faktörlü doğrulama

---

## 4. Database

### 4.1 Tablo: `users`

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  tax_id        VARCHAR(20)   NOT NULL,
  home_address  TEXT          NOT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'customer'
                  CHECK (role IN ('customer', 'sales_manager', 'product_manager')),
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### 4.2 Tablo: `refresh_tokens` *(opsiyonel ama önerilir)*

```sql
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.3 Seed — Varsayılan Manager Hesapları

```sql
-- Şifreler: bcrypt hash of 'Admin1234!'
INSERT INTO users (name, email, password_hash, tax_id, home_address, role)
VALUES
  ('Sales Manager', 'sales@ticketing.com', '$2b$10$...', '11111111111', 'HQ', 'sales_manager'),
  ('Product Manager', 'product@ticketing.com', '$2b$10$...', '22222222222', 'HQ', 'product_manager');
```

---

## 5. Backend

### 5.1 Tech Stack
- Runtime: Node.js 20+
- Framework: Express.js
- ORM/Query: `pg` (node-postgres) veya Sequelize
- Auth: `jsonwebtoken`, `bcrypt`
- Validation: `express-validator` veya `joi`

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
| 422 | Zayıf şifre | `"Şifre en az 8 karakter olmalı."` |

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

```js
// Payload
{
  sub: "user-uuid",
  email: "ahmet@example.com",
  role: "customer",
  iat: 1711234567,
  exp: 1711320967   // 24 saat
}

// .env
JWT_SECRET=supersecretkey_change_in_prod
JWT_EXPIRES_IN=24h
```

### 5.4 Middleware: `authMiddleware.js`

```js
// Diğer route'larda kullanım:
// router.get('/profile', authMiddleware, profileController)

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token bulunamadı.' });

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token geçersiz veya süresi dolmuş.' });
  }
};
```

### 5.5 Klasör Yapısı (Backend Auth)

```
src/
├── controllers/
│   └── authController.js   # register(), login()
├── middleware/
│   └── authMiddleware.js   # JWT doğrulama
├── routes/
│   └── authRoutes.js       # POST /register, POST /login
├── validators/
│   └── authValidators.js   # express-validator kuralları
└── utils/
    └── hashPassword.js     # bcrypt wrapper
```

---

## 6. Frontend

### 6.1 Tech Stack
- React 18+
- React Router v6
- Axios (API istekleri)
- Context API veya Redux (auth state)

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

```js
// src/context/AuthContext.jsx
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (token, userData) => {
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

```js
const redirectByRole = (role) => {
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
│   ├── LoginPage.jsx
│   └── RegisterPage.jsx
├── components/
│   └── auth/
│       ├── LoginForm.jsx
│       └── RegisterForm.jsx
├── context/
│   └── AuthContext.jsx
├── services/
│   └── authService.js      # axios.post('/api/auth/login'), register()
└── utils/
    └── validators.js       # Frontend validasyon helpers
```

---

## 7. Güvenlik Gereksinimleri (Req 16)

- Şifreler veritabanında **bcrypt** (salt rounds: 10) ile hashlenmeli, düz metin saklanmamalı.
- JWT secret `.env` dosyasında tutulmalı, repoya commit edilmemeli (`.gitignore`).
- API, e-posta var/yok bilgisini ayırt eden mesaj dönmemeli (brute-force önlemi) — her zaman `"E-posta veya şifre hatalı."` dön.
- HTTPS zorunlu (production). Development'ta HTTP kabul edilir.
- `Authorization` header'ı dışında token client-side'da yalnızca `localStorage`'da tutulabilir; `httpOnly cookie` daha güvenlidir (opsiyonel iyileştirme).

---

## 8. Acceptance Criteria

| # | Kriter | Test Yöntemi |
|---|--------|--------------|
| AC-01 | Geçerli bilgilerle kayıt olunca 201 dönmeli | Jest / Postman |
| AC-02 | Var olan e-postayla kayıt 409 dönmeli | Jest |
| AC-03 | Doğru kimlikle giriş yapınca JWT token dönmeli | Jest / Postman |
| AC-04 | Yanlış şifreyle giriş 401 dönmeli | Jest |
| AC-05 | Login sonrası customer `/`'e, manager `/admin`'e gitmeli | Cypress / Manuel |
| AC-06 | Boş form submit edilince frontend hataları göstermeli | Manuel |
| AC-07 | Şifre DB'de hash olarak saklanmalı, düz metin bulunmamalı | DB sorgusu |
| AC-08 | Token olmadan korumalı route'a gidince 401 dönmeli | Jest |

---

## 9. Definition of Done

- [ ] `POST /api/auth/register` ve `POST /api/auth/login` çalışıyor
- [ ] `users` tablosu migration ile oluşturulmuş
- [ ] Şifreler bcrypt ile hashleniyor
- [ ] Frontend'de LoginPage ve RegisterPage render oluyor
- [ ] Form validasyonu hem client hem server tarafta çalışıyor
- [ ] Rol bazlı redirect çalışıyor
- [ ] En az 5 unit test yazılmış (backend)
- [ ] `.env.example` dosyası repoya eklenmiş
- [ ] Kod review'dan geçmiş, PR merge edilmiş

---

*Bu PRD CS 308 Software Engineering dersi kapsamında hazırlanmıştır — Sabancı Üniversitesi, 2026*