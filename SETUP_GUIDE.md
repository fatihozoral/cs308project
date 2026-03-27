# Quick Setup Guide
**CS 308 Online Ticketing Platform**

Bu döküman projeyi hızlı bir şekilde çalıştırmanız için adım adım rehberdir.

---

## ⚡ Hızlı Başlangıç (Quick Start)

### 1. PostgreSQL Kurulumu ve Veritabanı Oluşturma

```bash
# PostgreSQL'i başlat (macOS)
brew services start postgresql@14

# PostgreSQL'e bağlan
psql postgres

# Veritabanı oluştur
CREATE DATABASE ticketing_db;

# Çıkış
\q
```

### 2. Backend Kurulumu

```bash
# Backend klasörüne git
cd backend

# Dependencies yükle
npm install

# .env dosyası oluştur
cp .env.example .env

# .env dosyasını düzenle - SADECE şunları değiştir:
# DB_PASSWORD=<PostgreSQL şifreniz>
# JWT_SECRET=<rastgele güvenli bir string>

# Tabloları oluştur (migration)
npm run migrate

# Varsayılan manager hesaplarını oluştur
npm run seed

# Backend'i başlat
npm run dev
```

✅ Backend çalışıyor: http://localhost:5000

### 3. Frontend Kurulumu

```bash
# YENİ TERMINAL AÇIN
# Frontend klasörüne git
cd frontend

# Dependencies yükle
npm install

# Frontend'i başlat
npm start
```

✅ Frontend çalışıyor: http://localhost:3000

---

## 🧪 Testleri Çalıştırma

```bash
cd backend
npm test
```

---

## 🔑 Test Hesapları

### Manager Hesapları (Seed Script ile Oluşturulmuş)

**Sales Manager:**
- E-posta: `sales@ticketing.com`
- Şifre: `Admin1234!`

**Product Manager:**
- E-posta: `product@ticketing.com`
- Şifre: `Admin1234!`

### Customer Hesabı Oluşturma

1. http://localhost:3000/register adresine git
2. Formu doldur
3. "Kayıt Ol" butonuna tıkla
4. Login sayfasına yönlendirileceksiniz

---

## 🐛 Sorun Giderme

### Problem: "Cannot connect to database"

**Çözüm:**
```bash
# PostgreSQL çalışıyor mu kontrol et
brew services list

# Eğer çalışmıyorsa başlat
brew services start postgresql@14

# .env dosyasındaki DB bilgilerini kontrol et
cat backend/.env
```

### Problem: "Port 5000 already in use"

**Çözüm:**
```bash
# Port 5000'i kullanan process'i bul
lsof -ti:5000

# Process'i öldür
kill -9 <PID>

# VEYA backend/.env dosyasında PORT değiştir
PORT=5001
```

### Problem: "Migration failed"

**Çözüm:**
```bash
# PostgreSQL bağlantısını test et
psql -U postgres -d ticketing_db -c "SELECT 1;"

# Eğer veritabanı yoksa oluştur
psql postgres -c "CREATE DATABASE ticketing_db;"

# Migration'ı tekrar çalıştır
npm run migrate
```

### Problem: "npm install" hata veriyor

**Çözüm:**
```bash
# Node version kontrolü (20+ olmalı)
node --version

# npm cache'i temizle
npm cache clean --force

# node_modules'u sil ve yeniden yükle
rm -rf node_modules package-lock.json
npm install
```

---

## 📋 Kurulum Checklist

- [ ] PostgreSQL kuruldu ve çalışıyor
- [ ] `ticketing_db` veritabanı oluşturuldu
- [ ] Backend dependencies yüklendi (`npm install`)
- [ ] Backend `.env` dosyası oluşturuldu ve düzenlendi
- [ ] Migration çalıştırıldı (`npm run migrate`)
- [ ] Seed çalıştırıldı (`npm run seed`)
- [ ] Backend başlatıldı (`npm run dev`)
- [ ] Frontend dependencies yüklendi
- [ ] Frontend başlatıldı (`npm start`)
- [ ] http://localhost:3000 açıldı
- [ ] Login/Register sayfaları çalışıyor
- [ ] Testler başarılı (`npm test`)

---

## 🎯 Definition of Done Checklist

Tüm gereksinimler PRD'ye göre tamamlandı:

- [x] `POST /api/auth/register` ve `POST /api/auth/login` çalışıyor
- [x] `users` tablosu migration ile oluşturulmuş
- [x] Şifreler bcrypt ile hashleniyor (salt rounds: 10)
- [x] Frontend'de LoginPage ve RegisterPage render oluyor
- [x] Form validasyonu hem client hem server tarafta çalışıyor
- [x] Rol bazlı redirect çalışıyor (customer→/, manager→/admin)
- [x] En az 8 unit test yazılmış (tüm AC'ler kapsanmış)
- [x] `.env.example` dosyası repoya eklenmiş
- [x] README ve setup guide oluşturulmuş

---

## 📚 Sonraki Adımlar

1. Backend'i başlat: `cd backend && npm run dev`
2. Frontend'i başlat: `cd frontend && npm start`
3. http://localhost:3000 adresini aç
4. Kayıt ol veya manager hesapları ile giriş yap
5. Testleri çalıştır: `cd backend && npm test`

**İyi çalışmalar!** 🚀
