import { Ban, CheckCircle2, Clock, DollarSign, ShoppingCart } from 'lucide-react'

export function PurchasingStats({ stats }) {
  return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ใบสั่งซื้อทั้งหมด</div>
            <div className="text-xl font-black mt-0.5" style={{ color: 'var(--text-900)' }}>
              {stats.total} <span className="text-xs font-normal text-slate-400">ใบ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <ShoppingCart size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รอรับสินค้า (Ordered)</div>
            <div className="text-xl font-black mt-0.5 text-blue-600 dark:text-blue-400">
              {stats.ordered} <span className="text-xs font-normal text-slate-400">ใบ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Clock size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รับสินค้าแล้ว (Received)</div>
            <div className="text-xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
              {stats.received} <span className="text-xs font-normal text-slate-400">ใบ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ยกเลิก (Cancelled)</div>
            <div className="text-xl font-black mt-0.5 text-rose-600 dark:text-rose-400">
              {stats.cancelled} <span className="text-xs font-normal text-slate-400">ใบ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <Ban size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">มูลค่าสั่งซื้อรวม</div>
            <div className="text-xl font-black mt-0.5 text-blue-600 dark:text-blue-400">
              ฿{stats.totalAmount.toLocaleString()}
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign size={18} />
          </div>
        </div>
      </div>
  )
}
