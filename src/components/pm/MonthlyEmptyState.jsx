import { RefreshCw, Sparkles } from 'lucide-react'
import { THAI_MONTHS } from './monthlyPlanGenerate'

// Table empty state moved verbatim from PMMonthlyScheduleView (props only).
export function MonthlyEmptyState({ loadingSchedule, selectedMonth, selectedYear, canAdd, handleAutoGenerate, daysPerMachine }) {
  return (
    <>
                          {loadingSchedule ? (
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw size={16} className="animate-spin text-blue-500" />
                              <span>กำลังโหลดข้อมูลแผนงาน...</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p>ยังไม่มีรายการแผน PM สำหรับเดือน {THAI_MONTHS[selectedMonth - 1]} {selectedYear}</p>
                              {canAdd && (
                                <button
                                  type="button"
                                  onClick={handleAutoGenerate}
                                  className="btn-primary text-xs px-3.5 py-1.5 inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Sparkles size={14} />
                                  <span>คลิกสร้างแผนอัตโนมัติ ({daysPerMachine} วัน/เครื่อง)</span>
                                </button>
                              )}
                            </div>
                          )}
    </>
  )
}
