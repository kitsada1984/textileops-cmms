-- Optional schema alignment for inventory category fields.
-- The app also stores Category in Note metadata for backward compatibility
-- when these columns have not been added yet.

alter table public.purchaseorders
  add column if not exists "Category" text;

alter table public.stocktransactions
  add column if not exists "Category" text;
