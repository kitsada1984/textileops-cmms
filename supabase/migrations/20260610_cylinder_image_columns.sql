-- Cylinder image fields.
-- Safe to run more than once.

alter table public.cylinders
  add column if not exists "ImageUrl" text,
  add column if not exists "ImageFingerprint" text,
  add column if not exists "ImageEmbedding" jsonb;
