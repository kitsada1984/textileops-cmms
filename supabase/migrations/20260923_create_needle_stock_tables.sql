-- Migration: Create needle stock tables (needle_sets, needle_history_logs, needle_configs)
-- Supports needle_grade_latest_v16 full functionality in TextileOps CMMS

-- 1. Table: needle_sets
CREATE TABLE IF NOT EXISTS public.needle_sets (
  id TEXT PRIMARY KEY,                       -- e.g. 'NS-0001'
  "Set_ID" TEXT,
  "Machine_Type" TEXT DEFAULT 'Single',
  "Gauge" TEXT DEFAULT '28G',
  "Machine_ID" TEXT,
  "Brand" TEXT,
  "Needle_Model" TEXT,
  "Grade" TEXT DEFAULT 'เกรด B',
  "Condition_Detail" TEXT DEFAULT 'สึกปานกลาง',
  "Status" TEXT DEFAULT 'คัดแล้ว',
  "Quantity" INTEGER DEFAULT 0,
  "Date_Recorded" DATE DEFAULT CURRENT_DATE,
  "Inspector" TEXT DEFAULT 'tuk',
  "Remarks" TEXT,
  "Image_URLs" JSONB DEFAULT '[]'::jsonb,
  "Location" TEXT DEFAULT 'STORE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.needle_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_needle_sets" ON public.needle_sets;
CREATE POLICY "allow_all_needle_sets" ON public.needle_sets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Index for search and filter performance
CREATE INDEX IF NOT EXISTS idx_needle_sets_grade ON public.needle_sets ("Grade");
CREATE INDEX IF NOT EXISTS idx_needle_sets_machine_type ON public.needle_sets ("Machine_Type");
CREATE INDEX IF NOT EXISTS idx_needle_sets_gauge ON public.needle_sets ("Gauge");
CREATE INDEX IF NOT EXISTS idx_needle_sets_location ON public.needle_sets ("Location");

-- 2. Table: needle_history_logs
CREATE TABLE IF NOT EXISTS public.needle_history_logs (
  id TEXT PRIMARY KEY,                       -- e.g. 'LOG-0001'
  "Log_ID" TEXT,
  "Set_ID" TEXT,
  "Action_Type" TEXT,
  "Old_Grade" TEXT,
  "New_Grade" TEXT,
  "Condition_Detail" TEXT,
  "Quantity" INTEGER DEFAULT 0,
  "Date_Action" DATE DEFAULT CURRENT_DATE,
  "Technician" TEXT DEFAULT 'tuk',
  "Remarks" TEXT,
  "Image_URLs" JSONB DEFAULT '[]'::jsonb,
  "Target_Machine" TEXT,
  "Source_From" TEXT,
  "Scrap_Reason" TEXT,
  "Qty_Change" TEXT,
  "Balance_After" INTEGER DEFAULT 0,
  "Stock_Detail" TEXT DEFAULT 'PM',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.needle_history_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_needle_history_logs" ON public.needle_history_logs;
CREATE POLICY "allow_all_needle_history_logs" ON public.needle_history_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_needle_history_set_id ON public.needle_history_logs ("Set_ID");
CREATE INDEX IF NOT EXISTS idx_needle_history_date_action ON public.needle_history_logs ("Date_Action");

-- 3. Table: needle_configs
CREATE TABLE IF NOT EXISTS public.needle_configs (
  id SERIAL PRIMARY KEY,
  "Category" TEXT NOT NULL,
  "Value" TEXT NOT NULL,
  "Description" TEXT,
  "Sort_Order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.needle_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_needle_configs" ON public.needle_configs;
CREATE POLICY "allow_all_needle_configs" ON public.needle_configs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
