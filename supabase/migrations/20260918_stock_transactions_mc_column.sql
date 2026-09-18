-- Add MC (Machine code) columns to stocktransactions table.
-- Safe to run more than once.

alter table public.stocktransactions
  add column if not exists "MC" text,
  add column if not exists "Machine_MC" text;
