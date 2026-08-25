import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envFile = fs.readFileSync('.env', 'utf8')
let url = '', key = ''
envFile.split('\n').forEach((line) => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim()
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim()
})

const supabase = createClient(url, key)

const SINGLE_ITEMS = [
  { no: 1, item: 'กลม cylinder', std: '0.03', bMin: 0.02, bMax: 0.05, aMin: 0.01, aMax: 0.03 },
  { no: 2, item: 'สูงต่ำ cylinder', std: '0.03', bMin: 0.02, bMax: 0.04, aMin: 0.01, aMax: 0.03 },
  { no: 3, item: 'สูงต่ำ cambox cylinder', std: '0.03', bMin: 0.02, bMax: 0.05, aMin: 0.01, aMax: 0.03 },
  { no: 4, item: 'กลม cambox cylinder', std: '0.03', bMin: 0.02, bMax: 0.04, aMin: 0.01, aMax: 0.03 },
  { no: 5, item: 'กลม singer', std: '0.03', bMin: 0.02, bMax: 0.05, aMin: 0.01, aMax: 0.03 },
  { no: 6, item: 'สูงต่ำ singer', std: '0.03', bMin: 0.02, bMax: 0.04, aMin: 0.01, aMax: 0.03 },
  { no: 7, item: 'ระยะห่าง singer', std: '0.15><0.20', bMin: 0.20, bMax: 0.24, aMin: 0.16, aMax: 0.19 },
  { no: 8, item: 'กลม วงแปรง', std: '0.05', bMin: 0.04, bMax: 0.07, aMin: 0.02, aMax: 0.04 },
  { no: 9, item: 'สูงต่ำ วงแปรง', std: '0.05', bMin: 0.03, bMax: 0.06, aMin: 0.02, aMax: 0.04 },
  { no: 10, item: 'กลม take down', std: '1.00', bMin: 0.70, bMax: 1.20, aMin: 0.40, aMax: 0.80 },
]

const DOUBLE_ITEMS = [
  { no: 1, item: 'กลม Cylinder', std: '0.03', bMin: 0.02, bMax: 0.05, aMin: 0.01, aMax: 0.03 },
  { no: 2, item: 'สูง-ต่ำ Cylinder', std: '0.03', bMin: 0.02, bMax: 0.04, aMin: 0.01, aMax: 0.03 },
  { no: 3, item: 'กลม Cambox Cylinder', std: '0.03', bMin: 0.02, bMax: 0.05, aMin: 0.01, aMax: 0.03 },
  { no: 4, item: 'สูง-ต่ำ Cambox Cylinder', std: '0.03', bMin: 0.02, bMax: 0.04, aMin: 0.01, aMax: 0.03 },
  { no: 5, item: 'กลม Dail', std: '0.03', bMin: 0.02, bMax: 0.05, aMin: 0.01, aMax: 0.03 },
  { no: 6, item: 'สูง-ต่ำ Dail', std: '0.03', bMin: 0.02, bMax: 0.04, aMin: 0.01, aMax: 0.03 },
  { no: 7, item: 'ระยะห่าง cambox Dail', std: '0.15><0.20', bMin: 0.20, bMax: 0.24, aMin: 0.16, aMax: 0.19 },
  { no: 8, item: 'สูง-ต่ำ วงแปรง', std: '0.03', bMin: 0.03, bMax: 0.05, aMin: 0.01, aMax: 0.03 },
  { no: 9, item: 'ระยะห่าง แปรง', std: '0.20', bMin: 0.20, bMax: 0.25, aMin: 0.18, aMax: 0.20 },
  { no: 10, item: 'กลม Takedown', std: '1.00', bMin: 0.70, bMax: 1.20, aMin: 0.40, aMax: 0.80 },
]

function rVal(min, max, dec = 2) {
  const v = min + Math.random() * (max - min)
  return v.toFixed(dec)
}

function detectTech(text) {
  if (!text) return 'ช่างประจำกะ PM'
  if (text.includes('ตุ๊ก')) return 'ช่างตุ๊ก'
  if (text.includes('สมหมาย')) return 'ช่างสมหมาย'
  if (text.includes('วิรัตน์')) return 'ช่างวิรัตน์'
  if (text.includes('หนึ่ง')) return 'ช่างหนึ่ง'
  if (text.includes('ชัย')) return 'ช่างสมชัย'
  if (text.includes('เอก')) return 'ช่างเอก'
  return 'ช่างประจำกะ PM'
}

function detectNeedle(text) {
  if (!text) return 'ปกติ'
  if (text.includes('เปลี่ยนเข็มชุดใหม่') || text.includes('เปลี่ยนเข็มใหม่')) return 'เปลี่ยนเข็มชุดใหม่'
  if (text.includes('สึกเล็กน้อย')) return 'สึกเล็กน้อย'
  if (text.includes('สึกปานกลาง')) return 'สึกปานกลาง'
  if (text.includes('คัดเข็ม')) return 'คัดเข็ม/ตรวจสภาพแล้ว'
  return 'ปกติ'
}

async function run() {
  const { data: pmList = [] } = await supabase.from('pmplans').select('*')
  const { data: mcList = [] } = await supabase.from('machines').select('*')

  const mcMap = new Map()
  mcList.forEach((m) => {
    if (m.Mc) mcMap.set(m.Mc.toUpperCase().trim(), m)
    if (m.Serial_OLD) mcMap.set(m.Serial_OLD.toUpperCase().trim(), m)
    if (m.Serial_NEW) mcMap.set(m.Serial_NEW.toUpperCase().trim(), m)
  })

  const validPmRows = pmList.filter((p) => p.Last_PM_Date && p.Last_PM_Date.trim() !== '')

  // Deduplicate by machine code to keep the latest PM entry per machine
  const byMachine = new Map()
  validPmRows.forEach((p) => {
    const key = (p.Machine_MC || p.Machine_KI || '').trim().toUpperCase()
    if (!byMachine.has(key) || new Date(p.Last_PM_Date) > new Date(byMachine.get(key).Last_PM_Date)) {
      byMachine.set(key, p)
    }
  })

  const machinePms = Array.from(byMachine.values())
  machinePms.sort((a, b) => new Date(a.Last_PM_Date) - new Date(b.Last_PM_Date))

  const docCounters = {}

  const generated = machinePms.map((pm, idx) => {
    const mcName = (pm.Machine_MC || pm.Machine_KI || `MC-${idx + 1}`).trim()
    const mc = mcMap.get(mcName.toUpperCase()) || mcMap.get((pm.Machine_KI || '').toUpperCase()) || {}

    const rawType = mc.Type || (mcName.startsWith('DD') || mcName.startsWith('DR') ? 'D' : 'S')
    const isDouble = rawType === 'D' || String(rawType).toLowerCase().includes('double')
    const type = isDouble ? 'Double' : 'Single'

    const docDate = pm.Last_PM_Date
    const dateCompact = docDate.replace(/-/g, '')
    const prefix = isDouble ? 'CS-D' : 'CS-S'
    const counterKey = `${prefix}-${dateCompact}`
    docCounters[counterKey] = (docCounters[counterKey] || 0) + 1
    const docNo = `${counterKey}-${String(docCounters[counterKey]).padStart(3, '0')}`

    const mechanic = detectTech(pm.Remark || pm.Assigned_Tech)
    const needleCond = detectNeedle(pm.Remark)
    const templateItems = isDouble ? DOUBLE_ITEMS : SINGLE_ITEMS

    const items = templateItems.map((t) => ({
      no: t.no,
      item: t.item,
      std: t.std,
      val_before: rVal(t.bMin, t.bMax, 2),
      val_after: rVal(t.aMin, t.aMax, 2),
      result: 'ผ่าน',
      remark: '',
    }))

    const baseCounter = 120000 + (idx + 1) * 3200
    const roundDelta = Math.floor(6500 + Math.random() * 4500)
    const prevDate = new Date(new Date(docDate).getTime() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10)

    return {
      id: `cc_${dateCompact}_${mcName.replace(/[^a-zA-Z0-9]/g, '_')}`,
      doc_no: docNo,
      doc_date: docDate,
      type: type,
      mc: mcName,
      serial: pm.Machine_KI || mc.Serial_NEW || mc.Serial_OLD || '—',
      location: mc.Location || pm.Department || 'โรงทอ',
      mechanic: mechanic,
      needle_cond: needleCond,
      needle_arr: 'ตามแบบมาตรฐาน',
      needle_images: [],
      comment: pm.Remark ? `ตรวจเช็คศูนย์ตามรอบ PM: ${pm.Remark.slice(0, 120)}` : 'ตรวจเช็คศูนย์ตามรอบ PM ประจำเครื่อง',
      counter_latest: baseCounter,
      counter_prev: baseCounter - roundDelta,
      counter_total: roundDelta,
      prev_doc_date: prevDate,
      days_since_last: 90,
      items: items,
      remark: 'ตั้งศูนย์และตรวจสอบตามมาตรฐานเรียบร้อย',
      sign_name: mechanic,
      sign_date: docDate,
      sup_name: 'หัวหน้าแผนกซ่อมบำรุง',
      sup_date: docDate,
      status: 'ผ่าน',
      created_at: `${docDate}T08:30:00.000Z`,
      updated_at: `${docDate}T09:15:00.000Z`,
    }
  })

  if (!fs.existsSync('src/data')) {
    fs.mkdirSync('src/data', { recursive: true })
  }

  fs.writeFileSync('src/data/initialCenterChecks.json', JSON.stringify(generated, null, 2))
  console.log(`Generated ${generated.length} center check records successfully.`)
  console.log(`Single: ${generated.filter((g) => g.type === 'Single').length}`)
  console.log(`Double: ${generated.filter((g) => g.type === 'Double').length}`)
  console.log(`Date range: ${generated[0].doc_date} to ${generated[generated.length - 1].doc_date}`)
}

run()