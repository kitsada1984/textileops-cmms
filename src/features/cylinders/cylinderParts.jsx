import { FileText, History, Pencil, QrCode, Tag, Trash2 } from 'lucide-react'
import { useWebBuilderColumn } from '../../hooks/useWebBuilderMenu'
import StatusBadge from '../../components/ui/StatusBadge'
import ImageThumbnail from '../../components/ui/ImageThumbnail'
import { getCylinderImageUrl } from '../../utils/cylinderImage'

export const CYLINDER_IMAGE_FOLDER = 'รูปกระบอก'
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column of 'cylinders'|column cylinders\.([^ ]+) does not exist/i
export const MACHINE_REF_OPTIONS = ['In-use-GMK1', 'Spare-GMK1', 'In-use-GMK3', 'Spare-GMK3']

export const EMPTY = {
  ITEM: '',
  Location: '',
  Standard: '',
  NewMC: '',
  Serial_OLD: '',
  Serial_NOW: '',
  Status_Now: 'STANDARD',
  Feeder: '',
  Manufacturer: '',
  Type: '',
  Diameter: '',
  Gauge: '',
  Needle: '',
  Machine_Ref: '',
  Comment: '',
  ImageUrl: '',
}

export function omitKeys(item, keys = []) {
  const clone = { ...item }
  keys.forEach((key) => {
    delete clone[key]
  })
  return clone
}

export function getMissingCylinderColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || match?.[2] || null
}

// Friendly label for the abbreviated Type column in the summary card.
const TYPE_LABEL = { S: 'Single', D: 'Double', 'Jac.': 'Jacquard' }
const formatCylType = (v) => TYPE_LABEL[v] || v || '—'

// Helper to verify whether a cylinder is mounted on an operable/running machine (In-use)
export function isCylinderInUse(cylinder) {
  const ref = String(cylinder?.Machine_Ref || '').trim().toLowerCase()
  return ref.startsWith('in-use')
}

// Build a Type/Diameter/Gauge grouping with counts, sorted numerically.
// By default onlyInUse=true so it accurately reflects runnable machines in operation.
export function buildCylinderSummary(rows = [], { onlyInUse = true } = {}) {
  const targetRows = onlyInUse ? rows.filter(isCylinderInUse) : rows
  const groups = new Map()
  for (const c of targetRows) {
    const type = c?.Type || ''
    const dia = c?.Diameter || ''
    const gauge = c?.Gauge || ''
    const key = `${type}|${dia}|${gauge}`
    const entry = groups.get(key) || { Type: type, Diameter: dia, Gauge: gauge, count: 0 }
    entry.count += 1
    groups.set(key, entry)
  }
  const toNum = (v) => {
    const n = Number(String(v).replace(/[^\d.]/g, ''))
    return Number.isFinite(n) ? n : 0
  }
  return [...groups.values()].sort((a, b) =>
    String(a.Type).localeCompare(String(b.Type)) ||
    toNum(a.Diameter) - toNum(b.Diameter) ||
    toNum(a.Gauge) - toNum(b.Gauge)
  )
}

export function buildMachineRefSummary(rows = []) {
  return MACHINE_REF_OPTIONS.map((value) => ({
    value,
    count: rows.filter((row) => String(row.Machine_Ref || '').trim() === value).length,
  }))
}

export function filterCylindersByMachineRef(cylinders = [], selectedRef = '') {
  if (!selectedRef) return cylinders
  return cylinders.filter((c) => String(c.Machine_Ref || '').trim() === selectedRef)
}

export function filterCylindersByGroup(cylinders = [], selectedGroupKey = '', { onlyInUse = true } = {}) {
  if (!selectedGroupKey) return cylinders
  return cylinders.filter((c) => {
    if (onlyInUse && !isCylinderInUse(c)) return false
    const type = c?.Type || ''
    const dia = c?.Diameter || ''
    const gauge = c?.Gauge || ''
    const key = `${type}|${dia}|${gauge}`
    return key === selectedGroupKey
  })
}

export const CYL_FIELD_KEYS = {
  ITEM: 'cyl_th_item',
  Location: 'cyl_th_loc',
  Standard: 'cyl_th_standard',
  NewMC: 'cyl_th_newmc',
  Serial_OLD: 'cyl_th_serial_old',
  Serial_NOW: 'cyl_th_serial_now',
  Status_Now: 'cyl_th_status_now',
  Feeder: 'cyl_th_feeder',
  Manufacturer: 'cyl_th_mfr',
  Type: 'cyl_th_type',
  Diameter: 'cyl_th_dia',
  Gauge: 'cyl_th_gauge',
  Needle: 'cyl_th_needle',
  Machine_Ref: 'cyl_th_machine_ref',
  Comment: 'cyl_th_comment',
  updated_at: 'mc_th_updated',
  ImageUrl: 'URL',
  ImagePreview: 'รูป',
}

export const CYLINDER_MULTI_FILTER_KEYS = ['Location', 'Manufacturer', 'Type', 'Diameter', 'Gauge', 'Machine_Ref']
export const CYLINDER_MULTI_FILTER_SET = new Set(CYLINDER_MULTI_FILTER_KEYS)
export const CYLINDER_FILTER_EXCLUDE_SET = new Set(['ITEM', 'Feeder', 'Status_Now', 'Standard', 'Serial_NOW'])

export function cylinderFilterValue(row, key, index) {
  if (key === 'ITEM') return row?.ITEM || index + 1
  return row?.[key]
}

function cylinderFilterLabel(row, key, index) {
  const value = cylinderFilterValue(row, key, index)
  if (key === 'Type') return formatCylType(value)
  return value
}

export function buildCylinderFilterOptions(rows = [], key) {
  const seen = new Map()
  rows.forEach((row, index) => {
    const value = cylinderFilterValue(row, key, index)
    const normalized = String(value ?? '').trim()
    if (!normalized || seen.has(normalized)) return
    seen.set(normalized, { value: normalized, label: cylinderFilterLabel(row, key, index) || normalized })
  })

  return [...seen.values()].sort((a, b) =>
    String(a.label ?? '').localeCompare(String(b.label ?? ''), 'th', {
      numeric: true,
      sensitivity: 'base',
    })
  )
}

export function normalizeOptions(opts = []) {
  return opts.map((o) => (
    typeof o === 'string'
      ? { label: o, value: o }
      : { label: o.label ?? o.value ?? o.id, value: o.value ?? o.label ?? o.id }
  )).filter((o) => o.value !== undefined && o.value !== null)
}

export function FormField({ label, id, type = 'text', opts, form, onChange, placeholder }) {
  const wbCol = useWebBuilderColumn('/cylinders', id)
  const forcedOptions = id === 'Machine_Ref' ? MACHINE_REF_OPTIONS : opts
  const effectiveType = id === 'Machine_Ref' ? 'select' : (wbCol?.type || (forcedOptions ? 'select' : type))
  const effectiveOptions = effectiveType === 'select'
    ? normalizeOptions((id === 'Machine_Ref' ? MACHINE_REF_OPTIONS : (wbCol?.options?.length ? wbCol.options : forcedOptions)) || [])
    : []
  const effectiveRows = Number(wbCol?.height || 2)
  const effectiveLabel = wbCol?.label
    ? `${wbCol.label}${wbCol.required ? ' *' : ''}`
    : label
  const fieldId = `cyl-field-${id}`
  const val = form[id] ?? ''
  const currentOptionExists = effectiveOptions.some((o) => String(o.value) === String(val))
  const handleChange = (e) => onChange(id, e.target.value)

  const handlePaste = (e) => {
    const pasted = e.clipboardData?.getData('text/plain') ?? ''
    if (!pasted) return
    e.preventDefault()
    const el = e.target
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = el.value.slice(0, start) + pasted + el.value.slice(end)
    onChange(id, next)
    requestAnimationFrame(() => {
      el.setSelectionRange(start + pasted.length, start + pasted.length)
    })
  }

  return (
    <div>
      <label className="label" htmlFor={fieldId}>{effectiveLabel}</label>
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
    </div>
  )
}

export function CylinderCard({
  c,
  canEdit,
  canDelete,
  onDetail,
  onPdf,
  onQr,
  onEdit,
  onDelete,
  onPreviewImage,
  onHistory,
  onPrintTag,
  onPrintMachineTag,
}) {
  const imageUrl = getCylinderImageUrl(c)
  const display = (c.Serial_OLD && c.Serial_NOW && c.Serial_OLD === c.Serial_NOW)
    ? 'STANDARD'
    : (c.Serial_NOW || '—')
  const clean = ['STANDARD', 'SCRAP', 'REPAIR', 'RESERVE'].includes(display)
  const isInUse = c.Machine_Ref && String(c.Machine_Ref).startsWith('In-use')

  return (
    <div
      onClick={() => onDetail(c)}
      className="card p-3 border-l-4 border-l-blue-500 border-slate-200 dark:border-slate-800 transition-all active:scale-[0.99] cursor-pointer shadow-xs hover:shadow-md"
    >
      {/* Top Header: Serial_NOW, Machine_Ref, Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-base font-black text-blue-600 dark:text-blue-400 tracking-tight truncate">
            {c.Serial_NOW || '—'}
          </span>
          {c.Location && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold flex-shrink-0">
              {c.Location}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {c.Machine_Ref && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              isInUse
                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
            }`}>
              {c.Machine_Ref}
            </span>
          )}
          {clean ? <StatusBadge value={display} /> : <span className="font-mono text-xs text-slate-500">{display}</span>}
        </div>
      </div>

      {/* Body: Thumbnail & Specs */}
      <div className="flex items-start gap-2.5 my-2">
        {imageUrl && (
          <div className="flex-shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
            <ImageThumbnail
              url={imageUrl}
              alt={c.Serial_NOW || 'กระบอก'}
              size={48}
              onClick={() => onPreviewImage({ url: imageUrl, title: `กระบอก ${c.Serial_NOW || ''}` })}
            />
          </div>
        )}

        <div className="flex-1 min-w-0 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="font-bold">{formatCylType(c.Type)}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500 truncate">{c.Manufacturer || c.Standard || '—'}</span>
          </div>

          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold text-slate-700 dark:text-slate-300">
              {c.Diameter ? `${c.Diameter}"` : '—'} · {c.Gauge ? `${c.Gauge}G` : '—'}
            </span>
            {c.Needle && <span>เข็ม: {c.Needle}</span>}
            {c.Feeder && <span>Feeder: {c.Feeder}</span>}
            {c.NewMC && <span className="text-slate-400">Mc: {c.NewMC}</span>}
          </div>
        </div>
      </div>

      {/* Footer: Serial OLD + Action Buttons */}
      <div
        className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">
          {c.Serial_OLD ? `OLD: ${c.Serial_OLD}` : ''}
        </span>

        <div className="flex items-center gap-1">
          {onPrintMachineTag && (
            <button
              type="button"
              onClick={() => onPrintMachineTag(c)}
              className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 transition-colors border border-emerald-200 dark:border-emerald-900/50"
              title="พิมพ์ Tack (เครื่องปัจจุบัน 20x7cm)"
              aria-label="พิมพ์ Tack"
            >
              <Tag size={14} />
            </button>
          )}
          {onPrintTag && (
            <button
              type="button"
              onClick={() => onPrintTag(c)}
              className="p-1.5 rounded-lg text-amber-600 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 transition-colors border border-amber-200 dark:border-amber-900/50"
              title="พิมพ์ Tack Spare (A4 แนวนอน)"
              aria-label="พิมพ์ Tack Spare"
            >
              <Tag size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onPdf(c)}
            className="p-1.5 rounded-lg text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition-colors border border-rose-200 dark:border-rose-900/50"
            title="พิมพ์ PDF"
          >
            <FileText size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => onQr(c, e)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 transition-colors"
            title="QR Code"
          >
            <QrCode size={14} />
          </button>
          {onHistory && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onHistory(c)
              }}
              className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-200 dark:border-indigo-800/60"
              title="ประวัติการเปลี่ยนกระบอก"
            >
              <History size={14} />
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(c)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 transition-colors"
              title="แก้ไข"
            >
              <Pencil size={14} />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(c._id || c.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 bg-slate-100 dark:bg-slate-800 transition-colors"
              title="ลบ"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
