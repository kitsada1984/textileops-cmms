import { useMemo, useState, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  FileSpreadsheet,
  Palette,
  Cpu,
  Layers,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  Check,
  X,
  Sparkles,
  Upload,
  AlertCircle,
  Copy,
} from 'lucide-react'
import { format } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { DesignBomAPI, MachineAPI } from '../api/entities'
import useWebBuilderMenu from '../hooks/useWebBuilderMenu'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import FilterSortPanel, { INIT_FS } from '../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../components/ui/GoogleSheetSyncButton'
import { useT } from '../contexts/LanguageContext'
import usePagePerms from '../hooks/usePagePerms'
import DetailDrawer from '../components/ui/DetailDrawer'
import { useToast } from '../components/ui/Toast'
import F from '../components/ui/FormField'
import { applyFilterSort, buildFilterSortColumns } from '../utils/filterSort'
import { uploadImageToGoogleDrive } from '../utils/googleDriveUpload'
import ImagePreviewModal from '../components/ui/ImagePreviewModal'
import ImageThumbnail from '../components/ui/ImageThumbnail'

const DESIGN_BOM_IMAGE_FOLDER = 'Design-BOM'
const IMAGE_NOTE_PREFIX = 'ImageUrl:'
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column of 'design_bom'|column design_bom\.([^ ]+) does not exist/i

function extractImageUrl(note = '') {
  const line = String(note || '').split('\n').find((item) => item.trim().startsWith(IMAGE_NOTE_PREFIX))
  return line?.trim().slice(IMAGE_NOTE_PREFIX.length).trim() || ''
}

function stripImageUrlMeta(note = '') {
  return String(note || '')
    .split('\n')
    .filter((line) => !line.trim().startsWith(IMAGE_NOTE_PREFIX))
    .join('\n')
    .trim()
}

function getDesignImageUrl(row = {}) {
  return row.ImageUrl || extractImageUrl(row.Comment) || ''
}

function appendDesignImageMeta(comment = '', imageUrl = '') {
  const cleanComment = stripImageUrlMeta(comment)
  return [cleanComment, imageUrl ? `${IMAGE_NOTE_PREFIX} ${imageUrl}` : ''].filter(Boolean).join('\n')
}

function omitKeys(item, keys = []) {
  const clone = { ...item }
  keys.forEach((key) => { delete clone[key] })
  return clone
}

function getMissingDesignColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || match?.[2] || null
}

const getFallbackCols = () => [
  { field: 'MC',           label: 'MC',           type: 'text' },
  { field: 'Design',       label: 'แบบงาน',      type: 'text' },
  { field: 'KI',           label: 'KI',           type: 'text' },
  { field: 'BOM',          label: 'BOM',          type: 'text' },
  { field: 'CL1',          label: 'CL1',          type: 'text' },
  { field: 'CL2',          label: 'CL2',          type: 'text' },
  { field: 'CL3',          label: 'CL3',          type: 'text' },
  { field: 'CL4',          label: 'CL4',          type: 'text' },
  { field: 'SP',           label: 'SP',           type: 'text' },
  { field: 'SL1',          label: 'SL1',          type: 'text' },
  { field: 'SL2',          label: 'SL2',          type: 'text' },
  { field: 'SL3',          label: 'SL3',          type: 'text' },
  { field: 'SL4',          label: 'SL4',          type: 'text' },
  { field: 'ImageUrl',     label: 'URL',          type: 'text', width: '220px' },
  { field: 'ImagePreview', label: 'รูป',          type: 'text', width: '110px' },
  { field: 'Comment',      label: 'หมายเหตุ',     type: 'text' },
  { field: 'LastUpdated',  label: 'อัปเดตล่าสุด',  type: 'date' },
]

const REQUIRED_IMAGE_COLS = [
  { field: 'ImageUrl',     label: 'URL', type: 'text', width: '220px' },
  { field: 'ImagePreview', label: 'รูป', type: 'text', width: '110px' },
]

function resolveDesignColumns(wbCols) {
  const sourceCols = (wbCols && wbCols.length > 0) ? wbCols : getFallbackCols()
  const nextCols = [...sourceCols]
  REQUIRED_IMAGE_COLS.forEach((requiredCol) => {
    if (!nextCols.some((col) => col.field === requiredCol.field)) {
      const commentIndex = nextCols.findIndex((col) => col.field === 'Comment')
      nextCols.splice(commentIndex >= 0 ? commentIndex : nextCols.length, 0, requiredCol)
    }
  })
  return nextCols
}

function getColumnWidthStyle(col) {
  if (!col?.width) return undefined
  return { width: col.width, minWidth: col.width }
}

const EMPTY = {
  MC: '',
  Design: '',
  KI: '',
  BOM: '',
  CL1: '',
  CL2: '',
  CL3: '',
  CL4: '',
  SP: '',
  SL1: '',
  SL2: '',
  SL3: '',
  SL4: '',
  ImageUrl: '',
  Comment: '',
  LastUpdated: '',
}

export default function DesignBom() {
  const { t } = useT()
  const { canAdd, canEdit, canDelete } = usePagePerms('designbom')
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(DesignBomAPI)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [detailRec, setDetailRec] = useState(null)
  const [previewImageModal, setPreviewImageModal] = useState(null)
  const [filterSort, setFilterSort] = useState(INIT_FS)
  const [machineList, setMachineList] = useState([])

  const wbCols = useWebBuilderMenu('/design-bom')
  const cols = resolveDesignColumns(wbCols)

  useEffect(() => {
    MachineAPI.list()
      .then((res) => {
        const rows = res?.data || res || []
        setMachineList(rows)
      })
      .catch(() => {})
  }, [])

  // Summary statistics
  const stats = useMemo(() => {
    const total = data.length
    const uniqueMCs = new Set(data.map((r) => r.MC).filter(Boolean)).size
    const uniqueDesigns = new Set(data.map((r) => r.Design).filter(Boolean)).size
    const withImages = data.filter((r) => Boolean(getDesignImageUrl(r))).length
    return { total, uniqueMCs, uniqueDesigns, withImages }
  }, [data])

  const filtered = useMemo(() => {
    return data.filter((r) =>
      [r.MC, r.Design, r.KI, r.BOM, r.CL1, r.CL2, r.CL3, r.CL4, r.SP, r.SL1, r.SL2, r.SL3, r.SL4, stripImageUrlMeta(r.Comment), getDesignImageUrl(r)].some((v) =>
        String(v || '').toLowerCase().includes(search.toLowerCase())
      )
    )
  }, [data, search])

  const mcOptions = useMemo(() => {
    const fromData = data.map((r) => String(r.MC || '').trim()).filter(Boolean)
    const fromMachines = machineList.map((m) => String(m.MC || m.Machine_ID || '').trim()).filter(Boolean)
    const values = Array.from(new Set([...fromData, ...fromMachines])).sort()
    return values.map((v) => ({ value: v, label: v }))
  }, [data, machineList])

  const designOptions = useMemo(() => {
    const values = Array.from(new Set(data.map((r) => String(r.Design || '').trim()).filter(Boolean))).sort()
    return values.map((v) => ({ value: v, label: v }))
  }, [data])

  const kiOptions = useMemo(() => {
    const values = Array.from(new Set(data.map((r) => String(r.KI || '').trim()).filter(Boolean))).sort()
    return values.map((v) => ({ value: v, label: v }))
  }, [data])

  const bomOptions = useMemo(() => {
    const values = Array.from(new Set(data.map((r) => String(r.BOM || '').trim()).filter(Boolean))).sort()
    return values.map((v) => ({ value: v, label: v }))
  }, [data])

  const FS_COLS = useMemo(() => {
    return cols.map((col) => {
      const key = col.field || col.key
      const label = col.label || key
      const isFilterable = ['MC', 'Design', 'KI', 'BOM'].includes(key)

      let filterConfig = undefined
      if (isFilterable) {
        let opts = []
        if (key === 'MC') opts = mcOptions
        else if (key === 'Design') opts = designOptions
        else if (key === 'KI') opts = kiOptions
        else if (key === 'BOM') opts = bomOptions
        filterConfig = { type: 'select', opts }
      }

      return {
        key,
        label,
        sortable: true,
        getValue:
          key === 'ImageUrl' || key === 'ImagePreview'
            ? getDesignImageUrl
            : key === 'Comment'
            ? (row) => stripImageUrlMeta(row.Comment)
            : undefined,
        filter: filterConfig,
      }
    })
  }, [cols, mcOptions, designOptions, kiOptions, bomOptions])

  const displayRows = useMemo(() => applyFilterSort(filtered, FS_COLS, filterSort), [filtered, FS_COLS, filterSort])

  const openNew = () => {
    setForm(EMPTY)
    setModal(true)
  }

  const openEdit = (r) => {
    setForm({
      ...r,
      ImageUrl: getDesignImageUrl(r),
      Comment: stripImageUrlMeta(r.Comment),
    })
    setModal(true)
    setDetailRec(null)
  }

  const onPickImageFile = async (file) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const { imageUrl } = await uploadImageToGoogleDrive(file, { folderName: DESIGN_BOM_IMAGE_FOLDER })
      setForm((prev) => ({ ...prev, ImageUrl: imageUrl }))
      toast.success('อัปโหลดรูปสำเร็จ', `บันทึกไว้ในโฟลเดอร์ ${DESIGN_BOM_IMAGE_FOLDER}`)
    } catch (e) {
      toast.error('อัปโหลดรูปไม่สำเร็จ', e.message)
    }
    setUploadingImage(false)
  }

  const saveWithImageFallback = async (payload) => {
    try {
      await save(payload)
    } catch (error) {
      const missingColumn = getMissingDesignColumn(error)
      if (missingColumn === 'ImageUrl') {
        await save(omitKeys(payload, ['ImageUrl']))
        toast.success('บันทึกลิงก์รูปในหมายเหตุแล้ว', 'ฐานข้อมูลยังไม่มีคอลัมน์ ImageUrl ของ Design/BOM')
        return
      }
      throw error
    }
  }

  const submit = async () => {
    if (!form.MC && !form.Design && !form.KI) {
      toast.warning('กรุณากรอกข้อมูล', 'ระบุ MC หรือแบบงานหรือ KI อย่างน้อย 1 ช่อง')
      return
    }
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    try {
      await saveWithImageFallback({
        ...form,
        Comment: appendDesignImageMeta(form.Comment, form.ImageUrl),
        LastUpdated: format(new Date(), 'yyyy-MM-dd'),
      })
      toast.success(isEdit ? 'แก้ไข Design/BOM สำเร็จ' : 'เพิ่ม Design/BOM สำเร็จ', form.Design || form.MC || form.KI)
      setModal(false)
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('ยืนยันการลบรายการ Design/BOM นี้?')) return
    try {
      await remove(id)
      toast.success('ลบรายการสำเร็จ')
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
  }

  const renderCellContent = (row, col) => {
    const v = col.field === 'ImageUrl' || col.field === 'ImagePreview'
      ? getDesignImageUrl(row)
      : col.field === 'Comment'
        ? stripImageUrlMeta(row.Comment)
        : row[col.field]

    if (v === null || v === undefined || v === '') {
      return <span className="text-slate-300 dark:text-slate-700 font-mono text-center block">—</span>
    }

    if (col.field === 'MC') {
      return (
        <span className="font-mono font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
          {String(v)}
        </span>
      )
    }

    if (col.field === 'Design') {
      return (
        <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
          <Palette size={13} className="opacity-70 flex-shrink-0" />
          <span className="truncate">{String(v)}</span>
        </div>
      )
    }

    if (col.field === 'KI' || col.field === 'BOM') {
      return <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{String(v)}</span>
    }

    if (col.field.startsWith('CL')) {
      return (
        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
          {String(v)}
        </span>
      )
    }

    if (col.field === 'SP') {
      return (
        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
          {String(v)}
        </span>
      )
    }

    if (col.field.startsWith('SL')) {
      return (
        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          {String(v)}
        </span>
      )
    }

    if (col.field === 'ImageUrl') {
      return (
        <a
          href={String(v)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-mono text-[11px] flex items-center gap-1 hover:underline max-w-[200px] truncate"
        >
          <span className="truncate">{String(v)}</span>
          <ExternalLink size={11} className="flex-shrink-0 opacity-70" />
        </a>
      )
    }

    if (col.field === 'ImagePreview') {
      const imgUrl = String(v)
      return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <ImageThumbnail
            url={imgUrl}
            alt={row.Design || row.MC || 'Master Image'}
            onClick={() => setPreviewImageModal({ url: imgUrl, title: row.Design || row.MC || 'Master Image' })}
          />
        </div>
      )
    }

    if (col.field === 'LastUpdated' || col.type === 'date') {
      try {
        return <span className="font-mono text-slate-500 text-[11px]">{format(new Date(v), 'dd/MM/yy')}</span>
      } catch {
        return <span className="font-mono text-slate-500 text-[11px]">{String(v)}</span>
      }
    }

    return <span className="text-slate-700 dark:text-slate-300 text-xs">{String(v)}</span>
  }

  return (
    <div className="space-y-5">
      {/* ── HEADER & STATS ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รายการทั้งหมด</div>
            <div className="text-xl font-black mt-0.5" style={{ color: 'var(--text-900)' }}>
              {stats.total} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Layers size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">เครื่องจักร (MC)</div>
            <div className="text-xl font-black mt-0.5 text-blue-600 dark:text-blue-400">
              {stats.uniqueMCs} <span className="text-xs font-normal text-slate-400">เครื่อง</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Cpu size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">แบบงาน (Design)</div>
            <div className="text-xl font-black mt-0.5 text-indigo-600 dark:text-indigo-400">
              {stats.uniqueDesigns} <span className="text-xs font-normal text-slate-400">แบบ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <Palette size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">มีรูป Master</div>
            <div className="text-xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
              {stats.withImages} <span className="text-xs font-normal text-slate-400">แบบ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <ImageIcon size={18} />
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="ค้นหา MC / แบบงาน / KI / BOM..."
            className="w-full sm:w-80"
          />
          <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
          <GoogleSheetSyncButton
            sheetName="Design BOM"
            columns={cols}
            rows={displayRows}
            valueGetters={{
              ImageUrl: getDesignImageUrl,
              ImagePreview: getDesignImageUrl,
              Comment: (row) => stripImageUrlMeta(row.Comment),
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="btn-outline text-xs px-3 py-2 flex items-center gap-1.5"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>

          {canAdd && (
            <button
              type="button"
              onClick={openNew}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <Plus size={15} />
              <span>เพิ่ม Design/BOM</span>
            </button>
          )}
        </div>
      </div>

      {/* ── DATA TABLE ────────────────────────────────────────── */}
      <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                {cols.map((c) => (
                  <th key={c.field || c.id} style={getColumnWidthStyle(c)} className="py-3 px-3.5 text-left">
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
                    <span>กำลังโหลดข้อมูล Design/BOM...</span>
                  </td>
                </tr>
              )}
              {!loading && displayRows.map((r, i) => (
                <tr
                  key={r._id || r.id || i}
                  onClick={() => setDetailRec(r)}
                  className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  {cols.map((c) => (
                    <td key={c.field || c.id} style={getColumnWidthStyle(c)} className="py-2.5 px-3.5">
                      {renderCellContent(r, c)}
                    </td>
                  ))}
                  <td onClick={(e) => e.stopPropagation()} className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="แก้ไข Design/BOM"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => del(r._id || r.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="ลบรายการ"
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
                    <Palette size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">ไม่พบรายการ Design/BOM</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">กดปุ่ม "+ เพิ่ม Design/BOM" เพื่อเริ่มต้นบันทึก</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DETAIL DRAWER ─────────────────────────────────────── */}
      <DetailDrawer
        open={!!detailRec}
        onClose={() => setDetailRec(null)}
        title={detailRec?.Design || detailRec?.MC || 'Design/BOM'}
        subtitle={detailRec?.KI ? `KI: ${detailRec.KI} | BOM: ${detailRec.BOM || '—'}` : detailRec?.BOM}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => { del(detailRec._id || detailRec.id); setDetailRec(null) }}
        groups={detailRec ? [
          {
            label: 'ข้อมูลเครื่องจักรและแบบงาน',
            fields: [
              { label: 'รหัสเครื่อง (MC)', value: detailRec.MC },
              { label: 'ชื่อแบบงาน (Design)', value: detailRec.Design },
              { label: 'รหัส KI', value: detailRec.KI },
              { label: 'รหัส BOM', value: detailRec.BOM },
            ].filter((f) => f.value),
          },
          {
            label: 'พารามิเตอร์ CL & SP',
            fields: [
              { label: 'CL1', value: detailRec.CL1 },
              { label: 'CL2', value: detailRec.CL2 },
              { label: 'CL3', value: detailRec.CL3 },
              { label: 'CL4', value: detailRec.CL4 },
              { label: 'SP', value: detailRec.SP },
            ].filter((f) => f.value),
          },
          {
            label: 'พารามิเตอร์ SL',
            fields: [
              { label: 'SL1', value: detailRec.SL1 },
              { label: 'SL2', value: detailRec.SL2 },
              { label: 'SL3', value: detailRec.SL3 },
              { label: 'SL4', value: detailRec.SL4 },
            ].filter((f) => f.value),
          },
          {
            label: 'รูปภาพ Master',
            fields: [
              ...(getDesignImageUrl(detailRec) ? [{
                label: 'รูป Master',
                full: true,
                node: (
                  <div className="pt-1">
                    <ImageThumbnail
                      url={getDesignImageUrl(detailRec)}
                      alt={detailRec.Design || detailRec.MC || 'Master Image'}
                      size={48}
                      onClick={() => setPreviewImageModal({ url: getDesignImageUrl(detailRec), title: detailRec.Design || detailRec.MC || 'Master Image' })}
                    />
                  </div>
                ),
              }] : []),
            ].filter((f) => f && (f.node || f.value)),
          },
          {
            label: 'ข้อมูลเพิ่มเติม',
            fields: [
              { label: 'หมายเหตุ', value: stripImageUrlMeta(detailRec.Comment), full: true },
              { label: 'อัปเดตล่าสุด', value: detailRec.LastUpdated ? format(new Date(detailRec.LastUpdated), 'dd/MM/yyyy') : null },
            ].filter((f) => f.value),
          },
        ].filter((g) => g.fields.length > 0) : []}
      />

      {/* ── ADD / EDIT MODAL ──────────────────────────────────── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form._id || form.id ? '✏️ แก้ไขข้อมูล Design/BOM' : '➕ เพิ่มรายการ Design/BOM ใหม่'}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button type="button" className="btn-outline px-4" onClick={() => setModal(false)}>
              {t('cancel')}
            </button>
            <button type="button" className="btn-primary px-5" onClick={submit} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>{t('save')}</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-5 text-xs">
          {/* Section 1: Basic Info */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Layers size={14} className="text-blue-500" />
              <span>ข้อมูลหลัก (Machine & Design Info)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <F form={form} setForm={setForm} label="เครื่องจักร (MC)" id="MC" placeholder="เช่น 344244" />
              <F form={form} setForm={setForm} label="แบบงาน (Design)" id="Design" placeholder="เช่น ลายลูกฟูก" />
              <F form={form} setForm={setForm} label="รหัส KI" id="KI" placeholder="เช่น 24234" />
              <F form={form} setForm={setForm} label="รหัส BOM" id="BOM" placeholder="เช่น 423424" />
            </div>
          </div>

          {/* Section 2: CL & SP */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Palette size={14} className="text-blue-500" />
              <span>พารามิเตอร์ CL & SP</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <F form={form} setForm={setForm} label="CL1" id="CL1" placeholder="0" />
              <F form={form} setForm={setForm} label="CL2" id="CL2" placeholder="0" />
              <F form={form} setForm={setForm} label="CL3" id="CL3" placeholder="0" />
              <F form={form} setForm={setForm} label="CL4" id="CL4" placeholder="0" />
              <F form={form} setForm={setForm} label="SP" id="SP" placeholder="0" />
            </div>
          </div>

          {/* Section 3: SL */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <SlidersHorizontal size={14} className="text-emerald-500" />
              <span>พารามิเตอร์ SL</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <F form={form} setForm={setForm} label="SL1" id="SL1" placeholder="0" />
              <F form={form} setForm={setForm} label="SL2" id="SL2" placeholder="0" />
              <F form={form} setForm={setForm} label="SL3" id="SL3" placeholder="0" />
              <F form={form} setForm={setForm} label="SL4" id="SL4" placeholder="0" />
            </div>
          </div>

          {/* Section 4: Image & Comments */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
              <ImageIcon size={14} className="text-indigo-500" />
              <span>รูปภาพ Master & หมายเหตุ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label font-bold">อัปโหลดรูปภาพเข้า Google Drive</label>
                <div className="flex items-center gap-2">
                  <label className="btn-primary text-xs py-2 px-3 cursor-pointer flex items-center gap-1.5 flex-1 justify-center">
                    {uploadingImage ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>กำลังอัปโหลด...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={13} />
                        <span>เลือกไฟล์รูปภาพ</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={(e) => onPickImageFile(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <F form={form} setForm={setForm} label="หรือวางลิงก์รูป (URL)" id="ImageUrl" useBuilder={false} placeholder="https://..." />
              </div>

              {form.ImageUrl && (
                <div className="col-span-1 sm:col-span-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="font-mono text-blue-700 dark:text-blue-300 truncate">{form.ImageUrl}</span>
                  </div>
                  <a
                    href={form.ImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline text-[11px] py-1 px-2 flex-shrink-0 flex items-center gap-1"
                  >
                    <span>ดูรูป</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}

              <div className="col-span-1 sm:col-span-2">
                <F form={form} setForm={setForm} label="หมายเหตุ (Comment)" id="Comment" placeholder="ข้อสังเกต หรือข้อมูลประกอบแบบงาน" />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── IMAGE PREVIEW MODAL ───────────────────────────────── */}
      <ImagePreviewModal
        open={!!previewImageModal}
        onClose={() => setPreviewImageModal(null)}
        url={previewImageModal?.url}
        title={`รูป Master: ${previewImageModal?.title || ''}`}
      />
    </div>
  )
}
