alter table if exists public.pmplans
  add column if not exists "Location" text;
