-- Migration: Add file_hash column to source_documents
-- Description: Adds SHA-256 hash for duplicate detection based on file content instead of just filename
-- Date: 2026-02-05

-- Pridaj stĺpec file_hash (nullable kvôli existujúcim záznamom)
ALTER TABLE source_documents 
ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);

-- Odstráň starý unikátny constraint na file_name (ak existuje)
-- Poznámka: file_name už nemusí byť unikátne, keďže duplikáty kontrolujeme podľa hashu
ALTER TABLE source_documents DROP CONSTRAINT IF EXISTS source_documents_file_name_key;

-- Pridaj UNIQUE constraint na file_hash
-- Poznámka: ON CONFLICT vyžaduje constraint, nie len index
ALTER TABLE source_documents 
ADD CONSTRAINT source_documents_file_hash_key UNIQUE (file_hash);

-- Pridaj index pre rýchle vyhľadávanie podľa hash (je vytvorený automaticky s UNIQUE constraint)
-- CREATE INDEX IF NOT EXISTS idx_source_docs_file_hash ON source_documents(file_hash);

COMMENT ON COLUMN source_documents.file_hash IS 'SHA-256 hash obsahu súboru pre detekciu duplikátov';
