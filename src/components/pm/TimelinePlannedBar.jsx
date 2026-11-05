// Timeline planned bar moved verbatim from PMMonthlyScheduleView (props only).
export function TimelinePlannedBar({ item, range, hasOverlap, showPlanned, handleOpenUpdateModal }) {
  return (
    <>
                                {showPlanned && (
                                  <div
                                    style={{
                                      gridColumnStart: range.startDay,
                                      gridColumnEnd: range.endDay + 1,
                                      left: '2px',
                                      right: '2px',
                                      width: 'calc(100% - 4px)',
                                      maxWidth: 'calc(100% - 4px)',
                                      boxSizing: 'border-box',
                                    }}
                                    onClick={() => handleOpenUpdateModal(item)}
                                    title={`แผนงาน: ${item.mc} (${item.plannedStartDate} ถึง ${item.plannedEndDate})`}
                                    className={`absolute z-4 rounded-md px-1.5 flex items-center justify-between font-bold cursor-pointer transition-all bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs overflow-hidden ${
                                      hasOverlap
                                        ? 'top-[2px] h-[14px] text-[9px] opacity-90 hover:opacity-100'
                                        : 'inset-y-0 my-auto h-[22px] text-[10px]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1 min-w-0 truncate">
                                      <span className="truncate font-semibold">แผน: {item.mc}</span>
                                      {!hasOverlap && (
                                        <span className="text-[9px] opacity-80 font-mono hidden sm:inline shrink-0">
                                          ({item.plannedStartDate.slice(8)}-{item.plannedEndDate.slice(8)})
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9px] font-mono hidden md:inline ml-1 shrink-0 opacity-90">
                                      {item.workingDays || 3}ว.
                                    </span>
                                  </div>
                                )}
    </>
  )
}
