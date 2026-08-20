-- Purchasing image search fields (Plan B)
alter table public.purchaseorders
  add column if not exists "ImageUrl" text,
  add column if not exists "ImageFingerprint" text,
  add column if not exists "ImageEmbedding" jsonb;
