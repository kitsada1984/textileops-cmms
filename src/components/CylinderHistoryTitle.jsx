import { History } from 'lucide-react'

// Modal title moved verbatim from CylinderHistoryModal (props only).
export function CylinderHistoryTitle({ selectedItem, effectiveMc, effectiveSerial }) {
  const title = selectedItem
    ? (selectedItem.type === 'SWAP' ? 'สลับกระบอก' : 'แก้ไขข้อมูลกระบอก')
    : (
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
          <History size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              ประวัติการเปลี่ยน / สลับกระบอกเข็ม
            </span>
            {effectiveMc && (
              <span className="font-mono font-bold text-[11px] bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg border border-blue-500/20">
                เครื่อง {effectiveMc}
              </span>
            )}
            {effectiveSerial && (
              <span className="font-mono font-bold text-[11px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                กระบอก {effectiveSerial}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">
            คลิกที่รายการใดก็ได้เพื่อดูรายละเอียดแบบเต็มเหมือนหน้าสลับกระบอก
          </div>
        </div>
      </div>
    )
  return title
}
