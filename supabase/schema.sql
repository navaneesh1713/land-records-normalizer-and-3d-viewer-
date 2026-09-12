-- ═══════════════════════════════════════════════════════════════════════════
-- SUPABASE POSTGRESQL SCHEMA FOR SVAMITVA LAND CADASTRE & DILRMP 3.0
-- Project: https://yxhpbiyfkllnitqlmrjk.supabase.co
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. CITIZENS / USERS TABLE
CREATE TABLE IF NOT EXISTS citizens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  aadhaar_number TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  state TEXT DEFAULT 'Karnataka',
  is_verified BOOLEAN DEFAULT false,
  kyc_txn_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index on Aadhaar for fast citizen lookup
CREATE INDEX IF NOT EXISTS idx_citizens_aadhaar ON citizens(aadhaar_number);

-- Enable RLS & open policies for prototype read/write
ALTER TABLE citizens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access on citizens" ON citizens FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on citizens" ON citizens FOR ALL USING (true);


-- 2. LAND_RECORDS TABLE (ULPIN & AADHAAR INTEGRATION)
CREATE TABLE IF NOT EXISTS land_records (
  id TEXT PRIMARY KEY,
  ulpin VARCHAR(14) UNIQUE NOT NULL,                       -- 14-Digit Standard Bhu-Aadhaar
  aadhaar_number TEXT,                                     -- Masked or plain citizen Aadhaar link
  owner_name TEXT NOT NULL,
  survey_number TEXT NOT NULL,
  khasra_number TEXT,
  building_name TEXT,
  house_number TEXT,
  street_name TEXT,
  locality TEXT,
  village_city TEXT,
  district TEXT,
  state TEXT DEFAULT 'Karnataka',
  country TEXT DEFAULT 'India',
  pincode TEXT,
  area_sqm NUMERIC DEFAULT 120,
  floors INTEGER DEFAULT 2,
  classification TEXT DEFAULT 'residential',
  confidence NUMERIC DEFAULT 95,
  dilrmp_sync_status TEXT DEFAULT 'SYNCED',                -- 'SYNCED' or 'PENDING'
  dilrmp_txn_id TEXT,                                      -- DILRMP Central Stack Transaction ID
  latitude NUMERIC DEFAULT 12.985,
  longitude NUMERIC DEFAULT 77.728,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- High-performance indexes for dual-mode search
CREATE INDEX IF NOT EXISTS idx_land_records_ulpin ON land_records(ulpin);
CREATE INDEX IF NOT EXISTS idx_land_records_aadhaar ON land_records(aadhaar_number);
CREATE INDEX IF NOT EXISTS idx_land_records_survey ON land_records(survey_number);

-- Enable RLS & open policies for prototype read/write
ALTER TABLE land_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on land_records" ON land_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on land_records" ON land_records FOR ALL USING (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- SQL QUERIES REQUIRED FOR THE TWO RETRIEVAL MODES:
-- ═══════════════════════════════════════════════════════════════════════════

-- Query 1: Retrieve ALL land records belonging to an owner by their Aadhaar Number
-- Example: Returns all properties/flats/agricultural parcels owned by citizen 'XXXX-XXXX-8492'
-- SELECT * FROM land_records 
-- WHERE aadhaar_number = 'XXXX-XXXX-8492'
-- ORDER BY created_at DESC;

-- Query 2: Retrieve the EXACT land parcel record by its 14-Digit ULPIN (Bhu-Aadhaar)
-- Example: Returns the unique singular title certificate for ULPIN '29849102847201'
-- SELECT * FROM land_records 
-- WHERE ulpin = '29849102847201'
-- LIMIT 1;


-- ═══════════════════════════════════════════════════════════════════════════
-- SEED INITIAL MOCK DATA
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO citizens (name, aadhaar_number, phone, state, is_verified, kyc_txn_id)
VALUES 
  ('Ramesh Kumar Sharma', 'XXXX-XXXX-8492', '+91 98451 23091', 'Karnataka', true, 'UIDAI-KYC-849201'),
  ('विरेन्द्र प्रताप सिंह', 'XXXX-XXXX-3829', '+91 94150 99482', 'Uttar Pradesh', true, 'UIDAI-KYC-382904'),
  ('राजेश मारुती पाटील', 'XXXX-XXXX-9104', '+91 98220 48192', 'Maharashtra', false, null)
ON CONFLICT (aadhaar_number) DO NOTHING;

INSERT INTO land_records (
  id, ulpin, aadhaar_number, owner_name, survey_number, khasra_number, building_name, 
  house_number, street_name, locality, village_city, district, state, area_sqm, floors, 
  classification, confidence, dilrmp_sync_status, dilrmp_txn_id
) VALUES 
  (
    'REC-KA-2026-0891', '29841029471024', 'XXXX-XXXX-8492', 'Ramesh Kumar Sharma & Meera Ramesh', 
    '48/2A', '48/2A', 'Shree Sai Residency', 'Flat 302, Bldg 4B', 'Kadugodi Main Road', 
    'Whitefield Zone', 'Kadugodi, Bengaluru', 'Bengaluru Urban', 'Karnataka', 134.7, 3, 
    'residential', 96, 'SYNCED', 'DILRMP-MIS-2026-891024'
  ),
  (
    'REC-KA-2026-0892', '29841029471025', 'XXXX-XXXX-8492', 'Ramesh Kumar Sharma', 
    '48/2B', '48/2B', 'Shree Sai Commercial Wing', 'Shop G-04', 'Kadugodi Main Road', 
    'Whitefield Zone', 'Kadugodi, Bengaluru', 'Bengaluru Urban', 'Karnataka', 88.5, 1, 
    'commercial', 98, 'SYNCED', 'DILRMP-MIS-2026-891025'
  ),
  (
    'REC-UP-2026-4102', '09712048912048', 'XXXX-XXXX-3829', 'विरेन्द्र प्रताप सिंह व सन्तोष कुमार', 
    '184/3', '184/3', 'Pratap Mansion', 'House No. 184/A', 'GT Road Bypass', 
    'Shivpur Industrial Sector', 'Shivpur, Varanasi', 'Varanasi', 'Uttar Pradesh', 2424.8, 3, 
    'residential', 94, 'SYNCED', 'DILRMP-MIS-2026-410291'
  ),
  (
    'REC-MH-2026-9311', '27649102849102', 'XXXX-XXXX-9104', 'राजेश मारुती पाटील (Rajesh M. Patil)', 
    '302/1B', '302/1B', 'Patil Commercial Arcade', 'Building 12', 'Nagar Highway', 
    'Wagholi East', 'Wagholi, Pune', 'Pune', 'Maharashtra', 4856.2, 4, 
    'commercial', 95, 'PENDING', null
  )
ON CONFLICT (ulpin) DO UPDATE SET 
  owner_name = EXCLUDED.owner_name,
  aadhaar_number = EXCLUDED.aadhaar_number,
  dilrmp_sync_status = EXCLUDED.dilrmp_sync_status;
