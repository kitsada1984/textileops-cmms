/**
 * src/utils/line.js
 * LINE Messaging API & LINE Notify Integration for TextileOps CMMS
 */
import { db } from '../api/dbClient'
import { resolveAppBaseUrl } from './telegram'
import { buildSpareNeedlePreparedFlexMessage, buildSpareNeedleReceivedFlexMessage } from './lineSpareCards'
import { ensureJson } from './lineFlexBuilder'
import {
  buildRepairRequestFlexMessage,
  buildTechnicianAssignedFlexMessage,
  buildRepairCompletedFlexMessage,
  buildSpareNeedleRequestFlexMessage,
  buildTestFlexMessage,
  buildWorkOrderAssignedFlexMessage,
} from './lineFlexBuilder'

const STORAGE_KEY = 'line_settings'
const DB_KEY      = 'line_settings'

export const DEFAULT_LINE_SETTINGS = {
  provider: 'line_oa', // 'line_oa' (Messaging API) | 'line_notify'
  channel_access_token: '',
  target_group_id: '',
  supervisors: [{ name: 'กฤษดา', user_id: 'U66f2b207af94e739c10a3cf937af2965' }],
  needle_keeper_user_id: '',
  needle_keepers: [],
  needle_keeper_notify_token: '',
  technicians: [{ name: 'หนึ่ง', user_id: '' }],
  channel_secret: '',
  notify_token: '',
  is_enabled: true,
  app_base_url: '',
  notify_on_new_request: true,
  notify_on_approve: true,
  notify_on_complete: true,
  notify_on_workorder: true,
  // LINE Login (OAuth 2.1)
  login_enabled: true,
  login_channel_id: '',
  login_channel_secret: '',
  login_callback_url: '',
  login_default_role: 'viewer',
}

export const loadLineSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!saved) return { ...DEFAULT_LINE_SETTINGS }
    return {
      ...DEFAULT_LINE_SETTINGS,
      ...saved,
      supervisors: saved.supervisors || (saved.target_group_id ? [{ name: 'หัวหน้างาน', user_id: saved.target_group_id }] : DEFAULT_LINE_SETTINGS.supervisors),
      needle_keeper_user_id: saved.needle_keeper_user_id || '',
      needle_keepers: saved.needle_keepers || [],
      needle_keeper_notify_token: saved.needle_keeper_notify_token || '',
      technicians: saved.technicians || DEFAULT_LINE_SETTINGS.technicians,
      notify_on_workorder: saved.notify_on_workorder ?? DEFAULT_LINE_SETTINGS.notify_on_workorder,
      login_enabled: saved.login_enabled ?? DEFAULT_LINE_SETTINGS.login_enabled,
      login_channel_id: saved.login_channel_id || '',
      login_channel_secret: saved.login_channel_secret || '',
      login_callback_url: saved.login_callback_url || '',
      login_default_role: saved.login_default_role || DEFAULT_LINE_SETTINGS.login_default_role,
    }
  } catch {
    return { ...DEFAULT_LINE_SETTINGS }
  }
}

export const saveLineSettings = (cfg) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
  } catch {}
}

export const loadLineSettingsDB = async () => {
  try {
    const { data, error } = await db
      .from('appconfigs')
      .select('value')
      .eq('key', DB_KEY)
      .maybeSingle()

    if (!error && data?.value) {
      const parsed = JSON.parse(data.value)
      const merged = {
        ...DEFAULT_LINE_SETTINGS,
        ...parsed,
        supervisors: parsed.supervisors || (parsed.target_group_id ? [{ name: 'หัวหน้างาน', user_id: parsed.target_group_id }] : DEFAULT_LINE_SETTINGS.supervisors),
        needle_keepers: parsed.needle_keepers || [],
        needle_keeper_notify_token: parsed.needle_keeper_notify_token || '',
        technicians: parsed.technicians || DEFAULT_LINE_SETTINGS.technicians,
      }
      saveLineSettings(merged)
      return merged
    }
  } catch (e) {
    console.warn('LINE settings DB load warning:', e)
  }
  return loadLineSettings()
}

export const saveLineSettingsDB = async (cfg) => {
  const merged = { ...DEFAULT_LINE_SETTINGS, ...cfg }
  saveLineSettings(merged)
  try {
    await db
      .from('appconfigs')
      .upsert(
        {
          key: DB_KEY,
          value: JSON.stringify(merged),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
  } catch (e) {
    console.warn('LINE settings DB save warning:', e)
  }
}

/**
 * Fetches auto-captured LINE contacts from Webhook storage
 */
export async function fetchLineContacts() {
  try {
    const { data } = await db
      .from('appconfigs')
      .select('value')
      .eq('key', 'line_contacts')
      .maybeSingle()

    if (data?.value) {
      const contacts = JSON.parse(data.value)
      return { ok: true, contacts: Array.isArray(contacts) ? contacts : [] }
    }
  } catch (e) {
    console.warn('Fetch LINE contacts error:', e)
  }
  return { ok: true, contacts: [] }
}

export function getSupervisorLineIds(cfg) {
  if (cfg.supervisors?.length) {
    return cfg.supervisors.map(s => s.user_id?.trim()).filter(Boolean)
  }
  if (cfg.target_group_id?.trim()) {
    return [cfg.target_group_id.trim()]
  }
  return []
}

export function getNeedleKeeperLineIds(cfg) {
  const ids = []
  if (cfg?.needle_keeper_user_id?.trim()) {
    ids.push(cfg.needle_keeper_user_id.trim())
  }
  if (Array.isArray(cfg?.needle_keepers)) {
    for (const k of cfg.needle_keepers) {
      const id = String(k.user_id || '').trim()
      if (id && !ids.includes(id)) {
        ids.push(id)
      }
    }
  }
  if (ids.length > 0) return ids
  return getSupervisorLineIds(cfg)
}

export function getTechnicianLineId(cfg, technicianName) {
  const norm = (s) => String(s || '').trim().toLowerCase()
  const target = norm(technicianName)
  const match = cfg.technicians?.find(t => norm(t.name) === target)
  if (match?.user_id?.trim()) return match.user_id.trim()
  try {
    const stored = JSON.parse(localStorage.getItem('txops_tbl_technicians') || '[]')
    const reg = stored.find(t => norm(t.Name) === target || norm(t.name) === target)
    if (reg?.Line_ID?.trim() || reg?.line_id?.trim()) return (reg.Line_ID || reg.line_id).trim()
  } catch {}
  if (cfg.target_group_id?.trim()) return cfg.target_group_id.trim()
  const supers = getSupervisorLineIds(cfg)
  return supers[0] || null
}

/**
 * Sends notification payload to Vercel Serverless Relay Proxy (/api/line-notify)
 */
export async function sendLineNotification(payload) {
  try {
    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }

    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      fetchOptions.signal = AbortSignal.timeout(12000) // 12 seconds timeout
    }

    const res = await fetch('/api/line-notify', fetchOptions)
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: json.error || 'LINE Serverless Relay Proxy Error',
        details: json,
      }
    }

    return { ok: true, ...json }
  } catch (err) {
    return { ok: false, error: err.message || 'Network / Timeout Error' }
  }
}

/**
 * Sends New Repair Request Notification to LINE (Non-blocking background handler)
 */
/**
 * Sends New Repair Request Notification to LINE (Step 1: Broadcast to all supervisors)
 */
export async function notifyLineNewRepair(request, cylinder, isEasyRepair = false) {
  try {
    const cfg = await loadLineSettingsDB()
    if (!cfg.is_enabled || !cfg.notify_on_new_request) {
      return { ok: false, skipped: true, reason: 'LINE notification disabled' }
    }

    const easy = isEasyRepair || request.repair_type === 'EASY' || (request.status === 'APPROVED' && request.technician_name)
    const effectiveProvider = (cfg.provider === 'line_oa' || (cfg.channel_access_token && !cfg.notify_token)) ? 'line_oa' : 'line_notify'

    if (effectiveProvider === 'line_oa') {
      if (!cfg.channel_access_token) {
        return { ok: false, skipped: true, reason: 'LINE Channel Access Token not configured' }
      }

      const targetIds = getSupervisorLineIds(cfg)
      if (!targetIds.length) {
        return { ok: false, skipped: true, reason: 'No Supervisor LINE User IDs or Group ID configured' }
      }

      const flexMsg = buildRepairRequestFlexMessage(request, cylinder, cfg.app_base_url, easy)

      const results = await Promise.all(
        targetIds.map(targetId =>
          sendLineNotification({
            type: 'flex',
            token: cfg.channel_access_token,
            targetId,
            messages: [flexMsg],
          })
        )
      )

      return results[0] || { ok: true }
    } else {
      if (!cfg.notify_token) {
        return { ok: false, skipped: true, reason: 'LINE Notify Token not configured' }
      }

      const serial = request.cylinder_serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || '—'
      const machine = request.machine_mc || cylinder?.NewMC || '—'
      const design = request.Design || cylinder?.Design
      const ki = (request.KI !== undefined && request.KI !== null && request.KI !== '') ? request.KI : cylinder?.KI
      const rollNo = request.roll_no || request.RollNo || request.roll_number
      const problem = request.problem_description || 'ไม่มีรายละเอียด'
      const reporter = request.reported_by || 'เจ้าหน้าที่'
      const appUrl = resolveAppBaseUrl(cfg.app_base_url)
      const stepTarget = easy ? 'view' : 'approve'
      const directUrl = `${appUrl}/repair/${encodeURIComponent(serial)}?req=${encodeURIComponent(request.id || '')}&step=${stepTarget}&openExternalBrowser=1`

      const header = easy ? `\n⚡ [แจ้งซ่อมทั่วไป - เลือกช่างตรง]` : `\n🚨 [แจ้งซ่อมใหม่]`
      const techLine = (easy && request.technician_name) ? `\nช่างผู้รับผิดชอบ: ${request.technician_name}` : ''
      const statusLine = easy ? `\nสถานะ: อนุมัติอัตโนมัติ (งานง่าย)` : ''
      const designLine = design ? `\nDesign: ${design}` : ''
      const kiLine = (ki !== undefined && ki !== null && ki !== '') ? `\nKI: ${ki}` : ''
      const rollLine = rollNo ? `\nเลขม้วน: ${rollNo}` : ''

      const textMessage = `${header}\nเครื่อง: ${machine}\nกระบอก: ${serial}${techLine}${statusLine}${designLine}${kiLine}${rollLine}\nอาการ: ${problem}\nผู้แจ้ง: ${reporter}\n👉 แตะเปิดรับงาน PWA: ${directUrl}`

      return await sendLineNotification({
        type: 'notify',
        notifyToken: cfg.notify_token,
        textMessage,
      })
    }
  } catch (err) {
    console.warn('[LINE Notify Error]', err)
    return { ok: false, error: err.message }
  }
}

/**
 * Sends Technician Assignment Notification to LINE (Step 2: Directly to designated technician)
 */
export async function notifyLineTechnician(request) {
  try {
    const cfg = await loadLineSettingsDB()
    if (!cfg.is_enabled || !cfg.notify_on_approve) {
      return { ok: false, skipped: true, reason: 'LINE notification on approve disabled' }
    }

    const effectiveProvider = (cfg.provider === 'line_oa' || (cfg.channel_access_token && !cfg.notify_token)) ? 'line_oa' : 'line_notify'

    if (effectiveProvider === 'line_oa') {
      if (!cfg.channel_access_token) {
        return { ok: false, skipped: true, reason: 'LINE Channel Access Token not configured' }
      }

      const targetId = getTechnicianLineId(cfg, request.technician_name)
      if (!targetId) {
        return { ok: false, skipped: true, reason: `No LINE User ID found for technician: ${request.technician_name}` }
      }

      const flexMsg = buildTechnicianAssignedFlexMessage(request, cfg.app_base_url)

      return await sendLineNotification({
        type: 'flex',
        token: cfg.channel_access_token,
        targetId,
        messages: [flexMsg],
      })
    } else {
      if (!cfg.notify_token) {
        return { ok: false, skipped: true, reason: 'LINE Notify Token not configured' }
      }

      const serial = request.cylinder_serial || '—'
      const machine = request.machine_mc || '—'
      const tech = request.technician_name || 'ช่างเทคนิค'
      const notes = request.approval_notes ? ` (หมายเหตุ: ${request.approval_notes})` : ''
      const appUrl = resolveAppBaseUrl(cfg.app_base_url)
      const directUrl = `${appUrl}/repair/${encodeURIComponent(serial)}?req=${encodeURIComponent(request.id || '')}&step=complete&openExternalBrowser=1`

      const textMessage = `\n✅ [มอบหมายช่างแล้ว]\nเครื่อง: ${machine}\nกระบอก: ${serial}\nช่างผู้รับผิดชอบ: ${tech}${notes}\n👉 แตะบันทึกผลการซ่อม: ${directUrl}`

      return await sendLineNotification({
        type: 'notify',
        notifyToken: cfg.notify_token,
        textMessage,
      })
    }
  } catch (err) {
    console.warn('[LINE Technician Notify Error]', err)
    return { ok: false, error: err.message }
  }
}

/**
 * Sends Repair Completed Notification to LINE (Step 3: Broadcast to all supervisors)
 */
export async function notifyLineCompleted(request) {
  try {
    const cfg = await loadLineSettingsDB()
    if (!cfg.is_enabled || !cfg.notify_on_complete) {
      return { ok: false, skipped: true, reason: 'LINE notification on complete disabled' }
    }

    const effectiveProvider = (cfg.provider === 'line_oa' || (cfg.channel_access_token && !cfg.notify_token)) ? 'line_oa' : 'line_notify'

    if (effectiveProvider === 'line_oa') {
      if (!cfg.channel_access_token) {
        return { ok: false, skipped: true, reason: 'LINE Channel Access Token not configured' }
      }

      const targetIds = getSupervisorLineIds(cfg)
      if (!targetIds.length) {
        return { ok: false, skipped: true, reason: 'No Supervisor LINE User IDs configured' }
      }

      const flexMsg = buildRepairCompletedFlexMessage(request, cfg.app_base_url)

      const results = await Promise.all(
        targetIds.map(targetId =>
          sendLineNotification({
            type: 'flex',
            token: cfg.channel_access_token,
            targetId,
            messages: [flexMsg],
          })
        )
      )

      return results[0] || { ok: true }
    } else {
      if (!cfg.notify_token) {
        return { ok: false, skipped: true, reason: 'LINE Notify Token not configured' }
      }

      const serial = request.cylinder_serial || '—'
      const machine = request.machine_mc || '—'
      const details = request.repair_details || 'ซ่อมบำรุงเรียบร้อย'
      const parts = request.parts_used ? ` (อะไหล่: ${request.parts_used})` : ''
      const tech = request.completed_by || request.technician_name || 'ช่างเทคนิค'
      const appUrl = resolveAppBaseUrl(cfg.app_base_url)
      const directUrl = `${appUrl}/repair/${encodeURIComponent(serial)}?req=${encodeURIComponent(request.id || '')}&openExternalBrowser=1`

      const textMessage = `\n🎉 [ซ่อมเสร็จเรียบร้อย]\nเครื่อง: ${machine}\nกระบอก: ${serial}\nวิธีแก้ไข: ${details}${parts}\nช่างผู้ซ่อม: ${tech}\n👉 ดูประวัติงานซ่อม: ${directUrl}`

      return await sendLineNotification({
        type: 'notify',
        notifyToken: cfg.notify_token,
        textMessage,
      })
    }
  } catch (err) {
    console.warn('[LINE Completed Notify Error]', err)
    return { ok: false, error: err.message }
  }
}

/**
 * Test LINE notification trigger for Settings Page
 */
export async function testLineNotification() {
  const cfg = await loadLineSettingsDB()
  if (!cfg.is_enabled) {
    return { ok: false, error: 'กรุณาเปิดสวิตช์ใช้งานการแจ้งเตือน LINE ก่อนทดสอบ' }
  }

  const effectiveProvider = (cfg.provider === 'line_oa' || (cfg.channel_access_token && !cfg.notify_token)) ? 'line_oa' : 'line_notify'

  if (effectiveProvider === 'line_oa') {
    if (!cfg.channel_access_token?.trim()) {
      return { ok: false, error: 'กรุณากรอก LINE Channel Access Token ก่อนทดสอบ' }
    }
    const targetIds = getSupervisorLineIds(cfg)
    if (!targetIds.length) {
      return { ok: false, error: 'กรุณาระบุ User ID หรือ Group ID อย่างน้อย 1 รายการก่อนทดสอบ' }
    }

    const testFlex = buildTestFlexMessage(cfg.app_base_url)

    const results = await Promise.all(
      targetIds.map(targetId =>
        sendLineNotification({
          type: 'flex',
          token: cfg.channel_access_token.trim(),
          targetId,
          messages: [testFlex],
        })
      )
    )

    const failed = results.find(r => !r.ok)
    if (failed) return failed
    return { ok: true, results }
  } else {
    if (!cfg.notify_token?.trim()) {
      return { ok: false, error: 'กรุณากรอก LINE Notify Token ก่อนทดสอบ' }
    }

    const appUrl = resolveAppBaseUrl(cfg.app_base_url)
    return await sendLineNotification({
      type: 'notify',
      notifyToken: cfg.notify_token.trim(),
      textMessage: `\n🔔 ทดสอบการแจ้งเตือนจาก TextileOps CMMS สำเร็จเรียบร้อย!\n👉 แตะเปิดแอป PWA: ${appUrl}?openExternalBrowser=1`,
    })
  }
}

/**
 * Test LINE notification specifically for Needle Keeper (คนคัดเข็ม)
 */
export async function testNeedleKeeperLineNotification(customTargetId) {
  try {
    const cfg = await loadLineSettingsDB()
    if (!cfg.is_enabled) {
      return { ok: false, error: 'กรุณาเปิดสวิตช์ใช้งานการแจ้งเตือน LINE ก่อน' }
    }
    const targetId = customTargetId?.trim() || getNeedleKeeperLineIds(cfg)[0]
    if (!targetId) {
      return { ok: false, error: 'ยังไม่มี LINE USER ID ของคนคัดเข็ม กรุณาระบุหรือเลือกคนคัดเข็มก่อน' }
    }
    if (!cfg.channel_access_token?.trim()) {
      return { ok: false, error: 'กรุณากรอก LINE Channel Access Token ในการตั้งค่า LINE ก่อน' }
    }

    const appUrl = resolveAppBaseUrl(cfg.app_base_url)
    const testFlex = buildSpareNeedleRequestFlexMessage({
      id: 'SNR-TEST-DEMO',
      request_no: 'SNR-TEST-8888',
      machine_mc: 'MC-TEST (สาธิต)',
      gauge: '24G',
      technician_name: 'ระบบทดสอบแจ้งเตือน',
      shift: 'กะเช้า',
      tracks_requested: {
        dial: { t1: 50, t2: 50 },
        cylinder: { t1: 50, t2: 50, t3: 50, t4: 50 },
      },
      request_comment: 'ทดสอบการเชื่อมต่อ LINE USER ID คนคัดเข็ม สำเร็จเรียบร้อย!',
      created_at: new Date().toISOString(),
    }, { Machine: 'MC-TEST', Gauge: '24G', Serial_NOW: 'CYL-DEMO-01' }, appUrl)

    const testText = `\n🔔 [ทดสอบการแจ้งเตือนคนคัดเข็ม]\nระบบ TextileOps CMMS ได้เชื่อมโยง LINE USER ID (${targetId}) เรียบร้อยแล้ว!\n👉 เมื่อช่างขอเบิกเข็ม Spare ระบบจะเด้งข้อความมาที่บัญชีนี้โดยตรง\n👉 เปิดแอป: ${appUrl}/needle-stock?openExternalBrowser=1`

    const flexRes = await sendLineNotification({
      type: 'flex',
      token: cfg.channel_access_token.trim(),
      targetId,
      messages: [testFlex],
    })

    if (!flexRes.ok) {
      return await sendLineNotification({
        type: 'text',
        token: cfg.channel_access_token.trim(),
        targetId,
        textMessage: testText,
      })
    }
    return flexRes
  } catch (err) {
    return { ok: false, error: err.message || 'เกิดข้อผิดพลาดในการทดสอบ' }
  }
}

/**
 * Sends Spare Needle Requested Notification to LINE
 */
export async function notifyLineSpareNeedleRequested(snr, cylinder) {
  try {
    const cfg = await loadLineSettingsDB()
    if (!cfg.is_enabled) return { ok: false, skipped: true }

    const appUrl = resolveAppBaseUrl(cfg.app_base_url)
    const serial = snr.cylinder_serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || ''
    const reqId = snr.id || ''
    const directUrl = `${appUrl}/repair/${encodeURIComponent(serial)}?needle_req=${encodeURIComponent(reqId)}&step=prepare&openExternalBrowser=1`

    const dial = snr.tracks_requested?.dial || {}
    const cyl = snr.tracks_requested?.cylinder || {}
    const trackLines = []
    if (dial.single > 0 || dial.t1 > 0 || dial.t2 > 0 || dial.singker > 0 || dial.sinker > 0) {
      const parts = []
      if (dial.single > 0) parts.push(`Single: ${dial.single} เล่ม`)
      if (dial.t1 > 0) parts.push(`T1: ${dial.t1} เล่ม`)
      if (dial.t2 > 0) parts.push(`T2: ${dial.t2} เล่ม`)
      if (dial.singker > 0 || dial.sinker > 0) parts.push(`Singker: ${dial.singker || dial.sinker} เล่ม`)
      trackLines.push(`• Dial: ${parts.join(', ')}`)
    }
    if (cyl.t1 > 0 || cyl.t2 > 0 || cyl.t3 > 0 || cyl.t4 > 0) {
      const parts = []
      if (cyl.t1 > 0) parts.push(`T1: ${cyl.t1} เล่ม`)
      if (cyl.t2 > 0) parts.push(`T2: ${cyl.t2} เล่ม`)
      if (cyl.t3 > 0) parts.push(`T3: ${cyl.t3} เล่ม`)
      if (cyl.t4 > 0) parts.push(`T4: ${cyl.t4} เล่ม`)
      trackLines.push(`• Cylinder: ${parts.join(', ')}`)
    }

    const textMessage = [
      `\n🪡 [ขอเบิกเข็ม Spare ประจำเครื่อง]`,
      `📋 เลขที่: ${snr.request_no || snr.id}`,
      `🏭 เครื่อง: ${snr.machine_mc || cylinder?.Machine || '—'} (กระบอก: ${serial})`,
      `📐 Gauge: ${snr.gauge || cylinder?.Gauge || '—'}`,
      `👷 ผู้ขอเบิก: ${snr.technician_name} (${snr.shift || 'กะเช้า'})`,
      `📌 รายการ Track ที่ต้องการ:`,
      trackLines.join('\n') || '— ตามระบุ —',
      snr.request_comment ? `💬 หมายเหตุ: ${snr.request_comment}` : '',
      `👉 แตะเพื่อจัดเตรียมเข็ม: ${directUrl}`,
    ].filter(Boolean).join('\n')

    const targetIds = getNeedleKeeperLineIds(cfg)
    let sentOa = false
    let oaResults = null

    if (cfg.channel_access_token && targetIds.length > 0) {
      const flexMsg = buildSpareNeedleRequestFlexMessage(snr, cylinder, cfg.app_base_url)
      oaResults = await Promise.all(targetIds.map(async targetId => {
        const res = await sendLineNotification({
          type: 'flex',
          token: cfg.channel_access_token,
          targetId,
          messages: [flexMsg],
        })
        if (!res.ok) {
          return await sendLineNotification({
            type: 'text',
            token: cfg.channel_access_token,
            targetId,
            textMessage,
          })
        }
        return res
      }))
      sentOa = true
    }

    const notifyToken = cfg.needle_keeper_notify_token || cfg.notify_token
    if (notifyToken) {
      await sendLineNotification({
        type: 'notify',
        notifyToken,
        textMessage,
      })
    }

    if (sentOa) return { ok: true, results: oaResults }
    if (notifyToken) return { ok: true }
    return { ok: false, skipped: true }
  } catch (err) {
    console.warn('[LINE Spare Request Error]', err)
    return { ok: false, error: err.message }
  }
}

/**
 * Sends Spare Needle Prepared Notification to LINE
 */
export async function notifyLineSpareNeedlePrepared(snr, cylinder) {
  try {
    const cfg = await loadLineSettingsDB()
    if (!cfg.is_enabled) return { ok: false, skipped: true }

    const appUrl = resolveAppBaseUrl(cfg.app_base_url)
    const serial = snr.cylinder_serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || ''
    const reqId = snr.id || ''
    const directUrl = `${appUrl}/repair/${encodeURIComponent(serial)}?needle_req=${encodeURIComponent(reqId)}&step=ack&openExternalBrowser=1`

    const issuedRaw = ensureJson(snr.issued_items, [])
    const issuedList = (Array.isArray(issuedRaw) ? issuedRaw : []).map(item => {
      const isOff = item.isOffSystem || item.sourceType === 'OFF_SYSTEM' || item.setId === 'OFF_SYSTEM'
      const offTag = isOff ? ' [เข็มนอกระบบ]' : ''
      return `• ${item.needleModel || item.setId || 'เข็ม'}${offTag}: ${item.quantity || 0} ตัว (${item.grade || 'เกรด B'})`
    }).join('\n')

    const textMessage = [
      `\n📦 [เข็ม Spare จัดเตรียมเรียบร้อยแล้ว]`,
      `📋 เลขที่: ${snr.request_no || snr.id}`,
      `🏭 เครื่อง: ${snr.machine_mc || cylinder?.Machine || '—'}`,
      `👷 ผู้ขอเบิก: ${snr.technician_name}`,
      `👨‍💼 ผู้จ่ายเข็ม: ${snr.issuer_name || 'สโตร์เข็ม'}`,
      `🎯 รายการเข็มที่จัดเตรียม:`,
      issuedList || '— ตามรายการที่ขอ —',
      snr.issuer_comment ? `💬 หมายเหตุ: ${snr.issuer_comment}` : '',
      `👉 แตะเพื่อตรวจสอบและกดรับทราบ: ${directUrl}`,
    ].filter(Boolean).join('\n')

    const effectiveProvider = (cfg.provider === 'line_oa' || (cfg.channel_access_token && !cfg.notify_token)) ? 'line_oa' : 'line_notify'

    if (effectiveProvider === 'line_oa' && cfg.channel_access_token) {
      const techTargetId = getTechnicianLineId(cfg, snr.technician_name)
      const supervisorIds = getSupervisorLineIds(cfg)
      const keeperIds = getNeedleKeeperLineIds(cfg)
      const targetIds = Array.from(new Set([techTargetId, ...supervisorIds, ...keeperIds].filter(Boolean)))
      if (!targetIds.length) return { ok: false, skipped: true }
      const flexMsg = buildSpareNeedlePreparedFlexMessage(snr, cylinder, cfg.app_base_url)
      const results = await Promise.all(targetIds.map(async targetId => {
        const res = await sendLineNotification({
          type: 'flex',
          token: cfg.channel_access_token,
          targetId,
          messages: [flexMsg],
        })
        if (!res.ok) {
          // LINE Notify cannot render flex — fall back to plain text
          return await sendLineNotification({
            type: 'text',
            token: cfg.channel_access_token,
            targetId,
            textMessage,
          })
        }
        return res
      }))
      return { ok: true, results }
    } else if (cfg.notify_token || cfg.needle_keeper_notify_token) {
      return await sendLineNotification({
        type: 'notify',
        notifyToken: cfg.needle_keeper_notify_token || cfg.notify_token,
        textMessage,
      })
    }
  } catch (err) {
    console.warn('[LINE Spare Prepared Error]', err)
    return { ok: false, error: err.message }
  }
}

/**
 * Sends Spare Needle Received Notification to LINE
 */
export async function notifyLineSpareNeedleReceived(snr, cylinder) {
  try {
    const cfg = await loadLineSettingsDB()
    if (!cfg.is_enabled) return { ok: false, skipped: true }

    const textMessage = [
      `\n🎉 [รับเข็ม Spare เรียบร้อย - ปิดงาน]`,
      `📋 เลขที่: ${snr.request_no || snr.id}`,
      `🏭 เครื่อง: ${snr.machine_mc || cylinder?.Machine || '—'}`,
      `👷 ผู้รับเข็ม: ${snr.technician_name}`,
      `⏰ เวลารับเข็ม: ${new Date(snr.acknowledged_at || Date.now()).toLocaleString('th-TH')}`,
      `✅ สถานะ: ปิดงานเบิกเข็ม Spare สมบูรณ์`,
    ].join('\n')

    const effectiveProvider = (cfg.provider === 'line_oa' || (cfg.channel_access_token && !cfg.notify_token && !cfg.needle_keeper_notify_token)) ? 'line_oa' : 'line_notify'

    if (effectiveProvider === 'line_oa' && cfg.channel_access_token) {
      const supervisorIds = getSupervisorLineIds(cfg)
      const keeperIds = getNeedleKeeperLineIds(cfg)
      const targetIds = Array.from(new Set([...supervisorIds, ...keeperIds].filter(Boolean)))
      if (!targetIds.length) return { ok: false, skipped: true }
      const flexMsg = buildSpareNeedleReceivedFlexMessage(snr, cylinder, cfg.app_base_url)
      const results = await Promise.all(targetIds.map(async targetId => {
        const res = await sendLineNotification({
          type: 'flex',
          token: cfg.channel_access_token,
          targetId,
          messages: [flexMsg],
        })
        if (!res.ok) {
          return await sendLineNotification({
            type: 'text',
            token: cfg.channel_access_token,
            targetId,
            textMessage,
          })
        }
        return res
      }))
      return { ok: true, results }
    } else if (cfg.notify_token || cfg.needle_keeper_notify_token) {
      return await sendLineNotification({
        type: 'notify',
        notifyToken: cfg.needle_keeper_notify_token || cfg.notify_token,
        textMessage,
      })
    }
  } catch (err) {
    console.warn('[LINE Spare Received Error]', err)
    return { ok: false, error: err.message }
  }
}



/**
 * Validates whether a target ID is a valid LINE user, group, or room ID
 */
export function isValidLineTargetId(id) {
  if (!id || typeof id !== 'string') return false
  const trimmed = id.trim()
  return /^[UCR][a-zA-Z0-9]{20,40}$/.test(trimmed)
}

/**
 * Flexible name matching: ignores title prefixes (Mr., นาย, ช่าง), parentheses/nicknames, emojis, case, whitespace
 */
export function namesMatch(name1, name2) {
  if (!name1 || !name2) return false
  const clean = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/^(mr\.|mr|miss|mrs|ช่าง|นาย|นางสาว|นาง)\s+/i, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()

  const c1 = clean(name1)
  const c2 = clean(name2)
  if (!c1 || !c2) return false
  if (c1 === c2) return true
  if (c1.length > 2 && c2.length > 2) {
    if (c1.includes(c2) || c2.includes(c1)) return true
  }

  const base1 = clean(String(name1).replace(/\([^)]*\)/g, ''))
  const base2 = clean(String(name2).replace(/\([^)]*\)/g, ''))
  if (base1 && base2 && (base1 === base2 || (base1.length > 2 && base2.length > 2 && (base1.includes(base2) || base2.includes(base1))))) {
    return true
  }

  return false
}

/**
 * Finds the best matching item from a list by name:
 * 1. Exact string match (trimmed)
 * 2. Case-insensitive exact string match (trimmed)
 * 3. Loose/fuzzy match via namesMatch
 */
export function findTechByName(list, targetName, getName = (t) => t?.Name || t?.name) {
  if (!Array.isArray(list) || !targetName) return null
  const target = String(targetName).trim()
  if (!target) return null
  const targetLower = target.toLowerCase()

  // 1. Exact match
  const exact = list.find((item) => String(getName(item) || '').trim() === target)
  if (exact) return exact

  // 2. Case-insensitive exact match
  const exactCi = list.find((item) => String(getName(item) || '').trim().toLowerCase() === targetLower)
  if (exactCi) return exactCi

  // 3. Fuzzy match via namesMatch
  return list.find((item) => namesMatch(getName(item), target)) || null
}

function findUserByName(users, targetName) {
  if (!Array.isArray(users) || !targetName) return null
  const target = String(targetName).trim()
  if (!target) return null
  const targetLower = target.toLowerCase()

  // 1. Exact match on full_name, line_display_name, or username
  const exact = users.find((u) =>
    [u?.full_name, u?.line_display_name, u?.username].some((n) => String(n || '').trim() === target)
  )
  if (exact) return exact

  // 2. Case-insensitive exact match
  const exactCi = users.find((u) =>
    [u?.full_name, u?.line_display_name, u?.username].some(
      (n) => String(n || '').trim().toLowerCase() === targetLower
    )
  )
  if (exactCi) return exactCi

  // 3. Fuzzy match via namesMatch
  return (
    users.find(
      (u) =>
        namesMatch(u?.full_name, target) ||
        namesMatch(u?.line_display_name, target) ||
        namesMatch(u?.username, target)
    ) || null
  )
}

/**
 * Resolves an array of technician names to their LINE User IDs
 * Supports in-memory data (technicians, systemUsers) for instant 100% accuracy,
 * with fallbacks to line_settings, localStorage, DB (technicians, users, line_contacts).
 */
export async function resolveTechniciansLineIds(cfg, techNames = [], extra = {}) {
  if (!Array.isArray(techNames) || techNames.length === 0) return []
  const targetNames = techNames.map((s) => String(s || '').trim()).filter(Boolean)
  if (targetNames.length === 0) return []

  const { technicians: inMemoryTechs = [], systemUsers: inMemoryUsers = [] } = extra

  const resolved = []
  const resolvedNames = new Set()
  const foundUserIds = new Set()
  const pendingAuthUserIdsByTechName = new Map()

  const addIfValid = (name, rawId) => {
    if (isValidLineTargetId(rawId)) {
      const id = rawId.trim()
      resolvedNames.add(name)
      if (!foundUserIds.has(id)) {
        foundUserIds.add(id)
        resolved.push({ name, userId: id })
      }
      return true
    }
    return false
  }

  // 1. Check in-memory technicians passed directly from WorkOrders component
  if (Array.isArray(inMemoryTechs) && inMemoryTechs.length > 0) {
    for (const tName of targetNames) {
      if (resolvedNames.has(tName)) continue
      const matched = findTechByName(inMemoryTechs, tName, (t) => t.Name || t.name)
      if (matched) {
        const directLineId = matched.Line_ID || matched.line_id
        if (addIfValid(tName, directLineId)) continue

        const rawUserId = matched.User_ID || matched.user_id
        if (addIfValid(tName, rawUserId)) continue

        if (rawUserId) {
          pendingAuthUserIdsByTechName.set(tName, rawUserId)
          if (Array.isArray(inMemoryUsers) && inMemoryUsers.length > 0) {
            const userObj = inMemoryUsers.find((u) => u.id === rawUserId || u.username === rawUserId)
            if (userObj?.line_user_id && addIfValid(tName, userObj.line_user_id)) {
              continue
            }
          }
        }
      }
    }
  }

  // 2. Check in-memory systemUsers directly by name match (exact first, then fuzzy)
  if (Array.isArray(inMemoryUsers) && inMemoryUsers.length > 0) {
    const usersWithLine = inMemoryUsers.filter((u) => isValidLineTargetId(u?.line_user_id))
    for (const tName of targetNames) {
      if (resolvedNames.has(tName)) continue
      const matchedUser = findUserByName(usersWithLine, tName)
      if (matchedUser?.line_user_id) {
        addIfValid(tName, matchedUser.line_user_id)
      }
    }
  }

  // 3. Check cfg.technicians from line_settings
  if (Array.isArray(cfg?.technicians) && cfg.technicians.length > 0) {
    const validCfgTechs = cfg.technicians.filter((t) => isValidLineTargetId(t?.user_id))
    for (const tName of targetNames) {
      if (resolvedNames.has(tName)) continue
      const matched = findTechByName(validCfgTechs, tName, (t) => t.name)
      if (matched?.user_id) {
        addIfValid(tName, matched.user_id)
      }
    }
  }

  // 4. Check localStorage 'txops_tbl_technicians'
  try {
    const stored = JSON.parse(localStorage.getItem('txops_tbl_technicians') || '[]')
    if (Array.isArray(stored) && stored.length > 0) {
      for (const tName of targetNames) {
        if (resolvedNames.has(tName)) continue
        const matched = findTechByName(stored, tName, (t) => t.Name || t.name)
        if (matched) {
          const directLine = matched.Line_ID || matched.line_id
          const rawUser = matched.User_ID || matched.user_id
          if (addIfValid(tName, directLine)) continue
          if (addIfValid(tName, rawUser)) continue
          if (rawUser && !pendingAuthUserIdsByTechName.has(tName)) {
            pendingAuthUserIdsByTechName.set(tName, rawUser)
          }
        }
      }
    }
  } catch {}

  // 5. If still unresolved, query DB appconfigs ('technicians', 'line_contacts') and users table
  const unresolvedNames = targetNames.filter((name) => !resolvedNames.has(name))
  if (unresolvedNames.length > 0) {
    try {
      const { data: techConfig } = await db
        .from('appconfigs')
        .select('value')
        .eq('key', 'technicians')
        .maybeSingle()

      if (techConfig?.value) {
        const dbTechs = JSON.parse(techConfig.value)
        if (Array.isArray(dbTechs) && dbTechs.length > 0) {
          for (const tName of unresolvedNames) {
            if (resolvedNames.has(tName)) continue
            const matched = findTechByName(dbTechs, tName, (t) => t.Name || t.name)
            if (matched) {
              const directLine = matched.Line_ID || matched.line_id
              const rawUser = matched.User_ID || matched.user_id
              if (addIfValid(tName, directLine)) continue
              if (addIfValid(tName, rawUser)) continue
              if (rawUser && !pendingAuthUserIdsByTechName.has(tName)) {
                pendingAuthUserIdsByTechName.set(tName, rawUser)
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[resolveTechniciansLineIds] Error reading appconfigs technicians:', e)
    }

    try {
      const { data: dbUsers } = await db
        .from('users')
        .select('id, username, full_name, line_user_id, line_display_name')

      if (Array.isArray(dbUsers) && dbUsers.length > 0) {
        const usersWithLine = dbUsers.filter((u) => isValidLineTargetId(u?.line_user_id))
        for (const tName of unresolvedNames) {
          if (resolvedNames.has(tName)) continue
          // First check if technician had a linked User_ID (UUID)
          const pendingUid = pendingAuthUserIdsByTechName.get(tName)
          if (pendingUid) {
            const byId = usersWithLine.find((u) => u.id === pendingUid || u.username === pendingUid)
            if (byId?.line_user_id && addIfValid(tName, byId.line_user_id)) continue
          }
          // Next match by name (exact first, then fuzzy)
          const matchedUser = findUserByName(usersWithLine, tName)
          if (matchedUser?.line_user_id) {
            addIfValid(tName, matchedUser.line_user_id)
          }
        }
      }
    } catch (e) {
      console.warn('[resolveTechniciansLineIds] Error querying users table:', e)
    }

    // 6. Final fallback: Check auto-captured LINE contacts from Webhook ('line_contacts')
    const stillUnresolved = targetNames.filter((name) => !resolvedNames.has(name))
    if (stillUnresolved.length > 0) {
      try {
        const { contacts } = await fetchLineContacts()
        if (Array.isArray(contacts) && contacts.length > 0) {
          const validContacts = contacts.filter((c) => isValidLineTargetId(c?.user_id || c?.userId))
          for (const tName of stillUnresolved) {
            if (resolvedNames.has(tName)) continue
            const matchedContact = findTechByName(
              validContacts,
              tName,
              (c) => c.name || c.displayName
            )
            if (matchedContact) {
              addIfValid(tName, matchedContact.user_id || matchedContact.userId)
            }
          }
        }
      } catch (e) {
        console.warn('[resolveTechniciansLineIds] Error checking line_contacts:', e)
      }
    }
  }

  return resolved
}

/**
 * Sends Work Order Assignment Notification to LINE
 * - Resolves LINE User IDs for all assigned technicians
 * - Pushes Flex Message directly to each assigned technician (plus target_group_id if configured)
 */
export async function notifyLineWorkOrderAssigned(jobData, assignedTechNames = [], extra = {}) {
  try {
    if (!jobData) return { ok: false, skipped: true, reason: 'No job data' }

    // Normalize technician list
    let techList = []
    if (Array.isArray(assignedTechNames)) {
      techList = assignedTechNames.map((s) => String(s || '').trim()).filter(Boolean)
    } else if (typeof assignedTechNames === 'string' && assignedTechNames.trim()) {
      techList = assignedTechNames.split(',').map((s) => s.trim()).filter(Boolean)
    }
    if (techList.length === 0) {
      const rawTechs = jobData.Technicians || jobData.Tech || ''
      if (rawTechs) {
        techList = rawTechs.split(',').map((s) => s.trim()).filter(Boolean)
      }
    }

    if (techList.length === 0) {
      return { ok: false, skipped: true, reason: 'No technicians assigned to work order' }
    }

    const cfg = await loadLineSettingsDB()
    if (!cfg.is_enabled || cfg.notify_on_workorder === false) {
      return { ok: false, skipped: true, reason: 'LINE notification for work orders disabled' }
    }

    const effectiveProvider =
      cfg.provider === 'line_oa' || (cfg.channel_access_token && !cfg.notify_token)
        ? 'line_oa'
        : 'line_notify'

    const jobId = jobData.Job_ID || jobData['Job ID'] || jobData.WO_ID || (jobData.id ? `JOB-${String(jobData.id).slice(0, 8)}` : 'JOB-NEW')
    const mc = jobData.MC || jobData.mc || '—'
    const ki = (jobData.KI !== undefined && jobData.KI !== null && jobData.KI !== '') ? String(jobData.KI) : ''
    const design = jobData.Design || jobData.design || ''
    const rollNo = jobData.RollNo || jobData.roll_no || ''
    const problem = jobData.Comment || jobData.Details || jobData.details || jobData.Problem || 'ไม่มีรายละเอียด'
    const createdBy = jobData.CreatedBy || jobData.created_by || 'เจ้าหน้าที่'

    if (effectiveProvider === 'line_oa') {
      // Resolve individual technician LINE IDs
      const resolvedTechs = await resolveTechniciansLineIds(cfg, techList, extra)
      const recipientIds = new Set()

      // Add individual assigned technicians
      for (const t of resolvedTechs) {
        if (isValidLineTargetId(t.userId)) recipientIds.add(t.userId)
      }

      const individualCount = recipientIds.size
      const techsWithoutLine = techList.filter(
        (tName) => !resolvedTechs.some((r) => r.name === tName || namesMatch(r.name, tName))
      )

      // Also include configured maintenance group if valid
      if (cfg.target_group_id && isValidLineTargetId(cfg.target_group_id)) {
        recipientIds.add(cfg.target_group_id.trim())
      }

      if (recipientIds.size === 0) {
        console.warn('[notifyLineWorkOrderAssigned] No valid LINE recipient IDs found for:', techList)
        return {
          ok: false,
          skipped: true,
          reason: 'no_line_id',
          techsWithoutLine: techList,
        }
      }

      const flexMsg = buildWorkOrderAssignedFlexMessage(jobData, techList, cfg.app_base_url)

      const results = await Promise.all(
        Array.from(recipientIds).map((targetId) =>
          sendLineNotification({
            type: 'flex',
            token: cfg.channel_access_token?.trim() || undefined,
            targetId,
            messages: [flexMsg],
          })
        )
      )

      const successCount = results.filter((r) => r.ok).length
      const failed = results.filter((r) => !r.ok)
      const errors = failed.map((r) => r.error || r.details?.message).filter(Boolean)
      if (failed.length > 0) {
        console.warn('[notifyLineWorkOrderAssigned] Some pushes failed:', failed)
      }

      return {
        ok: successCount > 0,
        sentCount: successCount,
        individualCount,
        techsWithoutLine,
        errors,
        recipientsText: resolvedTechs.map((r) => r.name).join(', ') || 'กลุ่มซ่อมบำรุง',
        results,
      }
    } else {
      // LINE Notify mode
      const appUrl = resolveAppBaseUrl(cfg.app_base_url)
      const directUrl = `${appUrl}/workorders?job=${encodeURIComponent(jobId)}&openExternalBrowser=1`
      const techStr = techList.join(', ')
      const designLine = design ? `\nDesign: ${design}` : ''
      const kiLine = ki ? `\nKI: ${ki}` : ''
      const rollLine = rollNo ? `\nเลขม้วน: ${rollNo}` : ''

      const textMessage = `\n📋 [ใบสั่งงานใหม่ - ได้รับมอบหมาย]\nเลขที่: ${jobId}\nเครื่อง: ${mc}${kiLine}${designLine}${rollLine}\nช่างผู้รับผิดชอบ: ${techStr}\nรายละเอียด: ${problem}\nผู้เปิดงาน: ${createdBy}\n👉 แตะเปิดดูใบสั่งงาน PWA: ${directUrl}`

      const res = await sendLineNotification({
        type: 'notify',
        notifyToken: cfg.notify_token?.trim() || undefined,
        textMessage,
      })

      return {
        ok: res.ok,
        sentCount: res.ok ? 1 : 0,
        errors: res.ok ? [] : [res.error || 'LINE Notify failed'],
        recipientsText: techStr,
        results: [res],
      }
    }
  } catch (err) {
    console.warn('[LINE Work Order Notify Error]', err)
    return { ok: false, error: err.message }
  }
}

