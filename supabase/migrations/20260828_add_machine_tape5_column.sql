-- ==============================================================================
-- Migration: Add Tape5_No (สายพาน เทป 5) column to machines table
-- Date: 2026-08-28
-- ==============================================================================

-- 1. Add "Tape5_No" column to public.machines if it doesn't exist
ALTER TABLE IF EXISTS public.machines
  ADD COLUMN IF NOT EXISTS "Tape5_No" text;

-- 2. Add lowercase alias "tape5_no" just in case any query uses lowercase naming
ALTER TABLE IF EXISTS public.machines
  ADD COLUMN IF NOT EXISTS "tape5_no" text;

-- 3. Comment explaining the column
COMMENT ON COLUMN public.machines."Tape5_No" IS 'พารามิเตอร์สายพาน เทป 5 (Tape 5 No.)';
