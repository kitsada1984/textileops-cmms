import { ArrowRight, CheckCircle2, ClipboardList, Clock, PieChart, Sliders, Target, UserCheck } from 'lucide-react'
import { WorkOrderTypeCard } from './WorkOrderTypeCard.jsx'

// Dashboard tab content moved verbatim from WorkOrders (props only).
export function WorkOrdersDashboard({ kpiStats, setKpiModalOpen, handleDrilldownByCause }) {
  return (
        <div className="space-y-6">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="stat-card">
              <div className="stat-icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md flex-shrink-0">
                <ClipboardList size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="stat-val text-xl sm:text-2xl font-black truncate" style={{ color: 'var(--text-900)' }}>
                  {kpiStats.total}
                </div>
                <div className="stat-label text-xs sm:text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--text-500)' }}>
                  งานทั้งหมด
                </div>
                <div className="stat-sub text-[10px] text-blue-500 font-bold truncate">Total Work Orders</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md flex-shrink-0">
                <Clock size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="stat-val text-xl sm:text-2xl font-black text-amber-500 truncate">
                  {kpiStats.active}
                </div>
                <div className="stat-label text-xs sm:text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--text-500)' }}>
                  กำลังปฏิบัติงาน
                </div>
                <div className="stat-sub text-[10px] text-amber-500 font-bold truncate">In Progress</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md flex-shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="stat-val text-xl sm:text-2xl font-black text-emerald-500 truncate">
                  {kpiStats.completed}
                </div>
                <div className="stat-label text-xs sm:text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--text-500)' }}>
                  งานเสร็จสิ้นแล้ว
                </div>
                <div className="stat-sub text-[10px] text-emerald-500 font-bold truncate">Completed</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-md flex-shrink-0">
                <Target size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="stat-val text-xl sm:text-2xl font-black text-purple-500 truncate">
                  {kpiStats.overallRate}%
                </div>
                <div className="stat-label text-xs sm:text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--text-500)' }}>
                  อัตราผ่าน KPI รวม
                </div>
                <div className="stat-sub text-[10px] text-purple-500 font-bold truncate">Overall SLA Rate</div>
              </div>
            </div>
          </div>

          {/* 🌟 3-JOB-TYPE KPI PERFORMANCE BREAKDOWN 🌟 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-900)' }}>
                <Target size={16} className="text-blue-500" />
                <span>สรุปประสิทธิภาพตามประเภทงาน (KPI Breakdown by Job Type)</span>
              </h2>
              <button
                onClick={() => setKpiModalOpen(true)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Sliders size={13} /> ปรับเป้าหมาย SLA
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Repair Card */}
              <WorkOrderTypeCard icon="🛠️" title="งานแก้ไข (Repair)" stats={kpiStats.repair} accent="blue" badgeClass="badge-green" />

              {/* 2. Design Card */}
              <WorkOrderTypeCard icon="🎨" title="งานปรับแบบ (Design)" stats={kpiStats.design} accent="amber" badgeClass="badge-yellow" />

              {/* 3. PM Card */}
              <WorkOrderTypeCard icon="🧹" title="PM / ล้างเครื่อง" stats={kpiStats.pm} accent="emerald" badgeClass="badge-green" />

              {/* 4. Setup Card */}
              <WorkOrderTypeCard icon="⚙️" title="งานเตรียมเครื่อง (Setup)" stats={kpiStats.setup} accent="indigo" badgeClass="badge-indigo" optional />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ── 📊 PROBLEM CAUSE & ROOT CAUSE ANALYTICS ─────────────── */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <PieChart size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-900)' }}>
                    <span>สรุปการวิเคราะห์สาเหตุปัญหา (Problem Cause & Root Cause Analytics)</span>
                  </h2>
                  <p className="text-[11px]" style={{ color: 'var(--text-500)' }}>
                    สถิติแยกตาม คน (Man), เครื่องจักร (Machine), วัตถุดิบ (Material) และงานที่รอระบุสาเหตุ
                  </p>
                </div>
              </div>
              <div className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                รวม {kpiStats.total} รายการ
              </div>
            </div>

            {/* Stacked 100% Proportion Bar Card */}
            <div className="card p-4 space-y-3 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-700)' }}>
                  <span>สัดส่วนสาเหตุปัญหาภาพรวม (Overall Distribution)</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">100% Total Jobs</span>
              </div>

              {/* The Multi-Segment Bar */}
              <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden p-0.5 gap-0.5 shadow-inner">
                {kpiStats.causeStats.personnel.total > 0 && (
                  <div
                    className="h-full bg-amber-500 rounded-sm transition-all duration-500 hover:opacity-90 cursor-pointer"
                    style={{ width: `${(kpiStats.causeStats.personnel.total / (kpiStats.total || 1)) * 100}%` }}
                    title={`คน: ${kpiStats.causeStats.personnel.total} งาน (${kpiStats.causeStats.personnel.percentage}%)`}
                    onClick={() => handleDrilldownByCause('คน')}
                  />
                )}
                {kpiStats.causeStats.machine.total > 0 && (
                  <div
                    className="h-full bg-blue-500 rounded-sm transition-all duration-500 hover:opacity-90 cursor-pointer"
                    style={{ width: `${(kpiStats.causeStats.machine.total / (kpiStats.total || 1)) * 100}%` }}
                    title={`เครื่องจักร: ${kpiStats.causeStats.machine.total} งาน (${kpiStats.causeStats.machine.percentage}%)`}
                    onClick={() => handleDrilldownByCause('เครื่องจักร')}
                  />
                )}
                {kpiStats.causeStats.material.total > 0 && (
                  <div
                    className="h-full bg-emerald-500 rounded-sm transition-all duration-500 hover:opacity-90 cursor-pointer"
                    style={{ width: `${(kpiStats.causeStats.material.total / (kpiStats.total || 1)) * 100}%` }}
                    title={`วัตถุดิบ: ${kpiStats.causeStats.material.total} งาน (${kpiStats.causeStats.material.percentage}%)`}
                    onClick={() => handleDrilldownByCause('วัตถุดิบ')}
                  />
                )}
                {kpiStats.causeStats.unspecified.total > 0 && (
                  <div
                    className="h-full bg-slate-400 dark:bg-slate-600 rounded-sm transition-all duration-500 hover:opacity-90 cursor-pointer"
                    style={{ width: `${(kpiStats.causeStats.unspecified.total / (kpiStats.total || 1)) * 100}%` }}
                    title={`ยังไม่ระบุ: ${kpiStats.causeStats.unspecified.total} งาน (${kpiStats.causeStats.unspecified.percentage}%)`}
                    onClick={() => handleDrilldownByCause('UNSPECIFIED')}
                  />
                )}
              </div>

              {/* Bar Legend Labels */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleDrilldownByCause('คน')}
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block flex-shrink-0" />
                    <span className="font-semibold" style={{ color: 'var(--text-800)' }}>👤 คน:</span>
                    <b className="font-mono text-amber-600 dark:text-amber-400">{kpiStats.causeStats.personnel.total} งาน</b>
                    <span className="text-[11px] text-slate-400 font-mono">({kpiStats.causeStats.personnel.percentage}%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDrilldownByCause('เครื่องจักร')}
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block flex-shrink-0" />
                    <span className="font-semibold" style={{ color: 'var(--text-800)' }}>⚙️ เครื่องจักร:</span>
                    <b className="font-mono text-blue-600 dark:text-blue-400">{kpiStats.causeStats.machine.total} งาน</b>
                    <span className="text-[11px] text-slate-400 font-mono">({kpiStats.causeStats.machine.percentage}%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDrilldownByCause('วัตถุดิบ')}
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
                    <span className="font-semibold" style={{ color: 'var(--text-800)' }}>🧵 วัตถุดิบ:</span>
                    <b className="font-mono text-emerald-600 dark:text-emerald-400">{kpiStats.causeStats.material.total} งาน</b>
                    <span className="text-[11px] text-slate-400 font-mono">({kpiStats.causeStats.material.percentage}%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDrilldownByCause('UNSPECIFIED')}
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 inline-block flex-shrink-0" />
                    <span className="font-semibold" style={{ color: 'var(--text-800)' }}>❓ ยังไม่ระบุ:</span>
                    <b className="font-mono text-slate-600 dark:text-slate-400">{kpiStats.causeStats.unspecified.total} งาน</b>
                    <span className="text-[11px] text-slate-400 font-mono">({kpiStats.causeStats.unspecified.percentage}%)</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 italic">
                  *คลิกที่สาเหตุเพื่อเจาะจงดูรายการใบสั่งงาน (Quick Drilldown)
                </div>
              </div>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Card 1: คน */}
              <div
                onClick={() => handleDrilldownByCause('คน')}
                className="card p-4 space-y-3 border border-amber-500/25 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base group-hover:scale-105 transition-transform">
                        👤
                      </div>
                      <div>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                          คน (Personnel)
                        </h3>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          การปฏิบัติงาน / พนักงาน
                        </p>
                      </div>
                    </div>
                    <span className="badge badge-amber text-xs font-bold font-mono">
                      {kpiStats.causeStats.personnel.percentage}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                      <div className="text-[10px]" style={{ color: 'var(--text-400)' }}>ทั้งหมด</div>
                      <div className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                        {kpiStats.causeStats.personnel.total}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <div className="text-[10px]">ทัน SLA</div>
                      <div className="font-bold text-sm">{kpiStats.causeStats.personnel.onTime}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <div className="text-[10px]">เกิน SLA</div>
                      <div className="font-bold text-sm">{kpiStats.causeStats.personnel.overdue}</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs pt-1" style={{ color: 'var(--text-500)' }}>
                    <div className="flex justify-between">
                      <span>อัตราทันเป้า SLA:</span>
                      <b className="font-mono text-emerald-600 dark:text-emerald-400">{kpiStats.causeStats.personnel.rate}%</b>
                    </div>
                    <div className="flex justify-between">
                      <span>ระยะเวลาเฉลี่ย:</span>
                      <b className="font-mono" style={{ color: 'var(--text-900)' }}>{kpiStats.causeStats.personnel.avgDurationText}</b>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">
                  <span>ดูรายการงาน ({kpiStats.causeStats.personnel.total})</span>
                  <ArrowRight size={13} />
                </div>
              </div>

              {/* Card 2: เครื่องจักร */}
              <div
                onClick={() => handleDrilldownByCause('เครื่องจักร')}
                className="card p-4 space-y-3 border border-blue-500/25 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base group-hover:scale-105 transition-transform">
                        ⚙️
                      </div>
                      <div>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                          เครื่องจักร (Machine)
                        </h3>
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          อุปกรณ์ / ความสึกหรอ
                        </p>
                      </div>
                    </div>
                    <span className="badge badge-blue text-xs font-bold font-mono">
                      {kpiStats.causeStats.machine.percentage}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                      <div className="text-[10px]" style={{ color: 'var(--text-400)' }}>ทั้งหมด</div>
                      <div className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                        {kpiStats.causeStats.machine.total}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <div className="text-[10px]">ทัน SLA</div>
                      <div className="font-bold text-sm">{kpiStats.causeStats.machine.onTime}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <div className="text-[10px]">เกิน SLA</div>
                      <div className="font-bold text-sm">{kpiStats.causeStats.machine.overdue}</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs pt-1" style={{ color: 'var(--text-500)' }}>
                    <div className="flex justify-between">
                      <span>อัตราทันเป้า SLA:</span>
                      <b className="font-mono text-emerald-600 dark:text-emerald-400">{kpiStats.causeStats.machine.rate}%</b>
                    </div>
                    <div className="flex justify-between">
                      <span>ระยะเวลาเฉลี่ย:</span>
                      <b className="font-mono" style={{ color: 'var(--text-900)' }}>{kpiStats.causeStats.machine.avgDurationText}</b>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-bold group-hover:translate-x-0.5 transition-transform">
                  <span>ดูรายการงาน ({kpiStats.causeStats.machine.total})</span>
                  <ArrowRight size={13} />
                </div>
              </div>

              {/* Card 3: วัตถุดิบ */}
              <div
                onClick={() => handleDrilldownByCause('วัตถุดิบ')}
                className="card p-4 space-y-3 border border-emerald-500/25 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base group-hover:scale-105 transition-transform">
                        🧵
                      </div>
                      <div>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                          วัตถุดิบ (Material)
                        </h3>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          เส้นด้าย / สารเคมี / ผ้า
                        </p>
                      </div>
                    </div>
                    <span className="badge badge-green text-xs font-bold font-mono">
                      {kpiStats.causeStats.material.percentage}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                      <div className="text-[10px]" style={{ color: 'var(--text-400)' }}>ทั้งหมด</div>
                      <div className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                        {kpiStats.causeStats.material.total}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <div className="text-[10px]">ทัน SLA</div>
                      <div className="font-bold text-sm">{kpiStats.causeStats.material.onTime}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <div className="text-[10px]">เกิน SLA</div>
                      <div className="font-bold text-sm">{kpiStats.causeStats.material.overdue}</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs pt-1" style={{ color: 'var(--text-500)' }}>
                    <div className="flex justify-between">
                      <span>อัตราทันเป้า SLA:</span>
                      <b className="font-mono text-emerald-600 dark:text-emerald-400">{kpiStats.causeStats.material.rate}%</b>
                    </div>
                    <div className="flex justify-between">
                      <span>ระยะเวลาเฉลี่ย:</span>
                      <b className="font-mono" style={{ color: 'var(--text-900)' }}>{kpiStats.causeStats.material.avgDurationText}</b>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">
                  <span>ดูรายการงาน ({kpiStats.causeStats.material.total})</span>
                  <ArrowRight size={13} />
                </div>
              </div>

              {/* Card 4: ยังไม่ระบุสาเหตุ (Pending) */}
              <div
                onClick={() => handleDrilldownByCause('UNSPECIFIED')}
                className="card p-4 space-y-3 border border-slate-300 dark:border-slate-700 hover:border-slate-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between bg-slate-50/50 dark:bg-slate-900/30"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-base group-hover:scale-105 transition-transform">
                        ❓
                      </div>
                      <div>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                          ยังไม่ระบุ (Pending)
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          รอการระบุสาเหตุ
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {kpiStats.causeStats.unspecified.percentage}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 font-medium">งานที่ยังไม่ได้ระบุสาเหตุ</div>
                    <div className="font-black text-xl text-slate-700 dark:text-slate-300 mt-0.5">
                      {kpiStats.causeStats.unspecified.total} <span className="text-xs font-normal">รายการ</span>
                    </div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                      {kpiStats.causeStats.unspecified.total > 0
                        ? '⚠️ ต้องติดตามช่างเพื่อสรุปสาเหตุ'
                        : '✅ บันทึกสาเหตุครบทุกงาน'}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 line-clamp-2">
                    ช่วยหัวหน้างานติดตามใบสั่งงานที่เสร็จสิ้นหรือกำลังทำอยู่แต่ยังไม่ระบุสาเหตุ
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-bold group-hover:translate-x-0.5 transition-transform">
                  <span>ดูงานค้างระบุ ({kpiStats.causeStats.unspecified.total})</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>
          </div>

          {/* Operational Metrics by User */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-900)' }}>
                <UserCheck size={16} className="text-emerald-500" />
                <span>สถิติการทำรายการแยกตามผู้ปฏิบัติงาน (Operational Metrics)</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
              {kpiStats.userMetrics.map((u, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold truncate" style={{ color: 'var(--text-900)' }}>
                      {u.name}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-500)' }}>
                      รายการที่ดูแล
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono font-bold text-sm">
                    {u.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
  )
}
