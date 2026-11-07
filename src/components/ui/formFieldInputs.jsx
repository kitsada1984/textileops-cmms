import { normalizeFieldOptions } from './formFieldUtils'

// Type-specific inputs + config resolution moved verbatim from FormField
// (presentational branches only — hooks stay in the caller).

export function resolveFieldConfig({ wbCol, opts, rows, type, form, id, pathname }) {
  const val = form ? form[id] ?? '' : undefined
  const fieldId = id ? `ff-${String(pathname || '').replace(/\W+/g, '')}-${id}` : undefined

  const effectiveType = wbCol?.type || (opts ? 'select' : rows ? 'textarea' : type)
  const effectiveOptions = effectiveType === 'select'
    ? normalizeFieldOptions((wbCol?.options?.length ? wbCol.options : opts) || [])
    : []
  const effectiveRows = Number(wbCol?.height || rows || 2)
  const effectiveLabel = wbCol?.label
    ? `${wbCol.label}${wbCol.required ? ' *' : ''}`
    : undefined
  const currentOptionExists = effectiveOptions.some(o => String(o.value) === String(val))
  return { val, fieldId, effectiveType, effectiveOptions, effectiveRows, effectiveLabel, currentOptionExists }
}

export function FormSelectInput({ fieldId, val, set, effectiveOptions, currentOptionExists, disabled }) {
  return (
    <select id={fieldId} className="select" value={val ?? ''} onChange={e => set(e.target.value)} disabled={disabled}>
      <option value="">—</option>
      {val !== '' && val !== undefined && !currentOptionExists && <option value={val}>{val}</option>}
      {effectiveOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function FormTextAreaInput({ fieldId, effectiveRows, placeholder, val, set, disabled }) {
  return <textarea id={fieldId} className="input" rows={effectiveRows} placeholder={placeholder} value={val ?? ''} onChange={e => set(e.target.value)} disabled={disabled} />
}

export function FormBooleanInput({ val, set }) {
  return (
    <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-700)' }}>
      <input
        type="checkbox"
        checked={!!val}
        onChange={e => set(e.target.checked)}
        style={{ width: 16, height: 16 }}
      />
      <span>{val ? 'ใช่' : 'ไม่ใช่'}</span>
    </label>
  )
}

export function FormTextInput({ fieldId, effectiveType, placeholder, val, set, disabled }) {
  return (
    <input id={fieldId} className="input" type={effectiveType} placeholder={placeholder} value={val ?? ''} disabled={disabled}
      onChange={e => set(effectiveType === 'number'
        ? (e.target.value === '' ? '' : +e.target.value)
        : e.target.value
      )} />
  )
}
