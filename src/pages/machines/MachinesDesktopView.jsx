// src/pages/machines/MachinesDesktopView.jsx
// Desktop View for Machines: Full High-Density Data Table (> 1024px)
// Follows ADR-0002

import React from 'react'
import {
  Plus, Pencil, Trash2, RefreshCw, Cpu, Layers, MapPin,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, FileText, Printer
} from 'lucide-react'
import SearchInput from '../../components/ui/SearchInput'
import FilterSortPanel from '../../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../../components/ui/GoogleSheetSyncButton'
import { formatMcType } from './useMachinesLogic'

export default function MachinesDesktopView({ logic }) {
  const {
    t,
    canAdd,
    canEdit,
    canDelete,
    loading,
    load,
    stats,
    summary,
    showSummary,
    setShowSummary,
    search,
    setSearch,
    filterSort,
    setFilterSort,
    FS_COLS,
    displayRows,
    cols,
    openNew,
    openEdit,
    del,
    setDetailRec,
    setPdfItem,
  } = logic

  return (
    <div className="space-y-5 machines-desktop-view">
      {/* ── 1. TOP KPI SUMMARY STATS CARDS ─────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">เครื่องจักรทั้งหมด</div>
            <div className="text-xl font-black mt-0.5" style={{ color: 'var(--text-900)' }}>
              {stats.total} <span className="text-xs font-normal text-slate-400">เครื่อง</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Cpu size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">สถานะปกติ (Running)</div>
            <div className="text-xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
              {stats.running} <span className="text-xs font-normal text-slate-400">เครื่อง</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ซ่อมบำรุง / หยุด</div>
            <div className="text-xl font-black mt-0.5 text-amber-600 dark:text-amber-400">
              {stats.maintenance} <span className="text-xs font-normal text-slate-400">เครื่อง</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">โซน / ตำแหน่ง</div>
            <div className="text-xl font-black mt-0.5 text-indigo-600 dark:text-indigo-400">
              {stats.uniqueLocations} <span className="text-xs font-normal text-slate-400">โซน</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <MapPin size={18} />
          </div>
        </div>
      </div>

      {/* ── 2. ACTION TOOLBAR ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1 max-w-sm">
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

        <div className="flex items-center gap-2">
          <GoogleSheetSyncButton
            type="machines"
            data={displayRows}
            label={t('sync_sheets') || 'Google Sheets'}
          />
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn-outline p-2"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {canAdd && (
            <button
              type="button"
              onClick={openNew}
              className="btn-primary flex items-center gap-1.5 text-xs font-semibold px-3 py-2"
            >
              <Plus size={15} />
              <span>{t('mc_btn_add')}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3. SUMMARY PILLS ─────────────────────────────────── */}
      {summary.length > 0 && (
        <div className="card overflow-hidden border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowSummary((v) => !v)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-blue-500" />
              <span>สรุปแยกตามประเภท / ขนาด (Type · Diameter · Gauge)</span>
              <span className="text-[11px] font-normal text-slate-400">({summary.length} กลุ่ม)</span>
            </div>
            {showSummary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showSummary && (
            <div className="p-3.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              {summary.map((g) => (
                <div
                  key={`${g.Type}|${g.Diameter}|${g.Gauge}`}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div className="min-w-0 pr-1 truncate">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatMcType(g.Type)}</span>
                    <span className="font-mono text-slate-500 text-[11px] ml-1.5">
                      {g.Diameter || '—'}" · {g.Gauge || '—'}G
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-blue-500 text-white flex-shrink-0">
                    {g.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 4. FULL DATA TABLE ───────────────────────────────── */}
      <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                {cols.map((c) => (
                  <th key={c.key} className="py-3 px-3 text-left whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                <th className="py-3 px-3 text-center w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading && (
                <tr>
                  <td colSpan={cols.length + 1} className="text-center py-12 text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-50" />
                    <span>{t('loading')}</span>
                  </td>
                </tr>
              )}
              {!loading && displayRows.map((m, i) => (
                <tr
                  key={m._id || m.id || i}
                  onClick={() => setDetailRec(m)}
                  className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  {cols.map((c) => (
                    <td key={c.key} className="py-2.5 px-3 whitespace-nowrap">
                      {c.render(m, i)}
                    </td>
                  ))}
                  <td onClick={(e) => e.stopPropagation()} className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPdfItem(m)}
                        className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 transition-all border border-rose-200 dark:border-rose-800/60"
                        title="ดูเอกสาร PDF และพิมพ์"
                      >
                        <FileText size={13} />
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="แก้ไขข้อมูลเครื่องจักร"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => del(m._id || m.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="ลบข้อมูล"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !displayRows.length && (
                <tr>
                  <td colSpan={cols.length + 1} className="text-center py-12 text-slate-400">
                    <Cpu size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">{t('no_data')}</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">กดปุ่ม "+ เพิ่มเครื่องจักร" เพื่อเริ่มต้นบันทึก</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
