-- 0005_needle_conditions.sql
-- Dedicated table for needle-condition inspection records.
-- Previously every record was rewritten as one JSON blob inside the legacy
-- SYS_NEEDLE_CONDITIONS workorder row (read-modify-write of the whole list),
-- so two inspectors saving at the same time could overwrite each other.

CREATE TABLE IF NOT EXISTS needle_conditions (
  id TEXT PRIMARY KEY,
  serial TEXT,
  machine_mc TEXT,
  location TEXT,
  type TEXT,
  doc_date TEXT,
  counter NUMERIC,
  status TEXT,
  needle_condition TEXT,
  remark TEXT,
  images TEXT,
  inspector TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_needle_conditions_serial ON needle_conditions(serial);
CREATE INDEX IF NOT EXISTS idx_needle_conditions_doc_date ON needle_conditions(doc_date);
CREATE INDEX IF NOT EXISTS idx_needle_conditions_machine ON needle_conditions(machine_mc);
