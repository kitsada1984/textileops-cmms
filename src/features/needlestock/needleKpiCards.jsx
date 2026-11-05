import { AlertOctagon, Box, CheckCircle2, Clock, ShieldCheck } from 'lucide-react'

export function NeedleKpiCards({ kpis, filterGrade, setActiveTab, setFilterGrade }) {
  return (
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Needles */}
          <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">เข็มทั้งหมดในระบบ</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{kpis.totalNeedles.toLocaleString()}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{kpis.totalSets} ชุดเข็ม</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Box className="w-6 h-6" />
            </div>
          </div>

          {/* Grade A */}
          <div
            onClick={() => { setActiveTab('inventory'); setFilterGrade(filterGrade === 'เกรด A' ? '' : 'เกรด A') }}
            className={`bg-gradient-to-br from-emerald-50 to-white p-4 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition ${
              filterGrade === 'เกรด A' ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-emerald-200 hover:border-emerald-400'
            }`}
          >
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <p className="text-xs font-medium text-emerald-800">เกรด A (พร้อมใช้)</p>
              </div>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{kpis.gradeAQty.toLocaleString()}</h3>
              <p className="text-[11px] text-emerald-600 mt-0.5">{kpis.gradeASets} ชุด</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Grade B */}
          <div
            onClick={() => { setActiveTab('inventory'); setFilterGrade(filterGrade === 'เกรด B' ? '' : 'เกรด B') }}
            className={`bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition ${
              filterGrade === 'เกรด B' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-200 hover:border-blue-400'
            }`}
          >
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <p className="text-xs font-medium text-blue-800">เกรด B (คัดแล้ว)</p>
              </div>
              <h3 className="text-2xl font-bold text-blue-700 mt-1">{kpis.gradeBQty.toLocaleString()}</h3>
              <p className="text-[11px] text-blue-600 mt-0.5">{kpis.gradeBSets} ชุด</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Pending Sorting */}
          <div
            onClick={() => { setActiveTab('inventory'); setFilterGrade(filterGrade === 'รอคัดแยก' ? '' : 'รอคัดแยก') }}
            className={`bg-gradient-to-br from-amber-50 to-white p-4 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition ${
              filterGrade === 'รอคัดแยก' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-amber-200 hover:border-amber-400'
            }`}
          >
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <p className="text-xs font-medium text-amber-800">รอคัดแยก</p>
              </div>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">{kpis.waitQty.toLocaleString()}</h3>
              <p className="text-[11px] text-amber-600 mt-0.5">{kpis.waitSets} ชุด</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Scrap */}
          <div
            onClick={() => { setActiveTab('inventory'); setFilterGrade(filterGrade === 'ปลดระวาง' ? '' : 'ปลดระวาง') }}
            className={`bg-gradient-to-br from-rose-50 to-white p-4 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition ${
              filterGrade === 'ปลดระวาง' ? 'border-rose-500 ring-2 ring-rose-200' : 'border-rose-200 hover:border-rose-400'
            }`}
          >
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <p className="text-xs font-medium text-rose-800">ปลดระวาง</p>
              </div>
              <h3 className="text-2xl font-bold text-rose-700 mt-1">{kpis.scrapQty.toLocaleString()}</h3>
              <p className="text-[11px] text-rose-600 mt-0.5">{kpis.scrapSets} ชุด</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertOctagon className="w-6 h-6" />
            </div>
          </div>
        </section>
  )
}
