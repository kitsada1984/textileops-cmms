import { ArrowDownLeft, ArrowUpRight, RotateCcw, Cpu, ExternalLink } from 'lucide-react'
import ImageThumbnail from '../../components/ui/ImageThumbnail'
import { getSignedStockDelta } from '../../utils/inventory'

// Cell value + cell renderers moved verbatim from StockMovement renderCellContent
// (pure logic + presentational branches only — no state changes).

export function resolveStockCellValue(row, col, { getStockPartImageUrl, getStockCategory, getMovementMC, getStockTxnDate }) {
  return col.field === 'ImageUrl' || col.field === 'ImagePreview'
    ? getStockPartImageUrl(row)
    : col.field === 'Category'
      ? getStockCategory(row)
      : col.field === 'MC'
        ? getMovementMC(row)
        : col.field === 'created_date'
          ? getStockTxnDate(row)
          : row[col.field]
}

export function renderStockMCButton(val, setSelectedMachineForHistory) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setSelectedMachineForHistory(String(val))
      }}
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors shadow-xs group"
      title={`คลิกเพื่อดูประวัติอะไหล่ของเครื่อง ${val}`}
    >
      <Cpu size={12} className="text-blue-500 group-hover:scale-110 transition-transform" />
      <span>{String(val)}</span>
    </button>
  )
}

export function renderStockTxnTypeCell(val) {
  const isRec = val === 'RECEIVE'
  const isAdj = val === 'ADJUST'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
      isRec
        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
        : isAdj
          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
    }`}>
      {isRec ? <ArrowDownLeft size={11} /> : isAdj ? <RotateCcw size={11} /> : <ArrowUpRight size={11} />}
      <span>{val === 'RECEIVE' ? 'รับเข้า' : val === 'ISSUE' ? 'เบิกจ่าย' : 'ปรับสต๊อก'}</span>
    </span>
  )
}

export function renderStockQtyChangeCell(val, row) {
  const delta = getSignedStockDelta(row.TXN_Type, val)
  return (
    <span className={`font-mono font-black text-xs ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      {delta > 0 ? `+${Number(val).toLocaleString()}` : `-${Number(val).toLocaleString()}`}
    </span>
  )
}

export function renderStockImageUrlCell(val, onStop) {
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

export function renderStockImagePreviewCell(val, row, { setPreviewImageModal, onStop }) {
  const imgUrl = String(val)
  return (
    <div className="flex items-center gap-1" onClick={onStop}>
      <ImageThumbnail
        url={imgUrl}
        alt={`${row.Part_Code} - ${row.Part_Name_EN || ''}`}
        onClick={() => setPreviewImageModal({ url: imgUrl, title: `${row.Part_Code} - ${row.Part_Name_EN || ''}` })}
      />
    </div>
  )
}
