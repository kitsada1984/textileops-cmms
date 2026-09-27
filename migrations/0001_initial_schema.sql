-- migrations/0001_initial_schema.sql
-- Cloudflare D1 Initial Schema for TextileOps CMMS
-- Includes all 16 application tables + _d1_change_log for Realtime Pub/Sub

-- 1. appconfigs
CREATE TABLE IF NOT EXISTS appconfigs (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE,
  value TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_appconfigs_key ON appconfigs(key);

-- 2. auditlogs
CREATE TABLE IF NOT EXISTS auditlogs (
  id TEXT PRIMARY KEY,
  Module TEXT,
  ActionType TEXT,
  RecordID TEXT,
  FieldName TEXT,
  OldValue TEXT,
  NewValue TEXT,
  User TEXT,
  Comment TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_auditlogs_module ON auditlogs(Module);
CREATE INDEX IF NOT EXISTS idx_auditlogs_record ON auditlogs(RecordID);

-- 3. cylinders
CREATE TABLE IF NOT EXISTS cylinders (
  id TEXT PRIMARY KEY,
  ITEM INTEGER,
  Location TEXT,
  Standard TEXT,
  NewMC TEXT,
  Serial_OLD TEXT,
  Serial_NOW TEXT,
  Status_Now TEXT,
  Feeder TEXT,
  Manufacturer TEXT,
  Type TEXT,
  Diameter TEXT,
  Gauge TEXT,
  Needle TEXT,
  Machine_Ref TEXT,
  Comment TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cylinders_serial ON cylinders(Serial_NOW);
CREATE INDEX IF NOT EXISTS idx_cylinders_location ON cylinders(Location);

-- 4. design_bom
CREATE TABLE IF NOT EXISTS design_bom (
  id TEXT PRIMARY KEY,
  MC TEXT,
  Design TEXT,
  KI TEXT,
  BOM TEXT,
  CL1 TEXT,
  CL2 TEXT,
  CL3 TEXT,
  CL4 TEXT,
  SP TEXT,
  SL1 TEXT,
  SL2 TEXT,
  SL3 TEXT,
  SL4 TEXT,
  Comment TEXT,
  LastUpdated TEXT,
  ImageUrl TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_design_bom_mc ON design_bom(MC);
CREATE INDEX IF NOT EXISTS idx_design_bom_design ON design_bom(Design);

-- 5. machines
CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  ITEM INTEGER,
  Location TEXT,
  Mc TEXT,
  WaterCheck TEXT,
  Serial_OLD TEXT,
  Serial_NEW TEXT,
  Feeder TEXT,
  Manufacturer TEXT,
  Type TEXT,
  Diameter TEXT,
  Gauge TEXT,
  Needle TEXT,
  Oil TEXT,
  Model TEXT,
  Model_Inverter TEXT,
  Sinker TEXT,
  Tape1_No TEXT,
  Tape2_No TEXT,
  Tape3_No TEXT,
  Tape4_No TEXT,
  Dial_Front TEXT,
  Dial_Rear TEXT,
  Leg1 TEXT,
  Leg2 TEXT,
  Leg3 TEXT,
  Leg4 TEXT,
  Status TEXT,
  Remark TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_machines_mc ON machines(Mc);
CREATE INDEX IF NOT EXISTS idx_machines_location ON machines(Location);

-- 6. needle_configs
CREATE TABLE IF NOT EXISTS needle_configs (
  id TEXT PRIMARY KEY,
  Category TEXT NOT NULL,
  Value TEXT NOT NULL,
  Description TEXT,
  Sort_Order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_needle_configs_cat ON needle_configs(Category);

-- 7. needle_history_logs
CREATE TABLE IF NOT EXISTS needle_history_logs (
  id TEXT PRIMARY KEY,
  Log_ID TEXT,
  Set_ID TEXT,
  Action_Type TEXT,
  Old_Grade TEXT,
  New_Grade TEXT,
  Condition_Detail TEXT,
  Quantity INTEGER DEFAULT 0,
  Date_Action TEXT,
  Technician TEXT,
  Remarks TEXT,
  Image_URLs TEXT DEFAULT '[]',
  Target_Machine TEXT,
  Source_From TEXT,
  Scrap_Reason TEXT,
  Qty_Change TEXT,
  Balance_After INTEGER DEFAULT 0,
  Stock_Detail TEXT DEFAULT 'PM',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_needle_history_set_id ON needle_history_logs(Set_ID);

-- 8. needle_sets
CREATE TABLE IF NOT EXISTS needle_sets (
  id TEXT PRIMARY KEY,
  Set_ID TEXT,
  Machine_Type TEXT,
  Gauge TEXT,
  Machine_ID TEXT,
  Brand TEXT,
  Needle_Model TEXT,
  Grade TEXT,
  Condition_Detail TEXT,
  Status TEXT,
  Quantity INTEGER DEFAULT 0,
  Date_Recorded TEXT,
  Inspector TEXT,
  Remarks TEXT,
  Image_URLs TEXT DEFAULT '[]',
  Location TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_needle_sets_grade ON needle_sets(Grade);
CREATE INDEX IF NOT EXISTS idx_needle_sets_location ON needle_sets(Location);

-- 9. pmplans
CREATE TABLE IF NOT EXISTS pmplans (
  id TEXT PRIMARY KEY,
  PM_ID TEXT,
  PM_Type TEXT,
  Machine_MC TEXT,
  Machine_KI TEXT,
  Department TEXT,
  Frequency_Type TEXT,
  Frequency_Value REAL,
  Last_PM_Date TEXT,
  Next_PM_Date TEXT,
  Estimated_Hours REAL,
  Assigned_Tech TEXT,
  Priority TEXT,
  Status TEXT,
  Checklist TEXT,
  Required_Parts TEXT,
  Downtime_Plan TEXT,
  Remark TEXT,
  CreatedBy TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pmplans_mc ON pmplans(Machine_MC);
CREATE INDEX IF NOT EXISTS idx_pmplans_status ON pmplans(Status);

-- 10. purchaseorders
CREATE TABLE IF NOT EXISTS purchaseorders (
  id TEXT PRIMARY KEY,
  PO_Number TEXT,
  Supplier TEXT,
  Status TEXT,
  Priority TEXT,
  Order_Date TEXT,
  Expected_Date TEXT,
  Received_Date TEXT,
  Items TEXT,
  Total_Amount REAL,
  RequestedBy TEXT,
  ApprovedBy TEXT,
  Note TEXT,
  Detail TEXT,
  Qty REAL,
  UnitPrice REAL,
  Phone TEXT,
  Email TEXT,
  Line TEXT,
  LastUpdated TEXT,
  ImageUrl TEXT,
  ImageFingerprint TEXT,
  ImageEmbedding TEXT,
  Category TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_purchaseorders_po ON purchaseorders(PO_Number);

-- 11. repair_requests
CREATE TABLE IF NOT EXISTS repair_requests (
  id TEXT PRIMARY KEY,
  request_no TEXT,
  cylinder_serial TEXT,
  cylinder_location TEXT,
  cylinder_standard TEXT,
  problem_description TEXT,
  reported_by TEXT,
  status TEXT,
  technician_name TEXT,
  approval_notes TEXT,
  approved_at TEXT,
  approved_by TEXT,
  repair_details TEXT,
  parts_used TEXT,
  completed_at TEXT,
  completed_by TEXT,
  machine_mc TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_repair_requests_no ON repair_requests(request_no);
CREATE INDEX IF NOT EXISTS idx_repair_requests_status ON repair_requests(status);

-- 12. spare_needle_requests
CREATE TABLE IF NOT EXISTS spare_needle_requests (
  id TEXT PRIMARY KEY,
  request_no TEXT,
  machine_mc TEXT,
  cylinder_serial TEXT,
  gauge TEXT,
  technician_name TEXT,
  shift TEXT,
  tracks_requested TEXT,
  request_comment TEXT,
  status TEXT,
  issued_items TEXT,
  issuer_name TEXT,
  issuer_comment TEXT,
  prepared_at TEXT,
  acknowledged_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_spare_needle_requests_no ON spare_needle_requests(request_no);

-- 13. spareparts
CREATE TABLE IF NOT EXISTS spareparts (
  id TEXT PRIMARY KEY,
  Part_Code TEXT,
  Part_Name_TH TEXT,
  Part_Name_EN TEXT,
  Category TEXT,
  Unit TEXT,
  Stock_Qty REAL DEFAULT 0,
  Min_Qty REAL DEFAULT 0,
  Location_Store TEXT,
  Supplier TEXT,
  Unit_Price REAL DEFAULT 0,
  Compatible_Machines TEXT,
  Status TEXT,
  Remark TEXT,
  ImageUrl TEXT,
  ImageFingerprint TEXT,
  ImageEmbedding TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_spareparts_code ON spareparts(Part_Code);

-- 14. stocktransactions
CREATE TABLE IF NOT EXISTS stocktransactions (
  id TEXT PRIMARY KEY,
  TXN_ID TEXT,
  TXN_Type TEXT,
  Part_ID TEXT,
  Part_Code TEXT,
  Part_Name_EN TEXT,
  Qty_Before REAL DEFAULT 0,
  Qty_Change REAL DEFAULT 0,
  Qty_After REAL DEFAULT 0,
  Unit TEXT,
  Unit_Price REAL DEFAULT 0,
  Reference TEXT,
  Reference_Type TEXT,
  Location_Store TEXT,
  Performed_By TEXT,
  Note TEXT,
  ImageUrl TEXT,
  ImageFingerprint TEXT,
  ImageEmbedding TEXT,
  Category TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stocktx_part ON stocktransactions(Part_Code);

-- 15. users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT,
  username TEXT,
  password_hash TEXT,
  status TEXT,
  permissions TEXT,
  password_salt TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 16. workorders
CREATE TABLE IF NOT EXISTS workorders (
  id TEXT PRIMARY KEY,
  WO_ID TEXT,
  MC TEXT,
  KI TEXT,
  Problem TEXT,
  Priority TEXT,
  Status TEXT,
  Tech TEXT,
  Requester TEXT,
  ApprovedBy TEXT,
  StartTime TEXT,
  EndTime TEXT,
  Duration REAL,
  Comment TEXT,
  Images TEXT,
  Design TEXT,
  BOM TEXT,
  DateStart TEXT,
  DateEnd TEXT,
  Detail TEXT,
  JobType TEXT,
  Result_Raw TEXT,
  Result_Set TEXT,
  Result_Dye TEXT,
  Result_Fix TEXT,
  LastUpdated TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_workorders_wo_id ON workorders(WO_ID);
CREATE INDEX IF NOT EXISTS idx_workorders_status ON workorders(Status);
CREATE INDEX IF NOT EXISTS idx_workorders_mc ON workorders(MC);

-- 17. _d1_change_log (Realtime Event Bus Table for SSE streaming)
CREATE TABLE IF NOT EXISTS _d1_change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,           -- 'INSERT', 'UPDATE', 'DELETE'
  record_id TEXT,
  data TEXT,                      -- JSON representation of modified record
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_d1_change_log_table ON _d1_change_log(table_name, id);
CREATE INDEX IF NOT EXISTS idx_d1_change_log_created ON _d1_change_log(created_at);

PRAGMA optimize;
