import { format } from 'date-fns'

/** Safe date formatter — returns '—' for null/undefined/invalid dates instead of crashing */
function safeFormatDate(val, fmt = 'dd/MM/yy HH:mm') {
  if (!val) return '—'
  try {
    const d = new Date(val)
    return isNaN(d.getTime()) ? '—' : format(d, fmt)
  } catch {
    return '—'
  }
}

export function generateMachinePdfProps(mc) {
  if (!mc) return null
  return {
    docType: 'machine',
    title: 'ทะเบียนประวัติเครื่องจักร / MACHINE DATA SHEET',
    docNo: mc.Mc || `MC-${mc.id || mc._id}`,
    docDate: mc.updated_at || mc.created_at || new Date(),
    status: mc.Status || 'ปกติ',
    priority: mc.WaterCheck || '',
    remarks: mc.Remark || '',
    sections: [
      {
        title: 'ข้อมูลทั่วไปของเครื่องจักร (General Machine Information)',
        fields: [
          { label: 'รหัสเครื่อง (Machine No.)', value: mc.Mc, mono: true },
          { label: 'สถานที่ติดตั้ง (Location)', value: mc.Location },
          { label: 'ประเภท (Type)', value: mc.Type },
          { label: 'ผู้ผลิต (Manufacturer)', value: mc.Manufacturer },
          { label: 'รุ่นเครื่อง (Model)', value: mc.Model },
          { label: 'สถานะการทำงาน (Status)', value: mc.Status },
          { label: 'การเช็คน้ำ (Water Check)', value: mc.WaterCheck },
          { label: 'รุ่น Inverter', value: mc.Model_Inverter },
        ],
      },
      {
        title: 'ข้อมูลทางเทคนิคและการตั้งค่า (Technical Specifications)',
        fields: [
          { label: 'ขนาดเส้นผ่านศูนย์กลาง (Diameter)', value: mc.Diameter ? `${mc.Diameter}"` : '—' },
          { label: 'เกจ (Gauge)', value: mc.Gauge ? `${mc.Gauge}G` : '—' },
          { label: 'จำนวนเข็ม (Needle Count)', value: mc.Needle },
          { label: 'จำนวนฟีดเดอร์ (Feeder)', value: mc.Feeder },
          { label: 'น้ำมันเครื่อง (Oil Type)', value: mc.Oil },
          { label: 'ชนิด Sinker', value: mc.Sinker },
        ],
      },
      {
        title: 'ประวัติหมายเลขซีเรียล (Serial History)',
        fields: [
          { label: 'ซีเรียลปัจจุบัน (Serial NEW/NOW)', value: mc.Serial_NEW || mc.Serial_NOW, mono: true },
          { label: 'ซีเรียลเดิม (Serial OLD)', value: mc.Serial_OLD, mono: true },
        ],
      },
      {
        title: 'ข้อมูลสายพาน, Dial และขาแคม (Belts & Cams)',
        fields: [
          { label: 'สายพาน 1 (Tape 1 No.)', value: mc.Tape1_No },
          { label: 'สายพาน 2 (Tape 2 No.)', value: mc.Tape2_No },
          { label: 'สายพาน 3 (Tape 3 No.)', value: mc.Tape3_No },
          { label: 'สายพาน 4 (Tape 4 No.)', value: mc.Tape4_No },
          { label: 'สายพาน 5 (Tape 5 No.)', value: mc.Tape5_No },
          { label: 'Dial ขาหน้า', value: mc.Dial_Front },
          { label: 'Dial ขาหลัง', value: mc.Dial_Rear },
          { label: 'ขา 1 (Leg 1)', value: mc.Leg1 },
          { label: 'ขา 2 (Leg 2)', value: mc.Leg2 },
          { label: 'ขา 3 (Leg 3)', value: mc.Leg3 },
          { label: 'ขา 4 (Leg 4)', value: mc.Leg4 },
        ],
      },
    ],
    signatories: [
      { title: 'ผู้บันทึกข้อมูล', name: '', date: format(new Date(), 'dd/MM/yyyy') },
      { title: 'ช่างประจำเครื่อง', name: '', date: '' },
      { title: 'หัวหน้าแผนกช่าง', name: '', date: '' },
      { title: 'ผู้จัดการฝ่ายผลิต', name: '', date: '' },
    ],
  }
}

export function generateCylinderPdfProps(cyl) {
  if (!cyl) return null
  return {
    docType: 'cylinder',
    title: 'ทะเบียนประวัติกระบอกเข็ม / CYLINDER DATA SHEET',
    docNo: cyl.Serial_NOW || cyl.Serial_OLD || `CYL-${cyl.id || cyl._id}`,
    docDate: cyl.updated_at || cyl.created_at || new Date(),
    status: cyl.Status_Now || cyl.Standard || 'ปกติ',
    priority: cyl.Location || '',
    remarks: cyl.Comment || '',
    sections: [
      {
        title: 'ข้อมูลกระบอกเข็ม (Cylinder Identity)',
        fields: [
          { label: 'ซีเรียลปัจจุบัน (Serial NOW)', value: cyl.Serial_NOW, mono: true },
          { label: 'ซีเรียลเดิม (Serial OLD)', value: cyl.Serial_OLD, mono: true },
          { label: 'เครื่องประจำปัจจุบัน (New M/C)', value: cyl.NewMC, mono: true },
          { label: 'เครื่องประจำเดิม (Old M/C)', value: cyl.OLDMC || cyl.Machine_KI, mono: true },
          { label: 'สถานที่จัดเก็บ/ติดตั้ง (Location)', value: cyl.Location },
          { label: 'ประเภทเครื่อง (Type)', value: cyl.Type },
          { label: 'ขนาดเส้นผ่านศูนย์กลาง (Diameter)', value: cyl.Diameter ? `${cyl.Diameter}"` : '—' },
          { label: 'เกจ (Gauge)', value: cyl.Gauge ? `${cyl.Gauge}G` : '—' },
          { label: 'สถานะกระบอก (Status Now)', value: cyl.Status_Now },
          { label: 'มาตรฐานการผลิต (Standard)', value: cyl.Standard },
        ],
      },
      {
        title: 'ข้อมูลจำเพาะและอะไหล่ (Specifications)',
        fields: [
          { label: 'จำนวนเข็ม (Needle Count)', value: cyl.Needle_Count },
          { label: 'ประเภทเข็ม (Needle Type)', value: cyl.Needle_Type },
          { label: 'ผู้ผลิตกระบอก (Manufacturer)', value: cyl.Manufacturer },
          { label: 'วันที่ตรวจเช็คล่าสุด', value: safeFormatDate(cyl.Last_Check_Date, 'dd/MM/yyyy') },
        ],
      },
    ],
    signatories: [
      { title: 'ผู้ตรวจสอบกระบอก', name: '', date: format(new Date(), 'dd/MM/yyyy') },
      { title: 'ช่างผู้เปลี่ยน/สลับ', name: '', date: '' },
      { title: 'หัวหน้างานซ่อมบำรุง', name: '', date: '' },
      { title: 'ผู้จัดการโรงงาน', name: '', date: '' },
    ],
  }
}

export function generateWorkOrderPdfProps(wo) {
  if (!wo) return null
  return {
    docType: 'workorder',
    title: 'ใบสั่งงานบำรุงรักษา / WORK ORDER',
    docNo: wo.WONumber || wo.OrderNo || `WO-${wo.id || wo._id}`,
    docDate: wo.OrderDate || wo.created_at || new Date(),
    status: wo.Status || 'รอดำเนินการ',
    priority: wo.Priority || 'ปกติ',
    remarks: wo.Notes || wo.Description || '',
    sections: [
      {
        title: 'ข้อมูลใบสั่งงาน (Work Order Details)',
        fields: [
          { label: 'เลขที่ใบสั่งงาน (WO No.)', value: wo.WONumber || wo.OrderNo, mono: true },
          { label: 'วันที่สั่งงาน (Date)', value: safeFormatDate(wo.OrderDate, 'dd/MM/yyyy') },
          { label: 'เครื่องจักรเป้าหมาย (Machine)', value: wo.MachineID || wo.MachineCode || wo.MachineName || wo.MC, mono: true },
          { label: 'รหัสงาน (KI)', value: wo.KI || '—', mono: true },
          { label: 'แบบงาน (Design)', value: wo.Design || '—' },
          { label: 'เลขม้วน (Roll No.)', value: (wo.RollNo || wo.roll_no) ? String(wo.RollNo || wo.roll_no) : '—', mono: true },
          { label: 'ประเภทงาน (WO Type)', value: wo.WOType || wo.Type || 'PM' },
          { label: 'ช่างผู้รับผิดชอบ (Assignee)', value: wo.AssignedTo || wo.TechnicianName || '—' },
          { label: 'ตำแหน่ง (Location)', value: wo.Location || '—' },
          { label: 'สถานะงาน (Status)', value: wo.Status || '—' },
        ],
      },
      {
        title: 'รายละเอียดและอาการปัญหา (Problem & Task Description)',
        fields: [
          { label: 'ชื่องาน / รายละเอียด (Title)', value: wo.Title || wo.TaskName, full: true },
          { label: 'รายละเอียดปัญหา (Problem Detail)', value: wo.Description || wo.ProblemDetail || '—', full: true },
          { label: 'แนวทางการแก้ไข (Action Taken)', value: wo.Solution || wo.ActionTaken || '—', full: true },
        ],
      },
      {
        title: 'เวลาและทรัพยากรที่ใช้ (Time & Resources)',
        fields: [
          { label: 'เวลาเริ่มงาน (Start Time)', value: wo.StartDate || wo.StartTime || '—' },
          { label: 'เวลาเสร็จสิ้น (End Time)', value: wo.EndDate || wo.EndTime || '—' },
          { label: 'ชั่วโมงการทำงาน (Working Hours)', value: wo.Duration ? `${wo.Duration} ชม.` : '—' },
          { label: 'ค่าใช้จ่ายรวม (Total Cost)', value: wo.TotalCost ? `${Number(wo.TotalCost).toLocaleString()} บาท` : '—' },
        ],
      },
    ],
    signatories: [
      { title: 'ผู้แจ้งงาน / สั่งงาน', name: wo.CreatedBy || '', date: '' },
      { title: 'ช่างผู้ปฏิบัติงาน', name: wo.AssignedTo || '', date: '' },
      { title: 'หัวหน้างานตรวจรับ', name: '', date: '' },
      { title: 'ผู้อนุมัติปิดงาน', name: '', date: '' },
    ],
  }
}

export function generatePMPlanPdfProps(pm) {
  if (!pm) return null
  return {
    docType: 'pmplan',
    title: 'แผนการบำรุงรักษาเชิงป้องกัน / PREVENTIVE MAINTENANCE PLAN',
    docNo: pm.PM_No || `PM-${pm.id || pm._id}`,
    docDate: pm.TargetDate || pm.PM_Date || pm.created_at || new Date(),
    status: pm.Status || 'รอดำเนินการ',
    priority: pm.PM_Type || 'RUNTIME',
    remarks: pm.Remark || pm.Description || '',
    sections: [
      {
        title: 'ข้อมูลแผน PM (PM Plan Information)',
        fields: [
          { label: 'รหัสเครื่องจักร (Machine ID)', value: pm.Machine_KI || pm.NewMC || pm.MachineCode, mono: true },
          { label: 'ประเภทเครื่อง (Type)', value: pm.Type || '—' },
          { label: 'ตำแหน่ง (Location)', value: pm.Location || '—' },
          { label: 'รอบการบำรุงรักษา (Interval)', value: pm.IntervalDays ? `${pm.IntervalDays} วัน` : (pm.IntervalRuntime ? `${pm.IntervalRuntime} ชม.` : '—') },
          { label: 'วันที่ทำ PM ล่าสุด (Last PM)', value: safeFormatDate(pm.LastPMDate, 'dd/MM/yyyy') },
          { label: 'วันที่กำหนดทำ PM ถัดไป (Next Due)', value: safeFormatDate(pm.NextPMDate || pm.TargetDate, 'dd/MM/yyyy') },
          { label: 'ช่างผู้รับผิดชอบ (Mechanic)', value: pm.ResponsiblePerson || pm.Mechanic || '—' },
          { label: 'สถานะแผนงาน (Status)', value: pm.Status },
        ],
      },
      {
        title: 'รายการตรวจเช็คและบำรุงรักษา (PM Tasks)',
        fields: [
          { label: 'หัวข้อการบำรุงรักษา (PM Title)', value: pm.Title || pm.PlanName || 'การบำรุงรักษาตามรอบเวลา / Runtime', full: true },
          { label: 'รายละเอียดงาน (Description)', value: pm.Description || 'ตรวจเช็คระบบหล่อลื่น, สายพาน, ตัวนับรอบ, ระบบไฟฟ้า และความตึงของเข็ม', full: true },
        ],
      },
    ],
    signatories: [
      { title: 'ผู้จัดทำแผน', name: '', date: format(new Date(), 'dd/MM/yyyy') },
      { title: 'ช่าง PM ผู้ปฏิบัติงาน', name: pm.ResponsiblePerson || '', date: '' },
      { title: 'หัวหน้างานแผน PM', name: '', date: '' },
      { title: 'ผู้จัดการฝ่ายวิศวกรรม', name: '', date: '' },
    ],
  }
}

export function generateCenterCheckPdfProps(chk) {
  if (!chk) return null
  const items = Array.isArray(chk.items) ? chk.items : []
  const tableRows = items.map((it, idx) => [
    it?.no || idx + 1,
    it?.item || '',
    it?.std || '',
    it?.val_before || '—',
    it?.val_after || '—',
    it?.result || 'ผ่าน',
    it?.remark || '',
  ])

  return {
    docType: 'centercheck',
    title: `ใบรายงานผลตรวจเช็คศูนย์เข็ม (${chk.type === 'Double' ? 'Double Jersey' : 'Single Jersey'})`,
    docNo: chk.doc_no || `CC-${chk.id || chk._id}`,
    docDate: chk.doc_date || new Date(),
    status: chk.status || 'ผ่าน',
    priority: chk.mc || '',
    remarks: chk.remark || chk.comment || '',
    sections: [
      {
        title: 'ข้อมูลการตรวจเช็คศูนย์เข็ม (Center Check Details)',
        fields: [
          { label: 'เลขที่เอกสาร (Doc No.)', value: chk.doc_no, mono: true },
          { label: 'วันที่ตรวจเช็ค (Date)', value: safeFormatDate(chk.doc_date, 'dd/MM/yyyy') },
          { label: 'รหัสเครื่องจักร (M/C No.)', value: chk.mc, mono: true },
          { label: 'ซีเรียลกระบอก (Serial)', value: chk.serial, mono: true },
          { label: 'ตำแหน่ง (Location)', value: (chk.location && chk.location !== '—') ? chk.location : (chk.Location || 'โรงทอ') },
          { label: 'ช่างผู้ตรวจเช็ค (Mechanic)', value: chk.mechanic || chk.sign_name || '—' },
          { label: 'หัวหน้างานตรวจรับ (Supervisor)', value: chk.sup_name || '—' },
          { label: 'ผลการประเมินรวม (Overall Status)', value: chk.status || 'ผ่าน' },
        ],
      },
      {
        title: 'ข้อมูลมิเตอร์และสภาพเข็ม (Counters & Needle Condition)',
        fields: [
          { label: 'มิเตอร์ล่าสุด (Latest Counter)', value: chk.counter_latest ? Number(chk.counter_latest).toLocaleString() : '—' },
          { label: 'มิเตอร์ก่อนหน้า (Prev Counter)', value: chk.counter_prev ? Number(chk.counter_prev).toLocaleString() : '—' },
          { label: 'ยอดรอบที่เดิน (Total Cycles)', value: chk.counter_total ? Number(chk.counter_total).toLocaleString() : '—' },
          { label: 'จำนวนวันนับจากครั้งก่อน', value: chk.days_since_last ? `${chk.days_since_last} วัน` : '—' },
          { label: 'สภาพเข็ม (Needle Condition)', value: chk.needle_cond || 'สึกเล็กน้อย' },
          { label: 'การจัดเรียงเข็ม (Needle Arrangement)', value: chk.needle_arr || 'ตามแบบมาตรฐาน' },
        ],
      },
      {
        title: 'รายการตรวจเช็คบำรุงรักษาเพิ่มเติม (Maintenance Checklist)',
        fields: [
          { label: 'อัดจารบี (Greasing)', value: chk.greasing ? '✅ ดำเนินการแล้ว' : '—' },
          { label: 'ถ่ายน้ำมันเกียร์ (Gear Oil Change)', value: chk.oil_change ? '✅ ดำเนินการแล้ว' : '—' },
          {
            label: 'สายพานส่งด้าย (Quality Feed Belts)',
            full: true,
            belts: [1, 2, 3, 4, 5].map((n) => ({
              tape: n,
              checked: !!chk[`belt_tape${n}`],
            })),
            value: [1, 2, 3, 4, 5]
              .map((n) => `เทป ${n}: ${chk[`belt_tape${n}`] ? '☑ ผ่าน' : '☐'}`)
              .join('   |   '),
          },
        ],
      },
    ],
    tableData: {
      title: 'รายการตรวจเช็คตามมาตรฐาน (Inspection Checklist Items)',
      headers: ['ลำดับ', 'รายการตรวจเช็ค', 'ค่ามาตรฐาน', 'ก่อนปรับ', 'หลังปรับ', 'ผลลัพธ์', 'หมายเหตุ'],
      rows: tableRows,
    },
    images: Array.isArray(chk.needle_images) ? chk.needle_images : [],
    signatories: [
      { title: 'ช่างผู้ตรวจเช็ค', name: chk.mechanic || chk.sign_name || '', date: chk.sign_date || chk.doc_date || '' },
      { title: 'หัวหน้าแผนกตรวจสอบ', name: chk.sup_name || '', date: chk.sup_date || chk.doc_date || '' },
      { title: 'หัวหน้าส่วนผลิตผ้า', name: '', date: '' },
      { title: 'ผู้จัดการฝ่ายโรงงาน', name: '', date: '' },
    ],
  }
}

export function generateSparePartPdfProps(sp) {
  if (!sp) return null
  return {
    docType: 'sparepart',
    title: 'ทะเบียนอะไหล่และอุปกรณ์ / SPARE PART DATA SHEET',
    docNo: sp.PartNumber || sp.Code || `SP-${sp.id || sp._id}`,
    docDate: sp.updated_at || sp.created_at || new Date(),
    status: (sp.QuantityOnHand || 0) <= (sp.MinStock || 0) ? 'สต็อกต่ำกว่าเกณฑ์' : 'สต็อกปกติ',
    priority: sp.Category || '',
    remarks: sp.Description || sp.Notes || '',
    sections: [
      {
        title: 'ข้อมูลอะไหล่ (Spare Part Details)',
        fields: [
          { label: 'รหัสอะไหล่ (Part No.)', value: sp.PartNumber || sp.Code, mono: true },
          { label: 'ชื่ออะไหล่ (Part Name)', value: sp.PartName || sp.Name, full: true },
          { label: 'หมวดหมู่ (Category)', value: sp.Category },
          { label: 'หน่วยนับ (Unit)', value: sp.Unit || 'ชิ้น' },
          { label: 'ตำแหน่งจัดเก็บ (Location)', value: sp.Location || sp.Shelf || '—' },
          { label: 'ราคาต่อหน่วย (Unit Price)', value: sp.UnitPrice ? `${Number(sp.UnitPrice).toLocaleString()} บาท` : '—' },
        ],
      },
      {
        title: 'สถานะสต็อกและระดับความปลอดภัย (Stock Levels)',
        fields: [
          { label: 'จำนวนคงเหลือ (On Hand)', value: `${sp.QuantityOnHand || sp.Stock || 0} ${sp.Unit || 'ชิ้น'}` },
          { label: 'สต็อกขั้นต่ำ (Min Stock)', value: `${sp.MinStock || 0} ${sp.Unit || 'ชิ้น'}` },
          { label: 'สต็อกสูงสุด (Max Stock)', value: `${sp.MaxStock || '—'} ${sp.Unit || 'ชิ้น'}` },
          { label: 'ซัพพลายเออร์หลัก (Supplier)', value: sp.Supplier || sp.Vendor || '—' },
        ],
      },
    ],
    signatories: [
      { title: 'ผู้ดูแลคลังอะไหล่', name: '', date: format(new Date(), 'dd/MM/yyyy') },
      { title: 'หัวหน้าคลังสินค้า', name: '', date: '' },
      { title: 'ฝ่ายจัดซื้อ', name: '', date: '' },
      { title: 'ผู้จัดการฝ่ายซ่อมบำรุง', name: '', date: '' },
    ],
  }
}

export function generatePurchasingPdfProps(pr) {
  if (!pr) return null
  return {
    docType: 'purchasing',
    title: 'ใบขอสั่งซื้ออะไหล่และอุปกรณ์ / PURCHASE REQUEST',
    docNo: pr.PRNumber || pr.OrderNo || `PR-${pr.id || pr._id}`,
    docDate: pr.RequestDate || pr.created_at || new Date(),
    status: pr.Status || 'รออนุมัติ',
    priority: pr.Priority || 'ปกติ',
    remarks: pr.Notes || pr.Reason || '',
    sections: [
      {
        title: 'ข้อมูลการขอสั่งซื้อ (Purchase Request Information)',
        fields: [
          { label: 'เลขที่เอกสาร (PR No.)', value: pr.PRNumber || pr.OrderNo, mono: true },
          { label: 'วันที่ขอสั่งซื้อ (Date)', value: safeFormatDate(pr.RequestDate, 'dd/MM/yyyy') },
          { label: 'ผู้ขอสั่งซื้อ (Requester)', value: pr.Requester || pr.CreatedBy || '—' },
          { label: 'แผนก (Department)', value: pr.Department || 'ฝ่ายซ่อมบำรุง (Maintenance)' },
          { label: 'ความเร่งด่วน (Urgency)', value: pr.Priority || 'ปกติ' },
          { label: 'สถานะการอนุมัติ (Status)', value: pr.Status || 'รออนุมัติ' },
        ],
      },
      {
        title: 'รายการสินค้าที่ต้องการสั่งซื้อ (Requested Items)',
        fields: [
          { label: 'รายการอะไหล่ / สินค้า', value: pr.ItemName || pr.PartName || '—', full: true },
          { label: 'จำนวนที่ขอสั่งซื้อ', value: `${pr.Quantity || 1} ${pr.Unit || 'หน่วย'}` },
          { label: 'ราคาประเมินต่อหน่วย', value: pr.EstimatedUnitPrice ? `${Number(pr.EstimatedUnitPrice).toLocaleString()} บาท` : '—' },
          { label: 'ยอดรวมประเมิน (Total Amount)', value: pr.TotalAmount ? `${Number(pr.TotalAmount).toLocaleString()} บาท` : '—' },
          { label: 'เหตุผลความจำเป็น', value: pr.Reason || 'ใช้สำหรับงานซ่อมบำรุงเครื่องจักร', full: true },
        ],
      },
    ],
    signatories: [
      { title: 'ผู้ขอสั่งซื้อ', name: pr.Requester || '', date: '' },
      { title: 'หัวหน้าแผนกตรวจสอบ', name: '', date: '' },
      { title: 'ฝ่ายจัดซื้อตรวจสอบราคา', name: '', date: '' },
      { title: 'ผู้จัดการโรงงานอนุมัติ', name: '', date: '' },
    ],
  }
}

export function generateRepairRequestPdfProps(req) {
  if (!req) return null
  return {
    docType: 'repair_request',
    title: 'ใบแจ้งซ่อมเครื่องจักร / MACHINE REPAIR REQUEST',
    docNo: req.request_no || req.RequestNo || req.code || `REQ-${req.id || req._id}`,
    docDate: req.created_at || new Date(),
    status: req.status || 'รอดำเนินการ',
    priority: req.urgency || req.priority || 'ปกติ',
    remarks: req.problem_description || req.description || req.symptom || '',
    sections: [
      {
        title: 'ข้อมูลการแจ้งซ่อม (Repair Request Details)',
        fields: [
          { label: 'เลขที่ใบแจ้งซ่อม (Req No.)', value: req.request_no || req.RequestNo || req.code, mono: true },
          { label: 'วันที่แจ้งซ่อม (Date)', value: safeFormatDate(req.created_at, 'dd/MM/yyyy HH:mm') },
          { label: 'ผู้แจ้งซ่อม (Reporter)', value: req.reported_by || req.reporter_name || req.CreatedBy || '—' },
          { label: 'เครื่องจักรที่แจ้งซ่อม (Machine)', value: req.machine_mc || req.machine_id || req.mc || '—', mono: true },
          { label: 'ซีเรียลกระบอก (Cylinder Serial)', value: req.cylinder_serial || req.serial || '—', mono: true },
          { label: 'Design (ลายผ้า)', value: req.Design || '—' },
          { label: 'KI', value: req.KI ? String(req.KI) : '—', mono: true },
          { label: 'เลขม้วน (Roll No.)', value: (req.roll_no || req.RollNo || req.roll_number) ? String(req.roll_no || req.RollNo || req.roll_number) : '—', mono: true },
          { label: 'สถานที่ติดตั้ง (Location)', value: req.cylinder_location || req.location || '—' },
          { label: 'สถานะปัจจุบัน (Status)', value: req.status || 'รอดำเนินการ' },
        ],
      },
      {
        title: 'อาการขัดข้องและปัญหาที่พบ (Issue Description)',
        fields: [
          { label: 'รายละเอียดปัญหา / อาการเสียที่พบ (Problem Description)', value: req.problem_description || req.description || req.symptom || '—', full: true },
          req.approval_notes ? { label: 'คำสั่งการ / หมายเหตุหัวหน้าช่าง (Supervisor Notes)', value: req.approval_notes, full: true } : null,
          req.repair_details ? { label: 'รายละเอียดการซ่อม / วิธีแก้ไข (Repair Details)', value: req.repair_details, full: true } : null,
          req.parts_used ? { label: 'อะไหล่ที่เบิกใช้ (Parts Used)', value: req.parts_used, full: true } : null,
        ].filter(Boolean),
      },
    ],
    signatories: [
      { title: 'ผู้แจ้งซ่อม (Operator)', name: req.reported_by || req.reporter_name || '', date: safeFormatDate(req.created_at, 'dd/MM/yyyy') },
      { title: 'ช่างผู้รับเรื่องซ่อม', name: req.technician_name || '', date: '' },
      { title: 'หัวหน้างานตรวจสอบ / ผู้อนุมัติ', name: req.approved_by || '', date: safeFormatDate(req.approved_at, 'dd/MM/yyyy') },
      { title: 'ผู้บันทึกปิดงานซ่อม', name: req.completed_by || req.technician_name || '', date: safeFormatDate(req.completed_at, 'dd/MM/yyyy') },
    ],
  }
}

export function generateNeedleConditionPdfProps(needle, historyList = []) {
  if (!needle) return null
  const statusLabels = {
    'สึกเล็กน้อย': 'สึกเล็กน้อย (Minor Wear)',
    'สึกปานกลาง': 'สึกปานกลาง (Medium Wear)',
    'สึกมาก': 'สึกมาก (Heavy Wear)',
    'สึกมาก(ควรเปลี่ยน)': 'สึกมาก(ควรเปลี่ยน) (Critical Wear / Replace)',
    'NORMAL': 'สึกเล็กน้อย (Minor Wear)',
    'WATCH': 'สึกปานกลาง (Medium Wear)',
    'WORN': 'สึกมาก (Heavy Wear)',
    'BROKEN': 'สึกมาก(ควรเปลี่ยน) (Critical Wear / Replace)',
    'REPLACED': 'เปลี่ยนเข็มใหม่แล้ว (Replaced)',
  }

  const tableRows = historyList.map((h, idx) => [
    idx + 1,
    safeFormatDate(h.doc_date, 'dd/MM/yyyy'),
    h.machine_mc || '—',
    h.location || '—',
    h.counter ? Number(h.counter).toLocaleString() : '—',
    statusLabels[h.status] || h.status || 'ปกติ',
    h.inspector || '—',
  ])

  return {
    docType: 'needle',
    title: 'ใบรายงานผลการตรวจสภาพเข็ม / NEEDLE INSPECTION REPORT',
    docNo: `NDL-${safeFormatDate(needle.doc_date, 'yyyyMMdd') !== '—' ? safeFormatDate(needle.doc_date, 'yyyyMMdd') : format(new Date(), 'yyyyMMdd')}-${needle.serial || needle.machine_mc || 'REC'}`,
    docDate: needle.doc_date || new Date(),
    status: statusLabels[needle.status] || needle.status || 'ปกติ',
    priority: needle.machine_mc ? `เครื่อง ${needle.machine_mc}` : '',
    remarks: needle.needle_condition
      ? `${needle.needle_condition}${needle.remark ? `\nหมายเหตุ: ${needle.remark}` : ''}`
      : (needle.remark || 'ตรวจสภาพเข็มและร่องเข็มเรียบร้อย'),
    sections: [
      {
        title: 'ข้อมูลกระบอกและเครื่องจักร (Cylinder & Machine Information)',
        fields: [
          { label: 'ซีเรียลกระบอก (Serial)', value: needle.serial, mono: true },
          { label: 'รหัสเครื่องจักร (Machine M/C)', value: needle.machine_mc, mono: true },
          { label: 'สถานที่ติดตั้ง (Location)', value: needle.location || 'In-use' },
          { label: 'ประเภทเครื่อง (Type)', value: needle.type || 'Single Jersey' },
          { label: 'วันที่ตรวจล่าสุด (Inspection Date)', value: safeFormatDate(needle.doc_date, 'dd/MM/yyyy') },
          { label: 'ช่างผู้ตรวจเช็ค (Inspector)', value: needle.inspector || '—' },
          { label: 'สถานะสภาพเข็ม (Condition Status)', value: statusLabels[needle.status] || needle.status || 'ปกติ' },
          { label: 'จำนวนรอบ Counter ล่าสุด', value: needle.counter ? `${Number(needle.counter).toLocaleString()} รอบ` : '—', mono: true },
        ],
      },
      {
        title: 'ผลการประเมินสภาพเข็มและข้อสังเกต (Condition Assessment Details)',
        fields: [
          { label: 'รายละเอียดสภาพเข็ม / ข้อสังเกต', value: needle.needle_condition || 'ปกติ สมบูรณ์พร้อมใช้งาน', full: true },
          { label: 'หมายเหตุเพิ่มเติม (Remarks)', value: needle.remark || '—', full: true },
        ],
      },
    ],
    tableData: historyList.length > 0 ? {
      title: `ประวัติการตรวจสภาพเข็มย้อนหลัง (${historyList.length} ครั้งล่าสุด)`,
      headers: ['ลำดับ', 'วันที่ตรวจ', 'เครื่อง (MC)', 'ตำแหน่ง', 'Counter (รอบ)', 'สภาพเข็ม', 'ผู้ตรวจ'],
      rows: tableRows,
    } : null,
    images: Array.isArray(needle.images) ? needle.images : [],
    signatories: [
      { title: 'ช่างผู้ตรวจเช็คสภาพเข็ม', name: needle.inspector || '', date: safeFormatDate(needle.doc_date, 'dd/MM/yyyy') || format(new Date(), 'dd/MM/yyyy') },
      { title: 'หัวหน้างานแผน PM', name: '', date: '' },
      { title: 'หัวหน้าส่วนผลิตผ้า', name: '', date: '' },
      { title: 'ผู้จัดการฝ่ายโรงงาน', name: '', date: '' },
    ],
  }
}
