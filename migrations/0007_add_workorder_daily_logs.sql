-- migrations/0007_add_workorder_daily_logs.sql
-- Add DailyLogs column to workorders table for end-of-day progress and daily status tracking

ALTER TABLE workorders ADD COLUMN DailyLogs TEXT;
