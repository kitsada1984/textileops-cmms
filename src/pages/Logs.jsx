import { useMemo, useState } from 'react'
import {
  RefreshCw,
  Download,
  Eye,
  Activity,
  PlusCircle,
  Edit,
  Trash2,
  LogIn,
  Layers,
  Clock,
  User,
  FileText,
  AlertCircle,
  ArrowRight,
  Filter
} from 'lucide-react'
import { format, isToday, subDays, parseISO } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { AuditLogAPI } from '../api/entities'
import SearchInput from '../components/ui/SearchInput'
import Modal from '../components/ui/Modal'
import { useT } from '../contexts/LanguageContext'

const MODULE_DEFINITIONS = {
  ALL: { label: 'ทุกโมดูล', color: '#64748b' },
  MACHINE: { label: 'เครื่องจักร', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  CYLINDER: { label: 'กระบอก', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)' },
  WORKORDER: { label: 'ใบสั่งงาน', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  PM: { label: 'แผน PM', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  PM_CENTER: { label: 'เช็คศูนย์กระบอก', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.3)' },
  PM_NEEDLE: { label: 'เช็คสภาพเข็ม', color: '#14b8a6', bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.3)' },
  SPARE_PART: { label: 'อะไหล่', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
  PURCHASING: { label: 'จัดซื้อ', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.3)' },
  STOCK: { label: 'เคลื่อนไหวสต็อก', color: '#0284c7', bg: 'rgba(2,132,199,0.12)', border: 'rgba(2,132,199,0.3)' },
  NEEDLE_STOCK: { label: 'สต็อกเข็ม', color: '#d97706', bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.3)' },
  USER: { label: 'ผู้ใช้งาน', color: '#9333ea', bg: 'rgba(147,51,234,0.12)', border: 'rgba(147,51,234,0.3)' },
  SYSTEM: { label: 'ตั้งค่าระบบ', color: '#475569', bg: 'rgba(71,85,105,0.12)', border: 'rgba(71,85,105,0.3)' },
  DESIGN_BOM: { label: 'Design/BOM', color: '#4f46e5', bg: 'rgba(79,70,229,0.12)', border: 'rgba(79,70,229,0.3)' },
  AUTH: { label: 'ความปลอดภัย/เข้าสู่ระบบ', color: '#06C755', bg: 'rgba(6,199,85,0.12)', border: 'rgba(6,199,85,0.3)' },
}

const ACTION_DEFINITIONS = {
  CREATE: { label: 'เพิ่มข้อมูล (CREATE)', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: PlusCircle },
  UPDATE: { label: 'แก้ไข (UPDATE)', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: Edit },
  DELETE: { label: 'ลบข้อมูล (DELETE)', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: Trash2 },
  LOGIN: { label: 'เข้าสู่ระบบ (LOGIN)', color: '#06C755', bg: 'rgba(6,199,85,0.12)', border: 'rgba(6,199,85,0.3)', icon: LogIn },
  SWAP: { label: 'สลับกระบอก (SWAP)', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)', icon: Activity },
  CHECK_PLAN: { label: 'ตรวจเช็ค (CHECK)', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.3)', icon: FileText },
}

function parseMaybeJson(val) {
  if (!val) return null
  if (typeof val === 'object') return val
  try {
    const parsed = JSON.parse(val)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {}
  return val
}

export default function Logs() {
  const { t } = useT()
  const { data = [], loading, load } = useEntity(AuditLogAPI)
  const [search, setSearch] = useState('')
  const [selectedModule, setSelectedModule] = useState('ALL')
  const [selectedAction, setSelectedAction] = useState('ALL')
  const [selectedUser, setSelectedUser] = useState('ALL')
  const [dateRange, setDateRange] = useState('all') // 'all' | 'today' | '7d' | '30d'
  const [inspectLog, setInspectLog] = useState(null)

  // Sort logs: newest first
  const sortedLogs = useMemo(() => {
    return [...data].sort((a, b) => {
      const dateA = new Date(a.created_date || a.created_at || 0).getTime()
      const dateB = new Date(b.created_date || b.created_at || 0).getTime()
      return dateB - dateA
    })
  }, [data])

  // Extract unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    const set = new Set()
    data.forEach((l) => {
      if (l.User) set.add(l.User.trim())
    })
    return Array.from(set).sort()
  }, [data])

  // Filtered rows
  const displayRows = useMemo(() => {
    const now = new Date()
    const sevenDaysAgo = subDays(now, 7)
    const thirtyDaysAgo = subDays(now, 30)

    return sortedLogs.filter((l) => {
      // 1. Text Search
      if (search) {
        const query = search.toLowerCase()
        const match = [
          l.Module,
          l.ActionType,
          l.RecordID,
          l.User,
          l.FieldName,
          l.Comment,
          l.NewValue,
          l.OldValue,
        ].some((v) => String(v || '').toLowerCase().includes(query))
        if (!match) return false
      }

      // 2. Module Filter
      if (selectedModule !== 'ALL') {
        const mod = (l.Module || '').toUpperCase()
        if (mod !== selectedModule) return false
      }

      // 3. Action Filter
      if (selectedAction !== 'ALL') {
        const act = (l.ActionType || '').toUpperCase()
        if (act !== selectedAction) return false
      }

      // 4. User Filter
      if (selectedUser !== 'ALL') {
        if ((l.User || '').trim() !== selectedUser) return false
      }

      // 5. Date Range Filter
      if (dateRange !== 'all') {
        const dateStr = l.created_date || l.created_at
        if (!dateStr) return false
        try {
          const logDate = new Date(dateStr)
          if (dateRange === 'today' && !isToday(logDate)) return false
          if (dateRange === '7d' && logDate < sevenDaysAgo) return false
          if (dateRange === '30d' && logDate < thirtyDaysAgo) return false
        } catch {
          return false
        }
      }

      return true
    })
  }, [sortedLogs, search, selectedModule, selectedAction, selectedUser, dateRange])

  // KPI Calculations
  const stats = useMemo(() => {
    let creates = 0
    let updates = 0
    let deletes = 0
    let logins = 0

    data.forEach((l) => {
      const act = (l.ActionType || '').toUpperCase()
      if (act === 'CREATE') creates++
      else if (act === 'UPDATE' || act === 'SWAP') updates++
      else if (act === 'DELETE') deletes++
      else if (act === 'LOGIN') logins++
    })

    return {
      total: data.length,
      creates,
      updates,
      deletes,
      logins,
    }
  }, [data])

  // Export CSV Handler
  const handleExportCsv = () => {
    if (displayRows.length === 0) return

    const headers = ['วัน-เวลา', 'ผู้ใช้งาน', 'การกระทำ', 'โมดูล', 'รหัสอ้างอิง', 'ฟิลด์ที่เปลี่ยน', 'ค่าเดิม', 'ค่าใหม่', 'หมายเหตุ']
    const csvRows = [headers.join(',')]

    displayRows.forEach((r) => {
      const dt = (r.created_date || r.created_at) ? format(new Date(r.created_date || r.created_at), 'yyyy-MM-dd HH:mm:ss') : ''
      const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`

      csvRows.push([
        escape(dt),
        escape(r.User || ''),
        escape(r.ActionType || ''),
        escape(r.Module || ''),
        escape(r.RecordID || ''),
        escape(r.FieldName || ''),
        escape(r.OldValue || ''),
        escape(r.NewValue || ''),
        escape(r.Comment || ''),
      ].join(','))
    })

    const csvContent = '\uFEFF' + csvRows.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TextileOps_AuditLogs_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* ── Page Header & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="text-blue-600 dark:text-blue-400" size={22} />
            <span>ประวัติกิจกรรม &amp; ตรวจสอบระบบ (Audit Logs)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            บันทึกการกระทำทุกรายการอัตโนมัติ: ใครเป็นคนเข้ามา เพิ่ม ลบ แก้ไข อะไร ในระบบ
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={displayRows.length === 0}
            className="btn-outline flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold"
            title="ส่งออกรายงานเป็นไฟล์ CSV"
          >
            <Download size={14} />
            <span>ส่งออก CSV</span>
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn-outline flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{t('refresh')}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            กิจกรรมทั้งหมด
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {stats.total.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              เพิ่มข้อมูล (CREATE)
            </span>
            <PlusCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.creates.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 shadow-xs flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              แก้ไข (UPDATE)
            </span>
            <Edit size={14} className="text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats.updates.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 shadow-xs flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              ลบข้อมูล (DELETE)
            </span>
            <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {stats.deletes.toLocaleString()}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-800/40 shadow-xs flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
              เข้าสู่ระบบ (LOGIN)
            </span>
            <LogIn size={14} className="text-sky-600 dark:text-sky-400" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
            {stats.logins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Filters & Controls Bar ── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        {/* Top row: search + quick date pills */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="ค้นหาชื่อผู้ใช้, รหัสรายการ, หรือคำอธิบาย..."
            />
          </div>

          {/* Quick Date Range Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 self-start md:self-auto overflow-x-auto max-w-full">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'today', label: 'วันนี้' },
              { id: '7d', label: '7 วันล่าสุด' },
              { id: '30d', label: '30 วันล่าสุด' },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setDateRange(id)}
                className={`py-1 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  dateRange === id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdowns row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div>
            <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              โมดูล / เมนู
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="select w-full text-xs"
            >
              <option value="ALL">ทุกโมดูล (ทั้งหมด)</option>
              {Object.entries(MODULE_DEFINITIONS)
                .filter(([k]) => k !== 'ALL')
                .map(([code, def]) => (
                  <option key={code} value={code}>
                    {def.label} ({code})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              ประเภทการกระทำ (Action)
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="select w-full text-xs"
            >
              <option value="ALL">ทุกการกระทำ (ทั้งหมด)</option>
              <option value="CREATE">เพิ่มข้อมูลใหม่ (CREATE)</option>
              <option value="UPDATE">แก้ไขข้อมูล (UPDATE)</option>
              <option value="DELETE">ลบข้อมูล (DELETE)</option>
              <option value="LOGIN">เข้าสู่ระบบ (LOGIN)</option>
              <option value="SWAP">สลับกระบอก (SWAP)</option>
              <option value="CHECK_PLAN">ตรวจเช็ค (CHECK_PLAN)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              ผู้ใช้งาน (User)
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="select w-full text-xs"
            >
              <option value="ALL">ทุกคน ({uniqueUsers.length} ท่าน)</option>
              {uniqueUsers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Logs Data Table ── */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 145 }}>วัน-เวลา</th>
              <th style={{ width: 140 }}>ผู้ใช้งาน</th>
              <th style={{ width: 120 }}>การกระทำ</th>
              <th style={{ width: 130 }}>โมดูล</th>
              <th style={{ width: 110 }}>รหัสอ้างอิง</th>
              <th>รายละเอียดกิจกรรม</th>
              <th style={{ width: 60, textAlign: 'center' }}>ตรวจสอบ</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="spinner-gemini" style={{ width: 24, height: 24 }} />
                    <span className="text-xs font-semibold">{t('loading')}</span>
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              displayRows.map((l, i) => {
                const actDef = ACTION_DEFINITIONS[l.ActionType] || {
                  label: l.ActionType || 'ACTION',
                  color: '#64748b',
                  bg: 'rgba(100,116,139,0.12)',
                  border: 'rgba(100,116,139,0.3)',
                }
                const modDef = MODULE_DEFINITIONS[l.Module] || {
                  label: l.Module || 'GENERAL',
                  color: '#64748b',
                  bg: 'rgba(100,116,139,0.12)',
                  border: 'rgba(100,116,139,0.3)',
                }
                const rawDate = l.created_date || l.created_at
                const formattedDate = rawDate ? format(new Date(rawDate), 'dd/MM/yy HH:mm:ss') : '—'

                return (
                  <tr
                    key={l._id || l.id || i}
                    onClick={() => setInspectLog(l)}
                    className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    {/* Timestamp */}
                    <td className="text-xs whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono">
                      {formattedDate}
                    </td>

                    {/* User */}
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase flex-shrink-0"
                          style={{
                            background:
                              l.ActionType === 'DELETE'
                                ? '#ef4444'
                                : l.ActionType === 'LOGIN'
                                ? '#06C755'
                                : '#3b82f6',
                          }}
                        >
                          {(l.User || '?')[0]}
                        </div>
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[110px]" title={l.User}>
                          {l.User || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Action Badge */}
                    <td>
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold"
                        style={{
                          color: actDef.color,
                          backgroundColor: actDef.bg,
                          border: `1px solid ${actDef.border}`,
                        }}
                      >
                        {actDef.icon && <actDef.icon size={11} />}
                        <span>{l.ActionType || '—'}</span>
                      </span>
                    </td>

                    {/* Module Badge */}
                    <td>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold truncate max-w-[120px]"
                        style={{
                          color: modDef.color,
                          backgroundColor: modDef.bg,
                          border: `1px solid ${modDef.border}`,
                        }}
                        title={l.Module}
                      >
                        {modDef.label}
                      </span>
                    </td>

                    {/* Record ID */}
                    <td className="font-mono text-xs text-slate-600 dark:text-slate-300 truncate max-w-[100px]" title={l.RecordID}>
                      {l.RecordID || '—'}
                    </td>

                    {/* Comment / Details summary */}
                    <td className="text-xs text-slate-700 dark:text-slate-300 max-w-[280px] truncate" title={l.Comment || l.FieldName || ''}>
                      {l.Comment || (l.FieldName ? `แก้ไขฟิลด์: ${l.FieldName}` : '—')}
                    </td>

                    {/* Inspect Button */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setInspectLog(l)
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                        title="ดูรายละเอียดการเปลี่ยนแปลง"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}

            {!loading && !displayRows.length && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">
                  <div className="flex flex-col items-center gap-1">
                    <AlertCircle size={24} className="opacity-40" />
                    <span className="text-xs font-semibold">{t('no_data')}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Audit Log Detail & Diff Modal ── */}
      {inspectLog && (
        <Modal
          open={Boolean(inspectLog)}
          onClose={() => setInspectLog(null)}
          title="รายละเอียดบันทึกกิจกรรม (Audit Log Detail)"
          size="lg"
          footer={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setInspectLog(null)}
            >
              ปิดหน้าต่าง
            </button>
          }
        >
          <div className="space-y-4">
            {/* Meta Header Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">วัน-เวลา</span>
                <span className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {(inspectLog.created_date || inspectLog.created_at) ? format(new Date(inspectLog.created_date || inspectLog.created_at), 'dd/MM/yyyy HH:mm:ss') : '—'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">ผู้ดำเนินการ</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 block truncate">
                  {inspectLog.User || '—'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">การกระทำ</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {inspectLog.ActionType || '—'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">โมดูล / เมนู</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {MODULE_DEFINITIONS[inspectLog.Module]?.label || inspectLog.Module || '—'}
                </span>
              </div>
            </div>

            {/* Record ID & Comment */}
            <div className="space-y-1">
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                คำอธิบาย / รหัสอ้างอิง
              </span>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {inspectLog.Comment || 'ไม่มีหมายเหตุเพิ่มเติม'}
                {inspectLog.RecordID && (
                  <span className="ml-2 font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">
                    ID: {inspectLog.RecordID}
                  </span>
                )}
              </div>
            </div>

            {/* Diff / Comparison Section */}
            {(() => {
              const oldVal = parseMaybeJson(inspectLog.OldValue)
              const newVal = parseMaybeJson(inspectLog.NewValue)

              const isOldObj = oldVal && typeof oldVal === 'object' && !Array.isArray(oldVal)
              const isNewObj = newVal && typeof newVal === 'object' && !Array.isArray(newVal)

              if (isOldObj && isNewObj) {
                // Side-by-side key-value comparison
                const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]))
                  .filter((k) => k !== '_id' && k !== 'password' && k !== 'password_hash')

                return (
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      การเปรียบเทียบข้อมูล (Before vs After)
                    </span>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px]">
                            <th className="p-2 text-left font-bold w-1/3">ชื่อฟิลด์ (Field)</th>
                            <th className="p-2 text-left font-bold w-1/3 text-rose-600 dark:text-rose-400">ค่าเดิม (Before)</th>
                            <th className="p-2 text-left font-bold w-1/3 text-emerald-600 dark:text-emerald-400">ค่าใหม่ (After)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allKeys.map((key, idx) => {
                            const o = oldVal[key]
                            const n = newVal[key]
                            const changed = JSON.stringify(o) !== JSON.stringify(n)

                            return (
                              <tr
                                key={key}
                                className={`border-b border-slate-100 dark:border-slate-800/50 ${
                                  changed ? 'bg-amber-50/40 dark:bg-amber-950/20 font-semibold' : ''
                                }`}
                              >
                                <td className="p-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                  {key}
                                </td>
                                <td className="p-2 font-mono text-[11px] text-rose-600 dark:text-rose-400 break-all">
                                  {o !== undefined ? (typeof o === 'object' ? JSON.stringify(o) : String(o)) : '—'}
                                </td>
                                <td className="p-2 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 break-all">
                                  {n !== undefined ? (typeof n === 'object' ? JSON.stringify(n) : String(n)) : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              }

              // Fallback: render raw Old / New blocks if string or single values
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inspectLog.OldValue && (
                    <div className="space-y-1">
                      <span className="block text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                        ค่าเดิม (Before)
                      </span>
                      <pre className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-[11px] font-mono text-rose-700 dark:text-rose-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                        {typeof oldVal === 'object' ? JSON.stringify(oldVal, null, 2) : String(inspectLog.OldValue)}
                      </pre>
                    </div>
                  )}

                  {inspectLog.NewValue && (
                    <div className="space-y-1">
                      <span className="block text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                        ค่าใหม่ (After)
                      </span>
                      <pre className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-[11px] font-mono text-emerald-700 dark:text-emerald-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                        {typeof newVal === 'object' ? JSON.stringify(newVal, null, 2) : String(inspectLog.NewValue)}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </Modal>
      )}
    </div>
  )
}
