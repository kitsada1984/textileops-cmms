import { useLocation } from 'react-router-dom'
import { useWebBuilderColumn } from '../../hooks/useWebBuilderMenu'

function normalizeOptions(opts = []) {
  return opts.map(o => (
    typeof o === 'string'
      ? { label: o, value: o }
      : { label: o.label ?? o.value ?? o.id, value: o.value ?? o.label ?? o.id }
  )).filter(o => o.value !== undefined && o.value !== null)
}

export default function FormField({ label, id, type = 'text', opts, rows, span, form, setForm, useBuilder = true, onChange, placeholder }) {
  const { pathname } = useLocation()
  const wbCol = useBuilder ? useWebBuilderColumn(pathname, id) : null
  const val = form[id] ?? ''
  const set = (v) => onChange ? onChange(v) : setForm(p => ({ ...p, [id]: v }))
  const fieldId = `ff-${String(pathname || '').replace(/\W+/g, '')}-${id}`

  const effectiveType = wbCol?.type || (opts ? 'select' : rows ? 'textarea' : type)
  const effectiveOptions = effectiveType === 'select'
    ? normalizeOptions((wbCol?.options?.length ? wbCol.options : opts) || [])
    : []
  const effectiveRows = Number(wbCol?.height || rows || 2)
  const effectiveLabel = wbCol?.label
    ? `${wbCol.label}${wbCol.required ? ' *' : ''}`
    : label
  const currentOptionExists = effectiveOptions.some(o => String(o.value) === String(val))

  return (
    <div className={span ? `col-span-${span}` : ''}>
      <label className="label" htmlFor={fieldId}>{effectiveLabel}</label>
      {effectiveType === 'select'
        ? <select id={fieldId} className="select" value={val} onChange={e => set(e.target.value)}>
            <option value="">—</option>
            {val !== '' && !currentOptionExists && <option value={val}>{val}</option>}
            {effectiveOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        : effectiveType === 'textarea'
          ? <textarea id={fieldId} className="input" rows={effectiveRows} placeholder={placeholder} value={val} onChange={e => set(e.target.value)} />
          : effectiveType === 'boolean'
            ? <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-700)' }}>
                <input
                  type="checkbox"
                  checked={!!val}
                  onChange={e => set(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span>{val ? 'ใช่' : 'ไม่ใช่'}</span>
              </label>
            : <input id={fieldId} className="input" type={effectiveType} placeholder={placeholder} value={val}
                onChange={e => set(effectiveType === 'number'
                  ? (e.target.value === '' ? '' : +e.target.value)
                  : e.target.value
                )} />
      }
    </div>
  )
}
