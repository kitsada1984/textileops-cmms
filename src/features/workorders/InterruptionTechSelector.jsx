import { UserCheck, Users, AlertTriangle, ShieldAlert } from 'lucide-react'

/**
 * InterruptionTechSelector.jsx
 * UI component for selecting technicians pulled from the interrupted machine.
 * Provides clear feedback on whether any technicians remain on the machine,
 * and warns if the machine is left with 0 technicians (triggering timer pause).
 */
export function InterruptionTechSelector({
  assignedTechs = [],
  availableTechs = [],
  selectedTechs = [],
  onChangeSelectedTechs,
  noTechRemaining = false,
}) {
  const toggleTech = (name) => {
    if (!onChangeSelectedTechs) return
    if (selectedTechs.includes(name)) {
      onChangeSelectedTechs(selectedTechs.filter((t) => t !== name))
    } else {
      onChangeSelectedTechs([...selectedTechs, name])
    }
  }

  const handleSelectAll = () => {
    if (!onChangeSelectedTechs) return
    const all = Array.from(new Set([...assignedTechs, ...selectedTechs]))
    onChangeSelectedTechs(all)
  }

  const handleClear = () => {
    if (!onChangeSelectedTechs) return
    onChangeSelectedTechs([])
  }

  // Find remaining technicians who will continue working at the machine
  const remainingTechs = assignedTechs.filter((t) => !selectedTechs.includes(t))

  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Users size={14} className="text-blue-500" />
          <span>เลือกช่างที่ถูกดึงตัวไปทำงานแทรก (จากเครื่องนี้)</span>
        </label>
        <div className="flex items-center gap-1 text-[11px]">
          {assignedTechs.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold px-1"
            >
              ดึงทั้งหมด
            </button>
          )}
          {selectedTechs.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-500 dark:text-slate-400 hover:underline px-1"
            >
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* Assigned Technicians on this machine */}
      {assignedTechs.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {assignedTechs.map((techName) => {
            const isSelected = selectedTechs.includes(techName)
            return (
              <button
                key={techName}
                type="button"
                onClick={() => toggleTech(techName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs scale-[1.02]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                <UserCheck size={13} className={isSelected ? 'text-white' : 'text-slate-400'} />
                <span>{techName}</span>
                <span className="text-[10px] opacity-80">{isSelected ? '(ถูกดึงไป)' : '(อยู่ประจำเครื่อง)'}</span>
              </button>
            )
          })}
        </div>
      ) : (
        /* If no technician assigned to this job initially, pick from available factory technicians */
        <div className="space-y-1.5">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            เครื่องนี้ยังไม่มีชื่อช่างที่ลงทะเบียนไว้ในใบสั่งงาน เลือกช่างผู้ไปปฏิบัติงานแทรก:
          </p>
          <div className="flex flex-wrap items-center gap-1 max-h-24 overflow-y-auto">
            {availableTechs.slice(0, 10).map((t) => {
              const name = t.Name || t.name || t.Technician_ID
              const isSelected = selectedTechs.includes(name)
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleTech(name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Machine Status Feedback Banner */}
      {noTechRemaining ? (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert size={15} className="text-rose-600 shrink-0" />
            <span>ไม่มีช่างอยู่ประจำเครื่องนี้แล้ว (ช่างถูกดึงไปหมด):</span>
          </div>
          <span className="font-extrabold text-[11px] px-2 py-0.5 rounded-md bg-rose-600 text-white shrink-0">
            ระบบจะหยุดนับเวลาทำงานชั่วคราว
          </span>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-semibold">
            <Users size={14} className="text-emerald-600 shrink-0" />
            <span>ยังมีช่างประจำเครื่องทำงานอยู่ {remainingTechs.length} ท่าน:</span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
              ({remainingTechs.join(', ')})
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
            เวลางานหลักยังคงนับต่อ
          </span>
        </div>
      )}
    </div>
  )
}
