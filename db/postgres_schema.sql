-- UtsavGrid PostgreSQL + PostGIS Schema (Supabase / Self-Hosted PostgreSQL Ready)
-- Paste into Supabase SQL Editor or execute via: psql "$DATABASE_URL" -f db/postgres_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Event Management Companies / Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  pincode TEXT NOT NULL,
  location GEOGRAPHY(Point, 4326),
  rating NUMERIC(2, 1) NOT NULL DEFAULT 4.8,
  review_count INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT true,
  response_minutes INTEGER NOT NULL DEFAULT 15,
  guest_capacity_min INTEGER NOT NULL DEFAULT 30,
  guest_capacity_max INTEGER NOT NULL DEFAULT 800,
  cover_image TEXT NOT NULL,
  about TEXT NOT NULL,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  razorpay_linked_account_id TEXT,
  commission_rate_bps INTEGER NOT NULL DEFAULT 800, -- 8.00%
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_city_category ON vendors (city, category);
CREATE INDEX IF NOT EXISTS idx_vendors_geo ON vendors USING GIST (location);

-- 2. Schema-Driven Service Packages (JSONB supports diverse event categories)
CREATE TABLE IF NOT EXISTS service_packages (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  base_price_inr INTEGER NOT NULL CHECK (base_price_inr > 0),
  per_guest_price_inr INTEGER NOT NULL DEFAULT 0,
  included_guests INTEGER NOT NULL DEFAULT 100,
  deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  addons JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Vendor Manual Availability Blackouts (offline bookings / maintenance)
CREATE TABLE IF NOT EXISTS vendor_blocked_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  slot_window TEXT NOT NULL CHECK (slot_window IN ('morning', 'evening', 'full_day')),
  reason TEXT NOT NULL DEFAULT 'Reserved offline by vendor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendor_id, event_date, slot_window)
);

-- 4. Short-TTL Checkout Slot Holds (10-minute lock preventing double-bookings)
CREATE TABLE IF NOT EXISTS slot_holds (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL REFERENCES service_packages(id),
  event_date DATE NOT NULL,
  slot_window TEXT NOT NULL CHECK (slot_window IN ('morning', 'evening', 'full_day')),
  session_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendor_id, event_date, slot_window)
);

-- 5. Confirmed & Historical Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  booking_code TEXT NOT NULL UNIQUE,
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  package_id TEXT NOT NULL REFERENCES service_packages(id),
  event_date DATE NOT NULL,
  slot_window TEXT NOT NULL CHECK (slot_window IN ('morning', 'evening', 'full_day')),
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  selected_addon_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  payment_plan TEXT NOT NULL CHECK (payment_plan IN ('full', 'token_25')),
  payment_method TEXT NOT NULL,
  subtotal_inr INTEGER NOT NULL,
  gst_inr INTEGER NOT NULL,
  total_inr INTEGER NOT NULL,
  amount_paid_inr INTEGER NOT NULL,
  balance_due_inr INTEGER NOT NULL,
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique index guarantees zero double-bookings for active bookings
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_vendor_slot_booking
  ON bookings (vendor_id, event_date, slot_window)
  WHERE status IN ('confirmed', 'in_progress', 'completed');

-- 6. Razorpay Webhook Idempotency Log
CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Live Customizable Frontend Theme & Layout Configuration
CREATE TABLE IF NOT EXISTS theme_configs (
  id TEXT PRIMARY KEY DEFAULT 'default',
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
