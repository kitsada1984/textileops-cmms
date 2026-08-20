import { useState, useEffect, useMemo } from 'react'
import { Wrench, RefreshCw, ArrowUpRight, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { RepairRequestAPI, CylinderAPI, REPAIR_STATUS } from '../api/entities'
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
import { getAppBaseUrl } from '../utils/telegram'
import { useT } from '../contexts/LanguageContext'
import { applyFilterSort, buildFilterSortColumns } from '../utils/filterSort'

const EMPTY = {
  request_no: '', status: 'PENDING',
  cylinder_serial: '', cylinder_location: '', cylinder_standard: '', machine_mc: '',
  KI: '', Design: '',
  problem_description: '', reported_by: '',
  technician_name: '', approved_by: '', approved_at: '', approval_notes: '',
  repair_details: '', parts_used: '', completed_by: '', completed_at: '',
}

const OPTIONAL_DB_FIELDS = ['KI', 'Design']
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
  const { canEdit, canDelete } = usePagePerms('workorders')
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(RepairRequestAPI)
  const [search,    setSearch]    = useState('')
  const [detailRec, setDetailRec] = useState(null)
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [cylinders, setCylinders] = useState([])
  const [filterSort, setFilterSort] = useState(INIT_FS)

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
      machine_mc:        cyl?.NewMC        || p.machine_mc,
      cylinder_location: cyl?.Location     || p.cylinder_location,
      cylinder_standard: cyl?.Standard     || p.cylinder_standard,
    }))
  }

  const openEdit = (r) => {
    const userName = user?.full_name || user?.username || ''
    setForm({
      ...EMPTY, ...r,
      technician_name: r.technician_name || userName,
      approved_by:     r.approved_by     || userName,
    })
    setModal(true)
    setDetailRec(null)
  }

  const submit = async () => {
    const isEdit = !!(form._id || form.id)
    const existing = isEdit
      ? data.find((r) => (r._id || r.id) === (form._id || form.id))
      : null
    const serialForSave = form.cylinder_serial || existing?.cylinder_serial || ''
    if (!serialForSave) return toast.warning('กรุณากรอกข้อมูล', 'ไม่พบซีเรียลกระบอกสำหรับบันทึกรายการนี้')
    setSaving(true)
    try {
      let payload = { ...form, cylinder_serial: serialForSave }
      const removedColumns = []
      while (true) {
        try {
          await save(payload)
          break
        } catch (error) {
          const missingColumn = getMissingRepairColumn(error)
          if (!OPTIONAL_DB_FIELDS.includes(missingColumn) || removedColumns.includes(missingColumn)) throw error
          removedColumns.push(missingColumn)
          payload = omitKeys(payload, [missingColumn])
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

  const STATUS_TH = Object.fromEntries(REPAIR_STATUS.map(s => [s.value, s.label]))


  const getRRFallbackCols = () => [
    { field:'request_no',          label: t('rr_field_no'),          type:'text'     },
    { field:'cylinder_serial',     label: 'ซีเรียล',                  type:'text'     },
    { field:'machine_mc',          label: 'เครื่องปัจจุบัน',          type:'text'     },
    { field:'KI',                  label: 'KI',                       type:'text'     },
    { field:'Design',              label: 'Design',                   type:'text'     },
    { field:'cylinder_location',   label: t('cyl_th_loc'),            type:'text'     },
    { field:'problem_description', label: t('rr_field_problem'),      type:'textarea' },
    { field:'status',              label: t('status'),                 type:'select'   },
    { field:'reported_by',         label: t('rr_field_reported_by'),  type:'text'     },
    { field:'technician_name',     label: t('wo_th_tech'),            type:'text'     },
    { field:'created_at',          label: t('rr_field_created_at'),   type:'datetime' },
    { field:'completed_at',        label: t('rr_field_completed_at'), type:'datetime' },
  ]

  const searched = data.filter(r =>
    [r.request_no, r.cylinder_serial, r.cylinder_location, r.KI, r.Design, r.reported_by, r.technician_name, r.problem_description]
      .some(v => String(v || '').toLowerCase().includes(search.toLowerCase()))
  )
  const byStatus = REPAIR_STATUS.reduce((acc, s) => { acc[s.value] = data.filter(r => r.status === s.value).length; return acc }, {})

  const wbCols = useWebBuilderMenu('/repair-requests')
  const sourceCols = (wbCols && wbCols.length > 0) ? wbCols : getRRFallbackCols()
  const cols = (() => {
    const list = [...sourceCols]
    const machineIdx = list.findIndex(c => c.field === 'machine_mc')
    const hasKI = list.some(c => c.field === 'KI')
    const hasDesign = list.some(c => c.field === 'Design')
    const insertAt = machineIdx >= 0 ? machineIdx + 1 : 0
    if (!hasKI) list.splice(insertAt, 0, { field: 'KI', label: 'KI', type: 'text' })
    const designInsertAt = list.findIndex(c => c.field === 'KI') + 1
    if (!hasDesign) list.splice(designInsertAt, 0, { field: 'Design', label: 'Design', type: 'text' })
    return list
  })()
  const FS_COLS = useMemo(() => buildFilterSortColumns(cols, {
    selectOptions: { status: REPAIR_STATUS },
  }), [cols])
  const displayRows = useMemo(() => applyFilterSort(searched, FS_COLS, filterSort), [searched, FS_COLS, filterSort])

  const renderRRCell = (row, col) => {
    const val = row[col.field]
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
        { label: t('status'),              value: STATUS_TH[detailRec.status] || detailRec.status },
        { label: t('rr_field_created_at'), value: fmt(detailRec.created_at) },
      ],
    },
    {
      label: t('dr_cylinder_info'),
      fields: [
        { label: 'ซีเรียล',           value: detailRec.cylinder_serial },
        { label: 'เครื่องปัจจุบัน',   value: detailRec.machine_mc },
        { label: 'KI',                value: detailRec.KI },
        { label: 'Design',            value: detailRec.Design },
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
        <button className="btn-ghost ml-auto" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {t('refresh')}
        </button>
      </div>

      {/* Table */}
      <div className="table-wrap">
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
              <tr key={r.id} className="cursor-pointer" onClick={() => openDetail(r)}>
                {cols.map(c => <td key={c.field||c.id}>{renderRRCell(r, c)}</td>)}
                <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
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
                      href={`${baseUrl}/repair/${r.cylinder_serial}?req=${r.id}&step=view`}
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
        onEdit={() => openEdit(detailRec)}
        onDelete={() => { del(detailRec._id || detailRec.id); setDetailRec(null) }}
        groups={drawerGroups}
        extraActions={detailRec ? (
          <button
            onClick={() => window.open(`${baseUrl}/repair/${detailRec.cylinder_serial}?req=${detailRec.id}&step=view`, '_blank')}
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

      {/* Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title="แก้ไขใบแจ้งซ่อม" size="lg"
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
        <div className="grid grid-cols-2 gap-4">
          <F form={form} setForm={setForm} label="เลขที่ใบแจ้งซ่อม" id="request_no" />
          <F form={form} setForm={setForm} label="สถานะ" id="status" opts={REPAIR_STATUS} useBuilder={false} />
          <F form={form} setForm={setForm} label="เครื่องปัจจุบัน (อัตโนมัติ)" id="machine_mc" />
          <F form={form} setForm={setForm} label="KI" id="KI" />
          <F form={form} setForm={setForm} label="Design" id="Design" />
          <F form={form} setForm={setForm} label={t('cyl_th_loc')} id="cylinder_location" />
          <F form={form} setForm={setForm} label={t('rr_field_reported_by')} id="reported_by" />
          <div className="col-span-2">
            <F form={form} setForm={setForm} label={t('rr_field_problem')} id="problem_description" type="textarea" />
          </div>
          <F form={form} setForm={setForm} label={t('wo_th_tech')} id="technician_name" />
          <F form={form} setForm={setForm} label={t('rr_field_approved_by')} id="approved_by" />
          <F form={form} setForm={setForm} label={t('rr_field_approved_at')} id="approved_at" type="datetime-local" />
          <div className="col-span-2">
            <F form={form} setForm={setForm} label={t('rr_field_approval_notes')} id="approval_notes" type="textarea" />
          </div>
          <div className="col-span-2">
            <F form={form} setForm={setForm} label={t('rr_field_repair_details')} id="repair_details" type="textarea" />
          </div>
          <F form={form} setForm={setForm} label={t('rr_field_parts_used')} id="parts_used" />
          <F form={form} setForm={setForm} label={t('rr_field_completed_by')} id="completed_by" />
          <F form={form} setForm={setForm} label={t('rr_field_completed_at')} id="completed_at" type="datetime-local" />
        </div>
      </Modal>
    </div>
  )
}
