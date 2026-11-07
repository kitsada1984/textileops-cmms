import { useMemo, useState } from 'react'
import useEntity from '../../hooks/useEntity'
import { RepairRequestAPI, REPAIR_STATUS } from '../../api/entities'
import { normalizeRepairRecord } from '../../modules/repair'
import { WORK_ORDER_STATUS_OPTIONS, getWorkOrderStatusMeta } from './workOrderNormalize.js'
import { isFinishedRepairStatus } from './repairStatusRow.jsx'
import { isRepairSyncedWorkOrder } from '../dashboard/dashboardHelpers.jsx'
import SearchInput from '../../components/ui/SearchInput'

// Unified pending-work view: work orders + repair requests in one list,
// each row tagged with its origin. Synced pairs (a repair + the WO created
// from it) appear once, on the WO side, so nothing is double-counted.

export const UNIFIED_SOURCES = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'WO', label: 'ใบสั่งงาน' },
  { value: 'REPAIR', label: 'แจ้งซ่อม' },
  { value: 'SYNCED', label: 'ซิงก์จากแจ้งซ่อม' },
]

const SOURCE_LABEL = { WO: 'ใบสั่งงาน', REPAIR: 'แจ้งซ่อม', SYNCED: 'ซิงก์จากแจ้งซ่อม' }

// Request keys already represented by a synced WO row (req_id / request_no
// from the sync Comment, plus the request_no embedded in WO-{request_no}).
export function getSyncedRepairKeys(allJobs = []) {
  const keys = new Set()
  for (const job of allJobs || []) {
    const woId = String(job?.WO_ID || job?.Job_ID || '')
    if (woId.startsWith('WO-')) keys.add(woId.slice(3))
    const comment = job?.Comment
    if (typeof comment === 'string' && comment.includes('synced_from_repair')) {
      try {
        const parsed = JSON.parse(comment)
        if (parsed?.req_id) keys.add(String(parsed.req_id))
        if (parsed?.request_no) keys.add(String(parsed.request_no))
      } catch {}
    }
  }
  return keys
}

function repairStatusLabel(status) {
  const raw = String(status || '')
  const legacy = REPAIR_STATUS.find((o) => o.value === raw)
  if (legacy) return legacy.label
  if (raw === 'APPROVED') return 'อนุมัติแล้ว'
  const wo = WORK_ORDER_STATUS_OPTIONS.find(
    (o) => o.value === raw.toUpperCase() || o.label === raw
  )
  return wo ? wo.label : raw || '—'
}

// Pending rows from both tables. WO side uses the shared WO meta;
// repair side uses the repair finished-rule. Repairs already synced into a
// WO row are suppressed (reachable from the แจ้งซ่อม tab).
export function buildUnifiedRows(allJobs = [], repairs = []) {
  const syncedKeys = getSyncedRepairKeys(allJobs)
  const rows = []

  for (const job of allJobs || []) {
    if (!job || job.IsDeleted) continue
    const meta = getWorkOrderStatusMeta(job.Status)
    if (meta.isCompleted || meta.isCancelled) continue
    const synced = isRepairSyncedWorkOrder(job)
    rows.push({
      key: `wo-${job.id || job.Job_ID || job.WO_ID}`,
      source: synced ? 'SYNCED' : 'WO',
      no: job.Job_ID || job.WO_ID || '',
      machine: job.MC || '',
      detail: job.Details || '',
      status: meta.label,
      date: job.StartTime || job.created_at || '',
    })
  }

  for (const raw of repairs || []) {
    const r = normalizeRepairRecord(raw)
    if (!r || isFinishedRepairStatus(r.status)) continue
    const id = String(r.id ?? r._id ?? '')
    const no = String(r.request_no || '')
    if ((id && syncedKeys.has(id)) || (no && syncedKeys.has(no))) continue
    rows.push({
      key: `rr-${id || no}`,
      source: 'REPAIR',
      no,
      machine: r.machine_mc || r.cylinder_serial || '',
      detail: r.problem_description || '',
      status: repairStatusLabel(r.status),
      date: r.created_at || '',
    })
  }

  return rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
}

export function UnifiedJobs({ allJobs = [], setCurrentTab, setSearch }) {
  const { data: repairs, loading, load } = useEntity(RepairRequestAPI)
  const [query, setQuery] = useState('')
  const [srcFilter, setSrcFilter] = useState('ALL')

  const rows = useMemo(() => buildUnifiedRows(allJobs, repairs), [allJobs, repairs])
  const counts = useMemo(() => {
    const c = { ALL: rows.length, WO: 0, REPAIR: 0, SYNCED: 0 }
    rows.forEach((r) => {
      if (c[r.source] !== undefined) c[r.source] += 1
    })
    return c
  }, [rows])

  const q = query.trim().toLowerCase()
  const visible = rows.filter(
    (r) =>
      (srcFilter === 'ALL' || r.source === srcFilter) &&
      (!q ||
        String(r.no || '').toLowerCase().includes(q) ||
        String(r.machine || '').toLowerCase().includes(q) ||
        String(r.detail || '').toLowerCase().includes(q))
  )

  const openRow = (row) => {
    if (row.source === 'REPAIR') {
      setCurrentTab('repair_requests')
      return
    }
    if (row.no) setSearch(row.no)
    setCurrentTab('records')
  }

  return (
    <div className="space-y-3">
      <div className="card p-3.5 sm:p-4 space-y-3 text-xs shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex-1 w-full">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="ค้นหาเลขที่, เครื่อง, รายละเอียด..."
              className="w-full"
            />
          </div>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors font-bold text-xs flex-shrink-0 cursor-pointer"
            title="รีเฟรชรายการแจ้งซ่อม"
          >
            <span>{loading ? 'กำลังโหลด...' : 'รีเฟรชแจ้งซ่อม'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">
              {rows.length}
            </span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {UNIFIED_SOURCES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSrcFilter(s.value)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[44px] cursor-pointer active:scale-[0.98] ${
                srcFilter === s.value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span>{s.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  srcFilter === s.value
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {counts[s.value] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-0 overflow-hidden shadow-xs">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>เลขที่</th>
                <th>เครื่อง</th>
                <th>รายละเอียด</th>
                <th>สถานะ</th>
                <th>ที่มา</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-400)' }}>
                    {loading ? 'กำลังโหลด...' : 'ไม่มีงานค้าง'}
                  </td>
                </tr>
              )}
              {visible.map((r) => (
                <tr key={r.key} className="cursor-pointer" onClick={() => openRow(r)}>
                  <td className="font-mono font-bold text-blue-700 dark:text-blue-300">{r.no || '—'}</td>
                  <td>{r.machine || '—'}</td>
                  <td className="max-w-[240px] truncate" title={r.detail}>{r.detail || '—'}</td>
                  <td>{r.status || '—'}</td>
                  <td>
                    <span className="badge badge-blue">{SOURCE_LABEL[r.source] || r.source}</span>
                  </td>
                  <td className="text-right">
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">เปิด ›</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
