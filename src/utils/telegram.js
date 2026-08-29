import { supabase } from '../supabase'

const STORAGE_KEY = 'telegram_settings'
const DB_KEY      = 'telegram_settings'

const DEFAULTS = {
  bot_token:   '',
  supervisors: [{ name: 'กฤษดา', chat_id: '6981653027' }],
  technicians: [{ name: 'หนึ่ง',  chat_id: '8207474130' }],
  app_base_url: 'https://textileops-cmms.vercel.app',
}

export const loadTelegramSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved ? { ...DEFAULTS, ...saved } : { ...DEFAULTS }
  } catch { return { ...DEFAULTS } }
}

export const saveTelegramSettings = (cfg) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

export const loadTelegramSettingsDB = async () => {
  try {
    const { data } = await supabase
      .from('appconfigs').select('value').eq('key', DB_KEY).maybeSingle()
    if (data?.value) {
      const parsed = JSON.parse(data.value)
      localStorage.setItem(STORAGE_KEY, data.value)
      return { ...DEFAULTS, ...parsed }
    }
  } catch {}
  return loadTelegramSettings()
}

export const saveTelegramSettingsDB = async (cfg) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
  await supabase.from('appconfigs')
    .upsert({ key: DB_KEY, value: JSON.stringify(cfg), updated_at: new Date().toISOString() }, { onConflict: 'key' })
}

export const getAppBaseUrl = () => {
  const cfg = loadTelegramSettings()
  return (cfg.app_base_url || window.location.origin).replace(/\/$/, '')
}

function formatTelegramName(from, chat) {
  const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim()
  return fullName || from?.username || chat?.title || `Chat ${chat?.id || from?.id || ''}`.trim()
}

export async function fetchTelegramContacts(token) {
  if (!token) return { ok: false, error: 'ไม่มี Bot Token' }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`)
    const json = await res.json()
    if (!json.ok) return { ok: false, error: json.description || 'Telegram getUpdates failed' }

    const contacts = new Map()
    for (const update of json.result || []) {
      const source = update.message || update.edited_message || update.callback_query?.message
      const from = update.message?.from || update.edited_message?.from || update.callback_query?.from
      const chat = source?.chat
      if (!chat?.id) continue

      const chatId = String(chat.id)
      if (!contacts.has(chatId)) {
        contacts.set(chatId, {
          name: formatTelegramName(from, chat),
          chat_id: chatId,
          username: from?.username || '',
          type: chat.type || 'unknown',
        })
      }
    }

    return { ok: true, contacts: Array.from(contacts.values()) }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// Resolve list — supports new {supervisors:[{name,chat_id}]} and legacy supervisor_chat_id
function getSupervisorIds(cfg) {
  if (cfg.supervisors?.length) return cfg.supervisors.map(s => s.chat_id).filter(Boolean)
  if (cfg.supervisor_chat_id) return [cfg.supervisor_chat_id]
  return []
}

export function getTechnicianChatId(cfg, technicianName) {
  const norm = (s) => String(s || '').trim().toLowerCase()
  const target = norm(technicianName)
  const match = cfg.technicians?.find(t => norm(t.name) === target)
  if (match?.chat_id) return match.chat_id
  try {
    const stored = JSON.parse(localStorage.getItem('txops_tbl_technicians') || '[]')
    const reg = stored.find(t => norm(t.Name) === target || norm(t.name) === target)
    if (reg?.Telegram_ID || reg?.telegram_id || reg?.chat_id) return reg.Telegram_ID || reg.telegram_id || reg.chat_id
  } catch {}
  if (cfg.technician_chat_id) return cfg.technician_chat_id
  // fallback to first supervisor
  const supers = getSupervisorIds(cfg)
  return supers[0] || null
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

async function sendMessage(token, chatId, text) {
  if (!token || !chatId) return { ok: false, error: 'ไม่มี Bot Token หรือ Chat ID' }
  try {
    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false }),
    }
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
      fetchOptions.signal = AbortSignal.timeout(10000)
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, fetchOptions)
    return await res.json()
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

/**
 * Normalizes repair records to ensure Design, KI, and roll_no
 * are always extracted from any column casing or embedded metadata tags.
 */
export function normalizeRepairRecord(row) {
  if (!row) return row

  let design = row.Design || row.design || ''
  let ki = row.KI !== undefined && row.KI !== null && row.KI !== '' ? row.KI : (row.ki !== undefined && row.ki !== null && row.ki !== '' ? row.ki : '')
  let roll = row.roll_no || row.RollNo || row.roll_number || ''
  let priority = row.priority || row.urgency || 'ปกติ'
  let rawProb = row.problem_description || ''
  let cleanProb = rawProb

  // 1. Try extracting from JSON metadata comment: <!--PROD:{"Design":"...","KI":"...","roll_no":"..."}-->
  const jsonMatch = rawProb.match(/<!--PROD:(\{.*?\})-->/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      if (!design && parsed.Design) design = parsed.Design
      if ((ki === '' || ki === undefined || ki === null) && parsed.KI !== undefined && parsed.KI !== null && parsed.KI !== '') ki = parsed.KI
      if (!roll && (parsed.roll_no || parsed.RollNo || parsed.roll_number)) roll = parsed.roll_no || parsed.RollNo || parsed.roll_number
      if (!row.priority && parsed.priority) priority = parsed.priority
    } catch {}
    cleanProb = cleanProb.replace(/<!--PROD:\{.*?\}-->\n?/, '').trim()
  }

  // 2. Try extracting from text banner: [ข้อมูลผลิต | Design: ... | KI: ... | เลขม้วน: ...]
  const textMatch = rawProb.match(/\[ข้อมูลผลิต\s*\|\s*Design:\s*([^|]*?)\s*\|\s*KI:\s*([^|]*?)\s*\|\s*เลขม้วน:\s*([^\]]*?)\]/)
  if (textMatch) {
    if (!design && textMatch[1] && textMatch[1] !== '—') design = textMatch[1].trim()
    if ((ki === '' || ki === undefined || ki === null) && textMatch[2] && textMatch[2] !== '—') ki = textMatch[2].trim()
    if (!roll && textMatch[3] && textMatch[3] !== '—') roll = textMatch[3].trim()
    cleanProb = cleanProb.replace(/\[ข้อมูลผลิต\s*\|\s*Design:[^\]]*?\]\n?/, '').trim()
  }

  return {
    ...row,
    Design: design,
    design: design,
    KI: ki,
    ki: ki,
    roll_no: roll,
    RollNo: roll,
    priority: priority,
    problem_description: cleanProb || rawProb,
    raw_problem_description: rawProb,
  }
}

/**
 * Builds the problem description with embedded metadata so that even if
 * Supabase lacks Design/KI/roll_no columns, the data is permanently preserved.
 */
export function encodeRepairProblemDescription(problemText, { Design, KI, roll_no, priority }) {
  const cleanText = (problemText || '')
    .replace(/<!--PROD:\{.*?\}-->\n?/, '')
    .replace(/\[ข้อมูลผลิต\s*\|\s*Design:[^\]]*?\]\n?/, '')
    .trim()

  const metaObj = {
    Design: Design || '',
    KI: KI !== undefined && KI !== null && KI !== '' ? KI : '',
    roll_no: roll_no || '',
    priority: priority || 'ปกติ',
  }

  const jsonTag = `<!--PROD:${JSON.stringify(metaObj)}-->`
  const textTag = (Design || KI || roll_no)
    ? `[ข้อมูลผลิต | Design: ${Design || '—'} | KI: ${KI ?? '—'} | เลขม้วน: ${roll_no || '—'}]`
    : ''

  return [jsonTag, textTag, cleanText].filter(Boolean).join('\n\n')
}

const fv = (v) => (v === null || v === undefined || v === '' ? '—' : escapeHtml(String(v)))

function buildRepairDetailLines(request, cylinder) {
  const norm = normalizeRepairRecord(request)
  const rollNo = norm.roll_no || norm.RollNo || norm.roll_number
  return [
    `📋 เลขที่: <b>${fv(norm.request_no)}</b>`,
    `🔩 Serial: <b>${fv(norm.cylinder_serial)}</b>`,
    `🏭 Current Machine: <b>${fv(norm.machine_mc || cylinder?.NewMC)}</b>`,
    `📍 ตำแหน่ง: ${fv(norm.cylinder_location || cylinder?.Location)}`,
    norm.Design ? `🎨 Design: <b>${escapeHtml(norm.Design)}</b>` : null,
    (norm.KI !== undefined && norm.KI !== null && norm.KI !== '') ? `🧾 KI: <b>${escapeHtml(norm.KI)}</b>` : null,
    rollNo ? `📦 เลขม้วน: <b>${escapeHtml(rollNo)}</b>` : null,
    `📐 Standard: ${fv(norm.cylinder_standard || cylinder?.Standard)}`,
    `⚠️ ปัญหา: ${fv(norm.problem_description)}`,
    `👤 ผู้แจ้ง: ${fv(norm.reported_by)}`,
    `⏰ เวลาแจ้ง: ${new Date(norm.created_at || Date.now()).toLocaleString('th-TH')}`,
  ].filter(Boolean)
}

export async function notifySupervisor(request, cylinder) {
  const cfg     = await loadTelegramSettingsDB()
  const baseUrl = getAppBaseUrl()
  const serial  = encodeURIComponent(request.cylinder_serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || '')
  const reqId   = encodeURIComponent(request.id || request._id || '')
  const approveLink = `${baseUrl}/repair/${serial}?req=${reqId}&step=approve`

  const text = [
    `🔧 <b>แจ้งซ่อมกระบอก</b>`,
    ``,
    ...buildRepairDetailLines(request, cylinder),
    ``,
    `🔗 <a href="${approveLink}">คลิกเพื่ออนุมัติและมอบหมายช่าง</a>`,
  ].filter(l => l !== null).join('\n')

  const ids = getSupervisorIds(cfg)
  if (!ids.length) return { ok: false, error: 'ไม่มี Supervisor Chat ID' }
  const results = await Promise.all(ids.map(id => sendMessage(cfg.bot_token, id, text)))
  return results[0]
}

export async function notifyTechnician(request) {
  const cfg      = await loadTelegramSettingsDB()
  const baseUrl  = getAppBaseUrl()
  const serial   = encodeURIComponent(request.cylinder_serial || '')
  const reqId    = encodeURIComponent(request.id || request._id || '')
  const completeLink = `${baseUrl}/repair/${serial}?req=${reqId}&step=complete`

  const text = [
    `✅ <b>ได้รับมอบหมายงานซ่อม</b>`,
    ``,
    ...buildRepairDetailLines(request),
    request.approval_notes ? `📝 หมายเหตุจาก Supervisor: ${escapeHtml(request.approval_notes)}` : null,
    ``,
    `🔗 <a href="${completeLink}">คลิกเพื่อบันทึกผลการซ่อม</a>`,
  ].filter(l => l !== null).join('\n')

  const chatId = getTechnicianChatId(cfg, request.technician_name)
  return sendMessage(cfg.bot_token, chatId, text)
}

export async function notifyCompleted(request) {
  const cfg = await loadTelegramSettingsDB()
  const text = [
    `🎉 <b>ซ่อมเสร็จแล้ว</b>`,
    ``,
    ...buildRepairDetailLines(request),
    ``,
    `🔧 วิธีแก้ไข: ${escapeHtml(request.repair_details)}`,
    request.parts_used ? `🔩 อะไหล่ที่ใช้: ${escapeHtml(request.parts_used)}` : null,
    `👷 ช่าง: ${escapeHtml(request.completed_by || request.technician_name)}`,
    `⏰ เสร็จ: ${new Date(request.completed_at || Date.now()).toLocaleString('th-TH')}`,
  ].filter(l => l !== null).join('\n')

  const ids = getSupervisorIds(cfg)
  if (!ids.length) return { ok: false, error: 'ไม่มี Supervisor Chat ID' }
  const results = await Promise.all(ids.map(id => sendMessage(cfg.bot_token, id, text)))
  return results[0]
}

export async function testTelegram() {
  const cfg = await loadTelegramSettingsDB()
  const text = '✅ TextileOps CMMS — ทดสอบการเชื่อมต่อ Telegram สำเร็จ!'
  const ids = getSupervisorIds(cfg)
  if (!ids.length) return { ok: false, error: 'ไม่มี Supervisor Chat ID' }
  const results = await Promise.all(ids.map(id => sendMessage(cfg.bot_token, id, text)))
  return results[0]
}
