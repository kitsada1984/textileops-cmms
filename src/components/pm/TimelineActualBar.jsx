import { CheckCircle2, Clock } from 'lucide-react'

// Timeline actual bar moved verbatim from PMMonthlyScheduleView (props only).
export function TimelineActualBar({ item, actRange, hasOverlap, showActual, statusMeta, handleOpenUpdateModal }) {
  return (
    <>
                                {showActual && (
                                  <div
                                    style={{
                                      gridColumnStart: actRange.startDay,
                                      gridColumnEnd: actRange.endDay + 1,
                                      left: '2px',
                                      right: '2px',
                                      width: 'calc(100% - 4px)',
                                      maxWidth: 'calc(100% - 4px)',
                                      boxSizing: 'border-box',
                                    }}
                                    onClick={() => handleOpenUpdateModal(item)}
                                    title={`ผลงานจริง: ${item.mc} (${item.actualStartDate} ถึง ${item.actualEndDate || item.actualStartDate}) | ${statusMeta.label}${item.workOrderId ? ` | WO: ${item.workOrderId}` : ''}`}
                                    className={`absolute z-5 rounded-md px-1.5 flex items-center justify-between font-bold cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md overflow-hidden ${
                                      hasOverlap
                                        ? 'bottom-[2px] h-[16px] text-[9px]'
                                        : 'inset-y-0 my-auto h-[22px] text-[10px]'
                                    } ${
                                      item.status === 'COMPLETED'
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs'
                                        : item.status === 'IN_PROGRESS'
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs animate-pulse ring-1 ring-amber-300'
                                        : item.status === 'DELAYED'
                                        ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-xs'
                                        : item.status === 'POSTPONED'
                                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-xs'
                                        : 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-xs'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1 truncate">
                                      <span className="truncate">จริง: {item.actualTech || item.mc}</span>
                                      {!hasOverlap && item.workOrderId && (
                                        <span className="text-[9px] opacity-90 font-mono hidden sm:inline">
                                          ({item.workOrderId})
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 ml-1">
                                      {item.status === 'COMPLETED' ? (
                                        <CheckCircle2 size={hasOverlap ? 9 : 11} className="text-white" />
                                      ) : item.status === 'IN_PROGRESS' ? (
                                        <Clock size={hasOverlap ? 9 : 11} className="text-white" />
                                      ) : null}
                                      {!hasOverlap && (
                                        <span className="text-[9px] hidden md:inline">
                                          {statusMeta.label}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
    </>
  )
}
