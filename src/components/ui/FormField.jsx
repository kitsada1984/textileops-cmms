import { createContext, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { useWebBuilderColumn } from '../../hooks/useWebBuilderMenu'
import { normalizeFieldOptions } from './formFieldUtils'
import { resolveFieldConfig, FormSelectInput, FormTextAreaInput, FormBooleanInput, FormTextInput } from './formFieldInputs'

/* ── Context ─────────────────────────────────────────────────────────────── */
const FormFieldContext = createContext(null)

export function useFormFieldContext() {
  return useContext(FormFieldContext)
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
  const norm = normalizeFieldOptions(options)
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
  const set = (v) => onChange ? onChange(v) : setForm ? setForm(p => ({ ...p, [id]: v })) : undefined
  const { val, fieldId, effectiveType, effectiveOptions, effectiveRows, effectiveLabel: wbLabel, currentOptionExists } = resolveFieldConfig({ wbCol, opts, rows, type, form, id, pathname })
  const effectiveLabel = wbLabel !== undefined ? wbLabel : label

  const contextValue = { fieldId, label: effectiveLabel, id, value: val, onChange: set }
  const [parent] = useAutoAnimate()

  return (
    <FormFieldContext.Provider value={contextValue}>
      <div ref={parent} className={`${span ? `col-span-${span}` : ''} ${className}`} {...props}>
        {children ? (
          children
        ) : (
          <>
            {effectiveLabel && <label className="label" htmlFor={fieldId}>{effectiveLabel}</label>}
            {effectiveType === 'select'
              ? <FormSelectInput fieldId={fieldId} val={val} set={set} effectiveOptions={effectiveOptions} currentOptionExists={currentOptionExists} />
              : effectiveType === 'textarea'
                ? <FormTextAreaInput fieldId={fieldId} effectiveRows={effectiveRows} placeholder={placeholder} val={val} set={set} />
                : effectiveType === 'boolean'
                  ? <FormBooleanInput val={val} set={set} />
                  : <FormTextInput fieldId={fieldId} effectiveType={effectiveType} placeholder={placeholder} val={val} set={set} />
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
