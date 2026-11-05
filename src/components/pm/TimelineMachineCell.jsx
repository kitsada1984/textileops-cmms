// Timeline machine cell moved verbatim from PMMonthlyScheduleView (props only).
export function TimelineMachineCell({ item }) {
  return (
                              <div
                                className="w-64 shrink-0 py-1 px-2.5 border-r border-slate-200 dark:border-slate-800 flex items-center min-w-0 overflow-hidden"
                                title={`${item.mc} (${item.ki || '—'}) | โรงงาน: ${item.location || '—'} | ชนิด: ${item.type || '—'}${item.countdownLabel ? ` | ${item.countdownLabel}` : ''}`}
                              >
                                <div className="flex items-center gap-1.5 w-full min-w-0 text-xs overflow-hidden">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate min-w-0 shrink-0">
                                    {item.mc}
                                  </span>
                                  {item.isUnplanned && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                                      นอกแผน
                                    </span>
                                  )}
                                  {item.countdownLabel && item.countdownLabel !== '—' && (
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center shrink-0 ml-auto ${
                                        item.countdownColor === 'red' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' :
                                        item.countdownColor === 'yellow' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                                        item.countdownColor === 'green' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                                        'bg-slate-500/10 text-slate-400'
                                      }`}
                                      title={item.nextPmDate ? `Next PM: ${item.nextPmDate}` : 'ไม่มีข้อมูล Next PM'}
                                    >
                                      {item.countdownLabel}
                                    </span>
                                  )}
                                </div>
                              </div>
  )
}
