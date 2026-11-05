import { ArrowLeft, Layers, Plus, RefreshCw, Sliders } from 'lucide-react'

export function CenterCheckHeader({ initNewForm, activeSubTab, editingId, formType, canAdd, onBackToPMPlan, records, recordsLoading, loadRecords, setActiveSubTab, setStandardsDraft, setStandardsTab, setStandardsModalOpen, setSqlModalOpen, standardsConfig }) {
  return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--text-900)' }}>
            <span className="p-2 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Layers size={22} />
            </span>
            <span>บันทึกประวัติการตั้งศูนย์เครื่องถักกลม</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-500)' }}>
            ตรวจสอบความเที่ยงตรง Cylinder, Cambox, Sinker, Dail และบันทึกผลต่างรอบเครื่องจักร
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onBackToPMPlan && (
            <button
              type="button"
              onClick={onBackToPMPlan}
              className="btn-outline text-xs px-3 py-2 flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300"
              title="กลับไปยังหน้าแผน PM"
            >
              <ArrowLeft size={14} />
              <span>กลับไปแผน PM</span>
            </button>
          )}

          {canAdd && (
            <>
              <button
                type="button"
                onClick={() => initNewForm('Single')}
                className={`btn text-xs font-bold transition-all shadow-sm ${
                  activeSubTab === 'single_form' && !editingId
                    ? 'bg-blue-600 text-white shadow-blue-500/25'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800'
                }`}
              >
                <Plus size={14} />
                <span>เช็คศูนย์ Single Jersey</span>
              </button>

              <button
                type="button"
                onClick={() => initNewForm('Double')}
                className={`btn text-xs font-bold transition-all shadow-sm ${
                  activeSubTab === 'double_form' && !editingId
                    ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                    : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                <Plus size={14} />
                <span>เช็คศูนย์ Double Jersey</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setStandardsDraft(JSON.parse(JSON.stringify(standardsConfig)))
              setStandardsTab(formType === 'Double' ? 'Double' : 'Single')
              setStandardsModalOpen(true)
            }}
            className="btn-outline text-xs px-2.5 flex items-center gap-1.5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            title="ตั้งค่ามาตรฐานเริ่มต้น (Center Check Standards)"
          >
            <Sliders size={13} />
            <span className="hidden sm:inline">ตั้งค่ามาตรฐาน</span>
          </button>

          <button
            type="button"
            onClick={() => setSqlModalOpen(true)}
            className="btn-outline text-xs px-2.5 flex items-center gap-1.5 text-slate-600 dark:text-slate-400"
            title="ดูคำสั่ง SQL สำหรับสร้างตารางบน Supabase"
          >
            <Sliders size={13} />
            <span className="hidden md:inline">SQL Schema</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('history')
              loadRecords()
            }}
            className="btn-outline p-2 text-xs"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={14} className={recordsLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
  )
}
