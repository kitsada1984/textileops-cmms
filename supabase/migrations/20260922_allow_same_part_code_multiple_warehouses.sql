-- Migration: Allow same Part_Code across different warehouses (Location_Store)
-- Description:
-- Previously, the spareparts table had a UNIQUE constraint on Part_Code alone ("spareparts_Part_Code_key").
-- This migration drops that constraint and adds a composite unique index on (Part_Code, Location_Store),
-- allowing parts like "SP-027" to have separate inventory records in "Store", "GMK", "GMK1", "GMK3", etc.

-- 1. Drop existing single-column unique constraint on Part_Code
ALTER TABLE public.spareparts 
  DROP CONSTRAINT IF EXISTS "spareparts_Part_Code_key";

-- 2. Create composite unique index to prevent duplicate records within the SAME warehouse
-- COALESCE ensures null or empty locations are treated consistently
CREATE UNIQUE INDEX IF NOT EXISTS spareparts_part_code_location_idx 
  ON public.spareparts ("Part_Code", COALESCE("Location_Store", ''));
