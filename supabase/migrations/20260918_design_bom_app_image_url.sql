-- Add CoverImageUrl and AppImageUrl columns to public.design_bom
-- Note: The application also supports storing these in Comment metadata fallback automatically.
alter table public.design_bom
  add column if not exists "CoverImageUrl" text,
  add column if not exists "AppImageUrl" text;
