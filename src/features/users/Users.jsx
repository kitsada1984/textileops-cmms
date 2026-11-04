import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import useEntity from '../../hooks/useEntity'
import { UserAPI } from '../../api/entities'
import Modal from '../../components/ui/Modal'
import SearchInput from '../../components/ui/SearchInput'
import FilterSortPanel, { INIT_FS } from '../../components/ui/FilterSortPanel'
import { useT } from '../../contexts/LanguageContext'
import { hashPassword, PERM_ACTIONS, parsePermissions, useAuth } from '../../contexts/AuthContext'
import usePagePerms from '../../hooks/usePagePerms'
import { useToast } from '../../components/ui/Toast'
import { applyFilterSort, buildFilterSortColumns } from '../../utils/filterSort'

import {
  ROLES,
  USER_STATUS,
  ALL_MENU_KEYS,
  ACTION_META,
  LineIcon,
  RoleBadge,
  StatusDot,
  PermGrid,
  buildPreset,
  buildTechnicianPreset,
  buildSupervisorPreset,
  EMPTY,
} from './userParts.jsx'


export default function UsersPage() {
  const { t } = useT()
  const toast  = useToast()
  const { user: currentUser, refreshUser } = useAuth()
  const { canAdd, canEdit, canDelete } = usePagePerms('users')
  const { data, loading, load, save, remove } = useEntity(UserAPI)
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState(false)
  const [tab,    setTab]    = useState('info')
  const [form,   setForm]   = useState(EMPTY)
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterSort, setFilterSort] = useState(INIT_FS)

  // D1 คืน permissions เป็น JSON string — parse ให้เป็น object ก่อนแสดงผล/แก้ไข
  const users = useMemo(
    () => data.map(u => ({ ...u, permissions: parsePermissions(u.permissions) })),
    [data]
  )

  const filtered = users.filter(u =>
    [u.username, u.full_name, u.role, u.line_display_name, u.line_user_id].some(v =>
      String(v || '').toLowerCase().includes(search.toLowerCase())
    )
  )
  const FS_COLS = useMemo(() => buildFilterSortColumns([
    { field: 'username', label: 'ชื่อผู้ใช้', type: 'text' },
    { field: 'full_name', label: 'ชื่อ-นามสกุล', type: 'text' },
    { field: 'line_display_name', label: 'ชื่อ LINE', type: 'text' },
    { field: 'role', label: 'บทบาท', type: 'select' },
    { field: 'status', label: 'สถานะ', type: 'select' },
  ], {
    selectOptions: { role: ROLES, status: USER_STATUS },
  }), [])
  const displayRows = useMemo(() => applyFilterSort(filtered, FS_COLS, filterSort), [filtered, FS_COLS, filterSort])

  const openNew = () => {
    setForm(EMPTY); setTab('info'); setShowPw(false); setModal(true)
  }
  const openEdit = (u) => {
    setForm({ ...u, password: '' }); setTab('info'); setShowPw(false); setModal(true)
  }

  const submit = async () => {
    if (!form.username) return toast.error('ต้องระบุชื่อผู้ใช้')
    const isEdit = !!(form._id || form.id)
    if (!isEdit && !form.password && !form.line_user_id) return toast.error('ต้องระบุรหัสผ่านสำหรับผู้ใช้ใหม่')
    setSaving(true)
    try {
      const payload = {
        ...form,
        username: form.username.trim().toLowerCase(),
        line_user_id: form.line_user_id || null,
        line_display_name: form.line_display_name || null,
        line_picture_url: form.line_picture_url || null,
      }
      if (form.password) payload.password_hash = await hashPassword(form.password)
      delete payload.password
      // Guard: permissions must always be a plain object — if it ever arrives
      // as a JSON string, spreading/stringifying garbage keys breaks the save.
      payload.permissions = parsePermissions(payload.permissions)
      await save(payload)
      toast.success(isEdit ? 'แก้ไขผู้ใช้สำเร็จ' : 'เพิ่มผู้ใช้สำเร็จ', form.username)
      if (currentUser?.id === (form._id || form.id) || currentUser?.username === form.username) {
        if (typeof refreshUser === 'function') refreshUser()
      }
      setModal(false)
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('ยืนยันการลบผู้ใช้นี้?')) return
    try { await remove(id); toast.success('ลบผู้ใช้สำเร็จ') }
    catch (e) { toast.error('เกิดข้อผิดพลาด', e.message) }
  }

  const isAdmin = form.role === 'admin'

  /* summary chips for table */
  const permSummary = (u) => {
    if (u.role === 'admin') return null
    const perms = u.permissions || {}
    const count = ALL_MENU_KEYS.filter(k => (perms[k]?.length || 0) > 0).length
    return count
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex-1 w-full">
          <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาผู้ใช้..." className="w-full" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-nowrap w-full sm:w-auto">
          <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
          <button className="btn-outline min-h-[44px] text-xs px-3 py-2 flex items-center gap-1.5 flex-shrink-0 cursor-pointer" onClick={load}><RefreshCw size={14}/> {t('refresh')}</button>
          {canAdd && <button className="btn-primary min-h-[44px] text-xs px-3.5 py-2 hidden sm:flex items-center gap-1.5 flex-shrink-0 cursor-pointer" onClick={openNew}><Plus size={15}/> เพิ่มผู้ใช้</button>}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>ชื่อผู้ใช้</th>
              <th>ชื่อ-นามสกุล</th>
              <th>บทบาท</th>
              <th>สถานะ</th>
              <th>สิทธิ์ที่ได้รับ</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-8" style={{color:'var(--text-400)'}}>{t('loading')}</td></tr>}
            {!loading && displayRows.map((u, i) => {
              const cnt = permSummary(u)
              return (
                <tr key={u._id || u.id || i}>
                  <td style={{color:'var(--text-400)',fontSize:12}}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                        background: u.line_picture_url ? 'transparent' : 'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(99,102,241,0.06))',
                        border: u.line_picture_url ? '1px solid rgba(6,199,85,0.4)' : '1px solid rgba(99,102,241,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800, color: '#818cf8',
                        overflow: 'hidden',
                      }}>
                        {u.line_picture_url ? (
                          <img src={u.line_picture_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          (u.username || '?')[0].toUpperCase()
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="font-semibold">{u.username || '—'}</span>
                          {u.line_user_id && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              padding: '1px 6px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                              color: '#06C755', background: 'rgba(6,199,85,0.12)', border: '1px solid rgba(6,199,85,0.3)',
                            }}>
                              <LineIcon size={10} /> LINE
                            </span>
                          )}
                        </div>
                        {u.line_display_name && (
                          <span style={{ fontSize: 10.5, color: 'var(--text-400)' }}>
                            LINE: {u.line_display_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{color:'var(--text-600)'}}>{u.full_name || '—'}</td>
                  <td><RoleBadge role={u.role || 'user'} /></td>
                  <td><StatusDot status={u.status || 'active'} /></td>
                  <td>
                    {u.role === 'admin' ? (
                      <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 11,
                        display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={12}/> ทุกเมนู (ผู้ดูแลระบบ)
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {cnt > 0 ? (
                          <>
                            {/* Show action chips that have at least 1 menu */}
                            {PERM_ACTIONS.map(action => {
                              const m = ACTION_META[action]
                              const hasAny = ALL_MENU_KEYS.some(k =>
                                Array.isArray(u.permissions?.[k]) && u.permissions[k].includes(action)
                              )
                              if (!hasAny) return null
                              return (
                                <span key={action} style={{
                                  fontSize: 10, padding: '2px 7px', borderRadius: 10,
                                  fontWeight: 700, color: m.color, background: m.bg,
                                  border: `1px solid ${m.border}`,
                                }}>{m.label}</span>
                              )
                            })}
                            <span style={{ fontSize: 10, color: 'var(--text-400)', fontWeight: 500,
                              alignSelf: 'center' }}>({cnt}/{ALL_MENU_KEYS.length} เมนู)</span>
                          </>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-400)' }}>ไม่มีสิทธิ์</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {canEdit && <button className="btn-outline min-h-[44px] min-w-[44px] p-2 rounded-xl text-xs flex items-center justify-center cursor-pointer" onClick={() => openEdit(u)} title="แก้ไข"><Pencil size={14}/></button>}
                      {canDelete && <button className="btn-danger min-h-[44px] min-w-[44px] p-2 rounded-xl text-xs flex items-center justify-center cursor-pointer" onClick={() => del(u._id || u.id)} title="ลบ"><Trash2 size={14}/></button>}
                      {!canEdit && !canDelete && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {!loading && !displayRows.length && (
              <tr><td colSpan={7} className="text-center py-8" style={{color:'var(--text-400)'}}>{t('no_data')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal ── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form._id || form.id ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
        size="xl"
        footer={<>
          <button className="btn-outline" onClick={() => setModal(false)}>{t('cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </>}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {[
            { id: 'info',  label: 'ข้อมูลผู้ใช้' },
            { id: 'perms', label: 'สิทธิ์เข้าใช้งาน' },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '9px 20px', fontSize: 12, fontWeight: 700, letterSpacing: '0.01em',
              cursor: 'pointer', border: 'none', background: 'transparent',
              color: tab === id ? '#6366f1' : 'var(--text-400)',
              borderBottom: tab === id ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: -1, transition: 'all 150ms',
            }}>{label}</button>
          ))}
        </div>

        {/* ── Tab: Info ── */}
        {tab === 'info' && (
          <div className="space-y-4">
            {/* LINE Account Link Info Box if user has LINE ID */}
            {form.line_user_id && (
              <div className="p-3.5 rounded-xl bg-[#06C755]/10 border border-[#06C755]/30 flex items-center gap-3.5">
                <div style={{
                  width: 44, height: 44, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
                  border: '2px solid #06C755', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#06C755', color: '#fff',
                }}>
                  {form.line_picture_url ? (
                    <img src={form.line_picture_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <LineIcon size={24} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {form.line_display_name || form.username}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#06C755] text-white">
                      บัญชี LINE เชื่อมต่อแล้ว
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    User ID: {form.line_user_id}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">ชื่อผู้ใช้ *</label>
                <input className="input" value={form.username}
                  placeholder="เช่น john, tech01"
                  onChange={e => setForm(p => ({...p, username: e.target.value}))} />
              </div>
              <div>
                <label className="label">ชื่อ-นามสกุล</label>
                <input className="input" value={form.full_name || ''}
                  placeholder="ชื่อจริง"
                  onChange={e => setForm(p => ({...p, full_name: e.target.value}))} />
              </div>

              <div>
                <label className="label">
                  รหัสผ่าน {form.line_user_id ? (
                    <span style={{fontWeight:400,opacity:.8,color:'#06C755'}}>(ผู้ใช้ LINE สแกน QR เข้าได้ทันที เว้นว่างได้)</span>
                  ) : form._id || form.id ? (
                    <span style={{fontWeight:400,opacity:.6}}>(เว้นว่างถ้าไม่เปลี่ยน)</span>
                  ) : '*'}
                </label>
              <div style={{ position: 'relative' }}>
                <input className="input"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  placeholder={form._id || form.id ? '••••••••' : 'ระบุรหัสผ่าน'}
                  style={{ paddingRight: 40 }}
                  onChange={e => setForm(p => ({...p, password: e.target.value}))}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-400)', padding: 2,
                }}>
                  {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>

            <div>
              <label className="label">บทบาท</label>
              <select className="select" value={form.role || 'user'}
                onChange={e => setForm(p => ({...p, role: e.target.value}))}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="label">สถานะ</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {USER_STATUS.map(s => {
                  const active = form.status === s
                  return (
                    <button key={s} onClick={() => setForm(p => ({...p, status: s}))} style={{
                      flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', transition: 'all 150ms', border: '1.5px solid',
                      borderColor: active ? (s==='active' ? '#10b981' : '#ef4444') : 'var(--border)',
                      background: active ? (s==='active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') : 'transparent',
                      color: active ? (s==='active' ? '#10b981' : '#ef4444') : 'var(--text-400)',
                    }}>
                      {s === 'active' ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                    </button>
                  )
                })}
              </div>
            </div>

            {isAdmin && (
              <div className="sm:col-span-2" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
              }}>
                <ShieldCheck size={16} style={{color:'#f59e0b', flexShrink:0}}/>
                <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                  บทบาทผู้ดูแลระบบมีสิทธิ์เข้าถึงทุกเมนูและทุกการกระทำโดยอัตโนมัติ
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* ── Tab: Permissions ── */}
        {tab === 'perms' && (
          <div>
            {isAdmin ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 12, padding: '32px 0', textAlign: 'center' }}>
                <ShieldCheck size={40} style={{color:'#f59e0b'}}/>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-900)' }}>Admin — เข้าถึงได้ทุกเมนู</div>
                <div style={{ fontSize: 12, color: 'var(--text-400)', maxWidth: 320 }}>
                  ผู้ใช้บทบาทผู้ดูแลระบบมีสิทธิ์ทุกอย่างโดยอัตโนมัติ ไม่ต้องตั้งค่าเพิ่มเติม
                </div>
              </div>
            ) : (
              <>
                {/* Preset buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-400)', alignSelf: 'center', fontWeight: 600 }}>Preset:</span>
                  <button className="btn-outline" style={{fontSize:11,padding:'4px 12px'}}
                    onClick={() => setForm(p => ({...p, permissions: buildPreset(['view','add','edit','delete'])}))}>
                    เต็มสิทธิ์ทุกเมนู
                  </button>
                  <button className="btn-outline" style={{fontSize:11,padding:'4px 12px'}}
                    onClick={() => setForm(p => ({...p, permissions: buildTechnicianPreset()}))}>
                    ช่างซ่อมบำรุง
                  </button>
                  <button className="btn-outline" style={{fontSize:11,padding:'4px 12px'}}
                    onClick={() => setForm(p => ({...p, permissions: buildSupervisorPreset()}))}>
                    หัวหน้างาน
                  </button>
                  <button className="btn-outline" style={{fontSize:11,padding:'4px 12px'}}
                    onClick={() => setForm(p => ({...p, permissions: buildPreset(['view'])}))}>
                    ดูอย่างเดียวทุกเมนู
                  </button>
                  <button className="btn-outline" style={{fontSize:11,padding:'4px 12px'}}
                    onClick={() => setForm(p => ({...p, permissions: {}}))}>
                    ล้างทั้งหมด
                  </button>
                </div>

                <PermGrid
                  permissions={form.permissions || {}}
                  onChange={perms => setForm(p => ({...p, permissions: perms}))}
                />
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Mobile Floating Action Button (FAB) for Adding User */}
      {canAdd && (
        <button
          type="button"
          onClick={openNew}
          className="btn-fab"
          title="เพิ่มผู้ใช้"
          aria-label="เพิ่มผู้ใช้"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
