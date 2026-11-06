import { useState } from 'react'
import { ArrowRight, Clock, FilePlus } from 'lucide-react'

export function InterruptionCreateNewCard({
  interruptionJob,
  selectedTechs = [],
  noTechRemaining = false,
  onOpenCreateWorkOrder,
  onStartImmediate,
}) {
  const [targetMc, setTargetMc] = useState('')
  const [taskDetail, setTaskDetail] = useState('')

  const handleCreateAndStart = () => {
    const techSnippet = selectedTechs.length > 0 ? ` [ช่าง: ${selectedTechs.join(', ')}]` : ''
    const taskName = targetMc.trim()
      ? `[งานแทรกเปิดใบงานใหม่] เครื่อง ${targetMc.trim()}${taskDetail.trim() ? `: ${taskDetail.trim()}` : ''}${techSnippet}`
      : `[งานแทรก] เปิดใบสั่งงานใหม่ด่วน${techSnippet}`

    // Start timer on current job
    if (onStartImmediate) {
      onStartImmediate(taskName, { selectedTechs, noTechRemaining })
    }

    // Open create work order modal with initial prefill
    if (onOpenCreateWorkOrder) {
      onOpenCreateWorkOrder({
        mc: targetMc.trim(),
        comment: `งานแทรกระหว่างทำใบงาน ${interruptionJob?.Job_ID || ''}${taskDetail.trim() ? ` - ${taskDetail.trim()}` : ''}`,
        selectedTechs,
      })
    }
  }

  const handleOpenModalOnly = () => {
    if (onOpenCreateWorkOrder) {
      onOpenCreateWorkOrder({
        mc: targetMc.trim(),
        comment: `งานแทรกระหว่างทำใบงาน ${interruptionJob?.Job_ID || ''}`,
        selectedTechs,
      })
    }
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-slate-50 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900 border-2 border-blue-200 dark:border-blue-900/60 space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
            <FilePlus size={18} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>เปิดใบสั่งงานใหม่สำหรับงานแทรกนี้</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                New WO
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              สร้างใบสั่งงานใหม่ในระบบทันที พร้อมหยุดเวลาใบงานปัจจุบันชั่วคราว
            </p>
          </div>
        </div>
      </div>

      {/* Quick Pre-fill Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            รหัสเครื่องจักรเป้าหมาย (ถ้าทราบ)
          </label>
          <input
            type="text"
            placeholder="เช่น DP-341M, SC-365W..."
            value={targetMc}
            onChange={(e) => setTargetMc(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            ระบุอาการเสีย / งานแทรกคร่าวๆ
          </label>
          <input
            type="text"
            placeholder="เช่น เส้นด้ายติดขัด, เปลี่ยนเข็ม..."
            value={taskDetail}
            onChange={(e) => setTaskDetail(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          type="button"
          onClick={handleCreateAndStart}
          className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5"
        >
          <Clock size={14} />
          <span>เริ่มจับเวลางานแทรก & เปิดใบงานใหม่</span>
          <ArrowRight size={14} />
        </button>

        <button
          type="button"
          onClick={handleOpenModalOnly}
          className="py-2.5 px-3 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all text-center"
        >
          เปิดฟอร์มสร้างใบงานโดยไม่จับเวลา
        </button>
      </div>
    </div>
  )
}
