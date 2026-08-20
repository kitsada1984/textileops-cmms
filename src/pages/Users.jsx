import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import useEntity from '../hooks/useEntity'
import { UserAPI } from '../api/entities'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import FilterSortPanel, { INIT_FS } from '../components/ui/FilterSortPanel'
import { useT } from '../contexts/LanguageContext'
import { hashPassword, PERM_ACTIONS } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { applyFilterSort, buildFilterSortColumns } from '../utils/filterSort'

const ROLES = ['admin', 'supervisor', 'technician', 'viewer', 'user']
const USER_STATUS = ['active', 'inactive']

const MENU_GROUPS = [
  {
    label: 'ภาพรวม',
    items: [
      { key: 'dashboard',  label: 'แดชบอร์ด' },
    ],
  },
  {
    label: 'การดำเนินงาน',
    items: [
      { key: 'machines',   label: 'เครื่องจักร' },
      { key: 'cylinders',  label: 'กระบอก' },
      { key: 'workorders', label: 'ใบสั่งงาน' },
      { key: 'pm',         label: 'แผน PM' },
      { key: 'designbom',  label: 'Design/BOM' },
    ],
  },
  {
    label: 'คลังสินค้า',
    items: [
      { key: 'spareparts', label: 'อะไหล่' },
      { key: 'purchasing', label: 'จัดซื้อ' },
      { key: 'stock',      label: 'เคลื่อนไหวสต็อก' },
    ],
  },
  {
    label: 'วิเคราะห์',
    items: [
      { key: 'reports',    label: 'รายงาน' },
      { key: 'logs',       label: 'บันทึก' },
    ],
  },
  {
    label: 'ระบบ',
    items: [
      { key: 'users',      label: 'ผู้ใช้งาน' },
      { key: 'webbuilder', label: 'ตั้งค่าเว็บ' },
      { key: 'settings',   label: 'การตั้งค่า' },
    ],
  },
]

const ALL_MENU_KEYS = MENU_GROUPS.flatMap(g => g.items.map(i => i.key))

const ACTION_META = {
  view:   { label: 'ดูรายการ', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  icon: '👁' },
  add:    { label: 'เพิ่ม',    color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  icon: '＋' },
  edit:   { label: 'แก้ไข',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  icon: '✏' },
  delete: { label: 'ลบ',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   icon: '✕' },
}

const ROLE_META = {
  admin:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)' },
  supervisor: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)' },
  technician: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  viewer:     { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)' },
  user:       { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)' },
}

function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.user
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      color: m.color, background: m.bg, border: `1px solid ${m.border}`,
    }}>{role}</span>
  )
}

function StatusDot({ status }) {
  const on = status === 'active'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
      color: on ? '#10b981' : '#ef4444' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%',
        background: on ? '#10b981' : '#ef4444',
        boxShadow: on ? '0 0 6px rgba(16,185,129,0.5)' : 'none' }}/>
      {on ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
    </span>
  )
}

/* ─── Checkbox cell ─────────────────────────────────────────────────── */
function Chk({ checked, onChange, color, indeterminate }) {
  return (
    <button onClick={onChange} style={{
      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
      border: `2px solid ${checked || indeterminate ? color : 'var(--border)'}`,
      background: checked ? color : indeterminate ? `${color}30` : 'transparent',
      cursor: 'pointer', transition: 'all 120ms',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {checked && (
        <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
          <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {!checked && indeterminate && (
        <svg width="8" height="2" viewBox="0 0 8 2" fill="none">
          <path d="M0 1H8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  )
}

/* ─── Permission Grid ────────────────────────────────────────────────── */
function PermGrid({ permissions, onChange }) {
  const has = (menuKey, action) => {
    const arr = permissions[menuKey]
    return Array.isArray(arr) && arr.includes(action)
  }

  const toggle = (menuKey, action) => {
    const arr = permissions[menuKey] || []
    const next = arr.includes(action) ? arr.filter(a => a !== action) : [...arr, action]
    onChange({ ...permissions, [menuKey]: next })
  }

  const toggleRow = (menuKey) => {
    const arr = permissions[menuKey] || []
    const next = arr.length === PERM_ACTIONS.length ? [] : [...PERM_ACTIONS]
    onChange({ ...permissions, [menuKey]: next })
  }

  const toggleCol = (action) => {
    const allHave = ALL_MENU_KEYS.every(k => has(k, action))
    const next = { ...permissions }
    ALL_MENU_KEYS.forEach(k => {
      const arr = next[k] || []
      if (allHave) next[k] = arr.filter(a => a !== action)
      else if (!arr.includes(action)) next[k] = [...arr, action]
    })
    onChange(next)
  }

  const colAllChecked = (action) => ALL_MENU_KEYS.every(k => has(k, action))
  const colSomeChecked = (action) => ALL_MENU_KEYS.some(k => has(k, action))
  const rowAllChecked = (menuKey) => {
    const arr = permissions[menuKey] || []
    return arr.length === PERM_ACTIONS.length
  }
  const rowSomeChecked = (menuKey) => {
    const arr = permissions[menuKey] || []
    return arr.length > 0 && arr.length < PERM_ACTIONS.length
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
        <thead>
          <tr style={{ background: 'var(--bg-thead)' }}>
            {/* Menu col */}
            <th style={{
              padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-400)',
              borderBottom: '1px solid var(--border)', width: 160,
            }}>เมนู</th>

            {/* Action cols */}
            {PERM_ACTIONS.map(action => {
              const m = ACTION_META[action]
              const allC = colAllChecked(action)
              const someC = colSomeChecked(action)
              return (
                <th key={action} style={{
                  padding: '10px 0', textAlign: 'center', width: 90,
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: m.color,
                    }}>{m.label}</span>
                    <Chk
                      checked={allC}
                      indeterminate={!allC && someC}
                      onChange={() => toggleCol(action)}
                      color={m.color}
                    />
                  </div>
                </th>
              )
            })}

            {/* All col */}
            <th style={{
              padding: '10px 0', textAlign: 'center', width: 64,
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-400)',
                textTransform: 'uppercase', letterSpacing: '0.06em' }}>ทั้งหมด</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {MENU_GROUPS.map((group, gi) => (
            <>
              {/* Group label row */}
              <tr key={`g-${gi}`} style={{ background: 'var(--bg-page)' }}>
                <td colSpan={6} style={{
                  padding: '5px 14px',
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: 'var(--text-400)',
                  borderTop: gi > 0 ? '1px solid var(--border)' : 'none',
                }}>
                  {group.label}
                </td>
              </tr>

              {group.items.map((item, ii) => {
                const allR  = rowAllChecked(item.key)
                const someR = rowSomeChecked(item.key)
                return (
                  <tr key={item.key} style={{
                    background: ii % 2 === 0 ? 'var(--bg-card)' : 'transparent',
                    borderTop: '1px solid var(--border-subtle)',
                    transition: 'background 120ms',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-thead)'}
                    onMouseLeave={e => e.currentTarget.style.background = ii % 2 === 0 ? 'var(--bg-card)' : 'transparent'}
                  >
                    {/* Menu name */}
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: 'var(--text-700)',
                        display: 'flex', alignItems: 'center', gap: 7,
                      }}>
                        {/* Access dot */}
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                          background: (permissions[item.key]?.length || 0) > 0 ? '#10b981' : 'var(--border)',
                          boxShadow: (permissions[item.key]?.length || 0) > 0 ? '0 0 5px rgba(16,185,129,0.5)' : 'none',
                          transition: 'all 200ms',
                        }}/>
                        {item.label}
                      </span>
                    </td>

                    {/* Action checkboxes */}
                    {PERM_ACTIONS.map(action => (
                      <td key={action} style={{ padding: '9px 0', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <Chk
                            checked={has(item.key, action)}
                            onChange={() => toggle(item.key, action)}
                            color={ACTION_META[action].color}
                          />
                        </div>
                      </td>
                    ))}

                    {/* Row all toggle */}
                    <td style={{ padding: '9px 0', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Chk
                          checked={allR}
                          indeterminate={someR}
                          onChange={() => toggleRow(item.key)}
                          color="#6366f1"
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', padding: '0 2px' }}>
        {PERM_ACTIONS.map(a => {
          const m = ACTION_META[a]
          return (
            <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: m.color, flexShrink: 0 }}/>
              <span style={{ color: m.color, fontWeight: 700 }}>{m.label}</span>
            </div>
          )
        })}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: '#6366f1', flexShrink: 0 }}/>
          <span style={{ color: '#6366f1', fontWeight: 700 }}>ทั้งหมดในแถว</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-400)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', flexShrink: 0 }}/>
          <span>= เมนูนี้เข้าถึงได้</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Bulk preset ─────────────────────────────────────────────────────── */
function buildPreset(actions) {
  const out = {}
  ALL_MENU_KEYS.forEach(k => { out[k] = [...actions] })
  return out
}

/* ─── Main page ───────────────────────────────────────────────────────── */
const EMPTY = { username: '', password: '', full_name: '', role: 'user', status: 'active', permissions: {} }

export default function UsersPage() {
  const { t } = useT()
  const toast  = useToast()
  const { data, loading, load, save, remove } = useEntity(UserAPI)
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState(false)
  const [tab,    setTab]    = useState('info')
  const [form,   setForm]   = useState(EMPTY)
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterSort, setFilterSort] = useState(INIT_FS)

  const filtered = data.filter(u =>
    [u.username, u.full_name, u.role].some(v =>
      String(v || '').toLowerCase().includes(search.toLowerCase())
    )
  )
  const FS_COLS = useMemo(() => buildFilterSortColumns([
    { field: 'username', label: 'ชื่อผู้ใช้', type: 'text' },
    { field: 'full_name', label: 'ชื่อ-นามสกุล', type: 'text' },
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
    if (!isEdit && !form.password) return toast.error('ต้องระบุรหัสผ่านสำหรับผู้ใช้ใหม่')
    setSaving(true)
    try {
      const payload = { ...form, username: form.username.trim().toLowerCase() }
      if (form.password) payload.password_hash = await hashPassword(form.password)
      delete payload.password
      await save(payload)
      toast.success(isEdit ? 'แก้ไขผู้ใช้สำเร็จ' : 'เพิ่มผู้ใช้สำเร็จ', form.username)
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
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาผู้ใช้..." />
        <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
        <button className="btn-outline ml-auto" onClick={load}><RefreshCw size={14}/> {t('refresh')}</button>
        <button className="btn-primary" onClick={openNew}><Plus size={15}/> เพิ่มผู้ใช้</button>
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
                        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                        background: 'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(99,102,241,0.06))',
                        border: '1px solid rgba(99,102,241,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800, color: '#818cf8',
                      }}>
                        {(u.username || '?')[0].toUpperCase()}
                      </div>
                      <span className="font-semibold">{u.username || '—'}</span>
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
                      <button className="btn-outline py-1 px-2 text-xs" onClick={() => openEdit(u)}><Pencil size={12}/></button>
                      <button className="btn-danger py-1 px-2 text-xs" onClick={() => del(u._id || u.id)}><Trash2 size={12}/></button>
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
                รหัสผ่าน {form._id || form.id ? <span style={{fontWeight:400,opacity:.6}}>(เว้นว่างถ้าไม่เปลี่ยน)</span> : '*'}
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
    </div>
  )
}
