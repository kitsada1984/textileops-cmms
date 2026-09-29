-- 0004: PM plan machine type (Single/Double) + backfill center_checks type
-- Part of CenterCheck -> PM Plan auto-sync by machine type.

-- 1. pmplans needs a Type column to distinguish Single/Double Jersey plans
ALTER TABLE pmplans ADD COLUMN Type TEXT;

-- 2. Backfill: derive center check machine type from document number prefix
--    (CS-S-* = Single Jersey, CS-D-* = Double Jersey) — system-generated prefixes
UPDATE center_checks
SET type = CASE
  WHEN doc_no LIKE 'CS-D-%' THEN 'Double'
  WHEN doc_no LIKE 'CS-S-%' THEN 'Single'
  ELSE type
END
WHERE type IS NULL OR type = '' OR type = 'Single' AND doc_no LIKE 'CS-D-%';

-- 3. cylinders.Last_Check_Date: written by CenterCheck auto-sync but missing from
--    the D1 schema (it silently failed on Supabase too). Add it so the sync works.
ALTER TABLE cylinders ADD COLUMN Last_Check_Date TEXT;
