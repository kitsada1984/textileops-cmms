import { useState, useRef, useEffect } from 'react'
import {
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  Filter,
  Search,
  CalendarDays,
  Hash,
} from 'lucide-react'
import { EMPTY_FILTER_SORT, getActiveFilterCount, isFilterValueActive, optionLabel, optionValue } from '../../utils/filterSort'

export const INIT_FS = EMPTY_FILTER_SORT
const MOBILE_QUERY = '(max-width: 640px)'

function cloneFilterSort(next = INIT_FS) {
  const sort = next?.sort || INIT_FS.sort
  const filters = next?.filters || {}
  return {
    sort: { key: sort.key || '', dir: sort.dir || 'asc' },
    filters: Object.fromEntries(
      Object.entries(filters).map(([key, val]) => [
        key,
        Array.isArray(val) ? [...val] : val && typeof val === 'object' ? { ...val } : val,
      ])
    ),
  }
}

export default function FilterSortPanel({ cols = [], value = INIT_FS, onChange }) {
  const [open, setOpen] = useState(false)
  const [draftValue, setDraftValue] = useState(() => cloneFilterSort(value))
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(MOBILE_QUERY).matches
      : false
  )
  const ref = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia(MOBILE_QUERY)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    if (!open) return
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) cancelChanges()
    }
    document.addEventListener('pointerdown', h)
    return () => document.removeEventListener('pointerdown', h)
  }, [open, value])

  useEffect(() => {
    if (!open) setDraftValue(cloneFilterSort(value))
  }, [open, value])

  useEffect(() => {
    if (!open || !isMobile) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, isMobile])

  const activeValue = open ? draftValue : value
  const sort = activeValue?.sort ?? { key: '', dir: 'asc' }
  const filters = activeValue?.filters ?? {}
  const sortable = cols.filter(c => c.sortable)
  const filterable = cols.filter(c => c.filter)
  const filterActive = getActiveFilterCount(filters)
  const total = filterActive + (sort.key ? 1 : 0)

  const openPanel = () => {
    setDraftValue(cloneFilterSort(value))
    setOpen(true)
  }
  const cancelChanges = () => {
    setDraftValue(cloneFilterSort(value))
    setOpen(false)
  }
  const commitChanges = () => {
    onChange?.(cloneFilterSort(draftValue))
    setOpen(false)
  }
  const updateDraft = (partial) => setDraftValue(prev => ({ ...prev, ...partial }))
  const setSort = (key) => updateDraft({ sort: { key, dir: sort.dir || 'asc' } })
  const setDir = (dir) => updateDraft({ sort: { ...sort, dir } })
  const setFilter = (key, val) => updateDraft({ filters: { ...filters, [key]: val } })
  const clearAll = () => setDraftValue(cloneFilterSort(INIT_FS))

  const toggleOpt = (key, opt, multi = true) => {
    if (!multi) {
      const cur = filters[key]
      setFilter(key, String(cur) === String(opt) ? '' : opt)
      return
    }
    const cur = Array.isArray(filters[key]) ? filters[key] : []
    setFilter(key, cur.map(String).includes(String(opt)) ? cur.filter(v => String(v) !== String(opt)) : [...cur, opt])
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => open ? cancelChanges() : openPanel()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 14px',
          borderRadius: 14,
          fontSize: 13,
          fontWeight: 800,
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 160ms ease',
          border: `1px solid ${total > 0 ? 'var(--accent)' : open ? 'var(--accent)' : 'var(--border)'}`,
          background: total > 0
            ? 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(79,70,229,0.06) 100%)'
            : open ? 'var(--bg-thead)' : 'var(--bg-card)',
          color: total > 0 ? 'var(--accent)' : 'var(--text-700)',
          boxShadow: total > 0
            ? '0 4px 14px rgba(37,99,235,0.15)'
            : '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <SlidersHorizontal size={15} />
        <span>ตัวกรอง</span>
        {total > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 20,
            height: 20,
            borderRadius: 999,
            padding: '0 6px',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 900,
            lineHeight: 1,
          }}>
            {total}
          </span>
        )}
      </button>

      {open && isMobile && (
        <div
          aria-hidden="true"
          onClick={cancelChanges}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 998,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {open && (
        <div style={panelStyle(isMobile)}>
          <div style={{ height: 3, background: 'var(--accent-gradient)' }} />

          <div style={{
            padding: isMobile ? '14px 14px 12px' : '16px 18px 14px',
            flex: isMobile ? '1 1 auto' : undefined,
            minHeight: isMobile ? 0 : undefined,
            overflowY: isMobile ? 'auto' : 'visible',
            WebkitOverflowScrolling: 'touch',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-900)' }}>ตัวกรองข้อมูล</div>
                <div style={{ fontSize: 11, color: 'var(--text-500)', marginTop: 2 }}>
                  ค้นให้แคบลงด้วยคอลัมน์ วันที่ ตัวเลข สถานะ และข้อความ
                </div>
              </div>
              {isMobile && (
                <button type="button" onClick={cancelChanges} style={closeStyle()}>
                  <X size={14} />
                </button>
              )}
            </div>

            {sortable.length > 0 && (
              <section style={sectionStyle()}>
                <SectionTitle icon={<ArrowUp size={13} />} label="เรียงลำดับ" tone="var(--accent)" />
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto auto', gap: 8 }}>
                  <select
                    className="select"
                    value={sort.key}
                    onChange={e => setSort(e.target.value)}
                    style={{ minHeight: 40, fontSize: 12, fontWeight: 700 }}
                  >
                    <option value="">เลือกคอลัมน์</option>
                    {sortable.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                  <DirButton active={Boolean(sort.key && sort.dir === 'asc')} disabled={!sort.key} onClick={() => setDir('asc')} icon={<ArrowUp size={13} />} label="น้อย" />
                  <DirButton active={Boolean(sort.key && sort.dir === 'desc')} disabled={!sort.key} onClick={() => setDir('desc')} icon={<ArrowDown size={13} />} label="มาก" />
                </div>
              </section>
            )}

            <section style={{ ...sectionStyle(), marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <SectionTitle icon={<Filter size={13} />} label="เงื่อนไขกรองข้อมูล" tone="var(--accent)" />
                {filterActive > 0 && (
                  <button type="button" onClick={clearAll} style={miniClearStyle()}>
                    <X size={10} /> ล้างเงื่อนไข
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filterable.map(col => {
                  const val = filters[col.key]
                  return (
                    <FilterField
                      key={col.key}
                      col={col}
                      value={val}
                      onChange={nextVal => setFilter(col.key, nextVal)}
                      onToggle={toggleOpt}
                    />
                  )
                })}
              </div>
            </section>
          </div>

          <div style={footerStyle(isMobile)}>
            <button type="button" onClick={cancelChanges} style={secondaryActionStyle(isMobile)}>
              ยกเลิก
            </button>
            <button type="button" onClick={commitChanges} style={confirmActionStyle(isMobile)}>
              {total > 0 ? `นำไปใช้ (${total})` : 'นำไปใช้'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionTitle({ icon, label, tone = 'var(--text-600)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, fontWeight: 900, color: tone, letterSpacing: '0.04em' }}>
      {icon}
      <span>{label}</span>
    </div>
  )
}

function FilterField({ col, value, onChange, onToggle }) {
  const type = col?.filter?.type || 'text'
  const active = isFilterValueActive(value)
  const options = col.filter?.opts || col.filter?.options || []

  return (
    <div style={{
      border: '1px solid var(--border-subtle)',
      background: 'var(--bg-card)',
      borderRadius: 14,
      padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <FieldIcon type={type} active={active} />
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-900)' }}>{col.label}</span>
        </div>
        {active && (
          <button
            type="button"
            onClick={() => onChange(type === 'select' ? [] : type === 'number' || type === 'date' ? {} : '')}
            style={miniClearStyle()}
          >
            <X size={10} /> ล้าง
          </button>
        )}
      </div>

      {type === 'select' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            className="input text-xs"
            type="text"
            value={Array.isArray(value) ? value.join(', ') : (value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`พิมพ์ค้นหา หรือคลิกเลือก ${col.label}...`}
            style={{ fontSize: 12, minHeight: 36 }}
          />

          {options.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 110, overflowY: 'auto' }}>
              {options.map(opt => {
                const ov = optionValue(opt)
                const ol = optionLabel(opt)
                const selected = Array.isArray(value) ? value.includes(ov) : String(value || '') === String(ov)
                return (
                  <button
                    key={String(ov)}
                    type="button"
                    onClick={() => onToggle(col.key, ov, col.filter.multi !== false)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 9px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                      background: selected ? 'var(--accent-gradient)' : 'var(--bg-thead)',
                      color: selected ? '#fff' : 'var(--text-700)',
                      boxShadow: selected ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
                    }}
                  >
                    {selected && <Check size={10} strokeWidth={3} />}
                    {ol}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {type === 'number' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input className="input" type="number" value={value?.min || ''} onChange={e => onChange({ ...(value || {}), min: e.target.value })} placeholder="ต่ำสุด" />
          <input className="input" type="number" value={value?.max || ''} onChange={e => onChange({ ...(value || {}), max: e.target.value })} placeholder="สูงสุด" />
        </div>
      )}

      {type === 'date' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input className="input" type="date" value={value?.from || ''} onChange={e => onChange({ ...(value || {}), from: e.target.value })} />
          <input className="input" type="date" value={value?.to || ''} onChange={e => onChange({ ...(value || {}), to: e.target.value })} />
        </div>
      )}

      {!['select', 'number', 'date'].includes(type) && (
        <input
          className="input"
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={`ค้นหา ${col.label}...`}
        />
      )}
    </div>
  )
}

function FieldIcon({ type, active }) {
  const color = active ? 'var(--accent)' : 'var(--text-400)'
  const icon = type === 'select'
    ? <Filter size={12} />
    : type === 'number'
      ? <Hash size={12} />
      : type === 'date'
        ? <CalendarDays size={12} />
        : <Search size={12} />
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 22,
      height: 22,
      borderRadius: 8,
      color,
      background: active ? 'rgba(37,99,235,0.12)' : 'var(--bg-thead)',
    }}>
      {icon}
    </span>
  )
}

function panelStyle(isMobile) {
  if (isMobile) {
    return {
      position: 'fixed',
      left: 12,
      right: 12,
      bottom: 12,
      maxHeight: 'calc(100dvh - 24px)',
      zIndex: 999,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 22,
      boxShadow: '0 26px 72px rgba(0,0,0,0.34), 0 8px 22px rgba(15,23,42,0.12)',
      overflow: 'hidden',
    }
  }
  return {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    left: 0,
    width: 'min(440px, calc(100vw - 32px))',
    zIndex: 250,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 22,
    boxShadow: '0 26px 72px rgba(15,23,42,0.18), 0 8px 22px rgba(15,23,42,0.08)',
    overflow: 'hidden',
  }
}

function closeStyle() {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 12,
    flexShrink: 0,
    cursor: 'pointer',
    color: 'var(--text-600)',
    background: 'var(--bg-thead)',
    border: '1px solid var(--border)',
  }
}

function DirButton({ active, disabled, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '9px 11px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 900,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'var(--accent-gradient)' : 'var(--bg-card)',
        color: disabled ? 'var(--text-300)' : active ? '#fff' : 'var(--text-700)',
        boxShadow: active ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
      }}
    >
      {icon}{label}
    </button>
  )
}

function sectionStyle() {
  return {
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-thead)',
    borderRadius: 18,
    padding: 12,
  }
}

function footerStyle(isMobile) {
  return {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'minmax(110px, 0.55fr) 1fr',
    gap: 8,
    padding: isMobile ? '12px 14px 14px' : '12px 18px 16px',
    borderTop: '1px solid var(--border-subtle)',
    background: 'var(--bg-card)',
    flexShrink: 0,
  }
}

function footerButtonBase(isMobile) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: isMobile ? 42 : 40,
    padding: isMobile ? '10px 12px' : '9px 14px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 900,
    lineHeight: 1.25,
    textAlign: 'center',
    whiteSpace: 'normal',
    cursor: 'pointer',
  }
}

function secondaryActionStyle(isMobile) {
  return {
    ...footerButtonBase(isMobile),
    color: 'var(--text-700)',
    background: 'var(--bg-thead)',
    border: '1px solid var(--border)',
  }
}

function confirmActionStyle(isMobile) {
  return {
    ...footerButtonBase(isMobile),
    color: '#fff',
    background: 'var(--accent-gradient)',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
  }
}

function miniClearStyle() {
  return {
    marginLeft: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 800,
    cursor: 'pointer',
    color: '#e11d48',
    background: '#fff1f2',
    border: '1px solid #fecdd3',
  }
}
