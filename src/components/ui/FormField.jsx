import { createContext, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { useWebBuilderColumn } from '../../hooks/useWebBuilderMenu'

/* ── Context ─────────────────────────────────────────────────────────────── */
const FormFieldContext = createContext(null)

export function useFormFieldContext() {
  return useContext(FormFieldContext)
}

function normalizeOptions(opts = []) {
  return opts.map(o => (
    typeof o === 'string'
      ? { label: o, value: o }
      : { label: o.label ?? o.value ?? o.id, value: o.value ?? o.label ?? o.id }
  )).filter(o => o.value !== undefined && o.value !== null)
}

/* ── Explicit Compound Variants ─────────────────────────────────────────── */

export function FormFieldLabel({ children, className = '', htmlFor, ...props }) {
  const ctx = useFormFieldContext()
  const targetId = htmlFor || ctx?.fieldId
  return (
    <label className={`label ${className}`} htmlFor={targetId} {...props}>
      {children || ctx?.label}
    </label>
  )
}

export function FormFieldInput({ className = '', id, ...props }) {
  const ctx = useFormFieldContext()
  const targetId = id || ctx?.fieldId
  return <input id={targetId} className={`input ${className}`} {...props} />
}

export function FormFieldSelect({ children, options = [], className = '', id, ...props }) {
  const ctx = useFormFieldContext()
  const targetId = id || ctx?.fieldId
  const norm = normalizeOptions(options)
  return (
    <select id={targetId} className={`select ${className}`} {...props}>
      {children || (
        <>
          <option value="">—</option>
          {norm.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </>
      )}
    </select>
  )
}

export function FormFieldTextarea({ className = '', id, rows = 3, ...props }) {
  const ctx = useFormFieldContext()
  const targetId = id || ctx?.fieldId
  return <textarea id={targetId} className={`input ${className}`} rows={rows} {...props} />
}

export function FormFieldCheckbox({ label, className = '', id, checked, onChange, ...props }) {
  const ctx = useFormFieldContext()
  const targetId = id || ctx?.fieldId
  return (
    <label className={`flex items-center gap-2 text-sm ${className}`} style={{ color: 'var(--text-700)' }}>
      <input
        id={targetId}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 16, height: 16 }}
        {...props}
      />
      <span>{label ?? (checked ? 'ใช่' : 'ไม่ใช่')}</span>
    </label>
  )
}

export function FormFieldHelper({ children, className = '', ...props }) {
  if (!children) return null
  return (
    <span className={`text-[11px] text-slate-400 mt-1 block ${className}`} {...props}>
      {children}
    </span>
  )
}

export function FormFieldError({ children, className = '', ...props }) {
  if (!children) return null
  return (
    <span className={`text-[11px] text-rose-500 font-medium mt-1 block ${className}`} {...props}>
      {children}
    </span>
  )
}

/* ── Main FormField (Backward-Compatible + Compound Enabled) ─────────────── */

export default function FormField({
  label,
  id,
  type = 'text',
  opts,
  rows,
  span,
  form,
  setForm,
  useBuilder = true,
  onChange,
  placeholder,
  className = '',
  children,
  ...props
}) {
  let pathname = ''
  try {
    const loc = useLocation()
    pathname = loc?.pathname || ''
  } catch {
    pathname = ''
  }

  const wbCol = useBuilder && pathname ? useWebBuilderColumn(pathname, id) : null
  const val = form ? form[id] ?? '' : undefined
  const set = (v) => onChange ? onChange(v) : setForm ? setForm(p => ({ ...p, [id]: v })) : undefined
  const fieldId = id ? `ff-${String(pathname || '').replace(/\W+/g, '')}-${id}` : undefined

  const effectiveType = wbCol?.type || (opts ? 'select' : rows ? 'textarea' : type)
  const effectiveOptions = effectiveType === 'select'
    ? normalizeOptions((wbCol?.options?.length ? wbCol.options : opts) || [])
    : []
  const effectiveRows = Number(wbCol?.height || rows || 2)
  const effectiveLabel = wbCol?.label
    ? `${wbCol.label}${wbCol.required ? ' *' : ''}`
    : label
  const currentOptionExists = effectiveOptions.some(o => String(o.value) === String(val))

  const contextValue = { fieldId, label: effectiveLabel, id, value: val, onChange: set }

  return (
    <FormFieldContext.Provider value={contextValue}>
      <div className={`${span ? `col-span-${span}` : ''} ${className}`} {...props}>
        {children ? (
          children
        ) : (
          <>
            {effectiveLabel && <label className="label" htmlFor={fieldId}>{effectiveLabel}</label>}
            {effectiveType === 'select'
              ? <select id={fieldId} className="select" value={val ?? ''} onChange={e => set(e.target.value)}>
                  <option value="">—</option>
                  {val !== '' && val !== undefined && !currentOptionExists && <option value={val}>{val}</option>}
                  {effectiveOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              : effectiveType === 'textarea'
                ? <textarea id={fieldId} className="input" rows={effectiveRows} placeholder={placeholder} value={val ?? ''} onChange={e => set(e.target.value)} />
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
                  : <input id={fieldId} className="input" type={effectiveType} placeholder={placeholder} value={val ?? ''}
                      onChange={e => set(effectiveType === 'number'
                        ? (e.target.value === '' ? '' : +e.target.value)
                        : e.target.value
                      )} />
            }
          </>
        )}
      </div>
    </FormFieldContext.Provider>
  )
}

FormField.Label = FormFieldLabel
FormField.Input = FormFieldInput
FormField.Select = FormFieldSelect
FormField.Textarea = FormFieldTextarea
FormField.Checkbox = FormFieldCheckbox
FormField.Helper = FormFieldHelper
FormField.Error = FormFieldError
