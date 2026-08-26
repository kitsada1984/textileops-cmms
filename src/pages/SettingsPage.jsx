import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Save, Database, User, Shield, Send, CheckCircle, AlertCircle, RefreshCw, UserPlus, Smartphone, Download } from 'lucide-react'
import { useT } from '../contexts/LanguageContext'
import { useAuth, hashPassword } from '../contexts/AuthContext'
import { APP_VERSION, APP_BUILD_DATE } from '../version'
import { fetchTelegramContacts, loadTelegramSettings, saveTelegramSettings, saveTelegramSettingsDB, loadTelegramSettingsDB, testTelegram } from '../utils/telegram'

const TABLES = [
  ['machines','เครื่องจักร'], ['cylinders','กระบอก'], ['workorders','ใบสั่งงาน'],
  ['pmplans','แผน PM'], ['spareparts','อะไหล่'], ['purchaseorders','ใบสั่งซื้อ'],
  ['stocktransactions','เคลื่อนไหวสต็อก'], ['auditlogs','บันทึกระบบ'], ['appconfigs','ตั้งค่าแอป'],
]

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Icon size={15} style={{color:'var(--text-500)'}}/>
          <span className="font-semibold text-sm" style={{color:'var(--text-900)'}}>{title}</span>
        </div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useT()
  const { user, refreshUser } = useAuth()
  const [counts,     setCounts]     = useState({})
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdMsg,     setPwdMsg]     = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  const [tg,        setTg]         = useState(() => {
    const saved = loadTelegramSettings()
    if (!saved.supervisors) saved.supervisors = saved.supervisor_chat_id ? [{ name: 'Supervisor', chat_id: saved.supervisor_chat_id }] : []
    if (!saved.technicians) saved.technicians = saved.technician_chat_id ? [{ name: 'ช่างเทคนิค', chat_id: saved.technician_chat_id }] : []
    return saved
  })
  const [tgMsg,     setTgMsg]      = useState('')
  const [tgTesting, setTgTesting]  = useState(false)
  const [tgContacts, setTgContacts] = useState([])
  const [tgContactLoading, setTgContactLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('appconfigs').select('value').eq('key', 'telegram_settings').maybeSingle()
      if (data?.value) {
        // DB has data — load it
        const cfg = JSON.parse(data.value)
        if (!cfg.supervisors) cfg.supervisors = []
        if (!cfg.technicians) cfg.technicians = []
        setTg(cfg)
      } else {
        // DB empty — sync localStorage → DB immediately
        const local = loadTelegramSettings()
        if (!local.supervisors) local.supervisors = []
        if (!local.technicians) local.technicians = []
        setTg(local)
        saveTelegramSettingsDB(local)
      }
    })()
  }, [])

  useEffect(() => {
    Promise.allSettled(
      TABLES.map(([tb]) => supabase.from(tb).select('id', { count: 'exact', head: true }))
    ).then(results => {
      const c = {}
      results.forEach((r, i) => {
        c[TABLES[i][0]] = r.status === 'fulfilled' ? (r.value.count ?? '—') : '—'
      })
      setCounts(c)
    })
  }, [])

  const changePassword = async () => {
    setPwdMsg('')
    if (!newPwd) { setPwdMsg(t('set_pwd_req')); return }
    if (newPwd.length < 6) { setPwdMsg(t('set_pwd_short')); return }
    if (newPwd !== confirmPwd) { setPwdMsg('รหัสผ่านไม่ตรงกัน'); return }

    setPwdLoading(true)
    try {
      const hash = await hashPassword(newPwd)
      const { error } = await supabase
        .from('users')
        .update({ password_hash: hash })
        .eq('id', user.id)

      if (error) throw new Error(error.message)
      setPwdMsg(t('set_pwd_ok'))
      setNewPwd('')
      setConfirmPwd('')
    } catch (e) {
      setPwdMsg(e.message)
    }
    setPwdLoading(false)
  }

  const isOk = pwdMsg.includes('✓') || pwdMsg.toLowerCase().includes('success') || pwdMsg.includes('สำเร็จ')

  const saveTg = async () => {
    await saveTelegramSettingsDB(tg)
    setTgMsg('บันทึกแล้ว ✓')
    setTimeout(() => setTgMsg(''), 3000)
  }

  const handleTestTg = async () => {
    await saveTelegramSettingsDB(tg)   // save current state first before testing
    setTgTesting(true); setTgMsg('')
    try {
      const r = await testTelegram()
      setTgMsg(r.ok ? '✓ ส่งข้อความทดสอบสำเร็จ' : `ผิดพลาด: ${r.description || r.error || 'unknown'}`)
    } catch (e) {
      setTgMsg(`ผิดพลาด: ${e.message}`)
    }
    setTgTesting(false)
  }

  const loadTgContacts = async () => {
    setTgContactLoading(true); setTgMsg('')
    try {
      const r = await fetchTelegramContacts(tg.bot_token)
      if (!r.ok) {
        setTgMsg(`ผิดพลาด: ${r.error || 'ไม่สามารถดึงรายชื่อจาก Telegram ได้'}`)
      } else {
        setTgContacts(r.contacts || [])
        setTgMsg((r.contacts || []).length
          ? `พบรายชื่อจาก Telegram ${r.contacts.length} รายการ`
          : 'ยังไม่พบรายชื่อ ให้ผู้ใช้เปิดแชตกับบอทแล้วกด Start หรือส่งข้อความก่อน')
      }
    } catch (e) {
      setTgMsg(`ผิดพลาด: ${e.message}`)
    }
    setTgContactLoading(false)
  }

  const addTgContact = (role, contact) => {
    const key = role === 'supervisor' ? 'supervisors' : 'technicians'
    setTg(p => {
      const current = p[key] || []
      if (current.some(item => item.chat_id === contact.chat_id)) return p
      return { ...p, [key]: [...current, { name: contact.name, chat_id: contact.chat_id }] }
    })
    setTgMsg(`เพิ่ม ${contact.name} แล้ว กดบันทึกเพื่อใช้งาน`)
  }

  const tgIsOk = tgMsg.startsWith('✓') || tgMsg.includes('สำเร็จ') || tgMsg.includes('บันทึกแล้ว') || tgMsg.includes('พบรายชื่อ') || tgMsg.includes('เพิ่ม ')

  return (
    <div className="space-y-6 max-w-2xl">

      {/* DB Info */}
      <SectionCard icon={Database} title={t('set_db_title')}>
        <div className="space-y-0 -mx-6 -mb-6">
          {[
            ['รหัสโปรเจกต์', <code key="pid" style={{background:'var(--bg-thead)',padding:'2px 8px',borderRadius:6,fontSize:11,fontFamily:'monospace'}}>fyulqejkzuhwppstezko</code>],
            ['ภูมิภาค',   'ap-northeast-1 (Tokyo)'],
            ['ฐานข้อมูล', <span key="db" style={{color:'#10b981',fontWeight:600}}>PostgreSQL ✓</span>],
            ['ระบบล็อกอิน', <span key="auth" style={{color:'#10b981',fontWeight:600}}>ล็อกอินกำหนดเอง ✓</span>],
          ].map(([k, v], i, arr) => (
            <div key={k} className="flex items-center justify-between px-6 py-3 text-sm"
              style={{borderBottom: i < arr.length-1 ? '1px solid var(--border-subtle)' : 'none'}}>
              <span style={{color:'var(--text-500)'}}>{k}</span>
              <span style={{color:'var(--text-900)'}}>{v}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Table record counts */}
      <SectionCard icon={Database} title={t('set_tables')}>
        <div className="space-y-0 -mx-6 -mb-6">
          {TABLES.map(([table, label], i) => (
            <div key={table} className="flex items-center justify-between px-6 py-2.5 text-sm"
              style={{borderBottom: i < TABLES.length-1 ? '1px solid var(--border-subtle)' : 'none'}}>
              <span style={{color:'var(--text-700)'}}>{label}</span>
              <div className="flex items-center gap-3">
                <code className="text-xs font-mono" style={{color:'var(--text-400)'}}>{table}</code>
                <span className="font-bold w-8 text-right tabular-nums" style={{color:'var(--text-900)'}}>{counts[table] ?? '...'}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Current user info */}
      <SectionCard icon={User} title={t('set_cur_user')}>
        <div className="space-y-0 -mx-6 -mb-6">
          {[
            ['ชื่อผู้ใช้', user?.username],
            ['ชื่อ-นามสกุล', user?.full_name || '—'],
            ['บทบาท', <span key="role" style={{
              padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.06em',
              background:'rgba(99,102,241,0.12)', color:'#818cf8',
              border:'1px solid rgba(99,102,241,0.2)',
            }}>{user?.role}</span>],
            ['User ID', <code key="uid" style={{background:'var(--bg-thead)',padding:'2px 8px',borderRadius:6,fontSize:10,fontFamily:'monospace',color:'var(--text-400)'}}>{user?.id?.slice(0,18)}…</code>],
            ['เวอร์ชันระบบ', <span key="ver" style={{fontWeight:700,color:'var(--text-900)'}}>{APP_VERSION}</span>],
            ['วันที่เผยแพร่', <span key="bdate" style={{color:'var(--text-500)',fontSize:12}}>{APP_BUILD_DATE}</span>],
          ].map(([k, v], i, arr) => (
            <div key={k} className="flex items-center justify-between px-6 py-3 text-sm"
              style={{borderBottom: i < arr.length-1 ? '1px solid var(--border-subtle)' : 'none'}}>
              <span style={{color:'var(--text-500)'}}>{k}</span>
              <span style={{color:'var(--text-900)'}}>{v}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Telegram / QR settings */}
      <SectionCard icon={Send} title="ตั้งค่า Telegram และ QR">
        <div className="space-y-5">

          {/* Bot Token */}
          <div>
            <label className="label">โทเคนบอต</label>
            <input className="input font-mono text-xs" type="password"
              value={tg.bot_token || ''}
              onChange={e => setTg(p => ({ ...p, bot_token: e.target.value }))}
              placeholder="123456789:AAF…" />
          </div>

          <div style={{
            padding: 14, borderRadius: 14, border: '1px solid var(--border)',
            background: 'var(--bg-page)',
          }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-900)' }}>
                  เพิ่มคนจาก Telegram แบบไม่ต้องกรอก User ID
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-500)', marginTop: 4, lineHeight: 1.6 }}>
                  ให้ผู้ใช้เปิดแชตกับบอทแล้วกด Start หรือส่งข้อความหนึ่งครั้ง จากนั้นกดดึงรายชื่อ
                </div>
              </div>
              <button onClick={loadTgContacts} disabled={tgContactLoading} className="btn-outline"
                style={{ padding: '7px 12px', fontSize: 12, flexShrink: 0 }}>
                <RefreshCw size={13} className={tgContactLoading ? 'animate-spin' : ''}/>
                {tgContactLoading ? 'กำลังดึง' : 'ดึงรายชื่อ'}
              </button>
            </div>

            {tgContacts.length > 0 && (
              <div className="space-y-2" style={{ marginTop: 12 }}>
                {tgContacts.map(contact => {
                  const inSupervisor = (tg.supervisors || []).some(s => s.chat_id === contact.chat_id)
                  const inTechnician = (tg.technicians || []).some(t => t.chat_id === contact.chat_id)
                  return (
                    <div key={contact.chat_id} className="flex items-center gap-2"
                      style={{
                        padding: '8px 10px', borderRadius: 10,
                        background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                      }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {contact.name}
                          {contact.username ? <span style={{ color: 'var(--text-400)', fontWeight: 500 }}> @{contact.username}</span> : null}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-400)', fontFamily: 'monospace' }}>
                          {contact.chat_id} · {contact.type}
                        </div>
                      </div>
                      <button onClick={() => addTgContact('supervisor', contact)} disabled={inSupervisor}
                        title="เพิ่มเป็น Supervisor"
                        style={{
                          height: 28, padding: '0 9px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 5,
                          border: '1px solid rgba(99,102,241,0.25)',
                          background: inSupervisor ? 'var(--bg-thead)' : 'rgba(99,102,241,0.1)',
                          color: inSupervisor ? 'var(--text-400)' : '#6366f1',
                          cursor: inSupervisor ? 'default' : 'pointer',
                        }}>
                        <UserPlus size={12}/> หัวหน้างาน
                      </button>
                      <button onClick={() => addTgContact('technician', contact)} disabled={inTechnician}
                        title="เพิ่มเป็น Technician"
                        style={{
                          height: 28, padding: '0 9px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 5,
                          border: '1px solid rgba(16,185,129,0.25)',
                          background: inTechnician ? 'var(--bg-thead)' : 'rgba(16,185,129,0.1)',
                          color: inTechnician ? 'var(--text-400)' : '#10b981',
                          cursor: inTechnician ? 'default' : 'pointer',
                        }}>
                        <UserPlus size={12}/> ช่าง
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Supervisors list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">หัวหน้างาน</label>
              <button onClick={() => setTg(p => ({ ...p, supervisors: [...(p.supervisors||[]), { name: '', chat_id: '' }] }))}
                style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer' }}>
                + เพิ่ม
              </button>
            </div>
            {(tg.supervisors || []).length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-400)', padding: '8px 0' }}>ยังไม่มีหัวหน้างาน — กด + เพิ่ม</div>
            )}
            <div className="space-y-2">
              {(tg.supervisors || []).map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="input text-sm" value={s.name}
                    onChange={e => setTg(p => { const a=[...p.supervisors]; a[i]={...a[i],name:e.target.value}; return {...p,supervisors:a} })}
                    placeholder="ชื่อ" style={{ flex: '0 0 130px' }} />
                  <input className="input font-mono text-xs" value={s.chat_id}
                    onChange={e => setTg(p => { const a=[...p.supervisors]; a[i]={...a[i],chat_id:e.target.value}; return {...p,supervisors:a} })}
                    placeholder="Chat ID เช่น -100…" style={{ flex: 1 }} />
                  <button onClick={() => setTg(p => ({ ...p, supervisors: p.supervisors.filter((_,j)=>j!==i) }))}
                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-400)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Technicians list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">ช่างเทคนิค</label>
              <button onClick={() => setTg(p => ({ ...p, technicians: [...(p.technicians||[]), { name: '', chat_id: '' }] }))}
                style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer' }}>
                + เพิ่ม
              </button>
            </div>
            {(tg.technicians || []).length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-400)', padding: '8px 0' }}>ยังไม่มีช่าง — กด + เพิ่ม</div>
            )}
            <div className="space-y-2">
              {(tg.technicians || []).map((t, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="input text-sm" value={t.name}
                    onChange={e => setTg(p => { const a=[...p.technicians]; a[i]={...a[i],name:e.target.value}; return {...p,technicians:a} })}
                    placeholder="ชื่อช่าง" style={{ flex: '0 0 130px' }} />
                  <input className="input font-mono text-xs" value={t.chat_id}
                    onChange={e => setTg(p => { const a=[...p.technicians]; a[i]={...a[i],chat_id:e.target.value}; return {...p,technicians:a} })}
                    placeholder="Chat ID เช่น -100…" style={{ flex: 1 }} />
                  <button onClick={() => setTg(p => ({ ...p, technicians: p.technicians.filter((_,j)=>j!==i) }))}
                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-400)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* App Base URL */}
          <div>
            <label className="label">URL หลักของแอป <span style={{fontSize:10,color:'var(--text-400)'}}>(สำหรับลิงก์ใน QR และ Telegram)</span></label>
            <input className="input font-mono text-xs"
              value={tg.app_base_url || ''}
              onChange={e => setTg(p => ({ ...p, app_base_url: e.target.value }))}
              placeholder={window.location.origin} />
            <div style={{fontSize:10,color:'var(--text-400)',marginTop:4}}>ถ้าว่างจะใช้ {window.location.origin}</div>
          </div>

          {tgMsg && (
            <div className="text-sm px-4 py-2.5 rounded-xl flex items-center gap-2" style={{
              color: tgIsOk ? '#10b981' : '#ef4444',
              background: tgIsOk ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${tgIsOk ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              {tgIsOk ? <CheckCircle size={13}/> : <AlertCircle size={13}/>}
              {tgMsg}
            </div>
          )}

          <div className="flex gap-3">
            <button className="btn-primary" onClick={saveTg}>
              <Save size={14}/> บันทึก
            </button>
            <button onClick={handleTestTg} disabled={tgTesting} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              cursor: tgTesting ? 'not-allowed' : 'pointer',
              background: 'var(--bg-page)', color: 'var(--text-700)',
              border: '1px solid var(--border)', transition: 'all 150ms',
            }}>
              <Send size={13}/> {tgTesting ? 'กำลังส่ง…' : 'ทดสอบการเชื่อมต่อ'}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Change password */}
      <SectionCard icon={Shield} title={t('set_change_pwd')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('set_pwd_label')}</label>
              <input className="input" type="password" value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)" />
            </div>
            <div>
              <label className="label">ยืนยันรหัสผ่าน</label>
              <input className="input" type="password" value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="พิมพ์รหัสผ่านซ้ำ" />
            </div>
          </div>

          {pwdMsg && (
            <div className="text-sm px-4 py-2.5 rounded-xl" style={{
              color: isOk ? '#10b981' : '#ef4444',
              background: isOk ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${isOk ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>{pwdMsg}</div>
          )}

          <button className="btn-primary" onClick={changePassword} disabled={pwdLoading}>
            <Save size={14}/> {pwdLoading ? t('saving') : t('set_pwd_btn')}
          </button>
        </div>
      </SectionCard>

      {/* PWA Mobile App Card */}
      <SectionCard icon={Smartphone} title="แอปพลิเคชันมือถือ (PWA Mobile App)">
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            ท่านสามารถติดตั้ง <b>TextileOps CMMS</b> เป็นแอปพลิเคชันลงบนหน้าจอมือถือ (Android / iPhone / iPad) เพื่อเปิดใช้งานแบบเต็มหน้าจอ (Full Screen) รวดเร็ว และรองรับการแจ้งเตือนงานซ่อม
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                localStorage.removeItem('pwa_prompt_dismissed')
                window.location.reload()
              }}
              className="btn-primary px-4 py-2 text-xs flex items-center gap-2"
            >
              <Download size={14} />
              <span>แสดงปุ่มติดตั้งแอปบนมือถือ</span>
            </button>
          </div>
        </div>
      </SectionCard>

    </div>
  )
}
