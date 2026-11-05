import { FileText, History, Pencil, QrCode, Tag, Trash2 } from 'lucide-react'

export function CylinderCardActions({ c, canEdit, canDelete, onPdf, onQr, onHistory, onPrintTag, onPrintMachineTag, onEdit, onDelete }) {
  return (
    <>
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
    </>
  )
}
