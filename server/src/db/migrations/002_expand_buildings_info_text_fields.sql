-- Migration: Expand constrained building fields to TEXT
-- Description: Prevents StringDataRightTruncation on long LLM outputs.
-- Date: 2026-04-10

ALTER TABLE buildings_info
ALTER COLUMN meno_budovy TYPE TEXT,
ALTER COLUMN gps_suradnice TYPE TEXT,
ALTER COLUMN rok_vystavby TYPE TEXT,
ALTER COLUMN aktualny_vlastnik TYPE TEXT,
ALTER COLUMN rok_zaradenia TYPE TEXT;
