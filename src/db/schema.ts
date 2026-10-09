import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm'

// 1. appconfigs
export const appconfigs = sqliteTable('appconfigs', {
  id: text('id').primaryKey(),
  key: text('key').unique(),
  value: text('value'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  keyIdx: index('idx_appconfigs_key').on(table.key),
}))
export type AppConfig = InferSelectModel<typeof appconfigs>
export type NewAppConfig = InferInsertModel<typeof appconfigs>

// 2. auditlogs
export const auditlogs = sqliteTable('auditlogs', {
  id: text('id').primaryKey(),
  Module: text('Module'),
  ActionType: text('ActionType'),
  RecordID: text('RecordID'),
  FieldName: text('FieldName'),
  OldValue: text('OldValue'),
  NewValue: text('NewValue'),
  User: text('User'),
  Comment: text('Comment'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  moduleIdx: index('idx_auditlogs_module').on(table.Module),
  recordIdx: index('idx_auditlogs_record').on(table.RecordID),
}))
export type AuditLog = InferSelectModel<typeof auditlogs>
export type NewAuditLog = InferInsertModel<typeof auditlogs>

// 3. cylinders
export const cylinders = sqliteTable('cylinders', {
  id: text('id').primaryKey(),
  ITEM: integer('ITEM'),
  Location: text('Location'),
  Standard: text('Standard'),
  NewMC: text('NewMC'),
  Serial_OLD: text('Serial_OLD'),
  Serial_NOW: text('Serial_NOW'),
  Status_Now: text('Status_Now'),
  Feeder: text('Feeder'),
  Manufacturer: text('Manufacturer'),
  Type: text('Type'),
  Diameter: text('Diameter'),
  Gauge: text('Gauge'),
  Needle: text('Needle'),
  Machine_Ref: text('Machine_Ref'),
  Comment: text('Comment'),
  Last_Check_Date: text('Last_Check_Date'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  serialIdx: index('idx_cylinders_serial').on(table.Serial_NOW),
  locationIdx: index('idx_cylinders_location').on(table.Location),
}))
export type Cylinder = InferSelectModel<typeof cylinders>
export type NewCylinder = InferInsertModel<typeof cylinders>

// 4. design_bom
export const design_bom = sqliteTable('design_bom', {
  id: text('id').primaryKey(),
  MC: text('MC'),
  Design: text('Design'),
  KI: text('KI'),
  BOM: text('BOM'),
  CL1: text('CL1'),
  CL2: text('CL2'),
  CL3: text('CL3'),
  CL4: text('CL4'),
  SP: text('SP'),
  SL1: text('SL1'),
  SL2: text('SL2'),
  SL3: text('SL3'),
  SL4: text('SL4'),
  Comment: text('Comment'),
  LastUpdated: text('LastUpdated'),
  ImageUrl: text('ImageUrl'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  mcIdx: index('idx_design_bom_mc').on(table.MC),
  designIdx: index('idx_design_bom_design').on(table.Design),
}))
export type DesignBom = InferSelectModel<typeof design_bom>
export type NewDesignBom = InferInsertModel<typeof design_bom>

// 5. machines
export const machines = sqliteTable('machines', {
  id: text('id').primaryKey(),
  ITEM: integer('ITEM'),
  Location: text('Location'),
  Mc: text('Mc'),
  WaterCheck: text('WaterCheck'),
  Serial_OLD: text('Serial_OLD'),
  Serial_NEW: text('Serial_NEW'),
  Feeder: text('Feeder'),
  Manufacturer: text('Manufacturer'),
  Type: text('Type'),
  Diameter: text('Diameter'),
  Gauge: text('Gauge'),
  Needle: text('Needle'),
  Oil: text('Oil'),
  Model: text('Model'),
  Model_Inverter: text('Model_Inverter'),
  Sinker: text('Sinker'),
  Tape1_No: text('Tape1_No'),
  Tape2_No: text('Tape2_No'),
  Tape3_No: text('Tape3_No'),
  Tape4_No: text('Tape4_No'),
  Tape5_No: text('Tape5_No'),
  Dial_Front: text('Dial_Front'),
  Dial_Rear: text('Dial_Rear'),
  Leg1: text('Leg1'),
  Leg2: text('Leg2'),
  Leg3: text('Leg3'),
  Leg4: text('Leg4'),
  Status: text('Status'),
  Remark: text('Remark'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  mcIdx: index('idx_machines_mc').on(table.Mc),
  locationIdx: index('idx_machines_location').on(table.Location),
}))
export type Machine = InferSelectModel<typeof machines>
export type NewMachine = InferInsertModel<typeof machines>

// 6. needle_configs
export const needle_configs = sqliteTable('needle_configs', {
  id: text('id').primaryKey(),
  Category: text('Category').notNull(),
  Value: text('Value').notNull(),
  Description: text('Description'),
  Sort_Order: integer('Sort_Order').default(0),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  catIdx: index('idx_needle_configs_cat').on(table.Category),
}))
export type NeedleConfig = InferSelectModel<typeof needle_configs>
export type NewNeedleConfig = InferInsertModel<typeof needle_configs>

// 7. needle_history_logs
export const needle_history_logs = sqliteTable('needle_history_logs', {
  id: text('id').primaryKey(),
  Log_ID: text('Log_ID'),
  Set_ID: text('Set_ID'),
  Action_Type: text('Action_Type'),
  Old_Grade: text('Old_Grade'),
  New_Grade: text('New_Grade'),
  Condition_Detail: text('Condition_Detail'),
  Quantity: integer('Quantity').default(0),
  Date_Action: text('Date_Action'),
  Technician: text('Technician'),
  Remarks: text('Remarks'),
  Image_URLs: text('Image_URLs').default('[]'),
  Target_Machine: text('Target_Machine'),
  Source_From: text('Source_From'),
  Scrap_Reason: text('Scrap_Reason'),
  Qty_Change: text('Qty_Change'),
  Balance_After: integer('Balance_After').default(0),
  Stock_Detail: text('Stock_Detail').default('PM'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  setIdIdx: index('idx_needle_history_set_id').on(table.Set_ID),
}))
export type NeedleHistoryLog = InferSelectModel<typeof needle_history_logs>
export type NewNeedleHistoryLog = InferInsertModel<typeof needle_history_logs>

// 8. needle_sets
export const needle_sets = sqliteTable('needle_sets', {
  id: text('id').primaryKey(),
  Set_ID: text('Set_ID'),
  Machine_Type: text('Machine_Type'),
  Gauge: text('Gauge'),
  Machine_ID: text('Machine_ID'),
  Brand: text('Brand'),
  Needle_Model: text('Needle_Model'),
  Grade: text('Grade'),
  Condition_Detail: text('Condition_Detail'),
  Status: text('Status'),
  Quantity: integer('Quantity').default(0),
  Date_Recorded: text('Date_Recorded'),
  Inspector: text('Inspector'),
  Remarks: text('Remarks'),
  Image_URLs: text('Image_URLs').default('[]'),
  Location: text('Location'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  gradeIdx: index('idx_needle_sets_grade').on(table.Grade),
  locationIdx: index('idx_needle_sets_location').on(table.Location),
}))
export type NeedleSet = InferSelectModel<typeof needle_sets>
export type NewNeedleSet = InferInsertModel<typeof needle_sets>

// 9. pmplans
export const pmplans = sqliteTable('pmplans', {
  id: text('id').primaryKey(),
  PM_ID: text('PM_ID'),
  PM_Type: text('PM_Type'),
  Type: text('Type'),
  Machine_MC: text('Machine_MC'),
  Machine_KI: text('Machine_KI'),
  Department: text('Department'),
  Frequency_Type: text('Frequency_Type'),
  Frequency_Value: real('Frequency_Value'),
  Last_PM_Date: text('Last_PM_Date'),
  Next_PM_Date: text('Next_PM_Date'),
  Estimated_Hours: real('Estimated_Hours'),
  Assigned_Tech: text('Assigned_Tech'),
  Priority: text('Priority'),
  Status: text('Status'),
  Checklist: text('Checklist'),
  Required_Parts: text('Required_Parts'),
  Downtime_Plan: text('Downtime_Plan'),
  Remark: text('Remark'),
  CreatedBy: text('CreatedBy'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  mcIdx: index('idx_pmplans_mc').on(table.Machine_MC),
  statusIdx: index('idx_pmplans_status').on(table.Status),
}))
export type PMPlan = InferSelectModel<typeof pmplans>
export type NewPMPlan = InferInsertModel<typeof pmplans>

// 10. purchaseorders
export const purchaseorders = sqliteTable('purchaseorders', {
  id: text('id').primaryKey(),
  PO_Number: text('PO_Number'),
  Supplier: text('Supplier'),
  Status: text('Status'),
  Priority: text('Priority'),
  Order_Date: text('Order_Date'),
  Expected_Date: text('Expected_Date'),
  Received_Date: text('Received_Date'),
  Items: text('Items'),
  Total_Amount: real('Total_Amount'),
  RequestedBy: text('RequestedBy'),
  ApprovedBy: text('ApprovedBy'),
  Note: text('Note'),
  Detail: text('Detail'),
  Qty: real('Qty'),
  UnitPrice: real('UnitPrice'),
  Phone: text('Phone'),
  Email: text('Email'),
  Line: text('Line'),
  LastUpdated: text('LastUpdated'),
  ImageUrl: text('ImageUrl'),
  ImageFingerprint: text('ImageFingerprint'),
  ImageEmbedding: text('ImageEmbedding'),
  Category: text('Category'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  poIdx: index('idx_purchaseorders_po').on(table.PO_Number),
}))
export type PurchaseOrder = InferSelectModel<typeof purchaseorders>
export type NewPurchaseOrder = InferInsertModel<typeof purchaseorders>

// 11. repair_requests
export const repair_requests = sqliteTable('repair_requests', {
  id: text('id').primaryKey(),
  request_no: text('request_no'),
  cylinder_serial: text('cylinder_serial'),
  cylinder_location: text('cylinder_location'),
  cylinder_standard: text('cylinder_standard'),
  problem_description: text('problem_description'),
  reported_by: text('reported_by'),
  status: text('status'),
  technician_name: text('technician_name'),
  approval_notes: text('approval_notes'),
  approved_at: text('approved_at'),
  approved_by: text('approved_by'),
  repair_details: text('repair_details'),
  parts_used: text('parts_used'),
  completed_at: text('completed_at'),
  completed_by: text('completed_by'),
  machine_mc: text('machine_mc'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  noIdx: index('idx_repair_requests_no').on(table.request_no),
  statusIdx: index('idx_repair_requests_status').on(table.status),
}))
export type RepairRequest = InferSelectModel<typeof repair_requests>
export type NewRepairRequest = InferInsertModel<typeof repair_requests>

// 12. spare_needle_requests
export const spare_needle_requests = sqliteTable('spare_needle_requests', {
  id: text('id').primaryKey(),
  request_no: text('request_no'),
  machine_mc: text('machine_mc'),
  cylinder_serial: text('cylinder_serial'),
  gauge: text('gauge'),
  technician_name: text('technician_name'),
  shift: text('shift'),
  tracks_requested: text('tracks_requested'),
  request_comment: text('request_comment'),
  status: text('status'),
  issued_items: text('issued_items'),
  issuer_name: text('issuer_name'),
  issuer_comment: text('issuer_comment'),
  prepared_at: text('prepared_at'),
  acknowledged_at: text('acknowledged_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  noIdx: index('idx_spare_needle_requests_no').on(table.request_no),
}))
export type SpareNeedleRequest = InferSelectModel<typeof spare_needle_requests>
export type NewSpareNeedleRequest = InferInsertModel<typeof spare_needle_requests>

// 13. spareparts
export const spareparts = sqliteTable('spareparts', {
  id: text('id').primaryKey(),
  Part_Code: text('Part_Code'),
  Part_Name_TH: text('Part_Name_TH'),
  Part_Name_EN: text('Part_Name_EN'),
  Category: text('Category'),
  Unit: text('Unit'),
  Stock_Qty: real('Stock_Qty').default(0),
  Min_Qty: real('Min_Qty').default(0),
  Location_Store: text('Location_Store'),
  Supplier: text('Supplier'),
  Unit_Price: real('Unit_Price').default(0),
  Compatible_Machines: text('Compatible_Machines'),
  Status: text('Status'),
  Remark: text('Remark'),
  ImageUrl: text('ImageUrl'),
  ImageFingerprint: text('ImageFingerprint'),
  ImageEmbedding: text('ImageEmbedding'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  codeIdx: index('idx_spareparts_code').on(table.Part_Code),
}))
export type SparePart = InferSelectModel<typeof spareparts>
export type NewSparePart = InferInsertModel<typeof spareparts>

// 14. stocktransactions
export const stocktransactions = sqliteTable('stocktransactions', {
  id: text('id').primaryKey(),
  TXN_ID: text('TXN_ID'),
  TXN_Type: text('TXN_Type'),
  Part_ID: text('Part_ID'),
  Part_Code: text('Part_Code'),
  Part_Name_EN: text('Part_Name_EN'),
  Qty_Before: real('Qty_Before').default(0),
  Qty_Change: real('Qty_Change').default(0),
  Qty_After: real('Qty_After').default(0),
  Unit: text('Unit'),
  Unit_Price: real('Unit_Price').default(0),
  Reference: text('Reference'),
  Reference_Type: text('Reference_Type'),
  Location_Store: text('Location_Store'),
  Performed_By: text('Performed_By'),
  Note: text('Note'),
  ImageUrl: text('ImageUrl'),
  ImageFingerprint: text('ImageFingerprint'),
  ImageEmbedding: text('ImageEmbedding'),
  Category: text('Category'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  partIdx: index('idx_stocktx_part').on(table.Part_Code),
  createdIdx: index('idx_stocktx_created').on(table.created_at),
}))
export type StockTransaction = InferSelectModel<typeof stocktransactions>
export type NewStockTransaction = InferInsertModel<typeof stocktransactions>

// 15. users
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email'),
  full_name: text('full_name'),
  role: text('role'),
  username: text('username'),
  password_hash: text('password_hash'),
  status: text('status'),
  permissions: text('permissions'),
  password_salt: text('password_salt'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  usernameIdx: index('idx_users_username').on(table.username),
  emailIdx: index('idx_users_email').on(table.email),
}))
export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>

// 16. workorders
export const workorders = sqliteTable('workorders', {
  id: text('id').primaryKey(),
  WO_ID: text('WO_ID'),
  MC: text('MC'),
  KI: text('KI'),
  Problem: text('Problem'),
  Priority: text('Priority'),
  Status: text('Status'),
  Tech: text('Tech'),
  Requester: text('Requester'),
  ApprovedBy: text('ApprovedBy'),
  StartTime: text('StartTime'),
  EndTime: text('EndTime'),
  Duration: real('Duration'),
  Comment: text('Comment'),
  Images: text('Images'),
  Design: text('Design'),
  BOM: text('BOM'),
  DateStart: text('DateStart'),
  DateEnd: text('DateEnd'),
  Detail: text('Detail'),
  JobType: text('JobType'),
  Result_Raw: text('Result_Raw'),
  Result_Set: text('Result_Set'),
  Result_Dye: text('Result_Dye'),
  Result_Fix: text('Result_Fix'),
  LastUpdated: text('LastUpdated'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  woIdx: index('idx_workorders_wo_id').on(table.WO_ID),
  statusIdx: index('idx_workorders_status').on(table.Status),
  mcIdx: index('idx_workorders_mc').on(table.MC),
  techIdx: index('idx_workorders_tech').on(table.Tech),
}))
export type WorkOrder = InferSelectModel<typeof workorders>
export type NewWorkOrder = InferInsertModel<typeof workorders>

// 17. needle_conditions
export const needle_conditions = sqliteTable('needle_conditions', {
  id: text('id').primaryKey(),
  serial: text('serial'),
  machine_mc: text('machine_mc'),
  location: text('location'),
  type: text('type'),
  doc_date: text('doc_date'),
  counter: real('counter'),
  status: text('status'),
  needle_condition: text('needle_condition'),
  remark: text('remark'),
  images: text('images'),
  inspector: text('inspector'),
  counter_prev: real('counter_prev'),
  counter_diff: real('counter_diff'),
  counter_prev_date: text('counter_prev_date'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  serialIdx: index('idx_needle_conditions_serial').on(table.serial),
  docDateIdx: index('idx_needle_conditions_doc_date').on(table.doc_date),
  machineIdx: index('idx_needle_conditions_machine').on(table.machine_mc),
}))
export type NeedleCondition = InferSelectModel<typeof needle_conditions>
export type NewNeedleCondition = InferInsertModel<typeof needle_conditions>

// 18. _d1_change_log (Realtime Event Bus)
export const d1_change_log = sqliteTable('_d1_change_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  table_name: text('table_name').notNull(),
  action: text('action').notNull(),
  record_id: text('record_id'),
  data: text('data'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  tableIdx: index('idx_d1_change_log_table').on(table.table_name, table.id),
  createdIdx: index('idx_d1_change_log_created').on(table.created_at),
}))
export type D1ChangeLog = InferSelectModel<typeof d1_change_log>
export type NewD1ChangeLog = InferInsertModel<typeof d1_change_log>
