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

function getTechnicianChatId(cfg, technicianName) {
  const match = cfg.technicians?.find(t => t.name === technicianName)
  if (match?.chat_id) return match.chat_id
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

const fv = (v) => (v === null || v === undefined || v === '' ? '—' : escapeHtml(String(v)))

function buildRepairDetailLines(request, cylinder) {
  return [
    `📋 เลขที่: <b>${fv(request.request_no)}</b>`,
    `🔩 Serial: <b>${fv(request.cylinder_serial)}</b>`,
    `🏭 Current Machine: <b>${fv(request.machine_mc || cylinder?.NewMC)}</b>`,
    `📍 ตำแหน่ง: ${fv(request.cylinder_location || cylinder?.Location)}`,
    `📐 Standard: ${fv(request.cylinder_standard || cylinder?.Standard)}`,
    request.KI ? `🧾 KI: ${escapeHtml(request.KI)}` : null,
    request.Design ? `🎨 Design: ${escapeHtml(request.Design)}` : null,
    `⚠️ ปัญหา: ${fv(request.problem_description)}`,
    `👤 ผู้แจ้ง: ${fv(request.reported_by)}`,
    `⏰ เวลาแจ้ง: ${new Date(request.created_at || Date.now()).toLocaleString('th-TH')}`,
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
