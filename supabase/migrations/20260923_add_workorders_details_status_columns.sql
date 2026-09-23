-- ==============================================================================
-- Migration: Add Details, details, Problem and verify Status in public.workorders
-- Ensures work orders have comprehensive column support for problem description,
-- details, and execution status across frontend and database.
-- ==============================================================================

-- 1. Ensure columns exist
ALTER TABLE public.workorders ADD COLUMN IF NOT EXISTS "Comment" text;
ALTER TABLE public.workorders ADD COLUMN IF NOT EXISTS "Details" text;
ALTER TABLE public.workorders ADD COLUMN IF NOT EXISTS "details" text;
ALTER TABLE public.workorders ADD COLUMN IF NOT EXISTS "Problem" text;
ALTER TABLE public.workorders ADD COLUMN IF NOT EXISTS "Status" text DEFAULT 'IN_PROGRESS';

-- 2. Backfill existing records if Details is null
UPDATE public.workorders
SET "Details" = COALESCE("Details", "Comment", "Problem"),
    "Comment" = COALESCE("Comment", "Details", "Problem")
WHERE "Details" IS NULL OR "Comment" IS NULL;
