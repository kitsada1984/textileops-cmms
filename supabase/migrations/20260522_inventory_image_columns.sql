-- Inventory image fields for Spare Parts and Stock Movement.
-- Safe to run more than once.

alter table public.spareparts
  add column if not exists "ImageUrl" text,
  add column if not exists "ImageFingerprint" text,
  add column if not exists "ImageEmbedding" jsonb;

alter table public.stocktransactions
  add column if not exists "ImageUrl" text,
  add column if not exists "ImageFingerprint" text,
  add column if not exists "ImageEmbedding" jsonb;

alter table public.purchaseorders
  add column if not exists "ImageUrl" text,
  add column if not exists "ImageFingerprint" text,
  add column if not exists "ImageEmbedding" jsonb;
