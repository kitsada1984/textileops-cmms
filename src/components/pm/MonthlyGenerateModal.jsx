import Modal from '../ui/Modal'
import { Sparkles, Clock, AlertTriangle } from 'lucide-react'
import { THAI_MONTHS, AVAILABLE_LOCATIONS, matchesLocation, sortMachinesByCountdownPriority, getMonthlyWorkingDays } from './monthlyPlanGenerate'

// Generate modal moved verbatim from PMMonthlyScheduleView (props only).
export function MonthlyGenerateModal({ generateModalOpen, setGenerateModalOpen, genDaysPerMachine, setGenDaysPerMachine, selectedGenLocations, setSelectedGenLocations, selectedMonth, selectedYear, effectiveMachines, currentItems, handleConfirmGenerate }) {
  return (
      <Modal
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title={`จัดทำแผน PM รายเดือนอัตโนมัติ (${genDaysPerMachine} วัน/เครื่อง)`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800 text-blue-900 dark:text-blue-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-sm">
              <Sparkles size={16} className="text-blue-600 dark:text-blue-400" />
              <span>แผนเดือน {THAI_MONTHS[selectedMonth - 1]} {selectedYear}</span>
            </div>
            <p className="text-[11px] opacity-90">
              ระบบจะจัดสรรเครื่องจักรลงในตาราง {genDaysPerMachine} วันทำการต่อ 1 เครื่อง (ไม่รวมวันอาทิตย์) โดยดึงหมายเลขเครื่องปัจจุบันจากฐานข้อมูลกระบอกสูบ
            </p>
          </div>

          {/* Days Per Machine Configuration (กำหนดจำนวนวันต่อเครื่อง) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock size={14} className="text-blue-600 dark:text-blue-400" />
                <span>กำหนดจำนวนวันทำการต่อเครื่อง:</span>
              </label>
              <span className="font-bold font-mono text-blue-600 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                {genDaysPerMachine} วัน/เครื่อง
              </span>
            </div>
            
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setGenDaysPerMachine(num)}
                  className={`py-2 px-1.5 rounded-xl border font-bold text-center transition-all cursor-pointer text-xs ${
                    genDaysPerMachine === num
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-400/40'
                      : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span>{num} วัน</span>
                  {num === 3 && <span className="block text-[9px] font-normal opacity-80">(ปกติ)</span>}
                </button>
              ))}
            </div>

            {/* Custom Input for N days */}
            <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-slate-500">
              <span>หรือกำหนดจำนวนวันเอง:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={genDaysPerMachine}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val) && val >= 1 && val <= 31) {
                      setGenDaysPerMachine(val)
                    }
                  }}
                  className="w-16 px-2 py-1 text-center font-bold font-mono text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-600 dark:text-slate-300">วัน/เครื่อง</span>
              </div>
            </div>
          </div>

          {/* Location Multi-Select Options */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              เลือกสถานที่ / โรงงาน (เลือกได้มากกว่า 1 รายการ):
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* All Locations button */}
              <button
                type="button"
                onClick={() => setSelectedGenLocations(['ALL'])}
                className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer flex flex-col justify-between ${
                  selectedGenLocations.includes('ALL')
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-400/40'
                    : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span className="text-xs">ทุกโรงงาน (ทั้งหมด)</span>
                <span className={`text-[10px] mt-1 ${selectedGenLocations.includes('ALL') ? 'text-blue-100' : 'text-slate-400'}`}>
                  {effectiveMachines.length} เครื่อง
                </span>
              </button>

              {AVAILABLE_LOCATIONS.map(loc => {
                const isChecked = !selectedGenLocations.includes('ALL') && selectedGenLocations.includes(loc.id)
                const locCount = effectiveMachines.filter(m => matchesLocation(m.location, [loc.id])).length
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setSelectedGenLocations(prev => {
                        if (prev.includes('ALL')) return [loc.id]
                        if (prev.includes(loc.id)) {
                          const next = prev.filter(x => x !== loc.id)
                          return next.length === 0 ? ['ALL'] : next
                        }
                        return [...prev, loc.id]
                      })
                    }}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer flex flex-col justify-between ${
                      isChecked
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-400/40'
                        : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs">{loc.label}</span>
                    <span className={`text-[10px] mt-1 ${isChecked ? 'text-blue-100' : 'text-slate-400'}`}>
                      {locCount} เครื่อง
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Summary Box */}
          {(() => {
            const candidateMachines = effectiveMachines.filter(m => matchesLocation(m.location, selectedGenLocations))
            const count = candidateMachines.length
            const sorted = sortMachinesByCountdownPriority(candidateMachines)
            const overdueList = sorted.filter(m => typeof m.countdownDays === 'number' && m.countdownDays < 0)
            const top3 = sorted.slice(0, 3)
            return (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-slate-600 dark:text-slate-300 text-xs">
                <div className="flex items-center justify-between">
                  <span>เครื่องจักรที่ถูกเลือก:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-slate-100 text-sm">
                    {count} เครื่อง
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>จำนวนบล็อกแผนงานในเดือนนี้:</span>
                  <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                    {`${Math.floor(getMonthlyWorkingDays(selectedYear, selectedMonth).length / genDaysPerMachine)} บล็อก (${genDaysPerMachine} วัน/บล็อก)`}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                    <span>เครื่องเกินกำหนด (Overdue):</span>
                  </span>
                  <span className={`font-bold font-mono ${overdueList.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                    {overdueList.length} เครื่อง
                  </span>
                </div>
                {top3.length > 0 && (
                  <div className="pt-1.5 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      ลำดับความเร่งด่วนสูงสุด (จัดลงแผนก่อน):
                    </div>
                    <div className="space-y-1">
                      {top3.map((m, idx) => (
                        <div key={m.mc || idx} className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-400 text-[10px]">#{idx + 1}</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{m.mc}</span>
                            <span className="text-[10px] text-slate-400">({m.location || '—'})</span>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                            m.countdownColor === 'red' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' :
                            m.countdownColor === 'yellow' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                            m.countdownColor === 'green' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                            'bg-slate-500/10 text-slate-400'
                          }`}>
                            {m.countdownLabel || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Warning if existing schedule exists */}
          {currentItems.length > 0 && (
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
              <span>มีแผนงานของเดือนนี้อยู่แล้ว {currentItems.length} เครื่อง การสร้างใหม่จะแทนที่ข้อมูลเดิม</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setGenerateModalOpen(false)}
              className="btn-outline px-3 py-1.5 text-xs cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirmGenerate}
              disabled={effectiveMachines.filter(m => matchesLocation(m.location, selectedGenLocations)).length === 0}
              className="btn-primary px-4 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={14} />
              <span>ยืนยันสร้างแผนงาน ({effectiveMachines.filter(m => matchesLocation(m.location, selectedGenLocations)).length} เครื่อง)</span>
            </button>
          </div>
        </div>
      </Modal>
  )
}
