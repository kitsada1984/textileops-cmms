
export function FormFieldInput({ effectiveType, fieldId, val, effectiveOptions, currentOptionExists, effectiveRows, placeholder, handleChange, handlePaste, id, onChange }) {
  return (
    <>
      {effectiveType === 'select'
        ? (
          <select id={fieldId} className="select" value={val} onChange={handleChange}>
            <option value="">—</option>
            {val !== '' && !currentOptionExists && <option value={val}>{val}</option>}
            {effectiveOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )
        : effectiveType === 'textarea'
          ? (
            <textarea
              id={fieldId}
              className="input"
              rows={effectiveRows}
              placeholder={placeholder}
              value={val}
              onChange={handleChange}
              onPaste={handlePaste}
            />
          )
          : effectiveType === 'boolean'
            ? (
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={!!val}
                  onChange={(e) => onChange(id, e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span>{val ? 'Yes' : 'No'}</span>
              </label>
            )
            : (
              <input
                id={fieldId}
                className="input"
                type={effectiveType}
                placeholder={placeholder}
                value={val}
                onChange={(e) => onChange(id, effectiveType === 'number'
                  ? (e.target.value === '' ? '' : +e.target.value)
                  : e.target.value
                )}
                onPaste={effectiveType !== 'number' ? handlePaste : undefined}
              />
            )}
    </>
  )
}
