// src/pages/machines/MachinesTabletView.jsx
// Tablet View for Machines: 2-Column Responsive Cards Grid (640px - 1024px)
// Follows ADR-0002

import React from 'react'
import {
  Plus, Pencil, Trash2, RefreshCw, Cpu, Layers, MapPin,
  CheckCircle2, AlertTriangle, FileText, Image as ImageIcon
} from 'lucide-react'
import SearchInput from '../../components/ui/SearchInput'
import FilterSortPanel from '../../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../../components/ui/GoogleSheetSyncButton'
import StatusBadge from '../../components/ui/StatusBadge'
import ImageThumbnail from '../../components/ui/ImageThumbnail'
import { formatMcType, getMachineImageUrl } from './useMachinesLogic'

export default function MachinesTabletView({ logic }) {
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
    <div className="space-y-4 machines-tablet-view">
      {/* ── 1. KPI SUMMARY CARDS (2x2 Grid) ───────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="card p-3 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">ทั้งหมด</div>
            <div className="text-lg font-black mt-0.5">{stats.total} <span className="text-xs font-normal text-slate-400">เครื่อง</span></div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Cpu size={16} />
          </div>
        </div>

        <div className="card p-3 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">ปกติ (Running)</div>
            <div className="text-lg font-black mt-0.5 text-emerald-600 dark:text-emerald-400">{stats.running}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={16} />
          </div>
        </div>

        <div className="card p-3 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">ซ่อมบำรุง / หยุด</div>
            <div className="text-lg font-black mt-0.5 text-amber-600 dark:text-amber-400">{stats.maintenance}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle size={16} />
          </div>
        </div>

        <div className="card p-3 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">โซน / ตำแหน่ง</div>
            <div className="text-lg font-black mt-0.5 text-indigo-600 dark:text-indigo-400">{stats.uniqueLocations} <span className="text-xs font-normal text-slate-400">โซน</span></div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <MapPin size={16} />
          </div>
        </div>
      </div>

      {/* ── 2. TOOLBAR ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('mc_search_ph')}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <FilterSortPanel
            columns={FS_COLS}
            value={filterSort}
            onChange={setFilterSort}
          />
          <GoogleSheetSyncButton
            type="machines"
            data={displayRows}
            label="Sheets"
          />
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn-outline p-2"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {canAdd && (
            <button
              type="button"
              onClick={openNew}
              className="btn-primary flex items-center gap-1 text-xs font-semibold px-2.5 py-2"
            >
              <Plus size={14} />
              <span>เพิ่ม</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3. 2-COLUMN RESPONSIVE CARDS GRID ─────────────────── */}
      {loading && (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw size={28} className="animate-spin mx-auto mb-2 opacity-60 text-blue-500" />
          <p className="text-sm font-semibold">{t('loading')}</p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayRows.map((m, i) => {
            const imageUrl = getMachineImageUrl(m)
            const isRunning = m.Status === 'RUNNING'

            return (
              <div
                key={m._id || m.id || i}
                onClick={() => setDetailRec(m)}
                className={`card p-3.5 border transition-all duration-200 hover:shadow-md cursor-pointer relative flex flex-col justify-between ${
                  isRunning
                    ? 'border-emerald-500/30 bg-white dark:bg-slate-900/90'
                    : 'border-amber-500/40 bg-amber-50/20 dark:bg-slate-900/90'
                }`}
              >
                <div>
                  {/* Card Header: Mc & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        {m.Location || '—'}
                      </span>
                      <h3 className="font-mono text-base font-black text-blue-600 dark:text-blue-400 tracking-tight">
                        {m.Mc}
                      </h3>
                    </div>
                    <StatusBadge value={m.Status} />
                  </div>

                  {/* Machine Meta & Thumbnail */}
                  <div className="flex items-start gap-3 my-2">
                    {imageUrl && (
                      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <ImageThumbnail
                          url={imageUrl}
                          alt={m.Mc}
                          size={46}
                          onClick={() => setPreviewImageModal({ url: imageUrl, title: `เครื่องจักร ${m.Mc}` })}
                        />
                      </div>
                    )}
                    <div className="text-xs space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <span className="font-bold">{formatMcType(m.Type)}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 truncate">{m.Manufacturer || 'ไม่ระบุผู้ผลิต'}</span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {m.Diameter ? `${m.Diameter}"` : '—'} · {m.Gauge ? `${m.Gauge}G` : '—'}
                        </span>
                        {m.Needle && <span>เข็ม: {m.Needle}</span>}
                        {m.Feeder && <span>Feeder: {m.Feeder}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Quick Actions */}
                <div
                  className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] font-mono text-slate-400">
                    {m.WaterCheck ? `เช็คน้ำ: ${m.WaterCheck}` : (m.Model ? `Model: ${m.Model}` : '')}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPdfItem(m)}
                      className="p-1.5 rounded-lg text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition-colors"
                      title="พิมพ์ PDF"
                    >
                      <FileText size={13} />
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        title="แก้ไข"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => del(m._id || m.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title="ลบ"
                      >
                        <Trash2 size={13} />
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
        <div className="card p-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800">
          <Cpu size={36} className="mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-slate-600 dark:text-slate-400">{t('no_data')}</p>
        </div>
      )}
    </div>
  )
}
