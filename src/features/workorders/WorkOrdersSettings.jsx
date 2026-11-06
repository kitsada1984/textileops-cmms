import { Check, Target } from 'lucide-react'

// Settings tab content moved verbatim from WorkOrders (props only).
export function WorkOrdersSettings({ draftKpi, setDraftKpi, handleSaveKpiSettings, user }) {
  return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* KPI SLA Target Configuration */}
          <div className="card p-6 space-y-5 border border-blue-500/25">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: 'var(--text-900)' }}>
                  <Target size={18} className="text-blue-500" />
                  <span>ตั้งค่าเป้าหมาย KPI (SLA Target Days)</span>
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-500)' }}>
                  กำหนดจำนวนวันเป้าหมายสำหรับงานแต่ละประเภทเพื่อนำไปประเมินความสำเร็จ (คิดฐานกะทำงาน 12 ชม./วัน: จันทร์-เสาร์ 08:00 - 20:00 น. ไม่นับวันอาทิตย์และเวลากลางคืน)
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="label">🛠️ เป้าหมายงานแก้ไข (Repair) (จำนวนวัน)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={draftKpi.REPAIR}
                    onChange={(e) => setDraftKpi({ ...draftKpi, REPAIR: parseFloat(e.target.value) || 1.0 })}
                    className="input font-mono font-bold text-sm"
                  />
                  <span className="font-bold" style={{ color: 'var(--text-500)' }}>วัน</span>
                </div>
              </div>

              <div>
                <label className="label">🎨 เป้าหมายงานปรับแบบ (Design) (จำนวนวัน)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={draftKpi.DESIGN}
                    onChange={(e) => setDraftKpi({ ...draftKpi, DESIGN: parseFloat(e.target.value) || 3.0 })}
                    className="input font-mono font-bold text-sm"
                  />
                  <span className="font-bold" style={{ color: 'var(--text-500)' }}>วัน</span>
                </div>
              </div>

              <div>
                <label className="label">🧹 เป้าหมายงาน PM / ล้างเครื่อง (PM) (จำนวนวัน)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={draftKpi.PM}
                    onChange={(e) => setDraftKpi({ ...draftKpi, PM: parseFloat(e.target.value) || 2.0 })}
                    className="input font-mono font-bold text-sm"
                  />
                  <span className="font-bold" style={{ color: 'var(--text-500)' }}>วัน</span>
                </div>
              </div>

              <div>
                <label className="label">⚙️ เป้าหมายงานเตรียมเครื่อง (Setup) (จำนวนวัน)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={draftKpi.SETUP ?? 1.0}
                    onChange={(e) => setDraftKpi({ ...draftKpi, SETUP: parseFloat(e.target.value) || 1.0 })}
                    className="input font-mono font-bold text-sm"
                  />
                  <span className="font-bold" style={{ color: 'var(--text-500)' }}>วัน</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveKpiSettings}
                  className="btn-primary w-full py-2.5"
                >
                  <Check size={14} />
                  <span>บันทึกเป้าหมาย KPI ทั้งหมด</span>
                </button>
              </div>
            </div>
          </div>

          {/* System Information Card */}
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-extrabold pb-3 border-b border-slate-200 dark:border-slate-800" style={{ color: 'var(--text-900)' }}>
              ข้อมูลระบบ & สิทธิ์การใช้งาน
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                <span style={{ color: 'var(--text-500)' }}>ผู้ใช้งานปัจจุบัน</span>
                <span className="font-mono font-bold" style={{ color: 'var(--text-900)' }}>
                  {user?.username || user?.full_name || 'Admin'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                <span style={{ color: 'var(--text-500)' }}>ระบบฐานข้อมูลหลัก</span>
                <span className="badge badge-green">Supabase PostgreSQL</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                <span style={{ color: 'var(--text-500)' }}>Google Sheets Export Sync</span>
                <span className="badge badge-blue">พร้อมใช้งาน</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                <span style={{ color: 'var(--text-500)' }}>SLA Calculation Engine</span>
                <span className="badge badge-purple">Active (Server Timestamp)</span>
              </div>
            </div>
          </div>
        </div>
  )
}
