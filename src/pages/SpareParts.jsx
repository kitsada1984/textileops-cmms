import { useMemo, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Package,
  CheckCircle2,
  DollarSign,
  Image as ImageIcon,
  ExternalLink,
  Upload,
  Check,
  X,
  Layers,
  Sparkles,
  FileText,
} from 'lucide-react'
import useEntity from '../hooks/useEntity'
import { SparePartAPI, PART_STATUS } from '../api/entities'
import useWebBuilderMenu, { useFieldOptions } from '../hooks/useWebBuilderMenu'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import SearchInput from '../components/ui/SearchInput'
import { useT } from '../contexts/LanguageContext'
import usePagePerms from '../hooks/usePagePerms'
import DetailDrawer from '../components/ui/DetailDrawer'
import { useToast } from '../components/ui/Toast'
import F from '../components/ui/FormField'
import FilterSortPanel, { INIT_FS } from '../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../components/ui/GoogleSheetSyncButton'
import { generatePartCode, getPartStockStatus } from '../utils/inventory'
import { uploadImageToGoogleDrive } from '../utils/googleDriveUpload'
import { applyFilterSort, buildFilterSortColumns } from '../utils/filterSort'
import PdfPreviewModal from '../components/ui/PdfPreviewModal'
import { generateSparePartPdfProps } from '../utils/pdfDocGenerators'
import {
  appendSparePartImageMeta,
  buildSparePartImagePayload,
  getSparePartImageUrl,
  preserveRemarkWithSparePartImageMeta,
  stripSparePartImageMeta,
} from '../utils/sparePartImage'

const SP_FIELD_KEYS = {
  Part_Code: 'sp_th_code',
  Part_Name_EN: 'sp_th_name_en',
  Category: 'sp_th_cat',
  Stock_Qty: 'sp_th_stock',
  Min_Qty: 'sp_th_min',
  Unit_Price: 'sp_th_price',
  Status: 'status',
  Remark: 'remark',
  Unit: 'field_unit',
  Supplier: 'field_supplier',
  Location_Store: 'field_warehouse',
}

const MISSING_SPAREPART_COLUMN_RE = /Could not find the '([^']+)' column of 'spareparts'|column spareparts\.([^ ]+) does not exist/i
const SPARE_PART_IMAGE_FOLDER = 'รูปอะไหล่'
const CATEGORY_OPTIONS = ['อะไหล่', 'เครื่องมือช่าง']
const WAREHOUSE_OPTIONS = ['GMK1', 'GMK3', 'Store']
const SP_FILTER_KEYS = ['Category', 'Status']

function optionRawValue(option) {
  if (option && typeof option === 'object') return option.value ?? option.id ?? option.label ?? ''
  return option ?? ''
}

function optionRawLabel(option) {
  if (option && typeof option === 'object') return option.label ?? option.value ?? option.id ?? ''
  return option ?? ''
}

function buildSparePartFilterOptions(rows = [], key, fallbackOptions = []) {
  const seen = new Map()
  fallbackOptions.forEach((option) => {
    const value = String(optionRawValue(option) ?? '').trim()
    if (!value || seen.has(value)) return
    seen.set(value, { value, label: optionRawLabel(option) || value })
  })
  rows.forEach((row) => {
    const raw = key === 'Status' ? getSparePartStatus(row) : row?.[key]
    const value = String(raw ?? '').trim()
    if (!value || seen.has(value)) return
    seen.set(value, { value, label: value })
  })

  return [...seen.values()].sort((a, b) =>
    String(a.label ?? '').localeCompare(String(b.label ?? ''), 'th', {
      numeric: true,
      sensitivity: 'base',
    })
  )
}

const getSPFallbackCols = (t) => [
  { field: 'Part_Code', label: t('sp_th_code'), type: 'text', width: '130px' },
  { field: 'Category', label: t('sp_th_cat'), type: 'select', width: '130px', options: CATEGORY_OPTIONS },
  { field: 'Part_Name_EN', label: t('sp_th_name_en'), type: 'text', width: '180px' },
  { field: 'Unit', label: t('field_unit'), type: 'text', width: '80px' },
  { field: 'Status', label: t('status'), type: 'select', width: '130px' },
  { field: 'Stock_Qty', label: t('sp_th_stock'), type: 'number', width: '90px' },
  { field: 'Min_Qty', label: t('sp_th_min'), type: 'number', width: '90px' },
  { field: 'Unit_Price', label: t('sp_th_price'), type: 'number', width: '120px' },
  { field: 'Location_Store', label: t('field_warehouse'), type: 'select', width: '130px', options: WAREHOUSE_OPTIONS },
  { field: 'Supplier', label: t('field_supplier'), type: 'text', width: '150px' },
  { field: 'Compatible_Machines', label: 'เครื่องที่ใช้ได้', type: 'text', width: '180px' },
  { field: 'ImageUrl', label: 'URL', type: 'text', width: '220px' },
  { field: 'ImagePreview', label: 'รูป', type: 'text', width: '110px' },
  { field: 'Remark', label: t('remark'), type: 'textarea', width: '220px' },
]

const getSPRequiredCols = (t) => getSPFallbackCols(t).map(({ field, label, width }) => ({ field, label, width }))

function resolveSPColumns(wbCols, t) {
  const fallbackCols = getSPFallbackCols(t)
  const sourceCols = (wbCols && wbCols.length > 0) ? wbCols : fallbackCols
  return getSPRequiredCols(t).map((requiredCol) => {
    const match = sourceCols.find((c) =>
      c?.field === requiredCol.field || c?.label === requiredCol.label
    )
    if (match) return { ...match, field: requiredCol.field, label: requiredCol.label }
    const fallback = fallbackCols.find((c) => c.field === requiredCol.field)
    return fallback || { ...requiredCol, type: 'text' }
  })
}

function getColumnWidthStyle(col) {
  if (!col?.width) return undefined
  return { width: col.width, minWidth: col.width }
}

function getSparePartName(row = {}) {
  if (!row) return ''
  return row.Part_Name_EN || row.Part_Name_TH || ''
}

function getSparePartStatus(row = {}) {
  return getPartStockStatus(row.Stock_Qty, row.Min_Qty)
}

const EMPTY = {
  Part_Code: '',
  Part_Name_TH: '',
  Part_Name_EN: '',
  Category: 'อะไหล่',
  Unit: '',
  Stock_Qty: 0,
  Min_Qty: 0,
  Location_Store: '',
  Supplier: '',
  Unit_Price: 0,
  Compatible_Machines: '',
  Status: 'IN_STOCK',
  Remark: '',
  ImageUrl: '',
}

function omitKeys(item, keys) {
  const clone = { ...item }
  keys.forEach((key) => {
    delete clone[key]
  })
  return clone
}

function getMissingSparePartColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_SPAREPART_COLUMN_RE)
  return match?.[1] || match?.[2] || null
}

export default function SpareParts() {
  const { t } = useT()
  const { canAdd, canEdit, canDelete } = usePagePerms('spareparts')
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(SparePartAPI)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [filterSort, setFilterSort] = useState(INIT_FS)
  const [detailRec, setDetailRec] = useState(null)
  const [pdfItem, setPdfItem] = useState(null)
  const [previewImageModal, setPreviewImageModal] = useState(null)

  // Summary statistics
  const stats = useMemo(() => {
    const total = data.length
    const inStock = data.filter((p) => getSparePartStatus(p) === 'IN_STOCK').length
    const lowStock = data.filter((p) => getSparePartStatus(p) !== 'IN_STOCK').length
    const totalValue = data.reduce((acc, p) => acc + (Number(p.Stock_Qty) || 0) * (Number(p.Unit_Price) || 0), 0)
    return { total, inStock, lowStock, totalValue }
  }, [data])

  const baseRows = useMemo(() => {
    return data.filter((p) =>
      [p.Part_Code, p.Part_Name_EN, p.Part_Name_TH, p.Category, p.Supplier, p.Location_Store, stripSparePartImageMeta(p.Remark)].some((v) =>
        String(v || '').toLowerCase().includes(search.toLowerCase())
      )
    )
  }, [data, search])

  const wbCols = useWebBuilderMenu('/spareparts')
  const cols = resolveSPColumns(wbCols, t)
  const statusOpts = useFieldOptions('/spareparts', 'Status', PART_STATUS)

  const categoryFilterOptions = useMemo(
    () => buildSparePartFilterOptions(data, 'Category', CATEGORY_OPTIONS),
    [data]
  )
  const statusFilterOptions = useMemo(
    () => buildSparePartFilterOptions(data, 'Status', statusOpts || PART_STATUS),
    [data, statusOpts]
  )

  const FS_COLS = useMemo(() => buildFilterSortColumns(cols, {
    include: SP_FILTER_KEYS,
    selectOptions: { Status: statusFilterOptions, Category: categoryFilterOptions },
    valueGetters: {
      Part_Name_EN: getSparePartName,
      ImageUrl: getSparePartImageUrl,
      ImagePreview: getSparePartImageUrl,
      Remark: (row) => stripSparePartImageMeta(row.Remark),
      Status: getSparePartStatus,
    },
  }), [categoryFilterOptions, cols, statusFilterOptions])

  const displayRows = useMemo(() => applyFilterSort(baseRows, FS_COLS, filterSort), [baseRows, FS_COLS, filterSort])

  const openNew = () => {
    setForm({ ...EMPTY, Part_Code: generatePartCode(data) })
    setModal(true)
  }

  const openEdit = (p) => {
    setForm({
      ...p,
      Compatible_Machines: Array.isArray(p.Compatible_Machines)
        ? p.Compatible_Machines.join(',') : p.Compatible_Machines || '',
      Status: getSparePartStatus(p),
      ImageUrl: getSparePartImageUrl(p),
    })
    setModal(true)
    setDetailRec(null)
  }

  const onPickImageFile = async (file) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const { imageUrl } = await uploadImageToGoogleDrive(file, { folderName: SPARE_PART_IMAGE_FOLDER })
      setForm((prev) => ({
        ...prev,
        ImageUrl: imageUrl,
        Remark: appendSparePartImageMeta(prev.Remark, { imageUrl }),
      }))
      toast.success('อัปโหลดรูปสำเร็จ', `บันทึกไว้ในโฟลเดอร์ ${SPARE_PART_IMAGE_FOLDER}`)
    } catch (e) {
      toast.error('อัปโหลดรูปไม่สำเร็จ', e.message)
    }
    setUploadingImage(false)
  }

  const saveWithColumnFallback = async (payload) => {
    let nextPayload = { ...payload }
    const removedColumns = []

    while (true) {
      try {
        await save(nextPayload)
        return removedColumns
      } catch (error) {
        const missingColumn = getMissingSparePartColumn(error)
        if (missingColumn === 'ImageUrl') {
          removedColumns.push(missingColumn)
          nextPayload = {
            ...omitKeys(nextPayload, ['ImageUrl']),
            Remark: appendSparePartImageMeta(nextPayload.Remark, { imageUrl: nextPayload.ImageUrl }),
          }
          continue
        }
        if (!missingColumn || removedColumns.includes(missingColumn)) {
          throw error
        }
        removedColumns.push(missingColumn)
        nextPayload = omitKeys(nextPayload, [missingColumn])
      }
    }
  }

  const submit = async () => {
    if (!form.Part_Code || !form.Part_Name_EN) {
      toast.warning('กรุณากรอกข้อมูล', t('sp_req'))
      return
    }
    const nextStatus = getSparePartStatus(form)
    const payload = buildSparePartImagePayload({
      ...form,
      Status: nextStatus,
      Compatible_Machines: form.Compatible_Machines
        ? String(form.Compatible_Machines).split(',').map((s) => s.trim()).filter(Boolean) : [],
    })
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    try {
      const removedColumns = await saveWithColumnFallback(payload)
      if (removedColumns.length > 0) {
        toast.warning(
          isEdit ? 'แก้ไขสำเร็จ (บางคอลัมน์บันทึกลงหมายเหตุ)' : 'เพิ่มสำเร็จ (บางคอลัมน์บันทึกลงหมายเหตุ)',
          `คอลัมน์ที่ฐานข้อมูลยังไม่มี: ${removedColumns.join(', ')}`
        )
      } else {
        toast.success(
          isEdit ? t('sp_edit_success') : t('sp_add_success'),
          `${form.Part_Code} - ${getSparePartName(form)}`
        )
      }
      setModal(false)
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm(t('sp_del_confirm'))) return
    try {
      await remove(id)
      toast.success('ลบข้อมูลสำเร็จ')
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
  }

  const renderCellContent = (row, col) => {
    const val = col.field === 'ImageUrl' || col.field === 'ImagePreview'
      ? getSparePartImageUrl(row)
      : col.field === 'Part_Name_EN'
        ? getSparePartName(row)
        : col.field === 'Status'
          ? getSparePartStatus(row)
          : row[col.field]

    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-300 dark:text-slate-700 font-mono text-center block">—</span>
    }

    if (col.field === 'Part_Code') {
      return (
        <span className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
          {String(val)}
        </span>
      )
    }

    if (col.field === 'Category') {
      const isTool = String(val).includes('เครื่องมือ')
      return (
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
          isTool
            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
            : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
        }`}>
          {String(val)}
        </span>
      )
    }

    if (col.field === 'Part_Name_EN') {
      return <span className="font-bold text-slate-800 dark:text-slate-100">{String(val)}</span>
    }

    if (col.field === 'Status') {
      return <StatusBadge value={val} />
    }

    if (col.field === 'Stock_Qty') {
      const isLow = Number(val) <= (Number(row.Min_Qty) || 0)
      return (
        <span className={`font-mono font-black text-xs ${isLow ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {Number(val).toLocaleString()}
        </span>
      )
    }

    if (col.field === 'Min_Qty') {
      return <span className="font-mono text-slate-500 text-xs">{Number(val).toLocaleString()}</span>
    }

    if (col.field === 'Unit_Price') {
      return <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs">฿{Number(val).toLocaleString()}</span>
    }

    if (col.field === 'Location_Store') {
      return (
        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold text-[11px]">
          {String(val)}
        </span>
      )
    }

    if (col.field === 'ImageUrl') {
      return (
        <a
          href={String(val)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-mono text-[11px] flex items-center gap-1 hover:underline max-w-[200px] truncate"
        >
          <span className="truncate">{String(val)}</span>
          <ExternalLink size={11} className="flex-shrink-0 opacity-70" />
        </a>
      )
    }

    if (col.field === 'ImagePreview') {
      const imgUrl = String(val)
      return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setPreviewImageModal({ url: imgUrl, title: `${row.Part_Code} - ${getSparePartName(row)}` })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all border border-blue-500/20"
          >
            <ImageIcon size={13} />
            <span>เปิดรูป</span>
          </button>
        </div>
      )
    }

    if (col.field === 'Compatible_Machines') {
      const text = Array.isArray(val) ? val.join(', ') : String(val)
      return <span className="text-slate-600 dark:text-slate-400 truncate max-w-[160px] block">{text}</span>
    }

    if (col.field === 'Remark') {
      return <span className="text-slate-500 truncate max-w-[200px] block">{stripSparePartImageMeta(val)}</span>
    }

    return <span className="text-slate-700 dark:text-slate-300 text-xs">{String(val)}</span>
  }

  return (
    <div className="space-y-5">
      {/* ── SUMMARY STATS CARDS ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รายการอะไหล่ทั้งหมด</div>
            <div className="text-xl font-black mt-0.5" style={{ color: 'var(--text-900)' }}>
              {stats.total} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Package size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">สต๊อกปกติ (In Stock)</div>
            <div className="text-xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
              {stats.inStock} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">สต๊อกต่ำกว่าเกณฑ์</div>
            <div className="text-xl font-black mt-0.5 text-rose-600 dark:text-rose-400">
              {stats.lowStock} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">มูลค่าสต๊อกรวม</div>
            <div className="text-xl font-black mt-0.5 text-blue-600 dark:text-blue-400">
              ฿{stats.totalValue.toLocaleString()}
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign size={18} />
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('sp_search')}
            className="w-full sm:w-80"
          />
          <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
          <GoogleSheetSyncButton
            sheetName="อะไหล่"
            columns={cols}
            rows={displayRows}
            valueGetters={{
              Part_Name_EN: getSparePartName,
              ImageUrl: getSparePartImageUrl,
              ImagePreview: getSparePartImageUrl,
              Remark: (row) => stripSparePartImageMeta(row.Remark),
              Status: getSparePartStatus,
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="btn-outline text-xs px-3 py-2 flex items-center gap-1.5"
            title={t('refresh')}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{t('refresh')}</span>
          </button>

          {canAdd && (
            <button
              type="button"
              onClick={openNew}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <Plus size={15} />
              <span>{t('sp_add')}</span>
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
                  <th key={c.field} style={getColumnWidthStyle(c)} className="py-3 px-3.5 text-left whitespace-nowrap">
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
              {!loading && displayRows.map((p, i) => (
                <tr
                  key={p._id || p.id || i}
                  onClick={() => setDetailRec(p)}
                  className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  {cols.map((c) => (
                    <td key={c.field} style={getColumnWidthStyle(c)} className="py-2.5 px-3.5 whitespace-nowrap">
                      {renderCellContent(p, c)}
                    </td>
                  ))}
                  <td onClick={(e) => e.stopPropagation()} className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPdfItem(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        title="ดูเอกสาร PDF และพิมพ์"
                      >
                        <FileText size={13} />
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="แก้ไขข้อมูลอะไหล่"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => del(p._id || p.id)}
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
                    <Package size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">{t('no_data')}</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">กดปุ่ม "+ เพิ่มอะไหล่" เพื่อเริ่มต้นบันทึก</p>
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
        title={getSparePartName(detailRec) || detailRec?.Part_Code}
        subtitle={detailRec ? `${detailRec.Part_Code} · ${detailRec.Category || 'อะไหล่'}` : ''}
        icon={Package}
        accentColor="#2563eb"
        badge={detailRec && <StatusBadge value={getSparePartStatus(detailRec)} />}
        canEdit={canEdit}
        canDelete={canDelete}
        onPdf={() => setPdfItem(detailRec)}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => {
          del(detailRec._id || detailRec.id)
          setDetailRec(null)
        }}
        groups={detailRec ? [
          {
            label: t('dr_general_info'),
            fields: [
              { label: t('sp_th_code'), value: detailRec.Part_Code, mono: true },
              { label: t('sp_th_name_en'), value: detailRec.Part_Name_EN },
              { label: t('sp_th_cat'), value: detailRec.Category },
              { label: t('field_unit'), value: detailRec.Unit },
              { label: t('field_warehouse'), value: detailRec.Location_Store },
              { label: t('field_supplier'), value: detailRec.Supplier },
              { label: 'ลิงก์รูปถ่าย', value: getSparePartImageUrl(detailRec), full: true },
            ].filter((f) => f.value),
          },
          {
            label: 'สต๊อกและราคา',
            fields: [
              { label: t('sp_th_stock'), value: detailRec.Stock_Qty != null ? `${detailRec.Stock_Qty} ${detailRec.Unit || ''}` : null },
              { label: t('sp_th_min'), value: detailRec.Min_Qty != null ? `${detailRec.Min_Qty} ${detailRec.Unit || ''}` : null },
              { label: t('sp_th_price'), value: detailRec.Unit_Price != null ? `฿${Number(detailRec.Unit_Price).toLocaleString()}` : null },
              { label: 'เครื่องที่ใช้ได้', value: Array.isArray(detailRec.Compatible_Machines) ? detailRec.Compatible_Machines.join(', ') : detailRec.Compatible_Machines },
            ].filter((f) => f.value),
          },
          {
            label: t('remark'),
            single: true,
            fields: [
              { label: t('remark'), value: stripSparePartImageMeta(detailRec.Remark), full: true },
            ].filter((f) => f.value),
          },
        ].filter((g) => g.fields.length > 0) : []}
      />

      {/* ── ADD / EDIT MODAL ──────────────────────────────────── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form._id || form.id ? '✏️ แก้ไขข้อมูลอะไหล่' : '➕ เพิ่มข้อมูลอะไหล่ใหม่'}
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
              <Package size={14} className="text-blue-500" />
              <span>ข้อมูลหลักและหมวดหมู่อะไหล่</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F form={form} setForm={setForm} label={`${t('sp_th_code')} *`} id="Part_Code" placeholder="เช่น SP-001" />
              <F form={form} setForm={setForm} label={t('sp_th_cat')} id="Category" opts={CATEGORY_OPTIONS} />
              <F form={form} setForm={setForm} label={`${t('sp_th_name_en')} *`} id="Part_Name_EN" placeholder="ชื่ออะไหล่ภาษาอังกฤษหรือไทย" />
              <F form={form} setForm={setForm} label={t('field_unit')} id="Unit" placeholder="เช่น ชิ้น, อัน, ตัว, กล่อง" />
              <F form={form} setForm={setForm} label={t('field_warehouse')} id="Location_Store" opts={WAREHOUSE_OPTIONS} />
              <F form={form} setForm={setForm} label={t('field_supplier')} id="Supplier" placeholder="ผู้ผลิตหรือร้านค้าที่ซื้อ" />
            </div>
          </div>

          {/* Section 2: Stock & Price */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <DollarSign size={14} className="text-blue-500" />
              <span>สต๊อกและราคา</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <F form={form} setForm={setForm} label={t('sp_th_stock')} id="Stock_Qty" type="number" placeholder="0" />
              <F form={form} setForm={setForm} label={t('sp_th_min')} id="Min_Qty" type="number" placeholder="0" />
              <F form={form} setForm={setForm} label={t('sp_th_price')} id="Unit_Price" type="number" placeholder="0" />
              <div className="sm:col-span-3">
                <F form={form} setForm={setForm} label="เครื่องที่ใช้ได้ (คั่นด้วยจุลภาค)" id="Compatible_Machines" placeholder="เช่น SA-301M, SA-302M" />
              </div>
            </div>
          </div>

          {/* Section 3: Photo & Remark */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
              <ImageIcon size={14} className="text-indigo-500" />
              <span>รูปถ่ายอะไหล่ & หมายเหตุ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label font-bold">อัปโหลดรูปอะไหล่เข้า Google Drive</label>
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
                        <span>เลือกไฟล์รูปถ่าย</span>
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
                <F
                  form={form}
                  setForm={setForm}
                  label={t('remark')}
                  id="Remark"
                  placeholder="ข้อคิดเห็น หรือรายละเอียดเพิ่มเติมของอะไหล่"
                  onChange={(value) => setForm((p) => ({
                    ...p,
                    Remark: preserveRemarkWithSparePartImageMeta(p.Remark, value),
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── IMAGE PREVIEW MODAL ───────────────────────────────── */}
      {previewImageModal && (
        <Modal
          open={!!previewImageModal}
          onClose={() => setPreviewImageModal(null)}
          title={`🖼️ ${previewImageModal.title}`}
        >
          <div className="space-y-4 text-center">
            <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.title}
                className="max-h-[65vh] w-auto object-contain mx-auto"
              />
            </div>
            <div className="flex items-center justify-between text-xs pt-2">
              <a
                href={previewImageModal.url}
                target="_blank"
                rel="noreferrer"
                className="btn-outline text-xs flex items-center gap-1.5"
              >
                <ExternalLink size={13} />
                <span>เปิดในแท็บใหม่ (Full Size)</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="btn-primary text-xs px-4"
              >
                ปิด
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── PDF PREVIEW & PRINT MODAL ───────────────────────── */}
      {pdfItem && (
        <PdfPreviewModal
          open={!!pdfItem}
          onClose={() => setPdfItem(null)}
          {...generateSparePartPdfProps(pdfItem)}
        />
      )}
    </div>
  )
}
