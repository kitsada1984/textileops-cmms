-- ==============================================================================
-- Migration: Add Design, KI, roll_no columns to repair_requests table
-- Date: 2026-08-29
-- ==============================================================================

-- 1. Add "Design", "KI", "roll_no", "priority" columns to public.repair_requests
ALTER TABLE IF EXISTS public.repair_requests
  ADD COLUMN IF NOT EXISTS "Design" text,
  ADD COLUMN IF NOT EXISTS "design" text,
  ADD COLUMN IF NOT EXISTS "KI" text,
  ADD COLUMN IF NOT EXISTS "ki" text,
  ADD COLUMN IF NOT EXISTS "roll_no" text,
  ADD COLUMN IF NOT EXISTS "RollNo" text,
  ADD COLUMN IF NOT EXISTS "priority" text;

-- 2. Comments explaining the columns
COMMENT ON COLUMN public.repair_requests."Design" IS 'ลายผ้า / Design';
COMMENT ON COLUMN public.repair_requests."KI" IS 'คำสั่งผลิต (KI)';
COMMENT ON COLUMN public.repair_requests."roll_no" IS 'เลขม้วนผ้า (Roll No.)';
COMMENT ON COLUMN public.repair_requests."priority" IS 'ระดับความเร่งด่วน';

-- 3. Enable RLS and verify policies
ALTER TABLE IF EXISTS public.repair_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'repair_requests' AND policyname = 'allow_all_repair_requests'
  ) THEN
    CREATE POLICY "allow_all_repair_requests" ON public.repair_requests
      FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END
$$;
