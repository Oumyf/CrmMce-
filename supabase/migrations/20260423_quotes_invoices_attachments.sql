-- ============================================================
-- Colonnes attachments pour devis et factures
-- ⚠️  À exécuter dans l'éditeur SQL Supabase
-- ============================================================

ALTER TABLE quotes   ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}';

-- Bucket pour les documents devis/factures (si pas déjà créé via dashboard)
-- À créer manuellement dans Storage > New bucket : "quote-invoice-files" (public)
