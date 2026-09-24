-- 20260924_create_spare_needle_requests.sql
-- Create table for Spare Needle Requisitions (ระบบเบิกเข็ม Spare ประจำเครื่องจักร)

create table if not exists public.spare_needle_requests (
  id text primary key,
  request_no text,
  machine_mc text,
  cylinder_serial text,
  gauge text,
  technician_name text,
  shift text default 'กะเช้า',
  tracks_requested jsonb default '{}'::jsonb,
  request_comment text,
  status text default 'PENDING', -- 'PENDING' | 'PREPARED' | 'COMPLETED' | 'CANCELLED'
  issued_items jsonb default '[]'::jsonb,
  issuer_name text,
  issuer_comment text,
  prepared_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now())
);

-- Enable RLS (permissive policy for authenticated/anon CMMS users)
alter table public.spare_needle_requests enable row level security;

create policy "Allow all operations for authenticated and anon users on spare_needle_requests"
  on public.spare_needle_requests
  for all
  using (true)
  with check (true);

-- Index for quick lookup
create index if not exists idx_spare_needle_requests_machine on public.spare_needle_requests (machine_mc);
create index if not exists idx_spare_needle_requests_status on public.spare_needle_requests (status);
create index if not exists idx_spare_needle_requests_created on public.spare_needle_requests (created_at desc);
