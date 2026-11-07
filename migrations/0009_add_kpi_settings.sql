-- migrations/0009_add_kpi_settings.sql
-- KPI SLA targets table read by KpiSettingsAPI (Key/Value columns).
-- Missing table caused HTTP 500 on every page load (app fell back to
-- local defaults). Safe to re-run.

CREATE TABLE IF NOT EXISTS kpi_settings (
  id TEXT PRIMARY KEY,
  "Key" TEXT UNIQUE,
  "Value" TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_settings_key ON kpi_settings ("Key");
