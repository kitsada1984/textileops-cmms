import { ExternalLink } from 'lucide-react'
import StatusBadge from '../../components/ui/StatusBadge'
import ImageThumbnail from '../../components/ui/ImageThumbnail'

// Cell value + cell renderers moved verbatim from SpareParts renderCellContent
// (pure logic + presentational branches only — no state changes).

export function resolveSpareCellValue(row, col, { getSparePartImageUrl, getSparePartName, getSparePartStatus }) {
  return col.field === 'ImageUrl' || col.field === 'ImagePreview'
    ? getSparePartImageUrl(row)
    : col.field === 'Part_Name_EN'
      ? getSparePartName(row)
      : col.field === 'Status'
        ? getSparePartStatus(row)
        : row[col.field]
}

export function countSamePartCode(data, codeStr) {
  return data.filter(
    (p) => String(p?.Part_Code || '').trim().toLowerCase() === codeStr.trim().toLowerCase()
  ).length
}

export function renderSpareCodeCell(val, data) {
  const codeStr = String(val)
  const sameCodeCount = countSamePartCode(data, codeStr)
  return (
    <span className="inline-flex items-center gap-1.5 font-mono">
      <span className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
        {codeStr}
      </span>
      {sameCodeCount > 1 && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
          title={`รหัสนี้มีจัดเก็บใน ${sameCodeCount} คลังสินค้า (สต๊อกแยกกัน)`}
        >
          {sameCodeCount} คลัง
        </span>
      )}
    </span>
  )
}

export function renderSpareLocationCell(val) {
  const locStr = String(val || '').trim()
  const isStore = locStr.toLowerCase() === 'store'
  const isGMK = locStr.toLowerCase().startsWith('gmk')
  return (
    <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1 ${
      isStore
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
        : isGMK
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
    }`}>
      {locStr || '—'}
    </span>
  )
}

export function renderSpareImageUrlCell(val, onStop) {
  return (
    <a
      href={String(val)}
      target="_blank"
      rel="noreferrer"
      onClick={onStop}
      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-mono text-[11px] flex items-center gap-1 hover:underline max-w-[200px] truncate"
    >
      <span className="truncate">{String(val)}</span>
      <ExternalLink size={11} className="flex-shrink-0 opacity-70" />
    </a>
  )
}

export function renderSpareImagePreviewCell(val, row, { setPreviewImageModal, getSparePartName, onStop }) {
  const imgUrl = String(val)
  return (
    <div className="flex items-center gap-1" onClick={onStop}>
      <ImageThumbnail
        url={imgUrl}
        alt={`${row.Part_Code} - ${getSparePartName(row)}`}
        onClick={() => setPreviewImageModal({ url: imgUrl, title: `${row.Part_Code} - ${getSparePartName(row)}` })}
      />
    </div>
  )
}

export function renderSpareStatusCell(val) {
  return <StatusBadge value={val} />
}
