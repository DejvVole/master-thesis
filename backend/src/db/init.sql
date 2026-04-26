-- Povoliť pgvector rozšírenie
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabuľka pre PDF dokumenty
CREATE TABLE IF NOT EXISTS source_documents (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64) UNIQUE,  -- SHA-256 hash obsahu súboru pre detekciu duplikátov
    file_path VARCHAR(500),  -- MinIO object name
    metadata JSONB,
    processed_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pre rýchle vyhľadávanie podľa hash
CREATE INDEX IF NOT EXISTS idx_source_docs_file_hash ON source_documents(file_hash);

-- Tracking spracovania dokumentov
CREATE TABLE IF NOT EXISTS document_processing (
    id SERIAL PRIMARY KEY,
    source_document_id INT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
    minio_object_name VARCHAR(500) NOT NULL,
    minio_bucket VARCHAR(100) NOT NULL DEFAULT 'raw-pdfs',
    chroma_collection_name VARCHAR(100) NOT NULL,

    chunks_count INT DEFAULT 0,
    
    -- Timestamps
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(source_document_id, minio_object_name)
);

ALTER TABLE document_processing
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Hlavná tabuľka budov
CREATE TABLE IF NOT EXISTS buildings_info (
    id SERIAL PRIMARY KEY,
    source_document_id INT REFERENCES source_documents(id),
    
    -- Základné informácie
    meno_budovy TEXT,
    adresa TEXT,
    gps_suradnice TEXT,
    rok_vystavby TEXT,
    aktualny_vlastnik TEXT,
    
    -- Historické údaje
    rok_zaradenia TEXT,
    historicky_vyznam TEXT,
    zaznamy_o_obnove TEXT,
    
    -- Materiály a konštrukcia
    material_vonkajsej_fasady TEXT,
    typ_strechy TEXT,
    material_interieru TEXT,
    ine_materialy TEXT,
    
    -- Stav budovy
    aktualny_stav TEXT,
    kriticke_miesta TEXT,
    potrebne_sanacie TEXT,
    
    -- Dokumentácia
    sucasne_fotografie TEXT,
    historicke_fotografie TEXT,
    plany_a_schemy TEXT,
    
    -- Údržba
    harmonogram_udrzby TEXT,
    revizne_zaznamy TEXT,
    ochranne_zony TEXT,
    
    -- Legislatíva
    povolenia_na_zasahy TEXT,
    legislativne_obmedzenia TEXT,
    
    -- Digitálne modely
    digitalne_vykresy TEXT,
    
    -- Výskum
    archeologicke_vyskumy TEXT,
    chemicke_analyzy TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE buildings_info 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_buildings_info_hidden ON buildings_info(is_hidden);

-- Add hidden column to source_documents for tracking
ALTER TABLE source_documents 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_source_docs_hidden ON source_documents(is_hidden);

-- Tabuľka pre embeddingy všetkých kategórií budovy
CREATE TABLE IF NOT EXISTS buildings_info_embed (
    id SERIAL PRIMARY KEY,
    budova_id INT NOT NULL REFERENCES buildings_info(id) ON DELETE CASCADE,
    
    -- Základné informácie (embeddingy)
    meno_budovy_emb vector(1536),
    adresa_emb vector(1536),
    gps_suradnice_emb vector(1536),
    rok_vystavby_emb vector(1536),
    aktualny_vlastnik_emb vector(1536),
    
    -- Historické údaje
    rok_zaradenia_emb vector(1536),
    historicky_vyznam_emb vector(1536),
    zaznamy_o_obnove_emb vector(1536),
    
    -- Materiály a konštrukcia
    material_vonkajsej_fasady_emb vector(1536),
    typ_strechy_emb vector(1536),
    material_interieru_emb vector(1536),
    ine_materialy_emb vector(1536),
    
    -- Stav budovy
    aktualny_stav_emb vector(1536),
    kriticke_miesta_emb vector(1536),
    potrebne_sanacie_emb vector(1536),
    
    -- Dokumentácia
    sucasne_fotografie_emb vector(1536),
    historicke_fotografie_emb vector(1536),
    plany_a_schemy_emb vector(1536),
    
    -- Údržba
    harmonogram_udrzby_emb vector(1536),
    revizne_zaznamy_emb vector(1536),
    ochranne_zony_emb vector(1536),
    
    -- Legislatíva
    povolenia_na_zasahy_emb vector(1536),
    legislativne_obmedzenia_emb vector(1536),
    
    -- Digitálne modely
    digitalne_vykresy_emb vector(1536),
    
    -- Výskum
    archeologicke_vyskumy_emb vector(1536),
    chemicke_analyzy_emb vector(1536),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(budova_id)
);

-- Index pre rýchle vyhľadávanie
CREATE INDEX IF NOT EXISTS idx_buildings_info_embed_budova ON buildings_info_embed(budova_id);

-- Indexy pre rýchlejšie vyhľadávanie
CREATE INDEX IF NOT EXISTS idx_source_docs_file_name ON source_documents(file_name);
CREATE INDEX IF NOT EXISTS idx_doc_processing_source ON document_processing(source_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_processing_minio ON document_processing(minio_object_name);
CREATE INDEX IF NOT EXISTS idx_buildings_info_source_doc ON buildings_info(source_document_id);
CREATE INDEX IF NOT EXISTS idx_budovy_meno ON buildings_info(meno_budovy);

-- Tabuľka pre metadata o zdroji informácií
CREATE TABLE IF NOT EXISTS buildings_info_sources (
    id SERIAL PRIMARY KEY,
    budova_id INT NOT NULL REFERENCES buildings_info(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('EXTRACTED', 'INFERRED', 'MISSING', 'EDITED')),
    confidence TEXT CHECK (confidence IN ('LOW', 'MEDIUM', 'HIGH') OR confidence IS NULL),
    reasoning TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(budova_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_buildings_sources_budova ON buildings_info_sources(budova_id);
CREATE INDEX IF NOT EXISTS idx_buildings_sources_type ON buildings_info_sources(source_type);

-- Trigger pre auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_budovy_updated_at
    BEFORE UPDATE ON buildings_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 1. Číselník normalizovaných hodnôt (single source of truth)
CREATE TABLE IF NOT EXISTS normalized_value_options (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,  -- 'typ_strechy', 'material_fasady', 'obdobie', ...
    value TEXT NOT NULL,     -- 'SEDLOVÁ', 'TEHLA', 'STREDOVEK', ...
    display_label TEXT,      -- Pre UI (môže byť NULL, default = value)
    sort_order INTEGER DEFAULT 0,    -- Pre triedenie v UI
    is_active BOOLEAN DEFAULT true,  -- Či sa má zobrazovať v filtroch
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_category_value UNIQUE(category, value)
);

ALTER TABLE normalized_value_options
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Index pre rýchle vyhľadávanie
CREATE INDEX IF NOT EXISTS idx_normalized_options_category ON normalized_value_options(category);
CREATE INDEX IF NOT EXISTS idx_normalized_options_active ON normalized_value_options(category, is_active);

-- 2. Prepojovacia tabuľka buildings <-> normalized values
CREATE TABLE IF NOT EXISTS buildings_normalized_values (
    id SERIAL PRIMARY KEY,
    building_id INTEGER NOT NULL REFERENCES buildings_info(id) ON DELETE CASCADE,
    normalized_option_id INTEGER NOT NULL REFERENCES normalized_value_options(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_building_option UNIQUE(building_id, normalized_option_id)
);

-- Indexy pre filtrovanie
CREATE INDEX IF NOT EXISTS idx_buildings_normalized_building ON buildings_normalized_values(building_id);
CREATE INDEX IF NOT EXISTS idx_buildings_normalized_option ON buildings_normalized_values(normalized_option_id);
CREATE INDEX IF NOT EXISTS idx_buildings_normalized_category ON buildings_normalized_values(building_id, normalized_option_id);

-- 3. Špeciálny stĺpec pre rok výstavby (zostáva priamo v buildings_info)
ALTER TABLE buildings_info 
ADD COLUMN IF NOT EXISTS rok_vystavby_normalized INTEGER;

CREATE INDEX IF NOT EXISTS idx_buildings_rok_normalized ON buildings_info(rok_vystavby_normalized);

-- 4. Better Auth tabuľky
CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "banned" BOOLEAN DEFAULT FALSE,
    "ban_reason" TEXT,
    "ban_expires" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
    "id" TEXT PRIMARY KEY,
    "expires_at" TIMESTAMP NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
    "id" TEXT PRIMARY KEY,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP,
    "refresh_token_expires_at" TIMESTAMP,
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "verification" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "invitation" (
    "id" SERIAL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "invited_by" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "accepted_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS session_user_id_idx ON "session"("user_id");
CREATE INDEX IF NOT EXISTS session_token_idx ON "session"("token");
CREATE INDEX IF NOT EXISTS account_user_id_idx ON "account"("user_id");
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"("identifier");
CREATE INDEX IF NOT EXISTS user_role_idx ON "user"("role");
CREATE INDEX IF NOT EXISTS user_banned_idx ON "user"("banned");
CREATE INDEX IF NOT EXISTS invitation_email_idx ON "invitation"("email");

-- 5. Seed základných hodnôt
INSERT INTO normalized_value_options (category, value, display_label, sort_order) VALUES
-- Typ strechy
('typ_strechy', 'SEDLOVÁ', 'Sedlová', 1),
('typ_strechy', 'VALBOVÁ', 'Valbová', 2),
('typ_strechy', 'PULTOVÁ', 'Pultová', 3),
('typ_strechy', 'MANSARDOVÁ', 'Mansardová', 4),
('typ_strechy', 'PLOCHÁ', 'Plochá', 5),
('typ_strechy', 'STANOVÁ', 'Stanová', 6),
('typ_strechy', 'INÁ', 'Iná', 99),

-- Materiál fasády
('material_fasady', 'TEHLA', 'Tehla', 1),
('material_fasady', 'KAMEŇ', 'Kameň', 2),
('material_fasady', 'DREVO', 'Drevo', 3),
('material_fasady', 'OMIETKA', 'Omietka', 4),
('material_fasady', 'BETON', 'Betón', 5),
('material_fasady', 'SKLO', 'Sklo', 6),
('material_fasady', 'KOV', 'Kov', 7),
('material_fasady', 'KOMBINOVANÉ', 'Kombinované', 8),
('material_fasady', 'INÉ', 'Iné', 99),

-- Materiál interiéru
('material_interieru', 'DREVO', 'Drevo', 1),
('material_interieru', 'OMIETKA', 'Omietka', 2),
('material_interieru', 'TEHLA', 'Tehla', 3),
('material_interieru', 'KAMEŇ', 'Kameň', 4),
('material_interieru', 'SADROKARTÓN', 'Sadrokartón', 5),
('material_interieru', 'DLAŽBA', 'Dlažba', 6),
('material_interieru', 'MRAMOR', 'Mramor', 7),
('material_interieru', 'KOMBINOVANÉ', 'Kombinované', 8),
('material_interieru', 'INÉ', 'Iné', 99),

-- Aktuálny stav
('aktualny_stav', 'VÝBORNÝ', 'Výborný', 1),
('aktualny_stav', 'DOBRÝ', 'Dobrý', 2),
('aktualny_stav', 'VYHOVUJÚCI', 'Vyhovujúci', 3),
('aktualny_stav', 'ZHORŠENÝ', 'Zhoršený', 4),
('aktualny_stav', 'HAVARIJNÝ', 'Havarijný', 5),
('aktualny_stav', 'V_REKONŠTRUKCII', 'V rekonštrukcii', 6),

-- Historické obdobie
('obdobie', 'STAROVEK', 'Starovek (do 476)', 1),
('obdobie', 'STREDOVEK', 'Stredovek (476-1492)', 2),
('obdobie', 'NOVOVEK', 'Novovek (1492-1789)', 3),
('obdobie', '19_STOROCIE', '19. storočie (1800-1899)', 4),
('obdobie', '20_STOROCIE', '20. storočie (1900-1999)', 5),
('obdobie', 'MODERNA', 'Moderna (2000+)', 6)

ON CONFLICT (category, value) DO NOTHING;