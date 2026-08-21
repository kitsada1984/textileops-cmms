-- ============================================================
-- Supabase Schema: Circular Knitting Machine Center Setting Checks
-- (ระบบบันทึกการตั้งศูนย์เครื่องถักกลม & Checklist Configs)
-- ============================================================

-- เปิดใช้งาน Extension สำหรับสร้าง UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. ตารางใบบันทึกการตั้งศูนย์ (center_checks) [Single & Double]
-- ============================================================
create table if not exists public.center_checks (
  id text primary key default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  timestamp text default to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  type text not null default 'Single',
  doc_no text not null unique,
  doc_date text default to_char(current_date, 'YYYY-MM-DD'),
  mechanic text,
  mc text not null,
  serial text,
  needle_cond text,
  needle_arr text,
  needle_images jsonb default '[]'::jsonb,
  comment text,
  counter_latest numeric default 0,
  counter_prev numeric default 0,
  counter_total numeric default 0,
  prev_doc_date text,
  days_since_last integer default 0,
  items jsonb default '[]'::jsonb,
  remark text,
  sign_name text,
  sign_date text,
  sup_name text,
  sup_date text,
  status text default 'ผ่าน'
);

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='center_checks' and column_name='timestamp') then
    alter table public.center_checks add column timestamp text;
  end if;
  alter table public.center_checks alter column id type text using id::text;
  alter table public.center_checks alter column doc_date type text using doc_date::text;
  alter table public.center_checks alter column prev_doc_date type text using prev_doc_date::text;
  alter table public.center_checks alter column sign_date type text using sign_date::text;
  alter table public.center_checks alter column sup_date type text using sup_date::text;
exception
  when others then null;
end $$;

create index if not exists idx_center_checks_type_mc on public.center_checks (type, mc);
create index if not exists idx_center_checks_date on public.center_checks (doc_date desc);
create index if not exists idx_center_checks_doc_no on public.center_checks (doc_no);
create index if not exists idx_center_checks_status on public.center_checks (status);

-- ============================================================
-- 2. ตารางตั้งค่ารายการตรวจและมาตรฐาน (checklist_configs)
-- ============================================================
create table if not exists public.checklist_configs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type text not null,
  no integer not null,
  item text not null,
  std text,
  active boolean not null default true
);

create index if not exists idx_checklist_configs_type on public.checklist_configs (type, no);

insert into public.checklist_configs (type, no, item, std, active) values
('Single', 1, 'กลม cylinder', '0.03', true),
('Single', 2, 'สูงต่ำ cylinder', '0.03', true),
('Single', 3, 'สูงต่ำ cambox cylinder', '0.03', true),
('Single', 4, 'กลม cambox cylinder', '0.03', true),
('Single', 5, 'กลม singer', '0.03', true),
('Single', 6, 'สูงต่ำ singer', '0.03', true),
('Single', 7, 'ระยะห่าง singer', '0.15><0.20', true),
('Single', 8, 'กลม วงแปรง', '0.05', true),
('Single', 9, 'สูงต่ำ วงแปรง', '0.05', true),
('Single', 10, 'กลม take down', '1.00', true),
('Double', 1, 'กลม Cylinder', '0.03', true),
('Double', 2, 'สูง-ต่ำ Cylinder', '0.03', true),
('Double', 3, 'กลม Cambox Cylinder', '0.03', true),
('Double', 4, 'สูง-ต่ำ Cambox Cylinder', '0.03', true),
('Double', 5, 'กลม Dail', '0.03', true),
('Double', 6, 'สูง-ต่ำ Dail', '0.03', true),
('Double', 7, 'ระยะห่าง cambox Dail', '0.15><0.20', true),
('Double', 8, 'สูง-ต่ำ วงแปรง', '0.03', true),
('Double', 9, 'ระยะห่าง แปรง', '0.20', true),
('Double', 10, 'กลม Takedown', '1.00', true)
on conflict do nothing;

-- ============================================================
-- 3. ตารางตัวนับลำดับเลขที่เอกสารรายวัน (doc_sequences)
-- ============================================================
create table if not exists public.doc_sequences (
  id serial primary key,
  type text not null,
  date_str text not null,
  counter integer not null default 1,
  updated_at timestamptz not null default now(),
  unique (type, date_str)
);

create index if not exists idx_doc_sequences_lookup on public.doc_sequences (type, date_str);

-- ============================================================
-- 4. Trigger จัดการ Updated_at
-- ============================================================
create or replace function public.handle_row_timestamps()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.created_at is null then
    new.created_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_center_checks_updated_at on public.center_checks;
create trigger set_center_checks_updated_at
  before insert or update on public.center_checks
  for each row execute function public.handle_row_timestamps();

-- ============================================================
-- 5. Row Level Security (RLS) & Policies
-- ============================================================
alter table public.center_checks enable row level security;
alter table public.checklist_configs enable row level security;
alter table public.doc_sequences enable row level security;

drop policy if exists "Allow all operations for center_checks" on public.center_checks;
create policy "Allow all operations for center_checks" on public.center_checks
  for all using (true) with check (true);

drop policy if exists "Allow all operations for checklist_configs" on public.checklist_configs;
create policy "Allow all operations for checklist_configs" on public.checklist_configs
  for all using (true) with check (true);

drop policy if exists "Allow all operations for doc_sequences" on public.doc_sequences;
create policy "Allow all operations for doc_sequences" on public.doc_sequences
  for all using (true) with check (true);
