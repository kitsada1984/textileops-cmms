import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'

export function normalizeDropdownOption(opt) {
  if (opt === null || opt === undefined) return { value: '', label: '' }
  if (typeof opt === 'string' || typeof opt === 'number') {
    return { value: String(opt), label: String(opt) }
  }
  const val = String(opt.value ?? opt.id ?? opt.code ?? opt.label ?? '')
  const lbl = String(opt.label ?? opt.name ?? opt.value ?? val)
  return { value: val, label: lbl }
}

export default function SearchableDropdown({
  value = '',
  onChange,
  options = [],
  placeholder = 'เลือก หรือพิมพ์เอง...',
  label,
  required = false,
  className = '',
  disabled = false,
  inputClassName = '',
  emptyText = 'ไม่พบรายการที่ตรงกับคำค้นหา',
  allowCustom = true,
  helperText,
  icon: Icon,
  id,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Normalize options
  const normalizedOptions = (options || []).map(normalizeDropdownOption).filter((o) => o.value)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  // Filter options based on typed search query when open
  const query = String(open ? search : '').trim().toLowerCase()
  const filteredOptions = query
    ? normalizedOptions.filter(
        (opt) => opt.value.toLowerCase().includes(query) || opt.label.toLowerCase().includes(query)
      )
    : normalizedOptions

  const handleSelect = (optValue) => {
    onChange?.(optValue)
    setSearch('')
    setOpen(false)
  }

  const handleInputChange = (e) => {
    const nextVal = e.target.value
    setSearch(nextVal)
    onChange?.(nextVal)
    if (!open) setOpen(true)
  }

  const handleInputFocus = () => {
    setSearch(value || '')
    setOpen(true)
  }

  const clearValue = (e) => {
    e.stopPropagation()
    onChange?.('')
    setSearch('')
    inputRef.current?.focus()
  }

  const toggleDropdown = (e) => {
    e.stopPropagation()
    if (disabled) return
    if (!open) {
      setSearch(value || '')
      setOpen(true)
      inputRef.current?.focus()
    } else {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`} data-testid="searchable-dropdown">
      {label && (
        <label className="label flex items-center justify-between mb-1">
          <span className="flex items-center gap-1">
            {Icon && <Icon size={12} className="text-blue-500" />}
            <span>{label}</span>
            {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
          </span>
          <span className="text-[10px] text-slate-400 font-normal">ดรอปดาวน์ / พิมพ์เอง</span>
        </label>
      )}

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          disabled={disabled}
          value={open ? search : (value || '')}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={`input text-xs w-full pr-14 ${inputClassName}`}
          autoComplete="off"
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              onClick={clearValue}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="ล้างค่า"
              aria-label="ล้างค่า"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={toggleDropdown}
            className="p-1 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
            title="เปิดดรอปดาวน์ลิสต์"
            aria-label="เปิดดรอปดาวน์ลิสต์"
          >
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${open ? 'rotate-180 text-blue-500' : ''}`}
            />
          </button>
        </div>
      </div>

      {helperText && (
        <span className="text-[10px] text-slate-400 mt-0.5 block">{helperText}</span>
      )}

      {/* Floating Dropdown List Menu */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 py-1 text-xs divide-y divide-slate-100 dark:divide-slate-800/60"
          role="listbox"
        >
          {allowCustom && search.trim() && !normalizedOptions.some((o) => o.value.toLowerCase() === search.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => handleSelect(search.trim())}
              className="w-full text-left px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-medium flex items-center justify-between"
            >
              <span>✨ ใช้ค่าที่พิมพ์: <strong className="font-mono">{search.trim()}</strong></span>
              <span className="text-[10px] text-blue-500 uppercase tracking-wider bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">ค่าใหม่</span>
            </button>
          )}

          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected = String(value || '').toLowerCase() === opt.value.toLowerCase()

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 font-bold text-blue-600 dark:text-blue-400'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{opt.label}</span>
                    {opt.label !== opt.value && (
                      <span className="text-[10px] font-mono text-slate-400 truncate">{opt.value}</span>
                    )}
                  </div>
                  {isSelected && <Check size={14} className="text-blue-500 shrink-0" />}
                </button>
              )
            })
          ) : (
            <div className="px-3 py-3 text-center text-slate-400 text-[11px] italic">
              {emptyText}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
