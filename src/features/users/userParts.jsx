import { PERM_ACTIONS } from '../../contexts/AuthContext'

export const ROLES = ['admin', 'supervisor', 'technician', 'viewer', 'user']
export const USER_STATUS = ['active', 'inactive']

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
      { key: 'needlestock', label: 'Stock เข็ม' },
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

export const ALL_MENU_KEYS = MENU_GROUPS.flatMap(g => g.items.map(i => i.key))

export const ACTION_META = {
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

export function LineIcon({ size = 12, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.038 9.608.391.084.922.258 1.057.592.122.303.079.778.039 1.085l-.171 1.026c-.052.312-.246 1.22.844.665 1.09-.556 5.882-3.468 8.026-5.939C22.617 15.289 24 12.98 24 10.304z" />
    </svg>
  )
}

export function RoleBadge({ role }) {
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

export function StatusDot({ status }) {
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
export function PermGrid({ permissions, onChange }) {
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
export function buildPreset(actions) {
  const out = {}
  ALL_MENU_KEYS.forEach(k => { out[k] = [...actions] })
  return out
}

export function buildTechnicianPreset() {
  const techKeys = ['machines', 'cylinders', 'workorders', 'pm', 'needlestock', 'spareparts', 'stock']
  const out = {}
  techKeys.forEach(k => { out[k] = ['view', 'add', 'edit'] })
  return out
}

export function buildSupervisorPreset() {
  const supervisorKeys = ['dashboard', 'machines', 'cylinders', 'workorders', 'pm', 'designbom', 'needlestock', 'spareparts', 'purchasing', 'stock', 'reports', 'logs']
  const out = {}
  supervisorKeys.forEach(k => { out[k] = ['view', 'add', 'edit', 'delete'] })
  return out
}

/* ─── Main page ───────────────────────────────────────────────────────── */
export const EMPTY = { username: '', password: '', full_name: '', role: 'user', status: 'active', permissions: {} }
