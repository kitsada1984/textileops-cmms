import { supabase } from '../supabase'

const STORAGE_KEY = 'telegram_settings'
const DB_KEY      = 'telegram_settings'

const DEFAULTS = {
  bot_token:   '',
  supervisors: [{ name: 'กฤษดา', chat_id: '6981653027' }],
  needle_keepers: [],
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

export function getNeedleKeeperIds(cfg) {
  if (cfg?.needle_keepers?.length) {
    const ids = cfg.needle_keepers.map(k => String(k.chat_id || '').trim()).filter(Boolean)
    if (ids.length > 0) return ids
  }
  return getSupervisorIds(cfg)
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

// Re-exported from domain module for 100% backward compatibility
export { normalizeRepairRecord, encodeRepairProblemDescription } from '../modules/repair/repairNormalizer'

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

export async function notifySupervisor(request, cylinder, isEasyRepair = false) {
  const cfg     = await loadTelegramSettingsDB()
  const baseUrl = getAppBaseUrl()
  const serial  = encodeURIComponent(request.cylinder_serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || '')
  const reqId   = encodeURIComponent(request.id || request._id || '')
  const approveLink = `${baseUrl}/repair/${serial}?req=${reqId}&step=approve`
  const viewLink    = `${baseUrl}/repair/${serial}?req=${reqId}&step=view`

  const easy = isEasyRepair || request.repair_type === 'EASY' || (request.status === 'APPROVED' && request.technician_name)

  const text = [
    easy
      ? `⚡ <b>แจ้งซ่อมทั่วไป (เลือกช่างตรง)</b>`
      : `🔧 <b>แจ้งซ่อมกระบอก (รองานอนุมัติ)</b>`,
    ``,
    ...buildRepairDetailLines(request, cylinder),
    request.technician_name ? `👷 ช่างผู้รับผิดชอบ: <b>${escapeHtml(request.technician_name)}</b>` : null,
    easy ? `✅ สถานะ: <b>อนุมัติอัตโนมัติ (งานง่าย)</b>` : null,
    ``,
    easy
      ? `🔗 <a href="${viewLink}">คลิกเพื่อดูรายละเอียดใบแจ้งซ่อม</a>`
      : `🔗 <a href="${approveLink}">คลิกเพื่ออนุมัติและมอบหมายช่าง</a>`,
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

/* ── Spare Needle Requisition Telegram Notifications ─────────── */
function formatTracksSummary(tracks = {}) {
  const dial = tracks.dial || {}
  const cyl = tracks.cylinder || {}
  const lines = []

  const dialParts = []
  if (dial.t1 > 0) dialParts.push(`T1: <b>${dial.t1}</b> ตัว`)
  if (dial.t2 > 0) dialParts.push(`T2: <b>${dial.t2}</b> ตัว`)
  if (dialParts.length > 0) lines.push(`🔘 <b>Dial:</b> ${dialParts.join(', ')}`)

  const cylParts = []
  if (cyl.t1 > 0) cylParts.push(`T1: <b>${cyl.t1}</b> ตัว`)
  if (cyl.t2 > 0) cylParts.push(`T2: <b>${cyl.t2}</b> ตัว`)
  if (cyl.t3 > 0) cylParts.push(`T3: <b>${cyl.t3}</b> ตัว`)
  if (cyl.t4 > 0) cylParts.push(`T4: <b>${cyl.t4}</b> ตัว`)
  if (cylParts.length > 0) lines.push(`⚙️ <b>Cylinder:</b> ${cylParts.join(', ')}`)

  return lines.length > 0 ? lines.join('\n') : '— ไม่ได้ระบุ Track —'
}

export async function notifySpareNeedleRequested(snr, cylinder) {
  const cfg = await loadTelegramSettingsDB()
  const baseUrl = getAppBaseUrl()
  const serial = encodeURIComponent(snr.cylinder_serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || '')
  const reqId = encodeURIComponent(snr.id || '')
  const prepareLink = `${baseUrl}/repair/${serial}?needle_req=${reqId}&step=prepare`

  const text = [
    `🪡 <b>[ขอเบิกเข็ม Spare] ประจำเครื่องจักร</b>`,
    ``,
    `📋 เลขที่ใบเบิก: <b>${escapeHtml(snr.request_no || snr.id)}</b>`,
    `🏭 เครื่องจักร (MC): <b>${escapeHtml(snr.machine_mc || cylinder?.Machine || '—')}</b>`,
    `🔩 กระบอก (Serial): <b>${escapeHtml(snr.cylinder_serial || cylinder?.Serial_NOW || '—')}</b>`,
    `📐 Gauge: <b>${escapeHtml(snr.gauge || cylinder?.Gauge || '—')}</b>`,
    `👷 ช่างผู้ขอเบิก: <b>${escapeHtml(snr.technician_name || 'ช่างประจำกะ')}</b> (${escapeHtml(snr.shift || 'กะเช้า')})`,
    `⏰ เวลาที่ขอเบิก: ${new Date(snr.created_at || Date.now()).toLocaleString('th-TH')}`,
    ``,
    `📌 <b>รายการ Track ที่ต้องการ:</b>`,
    formatTracksSummary(snr.tracks_requested),
    snr.request_comment ? `💬 หมายเหตุ: <i>${escapeHtml(snr.request_comment)}</i>` : null,
    ``,
    `🔗 <a href="${prepareLink}">👉 คลิกที่นี่เพื่อจัดเตรียมเข็มและตัดสต็อก</a>`,
  ].filter(l => l !== null).join('\n')

  const ids = getNeedleKeeperIds(cfg)
  if (!ids.length) return { ok: false, error: 'ไม่มี Chat ID สำหรับผู้จ่ายเข็ม/หัวหน้างาน' }
  const results = await Promise.all(ids.map(id => sendMessage(cfg.bot_token, id, text)))
  return results[0]
}

export async function notifySpareNeedlePrepared(snr, cylinder) {
  const cfg = await loadTelegramSettingsDB()
  const baseUrl = getAppBaseUrl()
  const serial = encodeURIComponent(snr.cylinder_serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || '')
  const reqId = encodeURIComponent(snr.id || '')
  const ackLink = `${baseUrl}/repair/${serial}?needle_req=${reqId}&step=ack`

  const issuedList = (snr.issued_items || []).map(item => 
    `• ${escapeHtml(item.needleModel || item.setId || 'เข็ม')}: <b>${item.quantity || 0}</b> ตัว (${escapeHtml(item.grade || 'เกรด B')})`
  ).join('\n')

  const text = [
    `📦 <b>[เข็ม Spare จัดเตรียมเรียบร้อยแล้ว]</b>`,
    ``,
    `📋 เลขที่ใบเบิก: <b>${escapeHtml(snr.request_no || snr.id)}</b>`,
    `🏭 เครื่องจักร: <b>${escapeHtml(snr.machine_mc || cylinder?.Machine || '—')}</b>`,
    `👷 ช่างผู้ขอเบิก: <b>${escapeHtml(snr.technician_name)}</b>`,
    `👨‍💼 ผู้จ่ายเข็ม/สโตร์: <b>${escapeHtml(snr.issuer_name || 'สโตร์เข็ม')}</b>`,
    `⏰ เวลาที่จัดเตรียม: ${new Date(snr.prepared_at || Date.now()).toLocaleString('th-TH')}`,
    ``,
    `🎯 <b>รายการเข็มที่จัดเตรียมพร้อมจ่าย:</b>`,
    issuedList || '— จัดเตรียมตามรายการที่ขอ —',
    snr.issuer_comment ? `💬 หมายเหตุผู้จ่าย: <i>${escapeHtml(snr.issuer_comment)}</i>` : null,
    ``,
    `🔗 <a href="${ackLink}">👉 คลิกที่นี่เพื่อดูรายการและกดรับทราบ</a>`,
  ].filter(l => l !== null).join('\n')

  const techChatId = getTechnicianChatId(cfg, snr.technician_name)
  const supervisorIds = getSupervisorIds(cfg)
  const keeperIds = getNeedleKeeperIds(cfg)
  const targetIds = Array.from(new Set([techChatId, ...supervisorIds, ...keeperIds].filter(Boolean)))

  if (!targetIds.length) return { ok: false, error: 'ไม่มี Chat ID ปลายทาง' }
  const results = await Promise.all(targetIds.map(id => sendMessage(cfg.bot_token, id, text)))
  return results[0]
}

export async function notifySpareNeedleReceived(snr, cylinder) {
  const cfg = await loadTelegramSettingsDB()
  const text = [
    `🎉 <b>[รับเข็ม Spare เรียบร้อย - ปิดงาน]</b>`,
    ``,
    `📋 เลขที่ใบเบิก: <b>${escapeHtml(snr.request_no || snr.id)}</b>`,
    `🏭 เครื่องจักร: <b>${escapeHtml(snr.machine_mc || cylinder?.Machine || '—')}</b>`,
    `👷 ผู้รับเข็ม: <b>${escapeHtml(snr.technician_name)}</b>`,
    `⏰ เวลารับเข็ม: ${new Date(snr.acknowledged_at || Date.now()).toLocaleString('th-TH')}`,
    `✅ สถานะ: <b>ปิดงานเบิกเข็ม Spare สมบูรณ์</b>`,
  ].join('\n')

  const ids = Array.from(new Set([...getSupervisorIds(cfg), ...getNeedleKeeperIds(cfg)]))
  if (!ids.length) return { ok: false, error: 'ไม่มี Chat ID' }
  const results = await Promise.all(ids.map(id => sendMessage(cfg.bot_token, id, text)))
  return results[0]
}
