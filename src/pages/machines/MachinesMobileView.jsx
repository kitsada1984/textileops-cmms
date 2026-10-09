// src/pages/machines/MachinesMobileView.jsx
// Modern Industrial Mobile View for Machines (< 640px)
// Follows ADR-0002 & TextileOps Mobile Ergonomics Standards

import React, { useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Cpu,
  MapPin,
  FileText,
  ChevronRight,
  Sparkles,
  Search,
  X,
  SlidersHorizontal,
} from 'lucide-react'
import SearchInput from '../../components/ui/SearchInput'
import FilterSortPanel from '../../components/ui/FilterSortPanel'
import StatusBadge from '../../components/ui/StatusBadge'
import ImageThumbnail from '../../components/ui/ImageThumbnail'
import { formatMcType, getMachineImageUrl } from './useMachinesLogic'

export default function MachinesMobileView({ logic }) {
  const {
    t,
    canAdd,
    canEdit,
    canDelete,
    loading,
    load,
    stats,
    search,
    setSearch,
    filterSort,
    setFilterSort,
    FS_COLS,
    displayRows,
    openNew,
    openEdit,
    del,
    setDetailRec,
    setPdfItem,
    setPreviewImageModal,
    toggleLocationFilter,
    activeLocationFilters,
  } = logic

  // Quick Status Filter State (for fast one-tap filtering on mobile)
  const [quickStatus, setQuickStatus] = useState('ALL') // 'ALL' | 'RUNNING' | 'MAINTENANCE'

  const filteredDisplayRows = React.useMemo(() => {
    if (quickStatus === 'ALL') return displayRows
    if (quickStatus === 'RUNNING') {
      return displayRows.filter((m) => m.Status === 'RUNNING')
    }
    if (quickStatus === 'MAINTENANCE') {
      return displayRows.filter((m) => m.Status === 'MAINTENANCE' || m.Status === 'STOP')
    }
    return displayRows
  }, [displayRows, quickStatus])

  return (
    <div className="space-y-3 pb-28 machines-mobile-view select-none">
      {/* ── 1. ERGONOMIC TOP STATUS SUMMARY CHIPS ─────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {/* All Filter Chip */}
        <button
          type="button"
          onClick={() => setQuickStatus('ALL')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all active:scale-95 shadow-2xs ${
            quickStatus === 'ALL'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80'
          }`}
        >
          <span className={quickStatus === 'ALL' ? 'text-blue-100' : 'text-slate-400'}>ทั้งหมด</span>
          <span className="font-mono font-bold">{stats.total}</span>
        </button>

        {/* Running Filter Chip */}
        <button
          type="button"
          onClick={() => setQuickStatus((prev) => (prev === 'RUNNING' ? 'ALL' : 'RUNNING'))}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all active:scale-95 shadow-2xs ${
            quickStatus === 'RUNNING'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>ปกติ</span>
          <span className="font-mono font-bold">{stats.running}</span>
        </button>

        {/* Maintenance / Stop Filter Chip */}
        <button
          type="button"
          onClick={() => setQuickStatus((prev) => (prev === 'MAINTENANCE' ? 'ALL' : 'MAINTENANCE'))}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all active:scale-95 shadow-2xs ${
            quickStatus === 'MAINTENANCE'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
              : 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>ซ่อม/หยุด</span>
          <span className="font-mono font-bold">{stats.maintenance}</span>
        </button>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-500 active:scale-90 transition-transform ml-auto flex-shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center shadow-2xs"
          title="รีเฟรชข้อมูล"
          aria-label="รีเฟรชข้อมูล"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-blue-500' : ''} />
        </button>
      </div>

      {/* ── 1.2 ZONE / LOCATION QUICK CHIPS ─────────────────── */}
      {stats.locationStats?.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap pl-0.5 flex items-center gap-1 flex-shrink-0">
            <MapPin size={12} className="text-indigo-500" /> โซน:
          </span>
          {stats.locationStats.map((loc) => {
            const isActive = activeLocationFilters?.includes(loc.name.toLowerCase())
            return (
              <button
                key={loc.name}
                type="button"
                onClick={() => toggleLocationFilter(loc.name)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-semibold whitespace-nowrap transition-all active:scale-95 shadow-2xs ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 ring-1.5 ring-indigo-400'
                    : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-200/80 dark:border-slate-700/80'
                }`}
              >
                <span>{loc.name}</span>
                <span
                  className={`text-[10px] font-mono px-1 rounded ${
                    isActive
                      ? 'bg-indigo-700 text-white'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300'
                  }`}
                >
                  {loc.count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── 2. STICKY TOP SEARCH & FILTER BAR ─────────────────── */}
      <div className="sticky top-0 z-20 -mx-3 px-3 py-2 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2 transition-colors">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('mc_search_ph')}
          />
        </div>
        <FilterSortPanel
          cols={FS_COLS}
          value={filterSort}
          onChange={setFilterSort}
        />
      </div>

      {/* ── 3. CARD LIST FEED ─────────────────────────────────── */}
      {loading && (
        <div className="text-center py-20 text-slate-400">
          <RefreshCw size={30} className="animate-spin mx-auto mb-2 opacity-60 text-blue-500" />
          <p className="text-xs font-semibold">{t('loading')}</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {filteredDisplayRows.map((m, i) => {
            const imageUrl = getMachineImageUrl(m)
            const isRunning = m.Status === 'RUNNING'
            const isMaintenance = m.Status === 'MAINTENANCE'

            return (
              <div
                key={m._id || m.id || i}
                onClick={() => setDetailRec(m)}
                className={`rounded-2xl border transition-all active:scale-[0.98] cursor-pointer shadow-xs bg-white dark:bg-slate-900 overflow-hidden ${
                  isRunning
                    ? 'border-l-4 border-l-emerald-500 border-slate-200/90 dark:border-slate-800'
                    : isMaintenance
                      ? 'border-l-4 border-l-amber-500 border-amber-200/80 dark:border-amber-900/50 bg-amber-50/20'
                      : 'border-l-4 border-l-rose-500 border-rose-200/80 dark:border-rose-900/50 bg-rose-50/20'
                }`}
              >
                {/* Top Section: Mc Code, Location & Status */}
                <div className="p-3.5 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-base font-black text-blue-600 dark:text-blue-400 tracking-tight bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                        {m.Mc}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex-shrink-0">
                        <MapPin size={11} className="text-slate-400" />
                        {m.Location || '—'}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      <StatusBadge value={m.Status} />
                    </div>
                  </div>

                  {/* Middle Section: Thumbnail + Specs Matrix */}
                  <div className="flex items-start gap-3 my-2.5">
                    {imageUrl ? (
                      <div
                        className="flex-shrink-0 pt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ImageThumbnail
                          url={imageUrl}
                          alt={m.Mc}
                          size={52}
                          onClick={() =>
                            setPreviewImageModal({
                              url: imageUrl,
                              title: `เครื่องจักร ${m.Mc}`,
                            })
                          }
                        />
                      </div>
                    ) : (
                      <div className="w-[52px] h-[52px] rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center flex-shrink-0 text-slate-400">
                        <Cpu size={22} className="opacity-40" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold">
                        <span>{formatMcType(m.Type)}</span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-slate-600 dark:text-slate-400 font-medium truncate">
                          {m.Manufacturer || '—'}
                        </span>
                      </div>

                      {/* Specs Tags Matrix */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                        <span className="font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-bold border border-blue-200/40 dark:border-blue-800/40">
                          {m.Diameter ? `${m.Diameter}"` : '—'} · {m.Gauge ? `${m.Gauge}G` : '—'}
                        </span>
                        {m.Needle && (
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-md">
                            เข็ม: {m.Needle}
                          </span>
                        )}
                        {m.Feeder && (
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-md">
                            Feeder: {m.Feeder}
                          </span>
                        )}
                        {m.WaterCheck && (
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            น้ำ: {m.WaterCheck}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 self-center flex-shrink-0" />
                  </div>
                </div>

                {/* Bottom Section: Serial & Action Buttons */}
                <div
                  className="px-3.5 py-2 bg-slate-50/60 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[11px] font-mono text-slate-400 truncate max-w-[140px]">
                    {m.Serial_NEW ? `SN: ${m.Serial_NEW}` : m.Serial_OLD ? `SN: ${m.Serial_OLD}` : '—'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Print PDF Button */}
                    <button
                      type="button"
                      onClick={() => setPdfItem(m)}
                      className="px-2.5 py-1.5 rounded-xl text-rose-600 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 border border-rose-200/50 dark:border-rose-900/40 active:scale-95 transition-all flex items-center gap-1 text-[11px] font-bold shadow-2xs"
                      title="พิมพ์ PDF"
                    >
                      <FileText size={14} />
                      <span>PDF</span>
                    </button>

                    {/* Edit Button */}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        className="px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 active:scale-95 transition-all flex items-center gap-1 text-[11px] font-bold shadow-2xs"
                        title="แก้ไข"
                      >
                        <Pencil size={14} />
                        <span>แก้ไข</span>
                      </button>
                    )}

                    {/* Delete Button */}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => del(m._id || m.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/60 dark:border-slate-700/60 active:scale-95 transition-all min-w-[34px] min-h-[34px] flex items-center justify-center shadow-2xs"
                        title="ลบ"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredDisplayRows.length === 0 && (
        <div className="rounded-2xl p-10 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 space-y-3">
          <Cpu size={36} className="mx-auto opacity-40 text-slate-400" />
          <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">
            {quickStatus !== 'ALL' || search
              ? 'ไม่พบข้อมูลเครื่องจักรที่ตรงกับเงื่อนไข'
              : t('no_data')}
          </p>
          {(quickStatus !== 'ALL' || search) && (
            <button
              type="button"
              onClick={() => {
                setQuickStatus('ALL')
                setSearch('')
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold active:scale-95 transition-transform"
            >
              <X size={13} />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}
        </div>
      )}

      {/* ── 4. MODERN FLOATING ACTION BUTTON (FAB) ──────────────── */}
      {canAdd && (
        <button
          type="button"
          onClick={openNew}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/35 flex items-center justify-center active:scale-90 transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/30"
          title="เพิ่มเครื่องจักรใหม่"
          aria-label="เพิ่มเครื่องจักรใหม่"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
