import { useState, useMemo } from 'react'
import {
  Disc,
  Printer,
  RefreshCw,
  Layers,
  Cpu,
  MapPin,
  X,
  Eye,
  Filter,
  CheckCircle2,
} from 'lucide-react'
import SearchInput from '../../components/ui/SearchInput'
import GoogleSheetSyncButton from '../../components/ui/GoogleSheetSyncButton'
import { useAuth } from '../../contexts/AuthContext'
import { aggregateYarnBelts, getMachineTapes } from '../../utils/yarnBeltsLogic'
import YarnBeltsPrintModal from './YarnBeltsPrintModal'

export default function YarnBeltsView({ logic }) {
  const { user } = useAuth()
  const { data: machines = [], loading, load, setDetailRec } = logic

  const [locationFilter, setLocationFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedBelt, setSelectedBelt] = useState('')
  const [printModalOpen, setPrintModalOpen] = useState(false)

  // Computed Belts Aggregation
  const aggregated = useMemo(() => {
    return aggregateYarnBelts(machines, {
      locationFilter,
      search,
      selectedBelt,
    })
  }, [machines, locationFilter, search, selectedBelt])

  const {
    locationOptions,
    overallSummary,
    tapeBreakdown,
    displayMachines,
    stats,
  } = aggregated

  // Export Columns for Google Sheets
  const exportCols = useMemo(() => [
    { key: 'Mc', label: 'เครื่องจักร' },
    { key: 'Location', label: 'โซน/สถานที่' },
    { key: 'Type', label: 'ประเภท' },
    { key: 'Tape1_No', label: 'เทป 1' },
    { key: 'Tape2_No', label: 'เทป 2' },
    { key: 'Tape3_No', label: 'เทป 3' },
    { key: 'Tape4_No', label: 'เทป 4' },
    { key: 'Tape5_No', label: 'เทป 5' },
  ], [])

  return (
    <div className="yarn-belts-view space-y-5">
      {/* ── 1. TOP KPI SUMMARY STATS CARDS ─────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Belts */}
        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">สายพานที่ใช้งานรวม</div>
            <div className="text-xl font-black mt-0.5 text-blue-600 dark:text-blue-400 font-mono">
              {stats.totalBelts.toLocaleString()} <span className="text-xs font-normal text-slate-400">เส้น</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Disc size={18} />
          </div>
        </div>

        {/* Unique Belt Numbers */}
        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">เบอร์สายพานที่ใช้</div>
            <div className="text-xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.uniqueBeltSizes.toLocaleString()} <span className="text-xs font-normal text-slate-400">เบอร์</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Layers size={18} />
          </div>
        </div>

        {/* Machines With Belts */}
        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">เครื่องที่ติดตั้งสายพาน</div>
            <div className="text-xl font-black mt-0.5 text-indigo-600 dark:text-indigo-400 font-mono">
              {stats.machinesWithBelts} / {stats.totalMachines} <span className="text-xs font-normal text-slate-400">เครื่อง</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <Cpu size={18} />
          </div>
        </div>

        {/* Selected Zone / Location */}
        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">โซน / ขอบเขตข้อมูล</div>
            <div className="text-base font-black mt-0.5 text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
              {locationFilter === 'ALL' ? 'ทุกโซน (ทั้งหมด)' : locationFilter}
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <MapPin size={18} />
          </div>
        </div>
      </div>

      {/* ── 2. ACTION & FILTER TOOLBAR ──────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Bar */}
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="ค้นหาเครื่อง หรือเบอร์สายพาน..."
            />
          </div>

          {/* Location Dropdown */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs shadow-xs">
            <Filter size={13} className="text-slate-400" />
            <span className="font-bold text-slate-500 text-[11px]">โซน:</span>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">ทุกโซน ({machines.length} เครื่อง)</option>
              {locationOptions.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filter Clear Tag */}
          {selectedBelt && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold animate-fadeIn">
              <span>กำลังเจาะลึกเบอร์: <strong>{selectedBelt}</strong></span>
              <button
                type="button"
                onClick={() => setSelectedBelt('')}
                className="hover:text-blue-900 dark:hover:text-white p-0.5 rounded cursor-pointer"
                title="ล้างตัวเลือกเบอร์สายพาน"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-2">
          {/* Print A4 Report Button */}
          <button
            type="button"
            onClick={() => setPrintModalOpen(true)}
            className="btn-outline text-xs px-3 py-2 flex items-center gap-1.5 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100 font-semibold"
            title="พิมพ์รายงานสรุปสายพานส่งด้าย (A4 Portrait)"
          >
            <Printer size={14} className="text-blue-600 dark:text-blue-400" />
            <span>พิมพ์รายงาน A4</span>
          </button>

          {/* Google Sheets Sync Button */}
          <GoogleSheetSyncButton
            sheetName="สายพานส่งด้าย"
            columns={exportCols}
            rows={displayMachines}
            totalCount={machines.length}
            valueGetters={{
              Tape1_No: (m) => getMachineTapes(m)[1] || '',
              Tape2_No: (m) => getMachineTapes(m)[2] || '',
              Tape3_No: (m) => getMachineTapes(m)[3] || '',
              Tape4_No: (m) => getMachineTapes(m)[4] || '',
              Tape5_No: (m) => getMachineTapes(m)[5] || '',
            }}
          />

          {/* Refresh Button */}
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn-outline p-2"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── 3. OVERALL BELTS SUMMARY (Interactive Grid) ────── */}
      <div className="card p-4 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Disc size={16} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              1. สรุปภาพรวมจำนวนสายพานแยกตามเบอร์ (รวมทุกตำแหน่ง เทป 1 - 5)
            </h3>
            <span className="text-[11px] font-normal text-slate-400">
              ({overallSummary.length} เบอร์)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 italic hidden sm:inline">
            * คลิกที่การ์ดเบอร์สายพานเพื่อกรองดูเครื่องจักรที่ใช้เบอร์นั้น
          </span>
        </div>

        {overallSummary.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            ไม่พบข้อมูลสายพานส่งด้ายในกลุ่มเครื่องจักรที่เลือก
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {overallSummary.map((item) => {
              const isSelected = selectedBelt === item.beltNo

              return (
                <button
                  type="button"
                  key={item.beltNo}
                  onClick={() => setSelectedBelt(isSelected ? '' : item.beltNo)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-xs font-black ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                      {item.beltNo}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black font-mono ${
                      isSelected
                        ? 'bg-blue-800 text-blue-100'
                        : 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    }`}>
                      {item.totalQty} เส้น
                    </span>
                  </div>

                  <div className={`text-[10.5px] mt-2 flex items-center justify-between ${
                    isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    <span>ติดตั้งใน:</span>
                    <span className="font-semibold">{item.machineCount} เครื่อง</span>
                  </div>

                  {/* Tape Mini Pills */}
                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[9px] font-mono">
                    {[1, 2, 3, 4, 5].map((pos) => {
                      const count = item.tapePositions[pos]
                      if (!count) return null
                      return (
                        <span
                          key={pos}
                          className={`px-1 py-0.2 rounded font-semibold ${
                            isSelected
                              ? 'bg-blue-700 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                          title={`เทป ${pos}: ${count} เส้น`}
                        >
                          T{pos}:{count}
                        </span>
                      )
                    })}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 4. TAPE BREAKDOWN (Positions 1 to 5) ───────────── */}
      <div className="card p-4 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            2. แจกแจงจำนวนเส้นแยกตามแต่ละตำแหน่ง (เทป 1 ถึง เทป 5)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((pos) => {
            const list = tapeBreakdown[pos] || []
            const tapeTotal = list.reduce((acc, i) => acc + i.qty, 0)

            return (
              <div
                key={pos}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden flex flex-col"
              >
                {/* Tape Header */}
                <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    เทป {pos}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono font-bold text-[10px]">
                    {tapeTotal} เส้น
                  </span>
                </div>

                {/* Belts List */}
                <div className="p-2 space-y-1.5 flex-1 max-h-48 overflow-y-auto">
                  {list.length === 0 ? (
                    <div className="py-4 text-center text-[11px] text-slate-400">
                      ไม่มีสายพาน
                    </div>
                  ) : (
                    list.map((item) => (
                      <div
                        key={item.beltNo}
                        onClick={() => setSelectedBelt(selectedBelt === item.beltNo ? '' : item.beltNo)}
                        className={`px-2 py-1 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          selectedBelt === item.beltNo
                            ? 'bg-blue-500 text-white font-bold'
                            : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        <span className="font-mono font-bold">{item.beltNo}</span>
                        <span className="font-mono text-[11px]">{item.qty} เส้น</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 5. MACHINE DETAIL MATRIX TABLE ─────────────────── */}
      <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              3. ตารางรายเครื่องจักรและเบอร์สายพาน (เทป 1 - 5)
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[10px]">
              {displayMachines.length} เครื่อง
            </span>
          </div>
          {selectedBelt && (
            <button
              type="button"
              onClick={() => setSelectedBelt('')}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X size={12} />
              <span>แสดงเครื่องจักรทั้งหมด</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 text-center w-10">#</th>
                <th className="py-2.5 px-3.5 text-left w-24">รหัสเครื่อง</th>
                <th className="py-2.5 px-3 text-center w-20">โซน</th>
                <th className="py-2.5 px-3 text-left w-28">ประเภท</th>
                <th className="py-2.5 px-2.5 text-center w-20">เทป 1</th>
                <th className="py-2.5 px-2.5 text-center w-20">เทป 2</th>
                <th className="py-2.5 px-2.5 text-center w-20">เทป 3</th>
                <th className="py-2.5 px-2.5 text-center w-20">เทป 4</th>
                <th className="py-2.5 px-2.5 text-center w-20">เทป 5</th>
                <th className="py-2.5 px-3 text-center w-20">ดูข้อมูล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {displayMachines.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 text-xs">
                    ไม่พบเครื่องจักรตามเงื่อนไขที่ค้นหาหรือเลือก
                  </td>
                </tr>
              ) : (
                displayMachines.map((m, idx) => {
                  const tapes = getMachineTapes(m)

                  return (
                    <tr
                      key={m.id || m._id || m.Mc || idx}
                      onClick={() => setDetailRec(m)}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {m.Mc || '—'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {m.Location || '—'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                        {m.Type || '—'}
                      </td>

                      {/* Tape 1 to 5 Columns with Highlight */}
                      {[1, 2, 3, 4, 5].map((pos) => {
                        const belt = tapes[pos]
                        const isMatch = selectedBelt && belt === selectedBelt

                        return (
                          <td key={pos} className="py-2 px-2.5 text-center font-mono">
                            {belt ? (
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] inline-block transition-all ${
                                isMatch
                                  ? 'bg-blue-600 text-white ring-2 ring-blue-400 scale-105'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                              }`}>
                                {belt}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-[11px]">—</span>
                            )}
                          </td>
                        )
                      })}

                      {/* Action */}
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className="py-2 px-3 text-center"
                      >
                        <button
                          type="button"
                          onClick={() => setDetailRec(m)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="ดูรายละเอียดเครื่องจักร"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 6. PRINT MODAL ─────────────────────────────────── */}
      {printModalOpen && (
        <YarnBeltsPrintModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          data={aggregated}
          locationFilter={locationFilter}
          currentUserName={user?.name || user?.username || ''}
        />
      )}
    </div>
  )
}
