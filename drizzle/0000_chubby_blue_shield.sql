CREATE TABLE `appconfigs` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text,
	`value` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `appconfigs_key_unique` ON `appconfigs` (`key`);--> statement-breakpoint
CREATE INDEX `idx_appconfigs_key` ON `appconfigs` (`key`);--> statement-breakpoint
CREATE TABLE `auditlogs` (
	`id` text PRIMARY KEY NOT NULL,
	`Module` text,
	`ActionType` text,
	`RecordID` text,
	`FieldName` text,
	`OldValue` text,
	`NewValue` text,
	`User` text,
	`Comment` text,
	`created_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_auditlogs_module` ON `auditlogs` (`Module`);--> statement-breakpoint
CREATE INDEX `idx_auditlogs_record` ON `auditlogs` (`RecordID`);--> statement-breakpoint
CREATE TABLE `cylinders` (
	`id` text PRIMARY KEY NOT NULL,
	`ITEM` integer,
	`Location` text,
	`Standard` text,
	`NewMC` text,
	`Serial_OLD` text,
	`Serial_NOW` text,
	`Status_Now` text,
	`Feeder` text,
	`Manufacturer` text,
	`Type` text,
	`Diameter` text,
	`Gauge` text,
	`Needle` text,
	`Machine_Ref` text,
	`Comment` text,
	`Last_Check_Date` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_cylinders_serial` ON `cylinders` (`Serial_NOW`);--> statement-breakpoint
CREATE INDEX `idx_cylinders_location` ON `cylinders` (`Location`);--> statement-breakpoint
CREATE TABLE `_d1_change_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_name` text NOT NULL,
	`action` text NOT NULL,
	`record_id` text,
	`data` text,
	`created_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_d1_change_log_table` ON `_d1_change_log` (`table_name`,`id`);--> statement-breakpoint
CREATE INDEX `idx_d1_change_log_created` ON `_d1_change_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `design_bom` (
	`id` text PRIMARY KEY NOT NULL,
	`MC` text,
	`Design` text,
	`KI` text,
	`BOM` text,
	`CL1` text,
	`CL2` text,
	`CL3` text,
	`CL4` text,
	`SP` text,
	`SL1` text,
	`SL2` text,
	`SL3` text,
	`SL4` text,
	`Comment` text,
	`LastUpdated` text,
	`ImageUrl` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_design_bom_mc` ON `design_bom` (`MC`);--> statement-breakpoint
CREATE INDEX `idx_design_bom_design` ON `design_bom` (`Design`);--> statement-breakpoint
CREATE TABLE `machines` (
	`id` text PRIMARY KEY NOT NULL,
	`ITEM` integer,
	`Location` text,
	`Mc` text,
	`WaterCheck` text,
	`Serial_OLD` text,
	`Serial_NEW` text,
	`Feeder` text,
	`Manufacturer` text,
	`Type` text,
	`Diameter` text,
	`Gauge` text,
	`Needle` text,
	`Oil` text,
	`Model` text,
	`Model_Inverter` text,
	`Sinker` text,
	`Tape1_No` text,
	`Tape2_No` text,
	`Tape3_No` text,
	`Tape4_No` text,
	`Tape5_No` text,
	`Dial_Front` text,
	`Dial_Rear` text,
	`Leg1` text,
	`Leg2` text,
	`Leg3` text,
	`Leg4` text,
	`Status` text,
	`Remark` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_machines_mc` ON `machines` (`Mc`);--> statement-breakpoint
CREATE INDEX `idx_machines_location` ON `machines` (`Location`);--> statement-breakpoint
CREATE TABLE `needle_conditions` (
	`id` text PRIMARY KEY NOT NULL,
	`serial` text,
	`machine_mc` text,
	`location` text,
	`type` text,
	`doc_date` text,
	`counter` real,
	`status` text,
	`needle_condition` text,
	`remark` text,
	`images` text,
	`inspector` text,
	`counter_prev` real,
	`counter_diff` real,
	`counter_prev_date` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_needle_conditions_serial` ON `needle_conditions` (`serial`);--> statement-breakpoint
CREATE INDEX `idx_needle_conditions_doc_date` ON `needle_conditions` (`doc_date`);--> statement-breakpoint
CREATE INDEX `idx_needle_conditions_machine` ON `needle_conditions` (`machine_mc`);--> statement-breakpoint
CREATE TABLE `needle_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`Category` text NOT NULL,
	`Value` text NOT NULL,
	`Description` text,
	`Sort_Order` integer DEFAULT 0,
	`created_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_needle_configs_cat` ON `needle_configs` (`Category`);--> statement-breakpoint
CREATE TABLE `needle_history_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`Log_ID` text,
	`Set_ID` text,
	`Action_Type` text,
	`Old_Grade` text,
	`New_Grade` text,
	`Condition_Detail` text,
	`Quantity` integer DEFAULT 0,
	`Date_Action` text,
	`Technician` text,
	`Remarks` text,
	`Image_URLs` text DEFAULT '[]',
	`Target_Machine` text,
	`Source_From` text,
	`Scrap_Reason` text,
	`Qty_Change` text,
	`Balance_After` integer DEFAULT 0,
	`Stock_Detail` text DEFAULT 'PM',
	`created_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_needle_history_set_id` ON `needle_history_logs` (`Set_ID`);--> statement-breakpoint
CREATE TABLE `needle_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`Set_ID` text,
	`Machine_Type` text,
	`Gauge` text,
	`Machine_ID` text,
	`Brand` text,
	`Needle_Model` text,
	`Grade` text,
	`Condition_Detail` text,
	`Status` text,
	`Quantity` integer DEFAULT 0,
	`Date_Recorded` text,
	`Inspector` text,
	`Remarks` text,
	`Image_URLs` text DEFAULT '[]',
	`Location` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_needle_sets_grade` ON `needle_sets` (`Grade`);--> statement-breakpoint
CREATE INDEX `idx_needle_sets_location` ON `needle_sets` (`Location`);--> statement-breakpoint
CREATE TABLE `pmplans` (
	`id` text PRIMARY KEY NOT NULL,
	`PM_ID` text,
	`PM_Type` text,
	`Type` text,
	`Machine_MC` text,
	`Machine_KI` text,
	`Department` text,
	`Frequency_Type` text,
	`Frequency_Value` real,
	`Last_PM_Date` text,
	`Next_PM_Date` text,
	`Estimated_Hours` real,
	`Assigned_Tech` text,
	`Priority` text,
	`Status` text,
	`Checklist` text,
	`Required_Parts` text,
	`Downtime_Plan` text,
	`Remark` text,
	`CreatedBy` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_pmplans_mc` ON `pmplans` (`Machine_MC`);--> statement-breakpoint
CREATE INDEX `idx_pmplans_status` ON `pmplans` (`Status`);--> statement-breakpoint
CREATE TABLE `purchaseorders` (
	`id` text PRIMARY KEY NOT NULL,
	`PO_Number` text,
	`Supplier` text,
	`Status` text,
	`Priority` text,
	`Order_Date` text,
	`Expected_Date` text,
	`Received_Date` text,
	`Items` text,
	`Total_Amount` real,
	`RequestedBy` text,
	`ApprovedBy` text,
	`Note` text,
	`Detail` text,
	`Qty` real,
	`UnitPrice` real,
	`Phone` text,
	`Email` text,
	`Line` text,
	`LastUpdated` text,
	`ImageUrl` text,
	`ImageFingerprint` text,
	`ImageEmbedding` text,
	`Category` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_purchaseorders_po` ON `purchaseorders` (`PO_Number`);--> statement-breakpoint
CREATE TABLE `repair_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`request_no` text,
	`cylinder_serial` text,
	`cylinder_location` text,
	`cylinder_standard` text,
	`problem_description` text,
	`reported_by` text,
	`status` text,
	`technician_name` text,
	`approval_notes` text,
	`approved_at` text,
	`approved_by` text,
	`repair_details` text,
	`parts_used` text,
	`completed_at` text,
	`completed_by` text,
	`machine_mc` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_repair_requests_no` ON `repair_requests` (`request_no`);--> statement-breakpoint
CREATE INDEX `idx_repair_requests_status` ON `repair_requests` (`status`);--> statement-breakpoint
CREATE TABLE `spare_needle_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`request_no` text,
	`machine_mc` text,
	`cylinder_serial` text,
	`gauge` text,
	`technician_name` text,
	`shift` text,
	`tracks_requested` text,
	`request_comment` text,
	`status` text,
	`issued_items` text,
	`issuer_name` text,
	`issuer_comment` text,
	`prepared_at` text,
	`acknowledged_at` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_spare_needle_requests_no` ON `spare_needle_requests` (`request_no`);--> statement-breakpoint
CREATE TABLE `spareparts` (
	`id` text PRIMARY KEY NOT NULL,
	`Part_Code` text,
	`Part_Name_TH` text,
	`Part_Name_EN` text,
	`Category` text,
	`Unit` text,
	`Stock_Qty` real DEFAULT 0,
	`Min_Qty` real DEFAULT 0,
	`Location_Store` text,
	`Supplier` text,
	`Unit_Price` real DEFAULT 0,
	`Compatible_Machines` text,
	`Status` text,
	`Remark` text,
	`ImageUrl` text,
	`ImageFingerprint` text,
	`ImageEmbedding` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_spareparts_code` ON `spareparts` (`Part_Code`);--> statement-breakpoint
CREATE TABLE `stocktransactions` (
	`id` text PRIMARY KEY NOT NULL,
	`TXN_ID` text,
	`TXN_Type` text,
	`Part_ID` text,
	`Part_Code` text,
	`Part_Name_EN` text,
	`Qty_Before` real DEFAULT 0,
	`Qty_Change` real DEFAULT 0,
	`Qty_After` real DEFAULT 0,
	`Unit` text,
	`Unit_Price` real DEFAULT 0,
	`Reference` text,
	`Reference_Type` text,
	`Location_Store` text,
	`Performed_By` text,
	`Note` text,
	`ImageUrl` text,
	`ImageFingerprint` text,
	`ImageEmbedding` text,
	`Category` text,
	`created_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_stocktx_part` ON `stocktransactions` (`Part_Code`);--> statement-breakpoint
CREATE INDEX `idx_stocktx_created` ON `stocktransactions` (`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`full_name` text,
	`role` text,
	`username` text,
	`password_hash` text,
	`status` text,
	`permissions` text,
	`password_salt` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_users_username` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `workorders` (
	`id` text PRIMARY KEY NOT NULL,
	`WO_ID` text,
	`MC` text,
	`KI` text,
	`Problem` text,
	`Priority` text,
	`Status` text,
	`Tech` text,
	`Requester` text,
	`ApprovedBy` text,
	`StartTime` text,
	`EndTime` text,
	`Duration` real,
	`Comment` text,
	`Images` text,
	`Design` text,
	`BOM` text,
	`DateStart` text,
	`DateEnd` text,
	`Detail` text,
	`JobType` text,
	`Result_Raw` text,
	`Result_Set` text,
	`Result_Dye` text,
	`Result_Fix` text,
	`LastUpdated` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_workorders_wo_id` ON `workorders` (`WO_ID`);--> statement-breakpoint
CREATE INDEX `idx_workorders_status` ON `workorders` (`Status`);--> statement-breakpoint
CREATE INDEX `idx_workorders_mc` ON `workorders` (`MC`);--> statement-breakpoint
CREATE INDEX `idx_workorders_tech` ON `workorders` (`Tech`);