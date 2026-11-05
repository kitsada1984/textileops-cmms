import { AlertCircle, CheckCircle, Pencil, Plus, RefreshCw, Save, Send, Shield, Trash2, UserPlus } from 'lucide-react'
import { SectionCard } from './settingsComponents.jsx'

export function TelegramSettings({ tg, setTg, tgContacts, tgContactLoading, tgTesting, tgIsOk, tgMsg, loadTgContacts, addTgContact, saveTg, handleTestTg, setAdminModalMode, setAdminModalIndex, setAdminFormName, setAdminFormChatId, setAdminAuthPwd, setAdminAuthError, setAdminStep, setAdminModalOpen }) {
  return (
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
                      <button onClick={() => addTgContact('needle_keeper', contact)} disabled={(tg.needle_keepers || []).some(k => k.chat_id === contact.chat_id)}
                        title="เพิ่มเป็น ผู้ดูแลเข็ม"
                        style={{
                          height: 28, padding: '0 9px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 5,
                          border: '1px solid rgba(14,165,233,0.25)',
                          background: (tg.needle_keepers || []).some(k => k.chat_id === contact.chat_id) ? 'var(--bg-thead)' : 'rgba(14,165,233,0.1)',
                          color: (tg.needle_keepers || []).some(k => k.chat_id === contact.chat_id) ? 'var(--text-400)' : '#0ea5e9',
                          cursor: (tg.needle_keepers || []).some(k => k.chat_id === contact.chat_id) ? 'default' : 'pointer',
                        }}>
                        <UserPlus size={12}/> ผู้ดูแลเข็ม
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

          {/* System Admins & Error Alert Recipients */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <Shield size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <label className="label mb-0 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                    🛡️ ผู้ดูแลระบบ / ผู้รับแจ้งเตือนข้อผิดพลาดระบบ (System Admins)
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  จะได้รับแจ้งเตือนทาง Telegram ทันทีเมื่อระบบตรวจพบ Error หรือหน้าจอขัดข้อง (ต้องยืนยันรหัสผ่าน 2 ครั้งเพื่อแก้ไข)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAdminModalMode('add')
                  setAdminModalIndex(-1)
                  setAdminFormName('')
                  setAdminFormChatId('')
                  setAdminAuthPwd('')
                  setAdminAuthError('')
                  setAdminStep(1)
                  setAdminModalOpen(true)
                }}
                className="btn-primary text-xs px-2.5 py-1 flex items-center gap-1"
                style={{ fontSize: 11 }}
              >
                <UserPlus size={12} />
                <span>+ เพิ่มแอดมิน</span>
              </button>
            </div>

            {(!tg.admins || tg.admins.length === 0) ? (
              <div className="text-xs text-slate-400 py-1">
                ยังไม่ได้ระบุแอดมินเฉพาะ — ระบบจะส่งแจ้งเตือน Error ไปยังรายชื่อหัวหน้างานเป็นค่าเริ่มต้น
              </div>
            ) : (
              <div className="space-y-2">
                {tg.admins.map((adm, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-indigo-100 dark:border-indigo-900/40 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                          <span>{adm.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                            ADMIN
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                          Chat ID: {adm.chat_id}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminModalMode('edit')
                          setAdminModalIndex(i)
                          setAdminFormName(adm.name)
                          setAdminFormChatId(adm.chat_id)
                          setAdminAuthPwd('')
                          setAdminAuthError('')
                          setAdminStep(1)
                          setAdminModalOpen(true)
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                        title="แก้ไขข้อมูลแอดมิน (ต้องยืนยันรหัสผ่าน 2 ครั้ง)"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminModalMode('delete')
                          setAdminModalIndex(i)
                          setAdminFormName(adm.name)
                          setAdminFormChatId(adm.chat_id)
                          setAdminAuthPwd('')
                          setAdminAuthError('')
                          setAdminStep(1)
                          setAdminModalOpen(true)
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                        title="ลบแอดมิน (ต้องยืนยันรหัสผ่าน 2 ครั้ง)"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
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

          {/* Needle Keepers list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="label mb-0 text-sky-700 dark:text-sky-400 font-bold">🪡 ผู้ดูแลเข็ม / สโตร์เข็ม (Needle Keepers)</label>
                <div style={{ fontSize: 11, color: 'var(--text-400)' }}>
                  จะได้รับแจ้งเตือนทันทีเมื่อมีช่างสแกนขอเบิกเข็ม Spare
                </div>
              </div>
              <button onClick={() => setTg(p => ({ ...p, needle_keepers: [...(p.needle_keepers||[]), { name: '', chat_id: '' }] }))}
                style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer' }}>
                + เพิ่มผู้ดูแลเข็ม
              </button>
            </div>
            {(!tg.needle_keepers || tg.needle_keepers.length === 0) && (
              <div style={{ fontSize: 12, color: 'var(--text-400)', padding: '8px 0' }}>ยังไม่ได้ระบุ — ระบบจะส่งแจ้งเตือนหาหัวหน้างานเป็นค่าเริ่มต้น</div>
            )}
            <div className="space-y-2">
              {(tg.needle_keepers || []).map((k, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="input text-sm" value={k.name}
                    onChange={e => setTg(p => { const a=[...(p.needle_keepers||[])]; a[i]={...a[i],name:e.target.value}; return {...p,needle_keepers:a} })}
                    placeholder="ชื่อผู้ดูแลเข็ม" style={{ flex: '0 0 130px' }} />
                  <input className="input font-mono text-xs" value={k.chat_id}
                    onChange={e => setTg(p => { const a=[...(p.needle_keepers||[])]; a[i]={...a[i],chat_id:e.target.value}; return {...p,needle_keepers:a} })}
                    placeholder="Chat ID เช่น 6981... หรือ -100..." style={{ flex: 1 }} />
                  <button onClick={() => setTg(p => ({ ...p, needle_keepers: (p.needle_keepers||[]).filter((_,j)=>j!==i) }))}
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
  )
}
