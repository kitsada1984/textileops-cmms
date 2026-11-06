import { db } from '../../api/dbClient'

// Sync Technicians to LINE and Telegram notification settings in Supabase
// & LocalStorage. Moved verbatim out of the WorkOrders component
// (`const syncTechToNotifications = async (techList) => {...}`).
export async function syncTechToNotifications(techList) {
  try {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('txops_tbl_technicians', JSON.stringify(techList)) } catch {}
    }
    const { data: lineData } = await db.from('appconfigs').select('value').eq('key', 'line_settings').maybeSingle()
    let lineCfg = {}
    if (lineData?.value) {
      try { lineCfg = JSON.parse(lineData.value) } catch {}
    } else {
      try { lineCfg = JSON.parse(localStorage.getItem('txops_tbl_line_settings') || '{}') } catch {}
    }
    lineCfg.technicians = techList.map((t) => ({ name: t.Name, user_id: (t.Line_ID || t.line_id || '').trim() }))
    await db.from('appconfigs').upsert({ key: 'line_settings', value: JSON.stringify(lineCfg), updated_at: new Date().toISOString() }, { onConflict: 'key' })
    try { localStorage.setItem('txops_tbl_line_settings', JSON.stringify(lineCfg)) } catch {}

    const { data: tgData } = await db.from('appconfigs').select('value').eq('key', 'telegram_settings').maybeSingle()
    let tgCfg = {}
    if (tgData?.value) {
      try { tgCfg = JSON.parse(tgData.value) } catch {}
    } else {
      try { tgCfg = JSON.parse(localStorage.getItem('txops_tbl_telegram_settings') || '{}') } catch {}
    }
    tgCfg.technicians = techList.map((t) => ({ name: t.Name, chat_id: (t.Telegram_ID || t.telegram_id || '').trim() }))
    await db.from('appconfigs').upsert({ key: 'telegram_settings', value: JSON.stringify(tgCfg), updated_at: new Date().toISOString() }, { onConflict: 'key' })
    try { localStorage.setItem('txops_tbl_telegram_settings', JSON.stringify(tgCfg)) } catch {}
  } catch (e) {
    console.warn('Sync tech to notifications error:', e)
  }
}
