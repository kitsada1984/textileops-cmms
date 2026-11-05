import { AlertTriangle, ArrowDownLeft, ArrowUpRight, PackageCheck } from 'lucide-react'

export function NeedleActivityStrip({ kpis, setActiveTab, setOnlyLowStock }) {
  return (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">สต็อกพร้อมใช้ (A+B)</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mt-0.5">{kpis.totalAvailable.toLocaleString()}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">เข็มสภาพใช้งานได้</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50/80 to-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">รับเข้าสะสม (In)</p>
              <h3 className="text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5">{kpis.totalReceived.toLocaleString()}</h3>
              <p className="text-[10px] text-emerald-600 mt-0.5">เล่มที่นำเข้าคลัง</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50/80 to-white p-3.5 sm:p-4 rounded-2xl border border-blue-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">เบิกออกสะสม (Out)</p>
              <h3 className="text-xl sm:text-2xl font-bold text-blue-700 mt-0.5">{kpis.totalIssued.toLocaleString()}</h3>
              <p className="text-[10px] text-blue-600 mt-0.5">เล่มที่ขึ้นเครื่อง</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => { setActiveTab('inventory'); setOnlyLowStock(prev => !prev) }}
            className="bg-gradient-to-br from-amber-50/80 to-white p-3.5 sm:p-4 rounded-2xl border border-amber-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
          >
            <div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">สต็อกเหลือน้อย</p>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-amber-700 mt-0.5">{kpis.lowStockCount} ชุด</h3>
              <p className="text-[10px] text-amber-600 mt-0.5">ตัดทิ้งสะสม: {kpis.totalScrappedAccum.toLocaleString()} เล่ม</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </section>
  )
}
