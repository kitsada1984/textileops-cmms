-- Optional real image URL column for Design/BOM.
-- The app also stores ImageUrl in Comment metadata as a fallback until this is applied.
alter table public.design_bom
  add column if not exists "ImageUrl" text;
