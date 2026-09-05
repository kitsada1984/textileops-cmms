import { useState, useEffect, useMemo } from 'react'
import { Wrench, RefreshCw, ArrowUpRight, Pencil, Trash2, Plus, QrCode, FileText } from 'lucide-react'
import { format } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { RepairRequestAPI, CylinderAPI, WorkOrderAPI, REPAIR_STATUS } from '../api/entities'
import useWebBuilderMenu from '../hooks/useWebBuilderMenu'
import SearchInput from '../components/ui/SearchInput'
import FilterSortPanel, { INIT_FS } from '../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../components/ui/GoogleSheetSyncButton'
import DetailDrawer from '../components/ui/DetailDrawer'
import Modal from '../components/ui/Modal'
import F from '../components/ui/FormField'
import usePagePerms from '../hooks/usePagePerms'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import { getAppBaseUrl, notifySupervisor, normalizeRepairRecord, encodeRepairProblemDescription } from '../utils/telegram'
import { notifyLineNewRepair } from '../utils/line'
import CylinderQRModal from '../components/CylinderQR'
import { useT } from '../contexts/LanguageContext'
import { applyFilterSort, buildFilterSortColumns } from '../utils/filterSort'
import PdfPreviewModal from '../components/ui/PdfPreviewModal'
import { generateRepairRequestPdfProps } from '../utils/pdfDocGenerators'

const EMPTY = {
  request_no: '', status: 'PENDING',
  cylinder_serial: '', cylinder_location: '', cylinder_standard: '', machine_mc: '',
  KI: '', Design: '', roll_no: '',
  problem_description: '', reported_by: '',
  technician_name: '', approved_by: '', approved_at: '', approval_notes: '',
  repair_details: '', parts_used: '', completed_by: '', completed_at: '',
}

const OPTIONAL_DB_FIELDS = ['KI', 'Design', 'roll_no', 'RollNo', 'roll_number']
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column of 'repair_requests'/i

const STATUS_CFG = {
  PENDING:     { bg:'rgba(251,191,36,0.12)',  border:'rgba(251,191,36,0.35)',  color:'#f59e0b', dot:'#f59e0b'  },
  IN_PROGRESS: { bg:'rgba(59,130,246,0.12)',  border:'rgba(59,130,246,0.35)',  color:'#3b82f6', dot:'#3b82f6'  },
  WAIT_PARTS:  { bg:'rgba(168,85,247,0.12)',  border:'rgba(168,85,247,0.35)',  color:'#a855f7', dot:'#a855f7'  },
  COMPLETED:   { bg:'rgba(16,185,129,0.12)',  border:'rgba(16,185,129,0.35)',  color:'#10b981', dot:'#10b981'  },
}

function fmt(dt) {
  if (!dt) return '-'
  try { return format(new Date(dt), 'dd/MM/yy HH:mm') } catch { return dt }
}

function omitKeys(item, keys) {
  const clone = { ...item }
  keys.forEach((key) => { delete clone[key] })
  return clone
}

function getMissingRepairColumn(error) {
  return String(error?.message || '').match(MISSING_COLUMN_RE)?.[1] || null
}

export default function RepairRequests() {
  const { t } = useT()
  const { user } = useAuth()
  const { canAdd, canEdit, canDelete } = usePagePerms('workorders')
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(RepairRequestAPI)
  const [search,    setSearch]    = useState('')
  const [detailRec, setDetailRec] = useState(null)
  const [pdfItem,   setPdfItem]   = useState(null)
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [cylinders, setCylinders] = useState([])
  const [filterSort, setFilterSort] = useState(INIT_FS)
  const [qrModalCylinder, setQrModalCylinder] = useState(null)

  useEffect(() => {
    CylinderAPI.list().then(setCylinders).catch(() => setCylinders([]))
  }, [])

  const cylMap = useMemo(() => {
    const m = {}
    cylinders.forEach(c => { if (c.Serial_NOW) m[c.Serial_NOW] = c })
    return m
  }, [cylinders])

  const serialOptions = useMemo(() => cylinders.map(c => c.Serial_NOW).filter(Boolean).sort(), [cylinders])

  const handleSerialChange = (val) => {
    const cyl = cylMap[val]
    setForm(p => ({
      ...p,
      cylinder_serial:   val,
      machine_mc:        cyl ? cyl.NewMC    : '',
      cylinder_location: cyl ? cyl.Location : '',
      cylinder_standard: cyl ? cyl.Standard : '',
    }))
  }

  const openAdd = () => {
    const userName = user?.full_name || user?.username || ''
    setForm({
      ...EMPTY,
      reported_by: userName,
    })
    setModal(true)
    setDetailRec(null)
  }

  const openEdit = (r) => {
    setForm({
      ...EMPTY,
      ...r,
      Design:          r.Design || r.design || '',
      KI:              r.KI !== undefined && r.KI !== null ? r.KI : (r.ki !== undefined && r.ki !== null ? r.ki : ''),
      roll_no:         r.roll_no || r.RollNo || r.roll_number || '',
      technician_name: r.technician_name || '',
      approved_by:     r.approved_by     || '',
    })
    setModal(true)
    setDetailRec(null)
  }

  const submit = async () => {
    if (saving) return
    const isEdit = !!(form._id || form.id)
    const existing = isEdit
      ? data.find((r) => (r._id || r.id) === (form._id || form.id))
      : null
    const serialForSave = form.cylinder_serial || existing?.cylinder_serial || ''
    if (!serialForSave) return toast.warning('กรุณากรอกข้อมูล', 'ไม่พบซีเรียลกระบอกสำหรับบันทึกรายการนี้')
    setSaving(true)
    try {
      let payload = {
        ...form,
        cylinder_serial: serialForSave,
        problem_description: encodeRepairProblemDescription(form.problem_description, {
          Design: form.Design,
          KI: form.KI,
          roll_no: form.roll_no || form.RollNo,
          priority: form.priority || 'ปกติ',
        }),
      }
      const removedColumns = []
      let savedRecord = null
      while (true) {
        try {
          savedRecord = await save(payload)
          break
        } catch (error) {
          const missingColumn = getMissingRepairColumn(error)
          if (!OPTIONAL_DB_FIELDS.includes(missingColumn) || removedColumns.includes(missingColumn)) throw error
          removedColumns.push(missingColumn)
          payload = omitKeys(payload, [missingColumn])
        }
      }
      if (!isEdit && savedRecord) {
        const matchingCyl = cylMap[serialForSave] || cylinders.find((c) => c.Serial_NOW === serialForSave || c.Serial_OLD === serialForSave)
        try {
          await notifySupervisor(savedRecord, matchingCyl)
        } catch (tgErr) {
          console.warn('Telegram notification warning:', tgErr)
        }
        try {
          await notifyLineNewRepair(savedRecord, matchingCyl)
        } catch (lineErr) {
          console.warn('LINE notification warning:', lineErr)
        }
      }

      // Auto-Sync Q1: If status is COMPLETED, sync to Work Orders & Tech KPI
      if (savedRecord && savedRecord.status === 'COMPLETED') {
        try {
          const reqNo = savedRecord.request_no || form.request_no || `REQ-${String(savedRecord.id || Date.now()).slice(0, 6)}`
          const techName = savedRecord.technician_name || savedRecord.completed_by || form.technician_name || form.completed_by || 'ช่างซ่อมบำรุง'
          const startTimeStr = savedRecord.approved_at || savedRecord.created_at || new Date().toISOString()
          const endTimeStr = savedRecord.completed_at || new Date().toISOString()
          const diffMs = Math.max(0, new Date(endTimeStr) - new Date(startTimeStr))
          const durationHours = Math.max(0.25, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100)

          await WorkOrderAPI.create({
            Job_ID: `WO-${reqNo}`,
            WONumber: `WO-${reqNo}`,
            OrderDate: savedRecord.created_at || startTimeStr,
            StartDate: startTimeStr,
            EndDate: endTimeStr,
            Duration: durationHours,
            WorkingDurationText: `${durationHours} ชม.`,
            MC: savedRecord.machine_mc || form.machine_mc || '',
            MachineID: savedRecord.machine_mc || form.machine_mc || '',
            KI: (savedRecord.KI !== undefined && savedRecord.KI !== null) ? String(savedRecord.KI) : (form.KI ? String(form.KI) : ''),
            Design: savedRecord.Design || form.Design || '',
            RollNo: savedRecord.roll_no || form.roll_no || '',
            JobType: 'REPAIR',
            Technicians: techName,
            AssignedTo: techName,
            Status: 'COMPLETED',
            Problem: savedRecord.problem_description || form.problem_description || '',
            Solution: savedRecord.repair_details || form.repair_details || 'ซ่อมแซมและแก้ไขตามมาตรฐาน',
            Title: (savedRecord.Design || form.Design) ? `ซ่อมเครื่อง ${savedRecord.machine_mc || form.machine_mc || ''} (ลาย ${savedRecord.Design || form.Design})` : `งานแจ้งซ่อม ${reqNo}`,
            CreatedBy: savedRecord.reported_by || form.reported_by || 'Operator',
            RequestNo: reqNo,
            req_id: savedRecord.id || form.id,
            Comment: JSON.stringify({
              synced_from_repair: true,
              request_no: reqNo,
              parts_used: savedRecord.parts_used || form.parts_used || '',
            }),
          })
        } catch (woSyncErr) {
          console.warn('Work order auto-sync from RepairRequests warning:', woSyncErr)
        }
      }

      toast.success(isEdit ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มข้อมูลสำเร็จ', `${form.request_no || serialForSave}`)
      setModal(false)
    } catch (e) { toast.error('เกิดข้อผิดพลาด', e.message) }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('ยืนยันการลบรายการนี้?')) return
    try {
      await remove(id)
      toast.success('ลบข้อมูลสำเร็จ')
    } catch (e) { toast.error('เกิดข้อผิดพลาด', e.message) }
  }

  const REPAIR_TYPE_OPTIONS = [
    { value: 'EASY', label: '⚡ งานทั่วไป (ช่างตรง)' },
    { value: 'COMPLEX', label: '🛡️ งานยาก (รออนุมัติ)' },
  ]

  const STATUS_TH = Object.fromEntries(REPAIR_STATUS.map(s => [s.value, s.label]))


  const getRRFallbackCols = () => [
    { field:'request_no',          label: t('rr_field_no'),          type:'text'     },
    { field:'repair_type',         label: 'ประเภทงาน',                type:'select'   },
    { field:'cylinder_serial',     label: 'ซีเรียล',                  type:'text'     },
    { field:'machine_mc',          label: 'เครื่องปัจจุบัน',          type:'text'     },
    { field:'Design',              label: 'Design',                   type:'text'     },
    { field:'KI',                  label: 'KI',                       type:'number'   },
    { field:'roll_no',             label: 'เลขม้วน',                  type:'number'   },
    { field:'cylinder_location',   label: t('cyl_th_loc'),            type:'text'     },
    { field:'problem_description', label: t('rr_field_problem'),      type:'textarea' },
    { field:'status',              label: t('status'),                 type:'select'   },
    { field:'reported_by',         label: t('rr_field_reported_by'),  type:'text'     },
    { field:'technician_name',     label: t('wo_th_tech'),            type:'text'     },
    { field:'created_at',          label: t('rr_field_created_at'),   type:'datetime' },
    { field:'completed_at',        label: t('rr_field_completed_at'), type:'datetime' },
  ]

  const normalizedData = useMemo(() => (Array.isArray(data) ? data.map(normalizeRepairRecord) : []), [data])

  const searched = normalizedData.filter(r =>
    [r.request_no, r.cylinder_serial, r.cylinder_location, r.Design, r.KI, r.roll_no, r.RollNo, r.reported_by, r.technician_name, r.problem_description, r.repair_type]
      .some(v => String(v || '').toLowerCase().includes(search.toLowerCase()))
  )
  const byStatus = REPAIR_STATUS.reduce((acc, s) => { acc[s.value] = normalizedData.filter(r => r.status === s.value).length; return acc }, {})

  const wbCols = useWebBuilderMenu('/repair-requests')
  const sourceCols = (wbCols && wbCols.length > 0) ? wbCols : getRRFallbackCols()
  const cols = (() => {
    const list = [...sourceCols]
    const machineIdx = list.findIndex(c => c.field === 'machine_mc')
    const hasRepairType = list.some(c => c.field === 'repair_type')
    const hasDesign = list.some(c => c.field === 'Design' || c.field === 'design')
    const hasKI = list.some(c => c.field === 'KI' || c.field === 'ki')
    const hasRollNo = list.some(c => c.field === 'roll_no' || c.field === 'RollNo')
    const insertAt = machineIdx >= 0 ? machineIdx + 1 : 0
    if (!hasRepairType) list.splice(1, 0, { field: 'repair_type', label: 'ประเภทงาน', type: 'select' })
    if (!hasDesign) list.splice(insertAt, 0, { field: 'Design', label: 'Design', type: 'text' })
    const kiInsertAt = list.findIndex(c => c.field === 'Design' || c.field === 'design') + 1
    if (!hasKI) list.splice(kiInsertAt, 0, { field: 'KI', label: 'KI', type: 'number' })
    const rollInsertAt = list.findIndex(c => c.field === 'KI' || c.field === 'ki') + 1
    if (!hasRollNo) list.splice(rollInsertAt, 0, { field: 'roll_no', label: 'เลขม้วน', type: 'number' })
    return list
  })()
  const FS_COLS = useMemo(() => buildFilterSortColumns(cols, {
    selectOptions: { status: REPAIR_STATUS, repair_type: REPAIR_TYPE_OPTIONS },
  }), [cols])
  const displayRows = useMemo(() => applyFilterSort(searched, FS_COLS, filterSort), [searched, FS_COLS, filterSort])

  const renderRRCell = (row, col) => {
    const val = row[col.field]
    if (col.field === 'repair_type') {
      const isEasy = val === 'EASY' || (!val && (row.approved_by?.includes('งานง่าย') || (row.status === 'APPROVED' && row.technician_name)))
      return isEasy ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 800,
          background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0'
        }}>
          ⚡ งานง่าย
        </span>
      ) : (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 800,
          background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe'
        }}>
          🛡️ งานยาก
        </span>
      )
    }
    if (col.field === 'status') {
      const cfg = STATUS_CFG[val] || {}
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          background: cfg.bg || 'var(--bg-card)', border: `1px solid ${cfg.border || 'var(--border)'}`, color: cfg.color || 'var(--text-500)',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot || 'currentColor', flexShrink: 0 }} />
          {STATUS_TH[val] || val}
        </span>
      )
    }
    if (col.field === 'Design' || col.field === 'design') {
      const d = val || row.Design || row.design
      return d ? <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-900)' }}>{d}</span> : <span style={{ color: 'var(--text-400)' }}>-</span>
    }
    if (col.field === 'KI' || col.field === 'ki') {
      const k = (val !== undefined && val !== null && val !== '') ? val : (row.KI !== undefined && row.KI !== null && row.KI !== '' ? row.KI : (row.ki ?? ''))
      return (k !== '' && k !== undefined && k !== null) ? <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', color: '#2563eb' }}>{String(k)}</span> : <span style={{ color: 'var(--text-400)' }}>-</span>
    }
    if (col.field === 'roll_no' || col.field === 'RollNo' || col.field === 'roll_number') {
      const r = val || row.roll_no || row.RollNo || row.roll_number
      return r ? <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', color: '#059669' }}>{String(r)}</span> : <span style={{ color: 'var(--text-400)' }}>-</span>
    }
    if (col.field === 'created_at' || col.field === 'completed_at' || col.type === 'datetime')
      return <span style={{ fontSize:11, color: col.field === 'completed_at' && val ? '#10b981' : 'var(--text-500)' }}>{fmt(val)}</span>
    if (col.type === 'textarea' || col.field === 'problem_description')
      return <span style={{ fontSize:12, display:'block', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{val || '-'}</span>
    if (val === null || val === undefined || val === '')
      return <span style={{ color:'var(--text-400)' }}>-</span>
    return <span style={{ fontSize:12 }}>{String(val)}</span>
  }

  const openDetail = (r) => setDetailRec(r)

  const drawerGroups = detailRec ? [
    {
      label: t('dr_request_info'),
      fields: [
        { label: t('rr_field_no'),         value: detailRec.request_no },
        {
          label: 'ประเภทงาน',
          value: (detailRec.repair_type === 'EASY' || (!detailRec.repair_type && (detailRec.approved_by?.includes('งานง่าย') || (detailRec.status === 'APPROVED' && detailRec.technician_name))))
            ? '⚡ งานทั่วไป / งานง่าย (เลือกช่างตรง / อนุมัติอัตโนมัติ)'
            : '🛡️ งานยาก / งานซ่อมใหญ่ (รอหัวหน้าอนุมัติ)'
        },
        { label: t('status'),              value: STATUS_TH[detailRec.status] || detailRec.status },
        { label: t('rr_field_created_at'), value: fmt(detailRec.created_at) },
      ],
    },
    {
      label: t('dr_cylinder_info'),
      fields: [
        { label: 'ซีเรียล',           value: detailRec.cylinder_serial },
        { label: 'เครื่องปัจจุบัน',   value: detailRec.machine_mc },
        { label: 'Design',            value: detailRec.Design },
        { label: 'KI',                value: detailRec.KI },
        { label: 'เลขม้วน',           value: detailRec.roll_no || detailRec.RollNo },
        { label: t('cyl_th_loc'),     value: detailRec.cylinder_location },
        { label: t('cyl_th_standard'),value: detailRec.cylinder_standard },
      ].filter(f => f.value),
    },
    {
      label: t('dr_problem'),
      fields: [
        { label: t('rr_field_problem'),     value: detailRec.problem_description },
        { label: t('rr_field_reported_by'), value: detailRec.reported_by },
      ],
    },
    {
      label: t('dr_assignment'),
      fields: [
        { label: t('wo_th_tech'),               value: detailRec.technician_name },
        { label: t('rr_field_approved_by'),     value: detailRec.approved_by },
        { label: t('rr_field_approved_at'),     value: fmt(detailRec.approved_at) },
        { label: t('rr_field_approval_notes'),  value: detailRec.approval_notes },
      ].filter(f => f.value),
    },
    {
      label: t('dr_repair_result'),
      fields: [
        { label: t('rr_field_repair_details'), value: detailRec.repair_details },
        { label: t('rr_field_parts_used'),     value: detailRec.parts_used },
        { label: t('rr_field_completed_by'),   value: detailRec.completed_by },
        { label: t('rr_field_completed_at'),   value: fmt(detailRec.completed_at) },
      ].filter(f => f.value),
    },
  ].filter(g => g.fields.length > 0) : []

  const baseUrl = getAppBaseUrl()

  return (
    <div className="space-y-4">

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {REPAIR_STATUS.map(s => {
          const cfg = STATUS_CFG[s.value] || {}
          return (
            <div key={s.value} style={{
              padding: '10px 16px', borderRadius: 12,
              background: cfg.bg || 'var(--bg-card)',
              border: `1px solid ${cfg.border || 'var(--border)'}`,
              minWidth: 100, textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, color: cfg.color || 'var(--text-900)' }}>{byStatus[s.value]}</div>
              <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: cfg.color || 'var(--text-400)' }}>
                {s.label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder={t('rr_search')} />
        <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
        <GoogleSheetSyncButton sheetName="แจ้งซ่อม" columns={cols} rows={displayRows} />
        <div className="flex items-center gap-2 ml-auto">
          {canAdd && (
            <button className="btn-primary text-xs flex items-center gap-1.5 shadow-sm" onClick={openAdd}>
              <Plus size={14} />
              <span>แจ้งซ่อมใหม่</span>
            </button>
          )}
          <button className="btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {t('refresh')}
          </button>
        </div>
      </div>

      {/* Mobile Card List View (Visible on small screens < md) */}
      <div className="block md:hidden space-y-3">
        {loading && (
          <div className="text-center py-8 text-slate-400 text-sm">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-indigo-500" />
            {t('loading')}
          </div>
        )}
        {!loading && displayRows.length === 0 && (
          <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6">
            <Wrench size={32} className="mx-auto mb-2 text-slate-400" />
            <div className="font-bold text-slate-600 dark:text-slate-300">{t('no_data')}</div>
          </div>
        )}
        {!loading && displayRows.map(r => {
          const cfg = STATUS_CFG[r.status] || {}
          return (
            <div
              key={r._id || r.id}
              onClick={() => openDetail(r)}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm active:scale-[0.99] transition-all cursor-pointer relative"
            >
              {/* Header: Request No & Status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">
                    {r.request_no || (r._id || r.id ? `REQ-${String(r._id || r.id).slice(0, 6)}` : 'REQ')}
                  </span>
                  {((r.repair_type === 'EASY') || (!r.repair_type && (r.approved_by?.includes('งานง่าย') || (r.status === 'APPROVED' && r.technician_name)))) ? (
                    <span className="font-bold text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      ⚡ งานง่าย
                    </span>
                  ) : (
                    <span className="font-bold text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      🛡️ งานยาก
                    </span>
                  )}
                  {r.created_at && (
                    <span className="text-[11px] text-slate-400">
                      {format(new Date(r.created_at), 'dd/MM/yy HH:mm')}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    background: cfg.bg || 'var(--bg-card)',
                    borderColor: cfg.border || 'var(--border)',
                    color: cfg.color || 'var(--text-500)',
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border"
                >
                  <span style={{ background: cfg.dot || 'currentColor' }} className="w-1.5 h-1.5 rounded-full" />
                  {STATUS_TH[r.status] || r.status}
                </span>
              </div>

              {/* Machine & Serial & Design/KI/Roll Info */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 dark:text-slate-300 font-semibold mb-2">
                <span>🏭 M/C: <strong className="text-slate-900 dark:text-white">{r.machine_mc || '—'}</strong></span>
                <span>•</span>
                <span>ซีเรียล: <strong className="text-blue-600 dark:text-blue-400">{r.cylinder_serial || '—'}</strong></span>
                {r.Design && (
                  <>
                    <span>•</span>
                    <span>🎨 Design: <strong className="text-indigo-600 dark:text-indigo-400">{r.Design}</strong></span>
                  </>
                )}
                {(r.KI !== undefined && r.KI !== null && r.KI !== '') && (
                  <>
                    <span>•</span>
                    <span>🧾 KI: <strong className="text-slate-900 dark:text-white font-mono">{r.KI}</strong></span>
                  </>
                )}
                {(r.roll_no || r.RollNo) && (
                  <>
                    <span>•</span>
                    <span>📦 เลขม้วน: <strong className="text-amber-600 dark:text-amber-400 font-mono">{r.roll_no || r.RollNo}</strong></span>
                  </>
                )}
                {r.cylinder_location && (
                  <>
                    <span>•</span>
                    <span className="text-slate-500">📍 {r.cylinder_location}</span>
                  </>
                )}
              </div>

              {/* Problem snippet */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 mb-3">
                <div className="text-[11px] font-bold text-rose-500 mb-0.5">⚠️ ปัญหา:</div>
                <div className="line-clamp-2">{r.problem_description || 'ไม่มีรายละเอียด'}</div>
              </div>

              {/* Footer: Tech & Quick Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60" onClick={e => e.stopPropagation()}>
                <div className="text-xs text-slate-500">
                  {r.technician_name ? (
                    <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                      👨‍🔧 {r.technician_name}
                    </span>
                  ) : (
                    <span className="text-amber-500 font-medium">รอระบุช่าง</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300"
                    onClick={() => {
                      const matchCyl = cylMap[r.cylinder_serial] || cylinders.find((c) => c.Serial_NOW === r.cylinder_serial || c.Serial_OLD === r.cylinder_serial) || { Serial_NOW: r.cylinder_serial, NewMC: r.machine_mc, Location: r.cylinder_location }
                      setQrModalCylinder(matchCyl)
                    }}
                    title="QR Code"
                  >
                    <QrCode size={14} />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                    onClick={() => setPdfItem(r)}
                    title="PDF"
                  >
                    <FileText size={14} />
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300"
                      onClick={() => openEdit(r)}
                      title="แก้ไข"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      onClick={() => del(r._id || r.id)}
                      title="ลบ"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <a
                    href={`${baseUrl}/repair/${r.cylinder_serial}?req=${r.id}&step=view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="เปิดหน้าแจ้งซ่อม"
                    className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                  >
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop Table (Hidden on small screens < md) */}
      <div className="table-wrap hidden md:block">
        <table>
          <thead>
            <tr>
              {cols.map(c => <th key={c.field||c.id}>{c.label}</th>)}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={cols.length+1} style={{ textAlign:'center', padding:'32px 0', color:'var(--text-400)' }}>{t('loading')}</td></tr>
            )}
            {!loading && displayRows.length === 0 && (
              <tr><td colSpan={cols.length+1} style={{ textAlign:'center', padding:'32px 0', color:'var(--text-400)' }}>{t('no_data')}</td></tr>
            )}
            {displayRows.map(r => (
              <tr key={r._id || r.id} className="cursor-pointer" onClick={() => openDetail(r)}>
                {cols.map(c => <td key={c.field||c.id}>{renderRRCell(r, c)}</td>)}
                <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn-outline py-1 px-2 text-xs"
                      onClick={() => {
                        const matchCyl = cylMap[r.cylinder_serial] || cylinders.find((c) => c.Serial_NOW === r.cylinder_serial || c.Serial_OLD === r.cylinder_serial) || { Serial_NOW: r.cylinder_serial, NewMC: r.machine_mc, Location: r.cylinder_location }
                        setQrModalCylinder(matchCyl)
                      }}
                      title="ดู QR Code สำหรับสแกนแจ้งซ่อม"
                    >
                      <QrCode size={12} />
                    </button>
                    <button
                      className="btn-outline py-1 px-2 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200"
                      onClick={() => setPdfItem(r)}
                      title="ดูเอกสาร PDF และพิมพ์"
                    >
                      <FileText size={12} />
                    </button>
                    {canEdit && (
                      <button className="btn-outline py-1 px-2 text-xs" onClick={() => openEdit(r)} title="แก้ไข">
                        <Pencil size={12} />
                      </button>
                    )}
                    {canDelete && (
                      <button className="btn-danger py-1 px-2 text-xs" onClick={() => del(r._id || r.id)} title="ลบ">
                        <Trash2 size={12} />
                      </button>
                    )}
                    <a
                      href={`${baseUrl}/repair/${r.cylinder_serial}?req=${r._id || r.id}&step=view`}
                      target="_blank" rel="noopener noreferrer"
                      title="เปิดหน้าแจ้งซ่อม"
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: 8,
                        border: '1px solid var(--border)', background: 'var(--bg-page)',
                        color: 'var(--text-400)', cursor: 'pointer', transition: 'all 150ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-400)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      <ArrowUpRight size={12} />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      <DetailDrawer
        open={!!detailRec}
        onClose={() => setDetailRec(null)}
        title={detailRec?.request_no || t('dr_repair_result')}
        subtitle={detailRec?.cylinder_serial}
        icon={Wrench}
        iconBg="rgba(99,102,241,0.12)"
        iconColor="#6366f1"
        badge={detailRec ? (() => { const cfg = STATUS_CFG[detailRec.status] || {}; return (
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:700, background:cfg.bg||'var(--bg-card)', border:`1px solid ${cfg.border||'var(--border)'}`, color:cfg.color||'var(--text-500)' }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:cfg.dot||'currentColor', flexShrink:0 }} />
            {STATUS_TH[detailRec.status] || detailRec.status}
          </span>
        )})() : null}
        accentColor="#6366f1"
        canEdit={canEdit} canDelete={canDelete}
        onPdf={() => setPdfItem(detailRec)}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => { del(detailRec._id || detailRec.id); setDetailRec(null) }}
        groups={drawerGroups}
        extraActions={detailRec ? (
          <button
            onClick={() => window.open(`${baseUrl}/repair/${detailRec.cylinder_serial}?req=${detailRec._id || detailRec.id}&step=view`, '_blank')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 11, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', background: 'var(--bg-page)',
              color: 'var(--text-700)', border: '1px solid var(--border)', transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-700)' }}
          >
            <ArrowUpRight size={12} /> {t('rr_open_page')}
          </button>
        ) : null}
      />

      {/* Edit / Create Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={form._id || form.id ? 'แก้ไขใบแจ้งซ่อม' : 'สร้างใบแจ้งซ่อมใหม่'} size="lg"
        footer={<>
          <button className="btn-outline" onClick={() => setModal(false)}>{t('cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </>}
      >
        {user && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', marginBottom:16, fontSize:12 }}>
            <span style={{ color:'var(--text-400)' }}>ผู้ใช้งาน:</span>
            <span style={{ fontWeight:700, color:'#6366f1' }}>{user.full_name || user.username}</span>
            <span style={{ color:'var(--text-400)', marginLeft:4 }}>({user.username})</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Asset, Production & People */}
          <div className="space-y-3">
            <div className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              📋 ข้อมูลเครื่องจักร & งานผลิต
            </div>
            <div>
              <label className="label">ซีเรียลกระบอก *</label>
              <input
                type="text"
                list="cylinder-serial-options"
                className="input font-mono font-bold"
                placeholder="เลือกหรือพิมพ์ซีเรียล..."
                value={form.cylinder_serial || ''}
                onChange={(e) => handleSerialChange(e.target.value)}
                required
              />
              <datalist id="cylinder-serial-options">
                {serialOptions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <F form={form} setForm={setForm} label="สถานะ" id="status" opts={REPAIR_STATUS} useBuilder={false} />
              <F form={form} setForm={setForm} label="เลขที่ใบแจ้งซ่อม" id="request_no" placeholder="สร้างอัตโนมัติ" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <F form={form} setForm={setForm} label="เครื่องปัจจุบัน" id="machine_mc" />
              <F form={form} setForm={setForm} label={t('cyl_th_loc')} id="cylinder_location" />
            </div>
            <F form={form} setForm={setForm} label="🎨 Design (ลายผ้า)" id="Design" placeholder="ระบุลายผ้า / Design..." />
            <div className="grid grid-cols-2 gap-2">
              <F form={form} setForm={setForm} label="🧾 KI" id="KI" type="number" placeholder="ตัวเลข KI..." />
              <F form={form} setForm={setForm} label="📦 เลขม้วน" id="roll_no" type="number" placeholder="เลขม้วน..." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <F form={form} setForm={setForm} label={t('rr_field_reported_by')} id="reported_by" />
              <F form={form} setForm={setForm} label={t('wo_th_tech')} id="technician_name" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <F form={form} setForm={setForm} label={t('rr_field_approved_by')} id="approved_by" />
              <F form={form} setForm={setForm} label={t('rr_field_approved_at')} id="approved_at" type="datetime-local" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <F form={form} setForm={setForm} label={t('rr_field_completed_by')} id="completed_by" />
              <F form={form} setForm={setForm} label={t('rr_field_completed_at')} id="completed_at" type="datetime-local" />
            </div>
          </div>

          {/* Right Column: Problem, Notes & Repair Details */}
          <div className="space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <div className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
              ⚠️ รายละเอียดปัญหา & การแก้ไข
            </div>
            <F form={form} setForm={setForm} label={t('rr_field_problem')} id="problem_description" type="textarea" placeholder="ระบุอาการเสีย หรือปัญหาที่พบ..." rows={4} />
            <F form={form} setForm={setForm} label={t('rr_field_approval_notes')} id="approval_notes" type="textarea" placeholder="คำสั่งการเพิ่มเติมจากหัวหน้าช่าง..." rows={2} />
            <F form={form} setForm={setForm} label={t('rr_field_repair_details')} id="repair_details" type="textarea" placeholder="รายละเอียดการซ่อม / วิธีแก้ไข..." rows={3} />
            <F form={form} setForm={setForm} label={t('rr_field_parts_used')} id="parts_used" placeholder="เช่น เข็ม 2 เล่ม, ซีลยาง..." />
          </div>
        </div>
      </Modal>

      {/* QR Code Modal for Scanning/Printing */}
      <CylinderQRModal
        open={!!qrModalCylinder}
        onClose={() => setQrModalCylinder(null)}
        cylinder={qrModalCylinder}
      />

      {/* ── PDF PREVIEW & PRINT MODAL ───────────────────────── */}
      {pdfItem && (
        <PdfPreviewModal
          open={!!pdfItem}
          onClose={() => setPdfItem(null)}
          {...generateRepairRequestPdfProps(pdfItem)}
        />
      )}
    </div>
  )
}
