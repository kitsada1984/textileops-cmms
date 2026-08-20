-- ==============================================================================
-- Migration: Rebuild Work Orders, Technicians, KPI Settings and Audit Logs
-- Based on Maintenance Management System (CMMS & KPI) from PROJECT_SOURCE_CODE.md
-- ==============================================================================

-- 1. Table: workorders
create table if not exists public.workorders (
  id                      uuid primary key default gen_random_uuid(),
  "Job_ID"                text,
  "StartDate"             date,
  "StartTime"             text,
  "StartTimestamp"        timestamptz,
  "KI"                    text,
  "MC"                    text,
  "Design"                text,
  "JobType"               text default 'REPAIR', -- 'REPAIR', 'DESIGN', 'PM'
  "Technicians"           text,
  "Comment"               text,
  "EndDate"               date,
  "EndTime"               text,
  "EndTimestamp"          timestamptz,
  "WorkingHoursDecimal"   numeric(10,2) default 0,
  "WorkingDurationText"   text,
  "Status"                text default 'IN_PROGRESS', -- 'IN_PROGRESS', 'COMPLETED'
  "CompletedBy"           text,
  "IsDeleted"             boolean default false,
  "DeletedAt"             timestamptz,
  "DeletedBy"             text,
  "CreatedBy"             text,
  "UpdatedBy"             text,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

alter table public.workorders enable row level security;

create policy "allow_all_workorders" on public.workorders
  for all to anon, authenticated
  using (true) with check (true);

-- 2. Table: technicians
create table if not exists public.technicians (
  id                      uuid primary key default gen_random_uuid(),
  "Technician_ID"         text,
  "Name"                  text not null,
  "Phone"                 text,
  "SkillLevel"            text default 'Senior', -- 'Junior', 'Mid-Level', 'Senior', 'Master'
  "Specialization"        text,
  "Status"                text default 'ACTIVE', -- 'ACTIVE', 'INACTIVE'
  "CreatedBy"             text,
  "UpdatedBy"             text,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

alter table public.technicians enable row level security;

create policy "allow_all_technicians" on public.technicians
  for all to anon, authenticated
  using (true) with check (true);

-- 3. Table: kpi_settings
create table if not exists public.kpi_settings (
  id                      uuid primary key default gen_random_uuid(),
  "Key"                   text unique not null,
  "Value"                 text not null,
  "Description"           text,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

alter table public.kpi_settings enable row level security;

create policy "allow_all_kpi_settings" on public.kpi_settings
  for all to anon, authenticated
  using (true) with check (true);

-- 4. Table: audit_logs
create table if not exists public.audit_logs (
  id                      uuid primary key default gen_random_uuid(),
  "UserEmail"             text,
  "Action"                text,
  "EntityType"            text,
  "EntityId"              text,
  "ChangedFields"         text,
  "BeforeData"            jsonb,
  "AfterData"             jsonb,
  "Description"           text,
  created_at              timestamptz default now()
);

alter table public.audit_logs enable row level security;

create policy "allow_all_audit_logs" on public.audit_logs
  for all to anon, authenticated
  using (true) with check (true);

-- Seed default initial KPI Settings
insert into public.kpi_settings ("Key", "Value", "Description")
values
  ('kpi_target_repair', '1.0', 'เป้าหมายวัน SLA สำหรับงานแก้ไข (Repair) (วัน)'),
  ('kpi_target_design', '3.0', 'เป้าหมายวัน SLA สำหรับงานปรับแบบ (Design) (วัน)'),
  ('kpi_target_pm', '2.0', 'เป้าหมายวัน SLA สำหรับงาน PM / ล้างเครื่อง (PM) (วัน)'),
  ('system_name', 'ระบบบันทึกผลงานช่าง Maintenance', 'ชื่อระบบ'),
  ('default_shift', 'กะเช้า (08:00 - 17:00)', 'กะการทำงานเริ่มต้น')
on conflict ("Key") do nothing;

-- Seed initial Technicians if empty
insert into public.technicians ("Technician_ID", "Name", "Phone", "SkillLevel", "Specialization", "Status")
values
  ('TECH-001', 'สมชาย ช่างยนต์', '081-111-2222', 'Master', 'ซ่อมเครื่องจักรหลัก, ระบบไฟ', 'ACTIVE'),
  ('TECH-002', 'วิชัย ปรับเครื่อง', '082-333-4444', 'Senior', 'ปรับแบบลายผ้า, ลาย Cy/Dail', 'ACTIVE'),
  ('TECH-003', 'อนันต์ ซ่อมบำรุง', '083-555-6666', 'Senior', 'PM ล้างเครื่อง, เช็คเข็มและลูกปืน', 'ACTIVE'),
  ('TECH-004', 'กิตติศักดิ์ ช่างเครื่อง', '084-777-8888', 'Mid-Level', 'งานซ่อมทั่วไป, เปลี่ยนอะไหล่', 'ACTIVE')
on conflict do nothing;
