# Quick Setup Guide
**CS 308 Online Ticketing Platform**

Bu döküman projeyi hızlı bir şekilde çalıştırmanız için adım adım rehberdir.

---

## ⚡ Hızlı Başlangıç (Quick Start)

### 1. Supabase Kurulumu

Projeyi başlatmak için bir Supabase hesabına ihtiyacınız vardır.
1. Supabase üzerinde yeni bir proje oluşturun.
2. `Settings > API` altından URL ve Anon Key bilgilerinizi kopyalayın.

### 2. Backend Kurulumu

```bash
# Backend klasörüne git
cd backend

# Virtual environment oluştur
python3 -m venv venv

# Aktif et (macOS/Linux)
source venv/bin/activate

# Dependencies yükle
pip install -r requirements.txt

# .env dosyası oluştur
cp .env.example .env

# .env dosyasını düzenle - SADECE şunları değiştir:
# SUPABASE_URL=<Sizin URL'niz>
# SUPABASE_KEY=<Sizin Anon Key'iniz>

# Backend'i başlat
uvicorn main:app --reload
```

✅ Backend çalışıyor: http://localhost:8000
✅ API Dokümantasyonu: http://localhost:8000/docs

### 3. Frontend Kurulumu

```bash
# YENİ TERMINAL AÇIN
# Frontend klasörüne git
cd frontend

# Dependencies yükle
npm install

# .env oluştur
cp .env.example .env

# Frontend'i başlat
npm run dev
```

✅ Frontend çalışıyor: http://localhost:5173

---

## 🧪 Testleri Çalıştırma

```bash
cd backend
source venv/bin/activate
pytest
```

---

## 🔑 Test Hesapları

### Manager Hesapları (Supabase Auth üzerinden)

**Sales Manager:**
- E-posta: `sales@ticketing.com`
- Şifre: `Admin1234!`

**Product Manager:**
- E-posta: `product@ticketing.com`
- Şifre: `Admin1234!`

### Customer Hesabı Oluşturma

1. http://localhost:5173/register adresine git
2. Formu doldur
3. "Kayıt Ol" butonuna tıkla
4. Login sayfasına yönlendirileceksiniz

---

## 🐛 Sorun Giderme

### Problem: "Cannot connect to database / Supabase API error"

**Çözüm:**
```bash
# .env dosyasındaki DB bilgilerini kontrol et
cat backend/.env

# SUPABASE_URL ve SUPABASE_KEY doğru olduğunu teyit et.
```

### Problem: "Port 8000 already in use"

**Çözüm:**
```bash
# Port 8000'i kullanan process'i bul
lsof -ti:8000

# Process'i öldür
kill -9 <PID>

# VEYA farklı portta başlat
uvicorn main:app --reload --port 8001
```

### Problem: "pip install" hata veriyor

**Çözüm:**
```bash
# Python versiyon kontrolü (3.10+ olmalı)
python3 --version

# pip'i güncelle
pip install --upgrade pip

# requirements.txt'yi tekrar yükle
pip install -r requirements.txt
```

---

## 📋 Kurulum Checklist

- [ ] Supabase projesi oluşturuldu
- [ ] Backend dependencies yüklendi (`pip install`)
- [ ] Backend `.env` dosyası oluşturuldu ve düzenlendi
- [ ] Backend başlatıldı (`uvicorn main:app --reload`)
- [ ] Frontend dependencies yüklendi (`npm install`)
- [ ] Frontend başlatıldı (`npm run dev`)
- [ ] http://localhost:5173 açıldı
- [ ] Login/Register sayfaları çalışıyor
- [ ] Testler başarılı (`pytest`)

---

## 🎯 Definition of Done Checklist

Tüm gereksinimler PRD'ye göre tamamlandı:

- [x] `POST /api/auth/register` ve `POST /api/auth/login` çalışıyor
- [x] Kullanıcı verileri Supabase üzerinde tutuluyor
- [x] Şifreler güvenli olarak hashleniyor (Supabase Auth)
- [x] Frontend'de LoginPage ve RegisterPage render oluyor
- [x] Form validasyonu hem client hem server tarafta çalışıyor
- [x] Rol bazlı redirect çalışıyor (customer→/, manager→/admin)
- [x] Unit testler yazılmış
- [x] `.env.example` dosyası repoya eklenmiş
- [x] README ve setup guide oluşturulmuş

---

## 📚 Sonraki Adımlar

1. Backend'i başlat: `cd backend && source venv/bin/activate && uvicorn main:app --reload`
2. Frontend'i başlat: `cd frontend && npm run dev`
3. http://localhost:5173 adresini aç
4. Kayıt ol veya manager hesapları ile giriş yap
5. Testleri çalıştır: `cd backend && pytest`

**İyi çalışmalar!** 🚀
