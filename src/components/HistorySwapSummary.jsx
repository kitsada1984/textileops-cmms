import { ArrowLeftRight } from 'lucide-react'
import { findCylinderBySerial } from '../utils/cylinderHistory'

// Swap OUT/IN summary moved verbatim from the timeline card (props only).
export function HistorySwapSummary({ item, effectiveCylinders }) {
  return (
                        <div className="flex items-center justify-between gap-2 flex-wrap font-mono">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px]">OUT</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{item.out?.serial || '—'}</span>
                            <span className="text-slate-400">
                              (เครื่อง {item.out?.mc || findCylinderBySerial(item.out?.serial, effectiveCylinders)?.NewMC || '—'})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-indigo-500 font-bold text-[11px]">
                            <ArrowLeftRight size={12} />
                            <span className="text-[10px] uppercase font-sans">สลับคู่กับ</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">IN</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{item.in?.serial || '—'}</span>
                            <span className="text-slate-400">
                              (เครื่อง {item.in?.mc || findCylinderBySerial(item.in?.serial, effectiveCylinders)?.NewMC || '—'})
                            </span>
                          </div>
                        </div>
  )
}
