import { useMemo, useState } from 'react'
import {
  Cpu,
  Package,
  History,
  Search,
  DollarSign,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Calendar,
  User,
  Tag,
} from 'lucide-react'
import { format } from 'date-fns'
import Modal from '../ui/Modal'
import { filterTransactionsByMachine, summarizeMachineParts, getMovementMC } from '../../utils/stockMovementMC'

export default function MachinePartsHistoryModal({
  open,
  onClose,
  machineCode,
  transactions = [],
  onSelectTxn,
}) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('list') // 'list' | 'breakdown'

  const machineTxs = useMemo(() => {
    return filterTransactionsByMachine(transactions, machineCode).sort((a, b) => {
      const dateA = new Date(a.created_date || a.Date || 0)
      const dateB = new Date(b.created_date || b.Date || 0)
      return dateB - dateA
    })
  }, [transactions, machineCode])

  const summary = useMemo(() => {
    return summarizeMachineParts(machineTxs)
  }, [machineTxs])

  const filteredTxs = useMemo(() => {
    if (!search.trim()) return machineTxs
    const q = search.trim().toLowerCase()
    return machineTxs.filter((tx) =>
      [
        tx.Part_Code,
        tx.Part_Name_EN,
        tx.Part_Name_TH,
        tx.Reference,
        tx.Performed_By,
        tx.Note,
      ].some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [machineTxs, search])

  const filteredBreakdown = useMemo(() => {
    if (!search.trim()) return summary.partBreakdown
    const q = search.trim().toLowerCase()
    return summary.partBreakdown.filter((p) =>
      p.partCode.toLowerCase().includes(q) || p.partName.toLowerCase().includes(q)
    )
  }, [summary.partBreakdown, search])

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Cpu size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                ประวัติการใช้อะไหล่เครื่องจักร:
              </span>
              <span className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
                {machineCode || '—'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-normal">
              ตรวจสอบประวัติย้อนหลังว่าเครื่องนี้เคยเปลี่ยนอะไหล่อะไรไปบ้าง มีอะไหล่ชิ้นไหนเสีย
            </div>
          </div>
        </div>
      }
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full text-xs text-slate-500">
          <span>พบ {machineTxs.length} รายการเคลื่อนไหวสำหรับเครื่อง {machineCode}</span>
          <button type="button" className="btn-outline px-4" onClick={onClose}>
            ปิดหน้าต่าง
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Stat Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="card p-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">จำนวนชิ้นที่เปลี่ยน</div>
            <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
              {summary.totalQty.toLocaleString()} <span className="text-[11px] font-normal text-slate-400">ชิ้น</span>
            </div>
          </div>

          <div className="card p-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ชนิดอะไหล่ที่เคยเปลี่ยน</div>
            <div className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">
              {summary.uniquePartsCount.toLocaleString()} <span className="text-[11px] font-normal text-slate-400">ชนิด</span>
            </div>
          </div>

          <div className="card p-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">มูลค่าอะไหล่รวม</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              ฿{summary.totalCost.toLocaleString()}
            </div>
          </div>

          <div className="card p-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">จำนวนครั้งที่ทำรายการ</div>
            <div className="text-lg font-black text-slate-700 dark:text-slate-300 mt-0.5">
              {summary.totalTransactions.toLocaleString()} <span className="text-[11px] font-normal text-slate-400">ครั้ง</span>
            </div>
          </div>
        </div>

        {/* Toolbar: Search + View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              className="input pl-8 py-1.5 text-xs w-full"
              placeholder="ค้นหารหัส / ชื่ออะไหล่ / ผู้เบิก..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('list')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                tab === 'list'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <History size={13} />
              <span>ประวัติไทม์ไลน์ ({filteredTxs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('breakdown')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                tab === 'breakdown'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Layers size={13} />
              <span>สรุปตามชนิดอะไหล่ ({filteredBreakdown.length})</span>
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="max-h-[380px] overflow-y-auto">
            {tab === 'list' ? (
              <table className="table w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px] z-10">
                  <tr>
                    <th className="py-2.5 px-3 text-left">วันที่</th>
                    <th className="py-2.5 px-3 text-left">ประเภท</th>
                    <th className="py-2.5 px-3 text-left">รหัสอะไหล่</th>
                    <th className="py-2.5 px-3 text-left">ชื่ออะไหล่</th>
                    <th className="py-2.5 px-3 text-right">จำนวน</th>
                    <th className="py-2.5 px-3 text-right">มูลค่า</th>
                    <th className="py-2.5 px-3 text-left">ผู้ทำรายการ</th>
                    <th className="py-2.5 px-3 text-left">อ้างอิง/ใบงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredTxs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400">
                        ไม่พบประวัติการใช้อะไหล่สำหรับเครื่อง {machineCode}
                      </td>
                    </tr>
                  ) : (
                    filteredTxs.map((tx, idx) => {
                      const qty = Math.abs(Number(tx.Qty_Change || tx.Quantity || 0))
                      const unitPrice = Number(tx.Unit_Price || 0)
                      const isIssue = tx.TXN_Type === 'ISSUE' || tx.TXN_Type === 'USE'
                      return (
                        <tr
                          key={tx._id || tx.id || idx}
                          onClick={() => onSelectTxn && onSelectTxn(tx)}
                          className={`hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors ${
                            onSelectTxn ? 'cursor-pointer' : ''
                          }`}
                        >
                          <td className="py-2 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {tx.created_date ? format(new Date(tx.created_date), 'dd/MM/yyyy HH:mm') : '—'}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isIssue
                                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                              }`}
                            >
                              {tx.TXN_Type === 'RECEIVE' ? 'รับเข้า' : tx.TXN_Type === 'ADJUST' ? 'ปรับปรุง' : 'เบิกใช้'}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-mono font-bold text-blue-600 dark:text-blue-400">
                            {tx.Part_Code}
                          </td>
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-200 max-w-[200px] truncate">
                            {tx.Part_Name_EN || tx.Part_Name_TH || '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap text-rose-600 dark:text-rose-400">
                            -{qty} {tx.Unit || ''}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {unitPrice > 0 ? `฿${(qty * unitPrice).toLocaleString()}` : '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {tx.Performed_By || tx.Created_By || '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                            {tx.Reference || tx.Reference_ID || '—'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table className="table w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px] z-10">
                  <tr>
                    <th className="py-2.5 px-3 text-left">รหัสอะไหล่</th>
                    <th className="py-2.5 px-3 text-left">ชื่ออะไหล่</th>
                    <th className="py-2.5 px-3 text-right">จำนวนที่เคยเปลี่ยนรวม</th>
                    <th className="py-2.5 px-3 text-right">ความถี่ (ครั้ง)</th>
                    <th className="py-2.5 px-3 text-right">มูลค่ารวม</th>
                    <th className="py-2.5 px-3 text-left">เปลี่ยนล่าสุดเมื่อ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        ไม่พบข้อมูลสรุปอะไหล่สำหรับเครื่อง {machineCode}
                      </td>
                    </tr>
                  ) : (
                    filteredBreakdown.map((item) => (
                      <tr key={item.partCode} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-blue-600 dark:text-blue-400">
                          {item.partCode}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200 font-medium">
                          {item.partName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                          {item.totalQty.toLocaleString()} {item.unit || ''}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-purple-600 dark:text-purple-400 font-bold">
                          {item.count} ครั้ง
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {item.totalCost > 0 ? `฿${item.totalCost.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {item.lastDate ? format(new Date(item.lastDate), 'dd/MM/yyyy') : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
