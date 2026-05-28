-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- ─── Organizations & Sites ───────────────────────────────────────────────────
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES organizations(id),
  timezone    TEXT NOT NULL DEFAULT 'Europe/Paris',
  retention_days INT NOT NULL DEFAULT 365,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id),
  name        TEXT NOT NULL,
  address     TEXT,
  location    GEOGRAPHY(POINT, 4326),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id),
  email        TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('admin','manager','viewer')),
  site_id      UUID REFERENCES sites(id),
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Fleet ───────────────────────────────────────────────────────────────────
CREATE TABLE vehicles (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id               UUID NOT NULL REFERENCES organizations(id),
  site_id              UUID REFERENCES sites(id),
  registration         TEXT NOT NULL UNIQUE,
  brand                TEXT,
  model                TEXT,
  year                 INT,
  fuel_type            TEXT CHECK (fuel_type IN ('diesel','essence','electric','hybrid','gaz')),
  tank_capacity_l      NUMERIC(6,1),
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  odometer_km          NUMERIC(10,1) DEFAULT 0,
  webfleet_object_uid  TEXT,
  commissioned_at      DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE drivers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  last_name       TEXT NOT NULL,
  first_name      TEXT NOT NULL,
  email           TEXT UNIQUE,
  phone           TEXT,
  license_number  TEXT,
  license_class   TEXT,
  driving_score   NUMERIC(4,1) DEFAULT 100,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  hired_at        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicle_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id),
  driver_id   UUID NOT NULL REFERENCES drivers(id),
  started_at  TIMESTAMPTZ NOT NULL,
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Telemetry (TimescaleDB) ─────────────────────────────────────────────────
CREATE TABLE positions (
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id),
  recorded_at TIMESTAMPTZ NOT NULL,
  lat         NUMERIC(10,7) NOT NULL,
  lng         NUMERIC(10,7) NOT NULL,
  speed_kmh   NUMERIC(5,1),
  heading     NUMERIC(5,1),
  altitude_m  NUMERIC(7,1),
  source      TEXT DEFAULT 'webfleet'
);
SELECT create_hypertable('positions', 'recorded_at');
CREATE INDEX ON positions (vehicle_id, recorded_at DESC);

CREATE TABLE trips (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
  driver_id       UUID REFERENCES drivers(id),
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ,
  distance_km     NUMERIC(8,2),
  duration_min    INT,
  fuel_l          NUMERIC(6,2),
  co2_kg          NUMERIC(6,2),
  driving_score   NUMERIC(4,1),
  start_address   TEXT,
  end_address     TEXT,
  source          TEXT DEFAULT 'webfleet',
  external_id     TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE driving_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id     UUID NOT NULL REFERENCES trips(id),
  event_type  TEXT NOT NULL CHECK (event_type IN ('harsh_brake','harsh_accel','speeding','sharp_turn','idle')),
  recorded_at TIMESTAMPTZ NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high'))
);

-- ─── Fuel ────────────────────────────────────────────────────────────────────
CREATE TABLE fuel_transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id       UUID REFERENCES vehicles(id),
  driver_id        UUID REFERENCES drivers(id),
  site_id          UUID REFERENCES sites(id),
  provider         TEXT NOT NULL CHECK (provider IN ('tankyou','total','other')),
  transacted_at    TIMESTAMPTZ NOT NULL,
  volume_l         NUMERIC(7,2) NOT NULL,
  unit_price_eur   NUMERIC(6,4),
  total_eur        NUMERIC(8,2) NOT NULL,
  station_name     TEXT,
  station_lat      NUMERIC(10,7),
  station_lng      NUMERIC(10,7),
  fraud_status     TEXT NOT NULL DEFAULT 'clear' CHECK (fraud_status IN ('clear','suspect','confirmed_fraud')),
  external_id      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fraud_alerts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES fuel_transactions(id),
  alert_type     TEXT NOT NULL,
  risk_score     NUMERIC(4,2) NOT NULL,
  description    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','false_positive')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ
);

-- ─── Maintenance ─────────────────────────────────────────────────────────────
CREATE TABLE maintenance_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
  plan_type       TEXT NOT NULL,
  odometer_threshold_km NUMERIC(10,1),
  interval_days   INT,
  last_done_at    TIMESTAMPTZ,
  next_due_at     TIMESTAMPTZ,
  active          BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE maintenance_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id   UUID NOT NULL REFERENCES vehicles(id),
  plan_id      UUID REFERENCES maintenance_plans(id),
  done_at      TIMESTAMPTZ NOT NULL,
  odometer_km  NUMERIC(10,1),
  provider     TEXT,
  cost_eur     NUMERIC(8,2),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Alerts ──────────────────────────────────────────────────────────────────
CREATE TABLE alerts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID NOT NULL REFERENCES organizations(id),
  vehicle_id     UUID REFERENCES vehicles(id),
  alert_type     TEXT NOT NULL,
  severity       TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  message        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id)
);

-- ─── API Connectors ──────────────────────────────────────────────────────────
CREATE TABLE api_connectors (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id),
  provider         TEXT NOT NULL,
  credentials_enc  TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','error','disabled')),
  last_sync_at     TIMESTAMPTZ,
  config           JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sync_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id     UUID NOT NULL REFERENCES api_connectors(id),
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,
  status           TEXT NOT NULL CHECK (status IN ('running','success','error')),
  records_count    INT DEFAULT 0,
  error_count      INT DEFAULT 0,
  error_message    TEXT
);

-- ─── Seed: default org + admin user ─────────────────────────────────────────
INSERT INTO organizations (id, name, timezone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Ma Flotte', 'Europe/Paris');

-- Password: Admin1234! (bcrypt, change at first login)
INSERT INTO users (id, org_id, email, name, password_hash, role) VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'admin@maflotte.fr', 'Administrateur',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lfcCVE0JmP3iVCJua',
   'admin');
