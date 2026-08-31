import { format } from 'date-fns'

/** Safe date formatter — returns '—' for null/undefined/invalid dates instead of crashing */
function safeFormatDate(val, fmt = 'dd/MM/yyyy HH:mm') {
  if (!val) return '—'
  try {
    const d = new Date(val)
    return isNaN(d.getTime()) ? '—' : format(d, fmt)
  } catch {
    return '—'
  }
}

const IMAGE_NOTE_PREFIX = 'ImageUrl:'

function extractImageUrl(note = '') {
  if (!note || typeof note !== 'string') return ''
  const line = note.split('\n').find((item) => item.trim().startsWith(IMAGE_NOTE_PREFIX))
  if (line) return line.trim().slice(IMAGE_NOTE_PREFIX.length).trim()
  const match = note.match(/ImageUrl:\s*(https?:\/\/[^\s\n]+)/i)
  return match?.[1]?.trim() || ''
}

function extractCylinderImageUrl(note = '') {
  if (!note || typeof note !== 'string') return ''
  const matches = [...note.matchAll(/ImageUrl:\s*(https?:\/\/.*?)(?=ImageUrl:|\r?\n|$)/gi)]
  return matches.at(-1)?.[1]?.trim() || ''
}

function extractHiddenValue(note = '', prefix = '') {
  if (!note || typeof note !== 'string') return ''
  const line = note.split('\n').find((item) => item.trim().startsWith(prefix))
  return line?.trim().slice(prefix.length).trim() || ''
}

/**
 * Normalizes any image or list of images into standard [{ url, caption }] array
 */
function normalizeImagesList(rawImages, defaultCaption = 'รูปถ่ายตัวอย่าง / Inspection Photo') {
  if (!rawImages) return []
  const list = Array.isArray(rawImages) ? rawImages : [rawImages]
  return list
    .filter(Boolean)
    .map((img, idx) => {
      if (typeof img === 'string' && img.trim()) {
        return {
          url: img.trim(),
          caption: list.length > 1 ? `${defaultCaption} #${idx + 1}` : defaultCaption,
        }
      }
      if (typeof img === 'object' && img !== null) {
        const url = (img.url || img.localUrl || img.src || img.ImageUrl || img.image_url || '').trim?.() || ''
        const caption = img.caption || img.title || (list.length > 1 ? `${defaultCaption} #${idx + 1}` : defaultCaption)
        return url ? { url, caption } : null
      }
      return null
    })
    .filter(Boolean)
}

/** Safe helper to access stored table caches in localStorage */
function getCachedTable(tableName) {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(`txops_tbl_${tableName}`) || localStorage.getItem(tableName)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Standard Circular Knitting Machine Needle Count Lookup / Auto-Calculation
 */
export function computeKnittingNeedles(diameterVal, gaugeVal, typeVal = '') {
  const dia = parseFloat(String(diameterVal || '').replace(/[^\d.]/g, ''))
  const gauge = parseFloat(String(gaugeVal || '').replace(/[^\d.]/g, ''))
  if (!dia || !gauge) return null

  // Standard Industry OEM Matrix for Circular Knitting Cylinders (Diameter x Gauge)
  const lookup = {
    '30_28': 2640,
    '34_28': 2988,
    '30_24': 2256,
    '34_24': 2568,
    '30_20': 1884,
    '34_20': 2136,
    '30_18': 1696,
    '34_18': 1920,
    '30_32': 3016,
    '34_32': 3420,
    '30_36': 3384,
    '34_36': 3840,
    '26_28': 2280,
    '26_24': 1956,
    '32_28': 2808,
    '32_24': 2412,
    '36_28': 3168,
    '38_28': 3344,
  }

  const key = `${Math.round(dia)}_${Math.round(gauge)}`
  if (lookup[key]) return lookup[key]

  // Standard mathematical formula aligned to 12/24 feeder systems:
  // Needles = round(PI * Dia * Gauge / 12) * 12
  const calc = Math.round((Math.PI * dia * gauge) / 12) * 12
  return calc > 0 ? calc : null
}

/**
 * Standard Needle Specification / Model Lookup based on Machine, Maker and Gauge
 */
export function computeKnittingNeedleType(manufacturer = '', type = '', gaugeVal = '', standard = '') {
  const mfr = String(manufacturer || '').toLowerCase()
  const t = String(type || '').toLowerCase()
  const g = String(gaugeVal || '').replace(/[^\d]/g, '') || '28'

  if (mfr.includes('mayer')) {
    if (t.includes('jac') || t.includes('j')) {
      return `Groz-Beckert Vo-LC 77.48 G01 (Mayer Jacquard ${g}G)`
    }
    if (t.includes('double') || t.includes('d') || t.includes('rib') || t.includes('inter')) {
      return `Groz-Beckert Wo 77.48 / Vo 89.52 G02 (${g}G)`
    }
    return `Groz-Beckert Vo 77.48 G01 (Mayer Relanit ${g}G)`
  }

  if (mfr.includes('terrot')) {
    return `Groz-Beckert Vo-Spec Terrot (${g}G High-Speed)`
  }

  if (mfr.includes('pailung')) {
    return `Groz-Beckert Vota-Spec Pailung (${g}G Standard)`
  }

  if (mfr.includes('fukuhara')) {
    return `Groz-Beckert Vo-Fukuhara Spec (${g}G)`
  }

  if (t.includes('jac')) {
    return `Groz-Beckert Jacquard Needle (${g}G OEM Spec)`
  }

  return `Groz-Beckert Standard (${g}G Knitting Needle)`
}

/* ── 1. MACHINE DATA SHEET ────────────────────────────────────────────────── */
export function generateMachinePdfProps(mc, context = {}) {
  if (!mc) return null
  const mcImage = mc.ImageUrl || extractImageUrl(mc.Remark)
  const images = normalizeImagesList(mcImage, `รูปถ่ายเครื่องจักร ${mc.Mc || ''}`.trim())

  // Cross-reference cylinders table for linked cylinder info
  const cylinders = context?.cylinders?.length ? context.cylinders : getCachedTable('cylinders')
  const matchedCyl = cylinders.find((c) =>
    (mc.Serial_NEW && (c.Serial_NOW === mc.Serial_NEW || c.Serial_OLD === mc.Serial_NEW)) ||
    (mc.Serial_NOW && (c.Serial_NOW === mc.Serial_NOW || c.Serial_OLD === mc.Serial_NOW)) ||
    (mc.Mc && (c.NewMC === mc.Mc || c.OLDMC === mc.Mc))
  )

  // Cross-reference center checks / needle conditions for last inspection date
  const centerChecks = context?.centerChecks?.length ? context.centerChecks : getCachedTable('center_checks')
  const needleConditions = context?.needleConditions?.length ? context.needleConditions : getCachedTable('needle_conditions')
  const matchedCheck = centerChecks.find((c) => c.mc === mc.Mc || (matchedCyl && c.serial === matchedCyl.Serial_NOW))
  const matchedNeedleCond = needleConditions.find((n) => n.machine_mc === mc.Mc || (matchedCyl && n.serial === matchedCyl.Serial_NOW))

  const rawNeedleCount = mc.Needle || mc.Needle_Count || mc.NeedleCount || mc.needle_count || mc.Needles || matchedCyl?.Needle
  const computedNeedles = computeKnittingNeedles(mc.Diameter || matchedCyl?.Diameter, mc.Gauge || matchedCyl?.Gauge, mc.Type || matchedCyl?.Type)
  const displayNeedleCount = rawNeedleCount
    ? `${Number(rawNeedleCount).toLocaleString()} เล่ม`
    : (computedNeedles ? `${Number(computedNeedles).toLocaleString()} เล่ม` : '—')

  const lastInspectionDate = safeFormatDate(
    matchedCheck?.doc_date || matchedNeedleCond?.doc_date || mc.updated_at,
    'dd/MM/yyyy'
  )

  return {
    docType: 'machine',
    title: 'ทะเบียนประวัติเครื่องจักร / MACHINE DATA SHEET',
    docNo: mc.Mc || `MC-${mc.id || mc._id}`,
    docDate: mc.updated_at || mc.created_at || new Date(),
    status: mc.Status || 'ปกติ',
    priority: mc.WaterCheck ? `เช็คน้ำ: ${mc.WaterCheck}` : (mc.Location || 'โรงทอ'),
    remarks: mc.Remark ? mc.Remark.replace(/ImageUrl:[^\n]+/g, '').trim() : '',
    sections: [
      {
        title: 'ข้อมูลทั่วไปของเครื่องจักร (General Machine Information)',
        fields: [
          { label: 'รหัสเครื่อง (Machine No.)', value: mc.Mc, mono: true },
          { label: 'สถานที่ติดตั้ง (Location)', value: mc.Location || matchedCyl?.Location || 'โรงทอ' },
          { label: 'ประเภทเครื่อง (Type)', value: mc.Type || matchedCyl?.Type || 'Single Jersey' },
          { label: 'ผู้ผลิต (Manufacturer)', value: mc.Manufacturer || matchedCyl?.Manufacturer || '—' },
          { label: 'รุ่นเครื่อง (Model)', value: mc.Model || '—' },
          { label: 'สถานะการทำงาน (Status)', value: mc.Status || 'ปกติ' },
          { label: 'การเช็คน้ำ (Water Check)', value: mc.WaterCheck || '—' },
          { label: 'รุ่น Inverter', value: mc.Model_Inverter || '—' },
        ],
      },
      {
        title: 'ข้อมูลทางเทคนิคและการตั้งค่า (Technical Specifications)',
        fields: [
          { label: 'ขนาดเส้นผ่านศูนย์กลาง (Diameter)', value: mc.Diameter ? `${mc.Diameter}"` : (matchedCyl?.Diameter ? `${matchedCyl.Diameter}"` : '—') },
          { label: 'เกจ (Gauge)', value: mc.Gauge ? `${mc.Gauge}G` : (matchedCyl?.Gauge ? `${matchedCyl.Gauge}G` : '—') },
          { label: 'จำนวนเข็ม (Needle Count)', value: displayNeedleCount, mono: true },
          { label: 'จำนวนฟีดเดอร์ (Feeder)', value: mc.Feeder ? `${mc.Feeder} ฟีด` : (matchedCyl?.Feeder ? `${matchedCyl.Feeder} ฟีด` : '—') },
          { label: 'น้ำมันเครื่อง (Oil Type)', value: mc.Oil || '—' },
          { label: 'ชนิด Sinker', value: mc.Sinker || '—' },
          { label: 'ตรวจเช็คล่าสุด', value: lastInspectionDate },
          matchedCyl ? { label: 'กระบอกเข็มที่ติดตั้ง', value: `Serial: ${matchedCyl.Serial_NOW || '—'} (${matchedCyl.Standard || 'Standard'})` } : null,
        ].filter(Boolean),
      },
      {
        title: 'ประวัติหมายเลขซีเรียล (Serial History)',
        fields: [
          { label: 'ซีเรียลปัจจุบัน (Serial NEW/NOW)', value: mc.Serial_NEW || mc.Serial_NOW || matchedCyl?.Serial_NOW || '—', mono: true },
          { label: 'ซีเรียลเดิม (Serial OLD)', value: mc.Serial_OLD || matchedCyl?.Serial_OLD || '—', mono: true },
        ],
      },
      {
        title: 'ข้อมูลสายพาน, Dial และขาแคม (Belts & Cams)',
        fields: [
          { label: 'สายพาน 1 (Tape 1 No.)', value: mc.Tape1_No || '—' },
          { label: 'สายพาน 2 (Tape 2 No.)', value: mc.Tape2_No || '—' },
          { label: 'สายพาน 3 (Tape 3 No.)', value: mc.Tape3_No || '—' },
          { label: 'สายพาน 4 (Tape 4 No.)', value: mc.Tape4_No || '—' },
          { label: 'สายพาน 5 (Tape 5 No.)', value: mc.Tape5_No || '—' },
          { label: 'Dial ขาหน้า', value: mc.Dial_Front || '—' },
          { label: 'Dial ขาหลัง', value: mc.Dial_Rear || '—' },
          { label: 'ขา 1 (Leg 1)', value: mc.Leg1 || '—' },
          { label: 'ขา 2 (Leg 2)', value: mc.Leg2 || '—' },
          { label: 'ขา 3 (Leg 3)', value: mc.Leg3 || '—' },
          { label: 'ขา 4 (Leg 4)', value: mc.Leg4 || '—' },
        ],
      },
    ],
    images,
    signatories: [
      { title: 'ผู้บันทึกข้อมูล', name: '', date: safeFormatDate(new Date(), 'dd/MM/yyyy') },
      { title: 'ช่างประจำเครื่อง', name: '', date: '' },
      { title: 'หัวหน้าแผนกช่าง', name: '', date: '' },
      { title: 'ผู้จัดการฝ่ายผลิต', name: '', date: '' },
    ],
  }
}

/* ── 2. CYLINDER DATA SHEET ──────────────────────────────────────────────── */
export function generateCylinderPdfProps(cyl, context = {}) {
  if (!cyl) return null
  const cylImage = cyl.ImageUrl || extractCylinderImageUrl(cyl.Comment)
  const images = normalizeImagesList(cylImage, `รูปถ่ายกระบอกเข็ม ${cyl.Serial_NOW || ''}`.trim())

  // Machine matching from context or localStorage
  const machines = context?.machines?.length ? context.machines : getCachedTable('machines')
  const matchedMc = machines.find((m) =>
    m.Mc === cyl.NewMC ||
    m.Mc === cyl.OLDMC ||
    m.Serial_NEW === cyl.Serial_NOW ||
    m.Serial_NOW === cyl.Serial_NOW
  )

  // Inspection matching from context or localStorage
  const centerChecks = context?.centerChecks?.length ? context.centerChecks : getCachedTable('center_checks')
  const needleConditions = context?.needleConditions?.length ? context.needleConditions : getCachedTable('needle_conditions')
  const matchedCheck = centerChecks.find((c) => c.serial === cyl.Serial_NOW || c.mc === cyl.NewMC)
  const matchedNeedleCond = needleConditions.find((n) => n.serial === cyl.Serial_NOW || n.machine_mc === cyl.NewMC)

  // 1. Needle Count (จำนวนเข็ม - ดึงจากข้อมูลกระบอก / เครื่องจักร / คำนวณอัตโนมัติ)
  const rawNeedleCount = cyl.Needle || cyl.Needle_Count || cyl.NeedleCount || cyl.needle_count || cyl.Needles || matchedMc?.Needle
  const computedNeedles = computeKnittingNeedles(cyl.Diameter || matchedMc?.Diameter, cyl.Gauge || matchedMc?.Gauge, cyl.Type || matchedMc?.Type)
  const displayNeedleCount = rawNeedleCount
    ? `${Number(rawNeedleCount).toLocaleString()} เล่ม`
    : (computedNeedles ? `${Number(computedNeedles).toLocaleString()} เล่ม` : '—')

  // 2. Needle Type (ประเภทเข็ม - ดึงจากสเปก หรือระบุตามรุ่นเครื่องจักร Mayer / Terrot / Pailung อัตโนมัติ)
  const rawNeedleType = cyl.Needle_Type || cyl.NeedleType || cyl.needle_type || cyl.Needle_Model || cyl.NeedleModel || matchedMc?.Needle_Type
  const displayNeedleType = rawNeedleType || computeKnittingNeedleType(
    cyl.Manufacturer || matchedMc?.Manufacturer || 'Mayer',
    cyl.Type || matchedMc?.Type || 'Single',
    cyl.Gauge || matchedMc?.Gauge || '28',
    cyl.Standard
  )

  // 3. Manufacturer (ผู้ผลิตกระบอก)
  const displayManufacturer = cyl.Manufacturer || matchedMc?.Manufacturer || 'Mayer'

  // 4. Last Check Date (วันที่ตรวจเช็คล่าสุด)
  const rawLastCheckDate = cyl.Last_Check_Date || cyl.LastCheckDate || cyl.last_check_date || cyl.LastPMDate || matchedCheck?.doc_date || matchedNeedleCond?.doc_date || cyl.updated_at || cyl.created_at
  const displayLastCheckDate = safeFormatDate(rawLastCheckDate, 'dd/MM/yyyy')

  return {
    docType: 'cylinder',
    title: 'ทะเบียนประวัติกระบอกเข็ม / CYLINDER DATA SHEET',
    docNo: cyl.Serial_NOW || cyl.Serial_OLD || `CYL-${cyl.id || cyl._id}`,
    docDate: cyl.updated_at || cyl.created_at || new Date(),
    status: cyl.Status_Now || cyl.Standard || 'ปกติ',
    priority: cyl.Location || 'คลังกระบอก',
    remarks: cyl.Comment ? cyl.Comment.replace(/ImageUrl:[^\n]+/g, '').trim() : '',
    sections: [
      {
        title: 'ข้อมูลกระบอกเข็ม (Cylinder Identity)',
        fields: [
          { label: 'ซีเรียลปัจจุบัน (Serial NOW)', value: cyl.Serial_NOW, mono: true },
          { label: 'ซีเรียลเดิม (Serial OLD)', value: cyl.Serial_OLD || '—', mono: true },
          { label: 'เครื่องประจำปัจจุบัน (New M/C)', value: cyl.NewMC || '—', mono: true },
          { label: 'เครื่องประจำเดิม (Old M/C)', value: cyl.OLDMC || cyl.Machine_KI || '—', mono: true },
          { label: 'สถานที่จัดเก็บ/ติดตั้ง (Location)', value: cyl.Location || 'คลังกระบอก' },
          { label: 'ประเภทเครื่อง (Type)', value: cyl.Type || 'Single Jersey' },
          { label: 'ขนาดเส้นผ่านศูนย์กลาง (Diameter)', value: cyl.Diameter ? `${cyl.Diameter}"` : '—' },
          { label: 'เกจ (Gauge)', value: cyl.Gauge ? `${cyl.Gauge}G` : '—' },
          { label: 'สถานะกระบอก (Status Now)', value: cyl.Status_Now || 'ปกติ' },
          { label: 'มาตรฐานการผลิต (Standard)', value: cyl.Standard || 'สแตนดาร์ด' },
        ],
      },
      {
        title: 'ข้อมูลจำเพาะและอะไหล่ (Specifications & Needles)',
        fields: [
          { label: 'จำนวนเข็ม (Needle Count)', value: displayNeedleCount, mono: true },
          { label: 'ประเภทเข็ม (Needle Type)', value: displayNeedleType },
          { label: 'ผู้ผลิตกระบอก (Manufacturer)', value: displayManufacturer },
          { label: 'วันที่ตรวจเช็คล่าสุด', value: displayLastCheckDate },
          cyl.Feeder || matchedMc?.Feeder ? { label: 'จำนวนฟีดเดอร์ (Feeders)', value: `${cyl.Feeder || matchedMc?.Feeder} ฟีด` } : null,
          cyl.Machine_Ref ? { label: 'สถานะการใช้งาน (Machine Ref)', value: cyl.Machine_Ref } : null,
          matchedMc?.Sinker ? { label: 'ชนิด Sinker', value: matchedMc.Sinker } : null,
          matchedMc?.Oil ? { label: 'น้ำมันเครื่องที่ใช้', value: matchedMc.Oil } : null,
        ].filter(Boolean),
      },
    ],
    images,
    signatories: [
      { title: 'ผู้ตรวจสอบกระบอก', name: '', date: safeFormatDate(new Date(), 'dd/MM/yyyy') },
      { title: 'ช่างผู้เปลี่ยน/สลับ', name: '', date: '' },
      { title: 'หัวหน้างานซ่อมบำรุง', name: '', date: '' },
      { title: 'ผู้จัดการโรงงาน', name: '', date: '' },
    ],
  }
}

/* ── 3. WORK ORDER ────────────────────────────────────────────────────────── */
export function generateWorkOrderPdfProps(wo, context = {}) {
  if (!wo) return null
  const woImages = wo.images || wo.Images || wo.ImageUrl || wo.image_url
  const images = normalizeImagesList(woImages, `รูปถ่ายประกอบงาน ${wo.WONumber || wo.Job_ID || ''}`.trim())

  // Cross-reference machine and repair requests if missing Design / KI / RollNo
  const machines = context?.machines?.length ? context.machines : getCachedTable('machines')
  const matchedMc = machines.find((m) => m.Mc === (wo.MachineID || wo.MachineCode || wo.MC))

  const repairRequests = context?.repairRequests?.length ? context.repairRequests : getCachedTable('repair_requests')
  const matchedReq = repairRequests.find((r) =>
    (wo.RequestNo && (r.request_no === wo.RequestNo || r.code === wo.RequestNo)) ||
    (wo.req_id && r.id === wo.req_id) ||
    (wo.MC && r.machine_mc === wo.MC && r.status !== 'REJECTED')
  )

  const designVal = wo.Design || matchedReq?.Design || '—'
  const kiVal = wo.KI || matchedReq?.KI || '—'
  const rollNoVal = (wo.RollNo || wo.roll_no || matchedReq?.roll_no || matchedReq?.RollNo) ? String(wo.RollNo || wo.roll_no || matchedReq?.roll_no || matchedReq?.RollNo) : '—'
  const locationVal = wo.Location || matchedMc?.Location || matchedReq?.cylinder_location || 'โรงทอ'

  return {
    docType: 'workorder',
    title: 'ใบสั่งงานบำรุงรักษา / WORK ORDER',
    docNo: wo.WONumber || wo.Job_ID || wo.OrderNo || `WO-${wo.id || wo._id}`,
    docDate: wo.OrderDate || wo.StartDate || wo.created_at || new Date(),
    status: wo.Status || 'รอดำเนินการ',
    priority: wo.Priority || 'ปกติ',
    remarks: wo.Notes || wo.Description || wo.Comment || '',
    sections: [
      {
        title: 'ข้อมูลใบสั่งงาน (Work Order Details)',
        fields: [
          { label: 'เลขที่ใบสั่งงาน (WO No.)', value: wo.WONumber || wo.Job_ID || wo.OrderNo, mono: true },
          { label: 'วันที่สั่งงาน (Date)', value: safeFormatDate(wo.OrderDate || wo.StartDate, 'dd/MM/yyyy') },
          { label: 'เครื่องจักรเป้าหมาย (Machine)', value: wo.MachineID || wo.MachineCode || wo.MachineName || wo.MC, mono: true },
          { label: 'รหัสงาน (KI)', value: kiVal, mono: true },
          { label: 'แบบงาน (Design)', value: designVal },
          { label: 'เลขม้วน (Roll No.)', value: rollNoVal, mono: true },
          { label: 'ประเภทงาน (WO Type)', value: wo.JobType || wo.WOType || wo.Type || 'REPAIR' },
          { label: 'ช่างผู้รับผิดชอบ (Assignee)', value: wo.Technicians || wo.AssignedTo || wo.TechnicianName || '—' },
          { label: 'สถานที่ติดตั้ง (Location)', value: locationVal },
          { label: 'สถานะงาน (Status)', value: wo.Status || '—' },
        ],
      },
      {
        title: 'รายละเอียดและอาการปัญหา (Problem & Task Description)',
        fields: [
          { label: 'ชื่องาน / หัวข้อ (Title)', value: wo.Title || wo.TaskName || `งาน ${wo.JobType || 'ซ่อมบำรุง'} เครื่อง ${wo.MC || ''}`, full: true },
          { label: 'รายละเอียดปัญหา (Problem Detail)', value: wo.Problem || wo.Description || wo.ProblemDetail || wo.Comment || '—', full: true },
          { label: 'แนวทางการแก้ไข (Action Taken)', value: wo.Solution || wo.ActionTaken || wo.Detail || '—', full: true },
        ],
      },
      {
        title: 'เวลาและประสิทธิภาพการทำงาน (Time & Net Working Hours)',
        fields: [
          { label: 'เวลาเริ่มงาน (Start Time)', value: safeFormatDate(wo.StartTimestamp || wo.StartDate, 'dd/MM/yyyy HH:mm') },
          { label: 'เวลาเสร็จสิ้น (End Time)', value: safeFormatDate(wo.EndTimestamp || wo.EndDate, 'dd/MM/yyyy HH:mm') },
          wo.GrossDurationText ? { label: 'เวลารวมทั้งหมด (Gross Duration)', value: wo.GrossDurationText } : null,
          (wo.SundayDurationText || wo.SundayDurationHours) ? { label: '🏖️ หักวันอาทิตย์ (Sunday Day-Off)', value: `- ${wo.SundayDurationText || `${wo.SundayDurationHours} ชม.`}` } : null,
          (wo.LostDurationText || wo.LostDurationHours) ? { label: '⏸️ เวลาที่สูญเสียไป/งานแทรก (Lost Time)', value: `- ${wo.LostDurationText || `${wo.LostDurationHours} ชม.`}` } : null,
          { label: '👉 เวลาทำงานสุทธิ (Net Working Time)', value: wo.WorkingDurationText || (wo.Duration ? `${wo.Duration} ชม.` : '—'), mono: true },
          { label: 'ผู้สร้างใบสั่งงาน (Created By)', value: wo.CreatedBy || '—' },
          (() => {
            let logs = wo.Interruption_Logs || wo.interruption_logs
            if (typeof logs === 'string') {
              try { logs = JSON.parse(logs) } catch { logs = [] }
            }
            if (Array.isArray(logs) && logs.length > 0) {
              const summary = logs.map((l) => `${l.task_name || 'งานแทรก'} (${l.duration_minutes ? `${l.duration_minutes} นาที` : (l.duration_hours ? `${l.duration_hours} ชม.` : '')})`).join(', ')
              return { label: '📋 รายการงานแทรก / สาเหตุสูญเสียเวลา', value: summary, full: true }
            }
            return null
          })(),
        ].filter(Boolean),
      },
    ],
    images,
    signatories: [
      { title: 'ผู้แจ้งงาน / สั่งงาน', name: wo.CreatedBy || '', date: safeFormatDate(wo.StartDate || wo.created_at, 'dd/MM/yyyy') },
      { title: 'ช่างผู้ปฏิบัติงาน', name: wo.Technicians || wo.AssignedTo || '', date: safeFormatDate(wo.EndDate, 'dd/MM/yyyy') },
      { title: 'หัวหน้างานตรวจรับ', name: '', date: '' },
      { title: 'ผู้อนุมัติปิดงาน', name: '', date: '' },
    ],
  }
}

/* ── 4. REPAIR REQUEST ────────────────────────────────────────────────────── */
export function generateRepairRequestPdfProps(req, context = {}) {
  if (!req) return null
  const reqImages = req.images || req.Images || req.image_url || req.ImageUrl || (req.problem_description ? extractImageUrl(req.problem_description) : '')
  const images = normalizeImagesList(reqImages, `รูปถ่ายจุดชำรุด / อาการเสีย ${req.request_no || ''}`.trim())

  // Cross-reference cylinders and machines for missing specs
  const cylinders = context?.cylinders?.length ? context.cylinders : getCachedTable('cylinders')
  const machines = context?.machines?.length ? context.machines : getCachedTable('machines')

  const matchedCyl = cylinders.find((c) =>
    (req.cylinder_serial && (c.Serial_NOW === req.cylinder_serial || c.Serial_OLD === req.cylinder_serial)) ||
    (req.machine_mc && (c.NewMC === req.machine_mc || c.OLDMC === req.machine_mc))
  )
  const matchedMc = machines.find((m) => m.Mc === req.machine_mc)

  const locationVal = req.cylinder_location || matchedCyl?.Location || matchedMc?.Location || 'โรงทอ'
  const serialVal = req.cylinder_serial || req.serial || matchedCyl?.Serial_NOW || matchedMc?.Serial_NEW || '—'
  const stdVal = req.cylinder_standard || matchedCyl?.Standard || 'Standard'

  // Clean problem description of hidden tags for clean PDF rendering
  const cleanProblem = req.problem_description
    ? req.problem_description
        .replace(/ImageUrl:[^\n]+/g, '')
        .replace(/Design:[^\n]+/g, '')
        .replace(/KI:[^\n]+/g, '')
        .replace(/Roll:[^\n]+/g, '')
        .trim()
    : (req.description || req.symptom || '—')

  return {
    docType: 'repair_request',
    title: 'ใบแจ้งซ่อมเครื่องจักร / MACHINE REPAIR REQUEST',
    docNo: req.request_no || req.RequestNo || req.code || `REQ-${req.id || req._id}`,
    docDate: req.created_at || new Date(),
    status: req.status || 'รอดำเนินการ',
    priority: req.urgency || req.priority || 'ปกติ',
    remarks: cleanProblem,
    sections: [
      {
        title: 'ข้อมูลการแจ้งซ่อม (Repair Request Details)',
        fields: [
          { label: 'เลขที่ใบแจ้งซ่อม (Req No.)', value: req.request_no || req.RequestNo || req.code, mono: true },
          { label: 'วันที่แจ้งซ่อม (Date)', value: safeFormatDate(req.created_at, 'dd/MM/yyyy HH:mm') },
          { label: 'ผู้แจ้งซ่อม (Reporter)', value: req.reported_by || req.reporter_name || req.CreatedBy || '—' },
          { label: 'เครื่องจักรที่แจ้งซ่อม (Machine)', value: req.machine_mc || req.machine_id || req.mc || '—', mono: true },
          { label: 'ซีเรียลกระบอก (Cylinder Serial)', value: serialVal, mono: true },
          { label: '🎨 Design (ลายผ้า)', value: req.Design || req.design || '—' },
          { label: '🧾 KI', value: req.KI ? String(req.KI) : '—', mono: true },
          { label: '📦 เลขม้วน (Roll No.)', value: (req.roll_no || req.RollNo || req.roll_number) ? String(req.roll_no || req.RollNo || req.roll_number) : '—', mono: true },
          { label: 'สถานที่ติดตั้ง (Location)', value: locationVal },
          { label: 'มาตรฐานการผลิต (Standard)', value: stdVal },
        ],
      },
      {
        title: 'อาการขัดข้องและปัญหาที่พบ (Issue Description & Actions)',
        fields: [
          { label: '⚠️ รายละเอียดปัญหา / อาการเสียที่พบ (Problem Description)', value: cleanProblem, full: true },
          req.approval_notes ? { label: '📝 คำสั่งการ / หมายเหตุหัวหน้าช่าง (Supervisor Notes)', value: req.approval_notes, full: true } : null,
          req.repair_details ? { label: '🛠️ รายละเอียดการซ่อม / วิธีแก้ไข (Repair Details)', value: req.repair_details, full: true } : null,
          req.parts_used ? { label: '📦 อะไหล่ที่เบิกใช้ (Parts Used)', value: req.parts_used, full: true } : null,
        ].filter(Boolean),
      },
    ],
    images,
    signatories: [
      { title: 'ผู้แจ้งซ่อม (Operator)', name: req.reported_by || req.reporter_name || '', date: safeFormatDate(req.created_at, 'dd/MM/yyyy') },
      { title: 'ช่างผู้รับเรื่องซ่อม', name: req.technician_name || '', date: '' },
      { title: 'หัวหน้างานตรวจสอบ / ผู้อนุมัติ', name: req.approved_by || '', date: safeFormatDate(req.approved_at, 'dd/MM/yyyy') },
      { title: 'ผู้บันทึกปิดงานซ่อม', name: req.completed_by || req.technician_name || '', date: safeFormatDate(req.completed_at, 'dd/MM/yyyy') },
    ],
  }
}

/* ── 5. PREVENTIVE MAINTENANCE PLAN ──────────────────────────────────────── */
export function generatePMPlanPdfProps(pm, context = {}) {
  if (!pm) return null
  const pmImages = pm.images || pm.Images || pm.ImageUrl || pm.image_url
  const images = normalizeImagesList(pmImages, `รูปถ่ายประกอบแผน PM ${pm.PM_No || ''}`.trim())

  // Cross-reference machine
  const machines = context?.machines?.length ? context.machines : getCachedTable('machines')
  const matchedMc = machines.find((m) => m.Mc === (pm.Machine_KI || pm.NewMC || pm.MachineCode))

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
          { label: 'ประเภทเครื่อง (Type)', value: pm.Type || matchedMc?.Type || 'Single Jersey' },
          { label: 'ตำแหน่ง (Location)', value: pm.Location || matchedMc?.Location || 'โรงทอ' },
          { label: 'รอบการบำรุงรักษา (Interval)', value: pm.IntervalDays ? `${pm.IntervalDays} วัน` : (pm.IntervalRuntime ? `${pm.IntervalRuntime} ชม.` : '—') },
          { label: 'วันที่ทำ PM ล่าสุด (Last PM)', value: safeFormatDate(pm.LastPMDate, 'dd/MM/yyyy') },
          { label: 'วันที่กำหนดทำ PM ถัดไป (Next Due)', value: safeFormatDate(pm.NextPMDate || pm.TargetDate, 'dd/MM/yyyy') },
          { label: 'ช่างผู้รับผิดชอบ (Mechanic)', value: pm.ResponsiblePerson || pm.Mechanic || '—' },
          { label: 'สถานะแผนงาน (Status)', value: pm.Status || 'รอดำเนินการ' },
        ],
      },
      {
        title: 'รายการตรวจเช็คและบำรุงรักษา (PM Tasks & Scope)',
        fields: [
          { label: 'หัวข้อการบำรุงรักษา (PM Title)', value: pm.Title || pm.PlanName || 'การบำรุงรักษาตามรอบเวลา / Runtime', full: true },
          { label: 'รายละเอียดงาน (Description)', value: pm.Description || 'ตรวจเช็คระบบหล่อลื่น, สายพาน, ตัวนับรอบ, ระบบไฟฟ้า และความตึงของเข็ม', full: true },
        ],
      },
    ],
    images,
    signatories: [
      { title: 'ผู้จัดทำแผน', name: '', date: safeFormatDate(new Date(), 'dd/MM/yyyy') },
      { title: 'ช่าง PM ผู้ปฏิบัติงาน', name: pm.ResponsiblePerson || pm.Mechanic || '', date: '' },
      { title: 'หัวหน้างานแผน PM', name: '', date: '' },
      { title: 'ผู้จัดการฝ่ายวิศวกรรม', name: '', date: '' },
    ],
  }
}

/* ── 6. CENTER CHECK REPORT ──────────────────────────────────────────────── */
export function generateCenterCheckPdfProps(chk, context = {}) {
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

  // Cross-reference machine/cylinder for location fallback
  const machines = context?.machines?.length ? context.machines : getCachedTable('machines')
  const cylinders = context?.cylinders?.length ? context.cylinders : getCachedTable('cylinders')
  const matchedMc = machines.find((m) => m.Mc === chk.mc)
  const matchedCyl = cylinders.find((c) => c.Serial_NOW === chk.serial || c.NewMC === chk.mc)

  const locationVal = (chk.location && chk.location !== '—') ? chk.location : (matchedCyl?.Location || matchedMc?.Location || 'โรงทอ')

  const images = normalizeImagesList(chk.needle_images || chk.images, `รูปถ่ายการตรวจศูนย์เข็ม ${chk.mc || ''}`.trim())

  return {
    docType: 'centercheck',
    title: `ใบรายงานผลตรวจเช็คศูนย์เข็ม (${chk.type === 'Double' ? 'Double Jersey' : 'Single Jersey'})`,
    docNo: chk.doc_no || `CC-${chk.id || chk._id}`,
    docDate: chk.doc_date || new Date(),
    status: chk.status || 'ผ่าน',
    priority: chk.mc ? `เครื่อง ${chk.mc}` : '',
    remarks: chk.remark || chk.comment || '',
    sections: [
      {
        title: 'ข้อมูลการตรวจเช็คศูนย์เข็ม (Center Check Details)',
        fields: [
          { label: 'เลขที่เอกสาร (Doc No.)', value: chk.doc_no, mono: true },
          { label: 'วันที่ตรวจเช็ค (Date)', value: safeFormatDate(chk.doc_date, 'dd/MM/yyyy') },
          { label: 'รหัสเครื่องจักร (M/C No.)', value: chk.mc, mono: true },
          { label: 'ซีเรียลกระบอก (Serial)', value: chk.serial, mono: true },
          { label: 'ตำแหน่ง (Location)', value: locationVal },
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
    images,
    signatories: [
      { title: 'ช่างผู้ตรวจเช็ค', name: chk.mechanic || chk.sign_name || '', date: safeFormatDate(chk.sign_date || chk.doc_date, 'dd/MM/yyyy') },
      { title: 'หัวหน้าแผนกตรวจสอบ', name: chk.sup_name || '', date: safeFormatDate(chk.sup_date || chk.doc_date, 'dd/MM/yyyy') },
      { title: 'หัวหน้าส่วนผลิตผ้า', name: '', date: '' },
      { title: 'ผู้จัดการฝ่ายโรงงาน', name: '', date: '' },
    ],
  }
}

/* ── 7. NEEDLE INSPECTION REPORT ─────────────────────────────────────────── */
export function generateNeedleConditionPdfProps(needle, historyList = [], context = {}) {
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

  // Cross-reference cylinder for location
  const cylinders = context?.cylinders?.length ? context.cylinders : getCachedTable('cylinders')
  const matchedCyl = cylinders.find((c) => c.Serial_NOW === needle.serial || c.NewMC === needle.machine_mc)
  const locationVal = needle.location || matchedCyl?.Location || 'In-use'

  const images = normalizeImagesList(needle.images || needle.needle_images, `รูปถ่ายสภาพเข็ม ${needle.serial || needle.machine_mc || ''}`.trim())

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
          { label: 'สถานที่ติดตั้ง (Location)', value: locationVal },
          { label: 'ประเภทเครื่อง (Type)', value: needle.type || matchedCyl?.Type || 'Single Jersey' },
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
    images,
    signatories: [
      { title: 'ช่างผู้ตรวจเช็คสภาพเข็ม', name: needle.inspector || '', date: safeFormatDate(needle.doc_date, 'dd/MM/yyyy') || format(new Date(), 'dd/MM/yyyy') },
      { title: 'หัวหน้างานแผน PM', name: '', date: '' },
      { title: 'หัวหน้าส่วนผลิตผ้า', name: '', date: '' },
      { title: 'ผู้จัดการฝ่ายโรงงาน', name: '', date: '' },
    ],
  }
}

/* ── 8. SPARE PART DATA SHEET ────────────────────────────────────────────── */
export function generateSparePartPdfProps(sp, context = {}) {
  if (!sp) return null
  const spImage = sp.ImageUrl || extractHiddenValue(sp.Remark, 'ImageUrl:')
  const images = normalizeImagesList(spImage, `รูปถ่ายอะไหล่ ${sp.PartNumber || sp.PartName || ''}`.trim())

  const qty = Number(sp.QuantityOnHand || sp.Stock || 0)
  const minStock = Number(sp.MinStock || 0)
  const maxStock = Number(sp.MaxStock || 0)
  const unitPrice = Number(sp.UnitPrice || 0)
  const totalValuation = qty * unitPrice

  const isLowStock = qty <= minStock
  const isOutOfStock = qty <= 0

  const statusText = isOutOfStock
    ? 'สินค้าหมดสต็อก (Out of Stock)'
    : isLowStock
      ? 'สต็อกต่ำกว่าเกณฑ์ (Low Stock)'
      : 'ระดับสต็อกปกติ (Normal)'

  return {
    docType: 'sparepart',
    title: 'ทะเบียนอะไหล่และอุปกรณ์ / SPARE PART DATA SHEET',
    docNo: sp.PartNumber || sp.Code || `SP-${sp.id || sp._id}`,
    docDate: sp.updated_at || sp.created_at || new Date(),
    status: statusText,
    priority: sp.Category || 'อะไหล่ทั่วไป',
    remarks: sp.Description || sp.Notes || (sp.Remark ? sp.Remark.replace(/ImageUrl:[^\n]+/g, '').trim() : ''),
    sections: [
      {
        title: 'ข้อมูลอะไหล่และอุปกรณ์ (Spare Part Specifications)',
        fields: [
          { label: 'รหัสอะไหล่ (Part No.)', value: sp.PartNumber || sp.Code, mono: true },
          { label: 'ชื่ออะไหล่ (Part Name)', value: sp.PartName || sp.Name, full: true },
          { label: 'หมวดหมู่อะไหล่ (Category)', value: sp.Category || '—' },
          { label: 'หน่วยนับ (Unit)', value: sp.Unit || 'ชิ้น' },
          { label: 'ตำแหน่งจัดเก็บ (Location)', value: sp.Location || sp.Shelf || 'คลังอะไหล่' },
          { label: 'ราคาต่อหน่วย (Unit Price)', value: unitPrice ? `${unitPrice.toLocaleString()} บาท` : '—' },
          { label: 'มูลค่าสต็อกรวม (Total Value)', value: totalValuation ? `${totalValuation.toLocaleString()} บาท` : '—' },
          { label: 'ผู้จัดจำหน่าย (Supplier)', value: sp.Supplier || sp.Vendor || '—' },
        ],
      },
      {
        title: 'ระดับสต็อกและความต้องการสั่งซื้อ (Inventory & Reorder Levels)',
        fields: [
          { label: 'จำนวนคงเหลือปัจจุบัน (On Hand)', value: `${qty} ${sp.Unit || 'ชิ้น'}` },
          { label: 'ระดับสต็อกขั้นต่ำ (Min Stock)', value: `${minStock} ${sp.Unit || 'ชิ้น'}` },
          { label: 'ระดับสต็อกสูงสุด (Max Stock)', value: maxStock ? `${maxStock} ${sp.Unit || 'ชิ้น'}` : '—' },
          { label: 'จำนวนที่ควรสั่งเพิ่ม (Reorder Qty)', value: isLowStock && maxStock ? `${Math.max(0, maxStock - qty)} ${sp.Unit || 'ชิ้น'}` : '—' },
        ],
      },
    ],
    images,
    signatories: [
      { title: 'ผู้ดูแลคลังอะไหล่', name: '', date: safeFormatDate(new Date(), 'dd/MM/yyyy') },
      { title: 'หัวหน้าคลังสินค้า', name: '', date: '' },
      { title: 'ฝ่ายจัดซื้อ', name: '', date: '' },
      { title: 'ผู้จัดการฝ่ายซ่อมบำรุง', name: '', date: '' },
    ],
  }
}

/* ── 9. PURCHASE REQUEST ──────────────────────────────────────────────────── */
export function generatePurchasingPdfProps(pr, context = {}) {
  if (!pr) return null
  const prImages = pr.images || pr.Images || pr.ImageUrl || pr.image_url
  const images = normalizeImagesList(prImages, `รูปถ่ายสินค้า / อะไหล่ ${pr.PRNumber || ''}`.trim())

  const qty = Number(pr.Quantity || 1)
  const unitPrice = Number(pr.EstimatedUnitPrice || pr.UnitPrice || 0)
  const totalAmount = pr.TotalAmount ? Number(pr.TotalAmount) : (qty * unitPrice || null)

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
        title: 'รายการสินค้าที่ต้องการสั่งซื้อ (Requested Items & Costs)',
        fields: [
          { label: 'รายการอะไหล่ / สินค้า', value: pr.ItemName || pr.PartName || '—', full: true },
          { label: 'จำนวนที่ขอสั่งซื้อ', value: `${qty} ${pr.Unit || 'หน่วย'}` },
          { label: 'ราคาประเมินต่อหน่วย', value: unitPrice ? `${unitPrice.toLocaleString()} บาท` : '—' },
          { label: 'ยอดรวมประเมิน (Total Amount)', value: totalAmount ? `${totalAmount.toLocaleString()} บาท` : '—' },
          { label: 'เหตุผลความจำเป็น', value: pr.Reason || 'ใช้สำหรับงานซ่อมบำรุงเครื่องจักร', full: true },
        ],
      },
    ],
    images,
    signatories: [
      { title: 'ผู้ขอสั่งซื้อ', name: pr.Requester || '', date: safeFormatDate(pr.RequestDate || pr.created_at, 'dd/MM/yyyy') },
      { title: 'หัวหน้าแผนกตรวจสอบ', name: '', date: '' },
      { title: 'ฝ่ายจัดซื้อตรวจสอบราคา', name: '', date: '' },
      { title: 'ผู้จัดการโรงงานอนุมัติ', name: '', date: '' },
    ],
  }
}

