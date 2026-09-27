// src/pages/machines/MachinesMobileView.jsx
// Mobile View for Machines: Single-Column Rich Card List + Sticky Search + FAB (< 640px)
// Follows ADR-0002

import React from 'react'
import {
  Plus, Pencil, Trash2, RefreshCw, Cpu, MapPin,
  CheckCircle2, AlertTriangle, FileText, ChevronRight
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
  } = logic

  return (
    <div className="space-y-3 pb-24 machines-mobile-view">
      {/* ── 1. COMPACT TOP STATUS SUMMARY ─────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
          <span className="text-slate-400">ทั้งหมด:</span>
          <span className="font-mono font-bold">{stats.total}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>ปกติ:</span>
          <span className="font-mono font-bold">{stats.running}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>ซ่อม/หยุด:</span>
          <span className="font-mono font-bold">{stats.maintenance}</span>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 active:scale-90 transition-transform ml-auto flex-shrink-0"
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── 2. STICKY TOP SEARCH & FILTER BAR ─────────────────── */}
      <div className="sticky top-0 z-20 -mx-3 px-3 py-2 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('mc_search_ph')}
          />
        </div>
        <FilterSortPanel
          columns={FS_COLS}
          value={filterSort}
          onChange={setFilterSort}
        />
      </div>

      {/* ── 3. SINGLE-COLUMN RICH CARD LIST ───────────────────── */}
      {loading && (
        <div className="text-center py-20 text-slate-400">
          <RefreshCw size={28} className="animate-spin mx-auto mb-2 opacity-60 text-blue-500" />
          <p className="text-xs font-semibold">{t('loading')}</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-2.5">
          {displayRows.map((m, i) => {
            const imageUrl = getMachineImageUrl(m)
            const isRunning = m.Status === 'RUNNING'

            return (
              <div
                key={m._id || m.id || i}
                onClick={() => setDetailRec(m)}
                className={`card p-3 border-l-4 transition-all active:scale-[0.99] cursor-pointer shadow-xs ${
                  isRunning
                    ? 'border-l-emerald-500 border-slate-200 dark:border-slate-800'
                    : 'border-l-amber-500 border-amber-200 dark:border-amber-900/40 bg-amber-50/20'
                }`}
              >
                {/* Header row: Mc, Location & Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-base font-black text-blue-600 dark:text-blue-400 tracking-tight truncate">
                      {m.Mc}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold flex-shrink-0">
                      {m.Location || '—'}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge value={m.Status} />
                  </div>
                </div>

                {/* Body row: Image + Specs */}
                <div className="flex items-start gap-2.5 my-2">
                  {imageUrl && (
                    <div className="flex-shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                      <ImageThumbnail
                        url={imageUrl}
                        alt={m.Mc}
                        size={48}
                        onClick={() => setPreviewImageModal({ url: imageUrl, title: `เครื่องจักร ${m.Mc}` })}
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className="font-bold">{formatMcType(m.Type)}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 truncate">{m.Manufacturer || '—'}</span>
                    </div>

                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold text-slate-700 dark:text-slate-300">
                        {m.Diameter ? `${m.Diameter}"` : '—'} · {m.Gauge ? `${m.Gauge}G` : '—'}
                      </span>
                      {m.Needle && <span>เข็ม: {m.Needle}</span>}
                      {m.WaterCheck && <span className="text-slate-400">น้ำ: {m.WaterCheck}</span>}
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-700 self-center flex-shrink-0" />
                </div>

                {/* Footer action buttons: Large touch targets */}
                <div
                  className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] font-mono text-slate-400">
                    {m.Serial_NEW ? `SN: ${m.Serial_NEW}` : (m.Serial_OLD ? `SN: ${m.Serial_OLD}` : '')}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPdfItem(m)}
                      className="p-2 rounded-xl text-rose-600 bg-rose-50 dark:bg-rose-950/40 active:scale-95 transition-transform"
                      title="พิมพ์ PDF"
                    >
                      <FileText size={15} />
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 active:scale-95 transition-transform"
                        title="แก้ไข"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => del(m._id || m.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 bg-slate-100 dark:bg-slate-800 active:scale-95 transition-transform"
                        title="ลบ"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && displayRows.length === 0 && (
        <div className="card p-10 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800">
          <Cpu size={32} className="mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-xs text-slate-600 dark:text-slate-400">{t('no_data')}</p>
        </div>
      )}

      {/* ── 4. FLOATING ACTION BUTTON (FAB) FOR ADDING MACHINE ──── */}
      {canAdd && (
        <button
          type="button"
          onClick={openNew}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform focus:outline-none focus:ring-4 focus:ring-blue-500/30"
          title="เพิ่มเครื่องจักรใหม่"
          aria-label="เพิ่มเครื่องจักรใหม่"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
