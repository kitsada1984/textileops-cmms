import { useState, useMemo, useEffect } from 'react'
import {
  History,
  ArrowLeft,
  ArrowLeftRight,
  Pencil,
  Calendar,
  User,
  Cpu,
  Disc,
  Search,
  CheckCircle2,
  Layers,
  ChevronRight,
  TableProperties,
} from 'lucide-react'
import Modal from './ui/Modal'
import {
  filterCylinderHistory,
  summarizeCylinderHistory,
  formatHistoryDate,
  buildSwapCompareTable,
  buildUpdateCompareTable,
} from '../utils/cylinderHistory'

/**
 * Chip component for Cylinder identification matching SwapCylinder modal style.
 */
function CylChip({ cyl, color, accent, label }) {
  const currentMachine = cyl?.NewMC || cyl?.Standard
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '5px 12px',
        borderRadius: 12,
        background: `${accent}12`,
        border: `1.5px solid ${accent}35`,
        minWidth: 92,
      }}
    >
      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent }}>
        {label}
      </span>
      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color, lineHeight: 1.1 }}>
        {cyl?.Serial_NOW || '—'}
      </span>
      {currentMachine && (
        <span style={{ fontSize: 10, color: 'var(--text-400)', marginTop: 1 }}>{currentMachine}</span>
      )}
    </div>
  )
}

/**
 * Step Bar matching the SwapCylinder 3-step workflow style.
 */
function HistoryStepBar({ actionType = 'SWAP' }) {
  const steps = actionType === 'SWAP'
    ? ['เลือกกระบอก', 'ตรวจสอบสเปก', 'ยืนยันการสลับ']
    : ['เลือกเครื่องจักร', 'ตรวจสอบข้อมูล', 'บันทึกการเปลี่ยนแปลง']

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, userSelect: 'none' }}>
      {steps.map((label, i) => {
        const s = i + 1
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800,
                background: 'linear-gradient(135deg,#10b981,#059669)',
                color: '#fff',
                boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
              }}>
                <CheckCircle2 size={13} strokeWidth={2.5} />
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: 'var(--text-800)',
                whiteSpace: 'nowrap',
              }}>
                {label} (บันทึกสมบูรณ์)
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 10px',
                background: 'linear-gradient(90deg,#10b981,#059669)',
                borderRadius: 99,
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Detailed side-by-side comparison table matching the Swap modal (CompareTable).
 */
function HistorySwapCompareTable({ item }) {
  const { rows, outCyl, inCyl, swapCount } = useMemo(() => buildSwapCompareTable(item), [item])

  if (!rows || rows.length === 0) {
    return (
      <div className="p-3 text-center text-slate-400 text-xs italic">
        ไม่มีข้อมูลเปรียบเทียบสเปกเพิ่มเติม
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/90 text-xs">
      {/* Cylinder Header Bar (เหมือนตอนเปลี่ยน) */}
      <div
        className="grid grid-cols-[minmax(110px,1.2fr)_60px_minmax(100px,1fr)_24px_minmax(100px,1fr)] p-2.5 px-3 gap-2 items-center bg-gradient-to-r from-amber-500/10 via-slate-100 dark:via-slate-800/40 to-indigo-500/10 border-b border-slate-200 dark:border-slate-800"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">คอลัมน์ / สเปก</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">สถานะ</span>
        <div className="flex justify-center">
          <CylChip cyl={outCyl} color="#d97706" accent="#f59e0b" label="OUT (ออก)" />
        </div>
        <div className="flex items-center justify-center">
          <ArrowLeftRight size={13} className="text-slate-400" />
        </div>
        <div className="flex justify-center">
          <CylChip cyl={inCyl} color="#4f46e5" accent="#6366f1" label="IN (เข้า)" />
        </div>
      </div>

      {/* Legend Banner */}
      <div className="px-3 py-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/30 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center justify-between gap-2 flex-wrap font-medium">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-emerald-500" />
          <span>เปรียบเทียบสเปกตามจริง — ค่าที่เปลี่ยนแปลงแสดงด้วยสีเน้น (ค่าเดิมถูกขีดฆ่า)</span>
        </span>
        <span className="text-slate-500 text-[10px] font-mono">
          สลับข้อมูล {swapCount} คอลัมน์
        </span>
      </div>

      {/* Table rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 overflow-x-auto">
        {rows.map((row) => (
          <div
            key={row.key}
            className={`grid grid-cols-[minmax(110px,1.2fr)_60px_minmax(100px,1fr)_24px_minmax(100px,1fr)] p-2.5 px-3 gap-2 items-center text-xs transition-colors ${
              row.isSwap
                ? 'bg-indigo-50/20 dark:bg-indigo-950/10'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          >
            {/* Column Label */}
            <div className="font-semibold text-slate-700 dark:text-slate-300 truncate">
              {row.label}
            </div>

            {/* Status Badge */}
            <div className="flex justify-center">
              {row.isSwap ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <ArrowLeftRight size={8} /> สลับ
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">
                  คงที่
                </span>
              )}
            </div>

            {/* OUT Cell */}
            <div className="text-center font-mono">
              {row.outChanged ? (
                <div className="flex flex-col items-center">
                  <span className="line-through text-slate-400 text-[10px] leading-tight">
                    {row.outOld || '—'}
                  </span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 text-xs leading-tight">
                    {row.outNew || '—'}
                  </span>
                </div>
              ) : (
                <span className="text-slate-600 dark:text-slate-400 text-xs">
                  {row.outOld || row.outNew || '—'}
                </span>
              )}
            </div>

            {/* Center Arrow */}
            <div className="flex items-center justify-center">
              {row.isSwap ? (
                <ArrowLeftRight size={11} className="text-indigo-400 opacity-60" />
              ) : (
                <div className="w-2.5 h-[1px] bg-slate-200 dark:bg-slate-700" />
              )}
            </div>

            {/* IN Cell */}
            <div className="text-center font-mono">
              {row.inChanged ? (
                <div className="flex flex-col items-center">
                  <span className="line-through text-slate-400 text-[10px] leading-tight">
                    {row.inOld || '—'}
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs leading-tight">
                    {row.inNew || '—'}
                  </span>
                </div>
              ) : (
                <span className="text-slate-600 dark:text-slate-400 text-xs">
                  {row.inOld || row.inNew || '—'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Detailed comparison table for UPDATE entries (single cylinder edit or machine change).
 */
function HistoryUpdateCompareTable({ item }) {
  const { rows } = useMemo(() => buildUpdateCompareTable(item), [item])

  if (!rows || rows.length === 0) {
    return (
      <div className="p-3 text-center text-slate-400 text-xs italic">
        ไม่มีรายละเอียดสเปกที่เปลี่ยนแปลง
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/90 text-xs">
      <div className="grid grid-cols-[minmax(120px,1.2fr)_68px_minmax(100px,1fr)_24px_minmax(100px,1fr)] p-2.5 px-3 gap-2 items-center bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span>คอลัมน์ / สเปก</span>
        <span className="text-center">สถานะ</span>
        <span className="text-center">ค่าเดิม (ก่อนเปลี่ยน)</span>
        <span className="text-center">➔</span>
        <span className="text-center">ค่าใหม่ (หลังเปลี่ยน)</span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 overflow-x-auto">
        {rows.map((row) => (
          <div
            key={row.key}
            className={`grid grid-cols-[minmax(120px,1.2fr)_68px_minmax(100px,1fr)_24px_minmax(100px,1fr)] p-2.5 px-3 gap-2 items-center text-xs transition-colors ${
              row.changed
                ? 'bg-blue-50/20 dark:bg-blue-950/15'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          >
            <div className="font-semibold text-slate-700 dark:text-slate-300 truncate">
              {row.label}
            </div>

            <div className="flex justify-center">
              {row.changed ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Pencil size={8} /> เปลี่ยนแปลง
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">คงเดิม</span>
              )}
            </div>

            <div className="text-center font-mono">
              <span className={row.changed ? 'line-through text-slate-400 text-xs' : 'text-slate-600 dark:text-slate-400 text-xs'}>
                {row.oldVal || '—'}
              </span>
            </div>

            <div className="flex items-center justify-center text-slate-400">
              ➔
            </div>

            <div className="text-center font-mono">
              <span className={row.changed ? 'font-bold text-blue-600 dark:text-blue-400 text-xs' : 'text-slate-600 dark:text-slate-400 text-xs'}>
                {row.newVal || '—'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Dedicated Full Screen / Drill-down view for a selected history entry,
 * looking exactly like the Swap confirmation screen.
 */
function HistoryItemDetailView({ item, onBack }) {
  const isSwap = item.type === 'SWAP'

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Navigation & Info Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={14} />
          <span>ย้อนกลับไปรายการประวัติทั้งหมด</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs ${
              isSwap
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
            }`}
          >
            {isSwap ? <ArrowLeftRight size={13} /> : <Pencil size={13} />}
            <span>{isSwap ? 'รายการสลับกระบอก (SWAP)' : 'รายการแก้ไข / ย้ายเครื่อง'}</span>
          </span>

          <span className="text-xs text-slate-500 flex items-center gap-1 font-mono bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
            <Calendar size={13} className="text-slate-400" />
            <span>{formatHistoryDate(item.date)}</span>
          </span>

          <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg font-medium">
            <User size={13} className="text-slate-400" />
            <span>ผู้ดำเนินการ: {item.user}</span>
          </span>
        </div>
      </div>

      {/* Step Bar (เหมือนตอนทำรายการสลับกระบอก) */}
      <HistoryStepBar actionType={item.type} />

      {/* Detailed Compare Table */}
      {isSwap ? (
        <HistorySwapCompareTable item={item} />
      ) : (
        <HistoryUpdateCompareTable item={item} />
      )}

      {/* Bottom Remarks & Record ID Card */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
        <div className="flex items-center justify-between text-slate-500 font-medium">
          <span>หมายเหตุการดำเนินการ:</span>
          {item.raw?.RecordID && (
            <span className="font-mono text-[11px] text-slate-400">
              Record ID: {item.raw.RecordID}
            </span>
          )}
        </div>
        <div className="text-slate-700 dark:text-slate-200 font-medium bg-white dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
          {item.comment || 'ไม่มีหมายเหตุเพิ่มเติม'}
        </div>
      </div>
    </div>
  )
}

export default function CylinderHistoryModal({
  open,
  onClose,
  cylinder = null,
  machineCode = '',
  auditLogs = [],
}) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('auto') // 'cylinder' | 'machine' | 'all' | 'auto'
  const [selectedItem, setSelectedItem] = useState(null)

  const effectiveSerial = cylinder?.Serial_NOW || cylinder?.Serial_OLD || ''
  const effectiveMc = machineCode || cylinder?.NewMC || cylinder?.OLDMC || ''

  // Reset selected item when modal opens or target changes
  useEffect(() => {
    if (open) {
      setSelectedItem(null)
    }
  }, [open, cylinder, machineCode])

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
                {selectedItem
                  ? 'รายละเอียดประวัติการเปลี่ยนกระบอก'
                  : 'ประวัติการเปลี่ยน / สลับกระบอกเข็ม'}
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
              {selectedItem
                ? 'กดดูรายละเอียดตารางเปรียบเทียบสเปกแบบเต็มเหมือนตอนขั้นตอนสลับกระบอก'
                : 'คลิกที่รายการใดก็ได้เพื่อเปิดดูรายละเอียดเปรียบเทียบสเปกแบบเต็มเหมือนตอนสลับ'}
            </div>
          </div>
        </div>
      }
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full text-xs text-slate-500">
          {selectedItem ? (
            <button
              type="button"
              className="btn-outline px-3.5 py-1.5 flex items-center gap-1.5 font-medium"
              onClick={() => setSelectedItem(null)}
            >
              <ArrowLeft size={13} />
              <span>กลับไปหน้ารายการประวัติ</span>
            </button>
          ) : (
            <span>พบ {historyList.length} รายการบันทึกประวัติ (คลิกรายการเพื่อดูแบบละเอียด)</span>
          )}

          <button type="button" className="btn-outline px-4 py-1.5 font-medium" onClick={onClose}>
            ปิดหน้าต่าง
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* If an item is selected, show its full dedicated comparison view! */}
        {selectedItem ? (
          <HistoryItemDetailView
            item={selectedItem}
            onBack={() => setSelectedItem(null)}
          />
        ) : (
          <>
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
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex-wrap">
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

              <div className="relative flex-1 sm:w-64">
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

            {/* ── Timeline List: Clickable cards to open full detail ── */}
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
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
                      onClick={() => setSelectedItem(item)}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-2.5 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all relative overflow-hidden"
                      title="คลิกเพื่อดูรายละเอียดแบบเต็มเหมือนตอนสลับกระบอก"
                    >
                      {/* Accent left highlight bar on hover */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-indigo-500 transition-colors" />

                      {/* Top Bar: Action Badge + Date + User + CTA */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pl-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                              isSwap
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {isSwap ? <ArrowLeftRight size={11} /> : <Pencil size={11} />}
                            <span>{isSwap ? 'สลับกระบอก (SWAP)' : 'แก้ไข / ย้ายเครื่อง'}</span>
                          </span>

                          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                            <Calendar size={11} className="text-slate-400" />
                            <span>{formatHistoryDate(item.date)}</span>
                          </span>

                          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                            <User size={11} className="text-slate-400" />
                            <span>{item.user}</span>
                          </span>
                        </div>

                        {/* CTA button */}
                        <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <TableProperties size={12} />
                          <span>ดูรายละเอียดเหมือนตอนสลับ</span>
                          <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>

                      {/* Summary Box */}
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] ml-1">
                        {isSwap ? (
                          <div className="flex items-center justify-between gap-2 flex-wrap font-mono">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px]">OUT</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{item.out?.serial || '—'}</span>
                              <span className="text-slate-400">(เครื่อง {item.out?.mc || '—'})</span>
                            </div>
                            <div className="flex items-center gap-1 text-indigo-500 font-bold text-[11px]">
                              <ArrowLeftRight size={12} />
                              <span className="text-[10px] uppercase font-sans">สลับคู่กับ</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">IN</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{item.in?.serial || '—'}</span>
                              <span className="text-slate-400">(เครื่อง {item.in?.mc || '—'})</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-500">เครื่องจักร:</span>
                            <span className="font-mono line-through text-slate-400">{item.mcFrom || '—'}</span>
                            <span className="text-slate-400">➔</span>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{item.mcTo || '—'}</span>
                            {item.locFrom || item.locTo ? (
                              <span className="text-slate-400 ml-2">
                                (ตำแหน่ง: {item.locFrom || '—'} ➔ {item.locTo || '—'})
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Comment preview if present */}
                      {item.comment && (
                        <div className="text-[11px] text-slate-500 italic bg-slate-50/50 dark:bg-slate-900/30 px-2 py-1 rounded-md ml-1 truncate">
                          "{item.comment}"
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
