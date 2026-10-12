import { useState, useMemo } from 'react'
import {
  History,
  ArrowLeftRight,
  Pencil,
  Plus,
  Calendar,
  User,
  MapPin,
  Cpu,
  Disc,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react'
import Modal from './ui/Modal'
import {
  filterCylinderHistory,
  summarizeCylinderHistory,
  formatHistoryDate,
} from '../utils/cylinderHistory'

export default function CylinderHistoryModal({
  open,
  onClose,
  cylinder = null,
  machineCode = '',
  auditLogs = [],
}) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('auto') // 'cylinder' | 'machine' | 'all' | 'auto'

  const effectiveSerial = cylinder?.Serial_NOW || cylinder?.Serial_OLD || ''
  const effectiveMc = machineCode || cylinder?.NewMC || cylinder?.OLDMC || ''

  // Determine current filter criteria based on tab
  const criteria = useMemo(() => {
    if (activeTab === 'cylinder') {
      return { serial: effectiveSerial, cylinderId: cylinder?.id || cylinder?._id }
    }
    if (activeTab === 'machine') {
      return { mc: effectiveMc }
    }
    // 'auto' or 'all': include both
    return {
      serial: effectiveSerial,
      mc: effectiveMc,
      cylinderId: cylinder?.id || cylinder?._id,
    }
  }, [activeTab, effectiveSerial, effectiveMc, cylinder])

  const historyList = useMemo(() => {
    return filterCylinderHistory(auditLogs, criteria)
  }, [auditLogs, criteria])

  const summary = useMemo(() => {
    return summarizeCylinderHistory(historyList)
  }, [historyList])

  const filteredItems = useMemo(() => {
    if (!search.trim()) return historyList
    const q = search.trim().toLowerCase()
    return historyList.filter((item) => {
      const comment = String(item.comment || '').toLowerCase()
      const user = String(item.user || '').toLowerCase()
      const serials = [item.in?.serial, item.out?.serial, item.serial].filter(Boolean).join(' ').toLowerCase()
      const mcs = [item.in?.mc, item.out?.mc, item.mcFrom, item.mcTo].filter(Boolean).join(' ').toLowerCase()
      return comment.includes(q) || user.includes(q) || serials.includes(q) || mcs.includes(q)
    })
  }, [historyList, search])

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <History size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                ประวัติการเปลี่ยน / สลับกระบอกเข็ม
              </span>
              {effectiveMc && (
                <span className="font-mono font-bold text-[11px] bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg border border-blue-500/20">
                  เครื่อง {effectiveMc}
                </span>
              )}
              {effectiveSerial && (
                <span className="font-mono font-bold text-[11px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                  กระบอก {effectiveSerial}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-normal mt-0.5">
              ตรวจสอบประวัติย้อนหลังว่าเคยเปลี่ยนกระบอกไปกี่ครั้ง วันที่ใด และสลับกับกระบอก/เครื่องใดบ้าง
            </div>
          </div>
        </div>
      }
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full text-xs text-slate-500">
          <span>พบ {historyList.length} รายการบันทึกประวัติ</span>
          <button type="button" className="btn-outline px-4" onClick={onClose}>
            ปิดหน้าต่าง
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* ── Summary Metric Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-400">ประวัติทั้งหมด</div>
            <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {summary.total} <span className="text-xs font-normal text-slate-500">ครั้ง</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
            <div className="text-[10px] font-bold uppercase text-indigo-500">สลับกระบอก (SWAP)</div>
            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {summary.swapCount} <span className="text-xs font-normal text-indigo-400">ครั้ง</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
            <div className="text-[10px] font-bold uppercase text-blue-500">แก้ไข/ย้ายเครื่อง</div>
            <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
              {summary.updateCount} <span className="text-xs font-normal text-blue-400">ครั้ง</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">เปลี่ยนล่าสุด</div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 truncate">
              {summary.lastDate}
            </div>
          </div>
        </div>

        {/* ── Filter Tabs & Search Bar ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            {effectiveSerial && (
              <button
                type="button"
                onClick={() => setActiveTab('cylinder')}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                  activeTab === 'cylinder'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Disc size={13} />
                <span>ตามกระบอกนี้</span>
              </button>
            )}
            {effectiveMc && (
              <button
                type="button"
                onClick={() => setActiveTab('machine')}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                  activeTab === 'machine'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Cpu size={13} />
                <span>ตามเครื่อง ({effectiveMc})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                activeTab === 'all' || activeTab === 'auto'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Layers size={13} />
              <span>ทั้งหมด</span>
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา ช่าง, เครื่อง, ซีเรียล..."
              className="input pl-8 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {/* ── Timeline List ── */}
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {filteredItems.length === 0 ? (
            <div className="p-10 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <History size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
              <div className="font-semibold text-slate-600 dark:text-slate-400">
                ยังไม่พบประวัติการเปลี่ยนกระบอก
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                ประวัติจะถูกบันทึกอัตโนมัติเมื่อทำรายการสลับกระบอก หรือแก้ไขรหัสเครื่องจักร
              </div>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSwap = item.type === 'SWAP'

              return (
                <div
                  key={item.id || idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-2.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  {/* Top Bar: Action Badge + Date + User */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                          isSwap
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {isSwap ? <ArrowLeftRight size={11} /> : <Pencil size={11} />}
                        <span>{isSwap ? 'สลับกระบอก' : 'แก้ไข / ย้ายเครื่อง'}</span>
                      </span>

                      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                        <Calendar size={11} className="text-slate-400" />
                        <span>{formatHistoryDate(item.date)}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <User size={11} className="text-slate-400" />
                      <span>{item.user}</span>
                    </div>
                  </div>

                  {/* Body: Difference / Details */}
                  {isSwap ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px]">
                      {/* Left Cylinder */}
                      <div className="space-y-1">
                        <div className="font-bold text-slate-500 text-[10px] uppercase">กระบอกที่ 1</div>
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                          <Disc size={12} className="text-indigo-500" />
                          <span>{item.in.serial || '—'}</span>
                        </div>
                        <div className="text-slate-500 flex items-center gap-1 text-[11px]">
                          <Cpu size={11} />
                          <span>เครื่อง: <strong className="font-mono text-slate-700 dark:text-slate-300">{item.in.mc || '—'}</strong></span>
                          {item.in.loc && <span className="text-slate-400">({item.in.loc})</span>}
                        </div>
                      </div>

                      {/* Right Cylinder */}
                      <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 pt-2 sm:pt-0 sm:pl-3">
                        <div className="font-bold text-slate-500 text-[10px] uppercase">กระบอกที่ 2 (คู่สลับ)</div>
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                          <Disc size={12} className="text-amber-500" />
                          <span>{item.out.serial || '—'}</span>
                        </div>
                        <div className="text-slate-500 flex items-center gap-1 text-[11px]">
                          <Cpu size={11} />
                          <span>เครื่อง: <strong className="font-mono text-slate-700 dark:text-slate-300">{item.out.mc || '—'}</strong></span>
                          {item.out.loc && <span className="text-slate-400">({item.out.loc})</span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
                      {item.mcFrom || item.mcTo ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">เครื่องจักร:</span>
                          <span className="font-mono line-through text-slate-400">{item.mcFrom || '—'}</span>
                          <span className="text-slate-400">➔</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{item.mcTo || '—'}</span>
                        </div>
                      ) : null}
                      {item.locFrom || item.locTo ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">ตำแหน่ง:</span>
                          <span className="line-through text-slate-400">{item.locFrom || '—'}</span>
                          <span className="text-slate-400">➔</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{item.locTo || '—'}</span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Comment */}
                  {item.comment && (
                    <div className="text-[11px] text-slate-500 italic bg-slate-50/50 dark:bg-slate-900/30 px-2 py-1 rounded-md">
                      "{item.comment}"
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </Modal>
  )
}
