/**
 * src/utils/line.js
 * LINE Messaging API & LINE Notify Integration for TextileOps CMMS
 */
import { supabase } from '../supabase'
import {
  buildRepairRequestFlexMessage,
  buildTechnicianAssignedFlexMessage,
  buildRepairCompletedFlexMessage,
  buildTestFlexMessage,
} from './lineFlexBuilder'

const STORAGE_KEY = 'line_settings'
const DB_KEY      = 'line_settings'

export const DEFAULT_LINE_SETTINGS = {
  provider: 'line_oa', // 'line_oa' (Messaging API) | 'line_notify'
  channel_access_token: '',
  target_group_id: '',
  channel_secret: '',
  notify_token: '',
  is_enabled: true,
  app_base_url: 'https://textileops-cmms.vercel.app',
  notify_on_new_request: true,
  notify_on_approve: true,
  notify_on_complete: true,
}

export const loadLineSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved ? { ...DEFAULT_LINE_SETTINGS, ...saved } : { ...DEFAULT_LINE_SETTINGS }
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
    const { data, error } = await supabase
      .from('appconfigs')
      .select('value')
      .eq('key', DB_KEY)
      .maybeSingle()

    if (!error && data?.value) {
      const parsed = JSON.parse(data.value)
      const merged = { ...DEFAULT_LINE_SETTINGS, ...parsed }
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
    await supabase
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
export async function notifyLineNewRepair(request, cylinder) {
  try {
    const cfg = await loadLineSettingsDB()
    if (!cfg.is_enabled || !cfg.notify_on_new_request) {
      return { ok: false, skipped: true, reason: 'LINE notification disabled' }
    }

    const effectiveProvider = (cfg.provider === 'line_oa' || (cfg.channel_access_token && !cfg.notify_token)) ? 'line_oa' : 'line_notify'

    if (effectiveProvider === 'line_oa') {
      if (!cfg.channel_access_token || !cfg.target_group_id) {
        return { ok: false, skipped: true, reason: 'LINE Channel Access Token or Group ID not configured' }
      }

      const flexMsg = buildRepairRequestFlexMessage(request, cylinder, cfg.app_base_url)

      return await sendLineNotification({
        type: 'flex',
        token: cfg.channel_access_token,
        targetId: cfg.target_group_id,
        messages: [flexMsg],
      })
    } else {
      if (!cfg.notify_token) {
        return { ok: false, skipped: true, reason: 'LINE Notify Token not configured' }
      }

      const serial = request.cylinder_serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || '—'
      const machine = request.machine_mc || cylinder?.NewMC || '—'
      const problem = request.problem_description || 'ไม่มีรายละเอียด'
      const reporter = request.reported_by || 'เจ้าหน้าที่'
      const appUrl = (cfg.app_base_url || 'https://textileops-cmms.vercel.app').replace(/\/$/, '')
      const directUrl = `${appUrl}/repair/${encodeURIComponent(serial)}?req=${encodeURIComponent(request.id || '')}&step=approve&openExternalBrowser=1`

      const textMessage = `\n🚨 [แจ้งซ่อมใหม่]\nเครื่อง: ${machine}\nกระบอก: ${serial}\nอาการ: ${problem}\nผู้แจ้ง: ${reporter}\n👉 แตะเปิดรับงาน PWA: ${directUrl}`

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
 * Sends Technician Assignment Notification to LINE (Step 2)
 */
export async function notifyLineTechnician(request) {
  try {
    const cfg = await loadLineSettingsDB()
    if (!cfg.is_enabled || !cfg.notify_on_approve) {
      return { ok: false, skipped: true, reason: 'LINE notification on approve disabled' }
    }

    const effectiveProvider = (cfg.provider === 'line_oa' || (cfg.channel_access_token && !cfg.notify_token)) ? 'line_oa' : 'line_notify'

    if (effectiveProvider === 'line_oa') {
      if (!cfg.channel_access_token || !cfg.target_group_id) {
        return { ok: false, skipped: true, reason: 'LINE Channel Access Token or Group ID not configured' }
      }

      const flexMsg = buildTechnicianAssignedFlexMessage(request, cfg.app_base_url)

      return await sendLineNotification({
        type: 'flex',
        token: cfg.channel_access_token,
        targetId: cfg.target_group_id,
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
      const appUrl = (cfg.app_base_url || 'https://textileops-cmms.vercel.app').replace(/\/$/, '')
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
 * Sends Repair Completed Notification to LINE (Step 3)
 */
export async function notifyLineCompleted(request) {
  try {
    const cfg = await loadLineSettingsDB()
    if (!cfg.is_enabled || !cfg.notify_on_complete) {
      return { ok: false, skipped: true, reason: 'LINE notification on complete disabled' }
    }

    const effectiveProvider = (cfg.provider === 'line_oa' || (cfg.channel_access_token && !cfg.notify_token)) ? 'line_oa' : 'line_notify'

    if (effectiveProvider === 'line_oa') {
      if (!cfg.channel_access_token || !cfg.target_group_id) {
        return { ok: false, skipped: true, reason: 'LINE Channel Access Token or Group ID not configured' }
      }

      const flexMsg = buildRepairCompletedFlexMessage(request, cfg.app_base_url)

      return await sendLineNotification({
        type: 'flex',
        token: cfg.channel_access_token,
        targetId: cfg.target_group_id,
        messages: [flexMsg],
      })
    } else {
      if (!cfg.notify_token) {
        return { ok: false, skipped: true, reason: 'LINE Notify Token not configured' }
      }

      const serial = request.cylinder_serial || '—'
      const machine = request.machine_mc || '—'
      const details = request.repair_details || 'ซ่อมบำรุงเรียบร้อย'
      const parts = request.parts_used ? ` (อะไหล่: ${request.parts_used})` : ''
      const tech = request.completed_by || request.technician_name || 'ช่างเทคนิค'
      const appUrl = (cfg.app_base_url || 'https://textileops-cmms.vercel.app').replace(/\/$/, '')
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
    if (!cfg.target_group_id?.trim()) {
      return { ok: false, error: 'กรุณากรอก Group ID หรือ User ID กลุ่มช่าง ก่อนทดสอบ' }
    }

    const testFlex = buildTestFlexMessage(cfg.app_base_url)

    return await sendLineNotification({
      type: 'flex',
      token: cfg.channel_access_token.trim(),
      targetId: cfg.target_group_id.trim(),
      messages: [testFlex],
    })
  } else {
    if (!cfg.notify_token?.trim()) {
      return { ok: false, error: 'กรุณากรอก LINE Notify Token ก่อนทดสอบ' }
    }

    const appUrl = (cfg.app_base_url || 'https://textileops-cmms.vercel.app').replace(/\/$/, '')
    return await sendLineNotification({
      type: 'notify',
      notifyToken: cfg.notify_token.trim(),
      textMessage: `\n🔔 ทดสอบการแจ้งเตือนจาก TextileOps CMMS สำเร็จเรียบร้อย!\n👉 แตะเปิดแอป PWA: ${appUrl}?openExternalBrowser=1`,
    })
  }
}
