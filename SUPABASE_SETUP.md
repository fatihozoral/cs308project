# Supabase Veritabanı Güncelleme Komutları

Yazdığımız kapasite yönetimi, spor müsabakaları kategorileri ve sipariş detaylarındaki kategorizasyonların tam arka plan desteğine kavuşabilmesi için Supabase veritabanında (`ticketing_db`) aşağıdaki **SQL** komutlarını çalıştırmanız gerekmektedir. 

*Not: Eğer Supabase Dashboard kullanıyorsanız, soldaki menüden "SQL Editor" sekmesine tıklayın, "New query" diyerek aşağıdaki sütun ekleme (ALTER TABLE) komutlarını yapıştırın ve "RUN" butonuna basın.*

```sql
-- ==========================================
-- 1. EVENTS TABLOSU İÇİN YENİ SÜTUNLAR
-- ==========================================
-- Etkinliklerin toplam kapasitesini, anlık kalan kapasitesini 
-- ve spor müsabakalarındaki gibi özel alanların (VIP vb.) kapasitelerini tutar.

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS total_capacity integer,
ADD COLUMN IF NOT EXISTS remaining_capacity integer,
ADD COLUMN IF NOT EXISTS ticket_categories jsonb;


-- ==========================================
-- 2. ORDER_ITEMS (SİPARİŞ DETAYLARI) TABLOSU İÇİN YENİ SÜTUN
-- ==========================================
-- Kullanıcının seçtiği Kategori bilgisini (örneğin "VIP" veya "1. Kategori") 
-- sepetten backend'e iletirken veritabanında tutar.

ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS category text;


-- ==========================================
-- 3. ORDERS (SİPARİŞLER) TABLOSU İÇİN YENİ SÜTUNLAR
-- ==========================================
-- Teslimat listesinde asgari olarak bulunması gereken müşteri adı, adresi,
-- e-postası ve vergi numarası gibi bilgileri sipariş anında orders tablosuna kaydeder.

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS user_name text,
ADD COLUMN IF NOT EXISTS user_email text,
ADD COLUMN IF NOT EXISTS home_address text,
ADD COLUMN IF NOT EXISTS tax_id text;
```

### Örnek Tablo İçeriği (JSONB - `ticket_categories`)
Spor müsabakalarında bu yapıyı kullanabilmeniz için bir tablo satırında `ticket_categories` JSON alanına manuel olarak girebileceğiniz veya admin panelinizden ayarlayacağınız örnek veri:

```json
[
  {"name": "VIP", "price": 1500, "capacity": 100, "remaining": 100},
  {"name": "1. Kategori", "price": 800, "capacity": 500, "remaining": 500},
  {"name": "2. Kategori", "price": 500, "capacity": 1500, "remaining": 1500},
  {"name": "Kale Arkası", "price": 250, "capacity": 3000, "remaining": 3000}
]
```

-- ==========================================
-- 4. YENİ EKSİKLİKLER (G9, G11, G15) İÇİN SQL MİGRASYONU
-- ==========================================

-- G9: Fiziksel/Donanımsal Mock Özellikler
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS model text,
ADD COLUMN IF NOT EXISTS serial_number text,
ADD COLUMN IF NOT EXISTS warranty_status text,
ADD COLUMN IF NOT EXISTS distributor_info text;

-- G11: Kampanya İndirim Oranı (%0 - %90)
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS discount_rate integer DEFAULT 0;

-- G11: İstek Listesi ve Genel Bildirimler Hub'ı
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- G15: Ürün Bazlı (Selective) İade ve Geri Ödeme Süreci
CREATE TABLE IF NOT EXISTS public.returns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id integer NOT NULL,
    order_item_id integer NOT NULL,
    user_id uuid NOT NULL,
    quantity integer NOT NULL,
    price float NOT NULL, -- Biletin satın alındığı andaki indirimli fiyatı (kilitlenmiş fiyat)
    status text DEFAULT 'pending', -- pending, approved, rejected
    reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

