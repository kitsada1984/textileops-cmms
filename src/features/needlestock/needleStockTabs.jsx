import { Package, ScrollText, Layers } from 'lucide-react'

export function NeedleStockTabs({ activeTab, setActiveTab, needleSets, historyLogs, spareRequests }) {
  return (
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar flex-nowrap" role="tablist">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Package className="w-4 h-4 text-sky-600" />
            <span>รายการชุดเข็ม & สต็อก</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 font-semibold">
              {needleSets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-white text-slate-900 border border-slate-200 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <ScrollText className="w-4 h-4 text-slate-500" />
            <span>สมุดบันทึกการเคลื่อนไหวสต็อก (Ledger)</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              {historyLogs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('spare_requests')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'spare_requests'
                ? 'bg-white text-slate-900 border border-slate-200 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>รายการขอเบิกเข็ม Spare</span>
            {spareRequests.filter(r => r.status === 'PENDING').length > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-500 text-white font-bold animate-pulse">
                รอจ่าย {spareRequests.filter(r => r.status === 'PENDING').length}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 font-semibold">
                {spareRequests.length}
              </span>
            )}
          </button>
        </div>
  )
}
