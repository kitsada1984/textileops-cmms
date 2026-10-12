import { Search, X } from 'lucide-react'

export default function SearchInput({ value, onChange, placeholder = 'ค้นหา...', className = 'w-48 sm:w-60' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-400)' }} />
      <input
        className="input pl-9 pr-8 py-2 w-full"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          title="ล้างคำค้นหา"
          aria-label="ล้างคำค้นหา"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
          style={{ color: 'var(--text-400)' }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
