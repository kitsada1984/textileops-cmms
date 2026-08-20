-- Create design_bom table (matches src/pages/DesignBom.jsx + createEntityClient)
create table if not exists public.design_bom (
  id            uuid primary key default gen_random_uuid(),
  "MC"          text,
  "Design"      text,
  "KI"          text,
  "BOM"         text,
  "CL1"         text,
  "CL2"         text,
  "CL3"         text,
  "CL4"         text,
  "SP"          text,
  "SL1"         text,
  "SL2"         text,
  "SL3"         text,
  "SL4"         text,
  "Comment"     text,
  "LastUpdated" date,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.design_bom enable row level security;

create policy "allow_all" on public.design_bom
  for all to anon, authenticated
  using (true) with check (true);
