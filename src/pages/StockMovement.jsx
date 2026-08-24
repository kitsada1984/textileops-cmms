import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  RefreshCw,
  ArrowLeftRight,
  Pencil,
  Trash2,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Image as ImageIcon,
  ExternalLink,
  Upload,
  Check,
  X,
  Layers,
  Sparkles,
  User,
  Tag,
} from 'lucide-react'
import { format } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { StockTxnAPI, TXN_TYPE, SparePartAPI } from '../api/entities'
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
import { generateStockTxnId, getPartStockStatus, getSignedStockDelta, toNumber } from '../utils/inventory'
import { getSparePartImageUrl } from '../utils/sparePartImage'
import { applyFilterSort, buildFilterSortColumns } from '../utils/filterSort'
import ImagePreviewModal from '../components/ui/ImagePreviewModal'
import ImageThumbnail from '../components/ui/ImageThumbnail'

const SM_FIELD_KEYS = {
  created_date: 'sm_th_date',
  TXN_Type: 'sm_th_type',
  Part_Name_EN: 'sm_th_name',
  Qty_Before: 'sm_th_before',
  Qty_Change: 'sm_th_change',
  Qty_After: 'sm_th_after',
  Reference: 'sm_th_ref',
  Performed_By: 'sm_th_by',
}
const IMAGE_NOTE_PREFIX = 'ImageUrl:'
const CATEGORY_NOTE_PREFIX = 'Category:'
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column/i
const HIDDEN_IMAGE_NOTE_PREFIXES = [
  IMAGE_NOTE_PREFIX,
  CATEGORY_NOTE_PREFIX,
]
const CATEGORY_OPTIONS = ['อะไหล่', 'เครื่องมือช่าง']
const WAREHOUSE_OPTIONS = ['GMK1', 'GMK3', 'Store']

const getSMFallbackCols = (t) => [
  { field: 'created_date', label: t('sm_th_date'), type: 'datetime' },
  { field: 'TXN_ID', label: 'เลขรายการ', type: 'text' },
  { field: 'TXN_Type', label: t('sm_th_type'), type: 'select' },
  { field: 'Part_Code', label: 'รหัสอะไหล่', type: 'text' },
  { field: 'Part_Name_EN', label: t('sm_th_name'), type: 'text' },
  { field: 'Category', label: 'หมวดหมู่', type: 'select', width: '140px', options: CATEGORY_OPTIONS },
  { field: 'Qty_Before', label: t('sm_th_before'), type: 'number' },
  { field: 'Qty_Change', label: t('sm_th_change'), type: 'number' },
  { field: 'Qty_After', label: t('sm_th_after'), type: 'number' },
  { field: 'Unit', label: t('field_unit'), type: 'text', width: '80px' },
  { field: 'Unit_Price', label: 'ราคาต่อหน่วย', type: 'number', width: '110px' },
  { field: 'Reference', label: t('sm_th_ref'), type: 'text' },
  { field: 'Location_Store', label: t('field_warehouse'), type: 'select', width: '130px', options: WAREHOUSE_OPTIONS },
  { field: 'Performed_By', label: t('sm_th_by'), type: 'text' },
  { field: 'ImageUrl', label: 'URL', type: 'text', width: '220px' },
  { field: 'ImagePreview', label: 'รูป', type: 'text', width: '110px' },
  { field: 'Note', label: 'หมายเหตุ', type: 'text', width: '220px' },
]

const getSMRequiredCols = (t) => [
  { field: 'created_date', label: t('sm_th_date') },
  { field: 'TXN_ID', label: 'เลขรายการ' },
  { field: 'TXN_Type', label: t('sm_th_type') },
  { field: 'Part_Code', label: 'รหัสอะไหล่' },
  { field: 'Part_Name_EN', label: t('sm_th_name') },
  { field: 'Category', label: 'หมวดหมู่', width: '140px' },
  { field: 'Qty_Before', label: t('sm_th_before') },
  { field: 'Qty_Change', label: t('sm_th_change') },
  { field: 'Qty_After', label: t('sm_th_after') },
  { field: 'Unit', label: t('field_unit'), width: '80px' },
  { field: 'Unit_Price', label: 'ราคาต่อหน่วย', width: '110px' },
  { field: 'Reference', label: t('sm_th_ref') },
  { field: 'Location_Store', label: t('field_warehouse'), width: '130px' },
  { field: 'Performed_By', label: t('sm_th_by') },
  { field: 'ImageUrl', label: 'URL', width: '220px' },
  { field: 'ImagePreview', label: 'รูป', width: '110px' },
  { field: 'Note', label: 'หมายเหตุ', width: '220px' },
]

const EMPTY = {
  TXN_Type: 'ISSUE',
  Part_Code: '',
  Part_Name_EN: '',
  Category: '',
  Qty_Before: 0,
  Qty_Change: 0,
  Qty_After: 0,
  Unit: '',
  Unit_Price: 0,
  Reference: '',
  Reference_Type: 'MANUAL',
  Location_Store: '',
  Performed_By: '',
  Note: '',
}

function resolveSMColumns(wbCols, t) {
  const fallbackCols = getSMFallbackCols(t)
  const requiredCols = getSMRequiredCols(t)
  const sourceCols = (wbCols && wbCols.length > 0) ? wbCols : fallbackCols
  const resolvedCols = requiredCols.map((requiredCol) => {
    const match = sourceCols.find((c) =>
      c?.field === requiredCol.field || c?.label === requiredCol.label
    )
    if (match) return { ...match, field: requiredCol.field, label: requiredCol.label }
    const fallback = fallbackCols.find((c) => c.field === requiredCol.field)
    return fallback || { ...requiredCol, type: 'text' }
  })
  const urlWidth = resolvedCols.find((c) => c.field === 'ImageUrl')?.width || '220px'
  return resolvedCols.map((col) => {
    if (col.field === 'Location_Store') {
      return { ...col, type: 'select', options: WAREHOUSE_OPTIONS }
    }
    if (col.field === 'Note') return { ...col, width: urlWidth }
    return col
  })
}

function getColumnWidthStyle(col) {
  if (!col?.width) return undefined
  return { width: col.width, minWidth: col.width }
}

function extractHiddenNoteValue(note = '', prefix = '') {
  const line = String(note || '').split('\n').find((item) => item.trim().startsWith(prefix))
  return line?.trim().slice(prefix.length).trim() || ''
}

function stripImageUrlFromNote(note = '') {
  return String(note || '')
    .split('\n')
    .filter((line) => !HIDDEN_IMAGE_NOTE_PREFIXES.some((prefix) => line.trim().startsWith(prefix)))
    .join('\n')
    .trim()
}

function appendStockMetaToNote(note = '', { category = '' } = {}) {
  const cleanNote = stripImageUrlFromNote(note)
  return [
    cleanNote,
    category ? `${CATEGORY_NOTE_PREFIX} ${category}` : '',
  ].filter(Boolean).join('\n')
}

function getHiddenStockCategory(row = {}) {
  return row.Category || extractHiddenNoteValue(row.Note, CATEGORY_NOTE_PREFIX) || ''
}

function buildStockPayload(form = {}) {
  return {
    ...omitKeys(form, ['ImageUrl', 'Category']),
    Note: appendStockMetaToNote(form.Note, { category: getHiddenStockCategory(form) }),
  }
}

function omitKeys(item, keys) {
  const clone = { ...item }
  keys.forEach((key) => {
    delete clone[key]
  })
  return clone
}

function getMissingStockColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || null
}

export default function StockMovement() {
  const { t } = useT()
  const { canAdd, canEdit, canDelete } = usePagePerms('stock')
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(StockTxnAPI)
  const { data: parts, load: loadParts } = useEntity(SparePartAPI)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filterSort, setFilterSort] = useState(INIT_FS)
  const [detailRec, setDetailRec] = useState(null)
  const [previewImageModal, setPreviewImageModal] = useState(null)

  // Summary statistics
  const stats = useMemo(() => {
    const total = data.length
    const receive = data.filter((tx) => tx.TXN_Type === 'RECEIVE').length
    const issue = data.filter((tx) => tx.TXN_Type === 'ISSUE').length
    const adjust = data.filter((tx) => tx.TXN_Type === 'ADJUST').length
    return { total, receive, issue, adjust }
  }, [data])

  const findPartForStockRow = (row = {}) =>
    parts.find((part) =>
      String(part.Part_Code || '').trim().toLowerCase() === String(row.Part_Code || '').trim().toLowerCase() ||
      (row.Part_ID && String(part.id || part._id) === String(row.Part_ID))
    )

  const getStockPartImageUrl = (row = {}) => {
    const part = findPartForStockRow(row)
    return getSparePartImageUrl(part || row)
  }

  const getStockCategory = (row = {}) => {
    const part = findPartForStockRow(row)
    return getHiddenStockCategory(row) || part?.Category || ''
  }

  const baseRows = useMemo(() => {
    return data.filter((tx) =>
      [tx.TXN_ID, tx.Part_Code, tx.Part_Name_EN, getStockCategory(tx), tx.Reference, tx.Performed_By, stripImageUrlFromNote(tx.Note)]
        .some((v) => String(v || '').toLowerCase().includes(search.toLowerCase()))
    )
  }, [data, parts, search])

  const wbCols = useWebBuilderMenu('/stock-movement')
  const cols = resolveSMColumns(wbCols, t)
  const txnTypeOptions = useFieldOptions('/stock-movement', 'TXN_Type', TXN_TYPE)

  const FS_COLS = useMemo(() => buildFilterSortColumns(cols, {
    selectOptions: {
      TXN_Type: txnTypeOptions || TXN_TYPE,
      Category: CATEGORY_OPTIONS,
    },
    valueGetters: {
      Category: getStockCategory,
      ImageUrl: getStockPartImageUrl,
      ImagePreview: getStockPartImageUrl,
      Note: (row) => stripImageUrlFromNote(row.Note),
    },
  }), [cols, parts, txnTypeOptions])

  const displayRows = useMemo(() => applyFilterSort(baseRows, FS_COLS, filterSort), [baseRows, FS_COLS, filterSort])

  const openNew = () => {
    setForm(EMPTY)
    setModal(true)
  }

  const openEdit = (tx) => {
    setForm({
      ...EMPTY,
      ...tx,
      Note: stripImageUrlFromNote(tx.Note),
      Category: getStockCategory(tx),
      ImageUrl: getStockPartImageUrl(tx),
    })
    setModal(true)
    setDetailRec(null)
  }

  useEffect(() => {
    const part = parts.find((item) => String(item.Part_Code || '').toLowerCase() === String(form.Part_Code || '').toLowerCase())
    if (!part) return
    const before = toNumber(part.Stock_Qty)
    const after = before + getSignedStockDelta(form.TXN_Type, form.Qty_Change)
    if (toNumber(form.Qty_Before) !== before || toNumber(form.Qty_After) !== after) {
      setForm((prev) => ({ ...prev, Qty_Before: before, Qty_After: after }))
    }
  }, [form.Part_Code, form.Qty_Change, form.TXN_Type, parts])

  const applyPartToForm = (partCode) => {
    const part = parts.find((item) => String(item.Part_Code || '').toLowerCase() === String(partCode || '').toLowerCase())
    setForm((prev) => ({
      ...prev,
      Part_Code: partCode,
      Part_Name_EN: part?.Part_Name_EN || prev.Part_Name_EN,
      Category: part?.Category || prev.Category,
      Qty_Before: part ? toNumber(part.Stock_Qty) : prev.Qty_Before,
      Qty_After: part ? toNumber(part.Stock_Qty) + getSignedStockDelta(prev.TXN_Type, prev.Qty_Change) : prev.Qty_After,
      Unit: part?.Unit || prev.Unit,
      Unit_Price: part?.Unit_Price || prev.Unit_Price,
      Location_Store: part?.Location_Store || prev.Location_Store,
    }))
  }

  const applyMovementToSparePart = async (payload) => {
    const partCode = String(payload.Part_Code || '').trim()
    if (!partCode) throw new Error('กรุณากรอกรหัสอะไหล่')

    const allParts = await SparePartAPI.list()
    const existing = allParts.find((part) => String(part.Part_Code || '').toLowerCase() === partCode.toLowerCase())
    const delta = getSignedStockDelta(payload.TXN_Type, payload.Qty_Change)
    if (!existing && delta < 0) throw new Error(`ไม่พบอะไหล่ ${partCode} ในเมนูอะไหล่`)

    const before = toNumber(existing?.Stock_Qty)
    const after = before + delta
    const partPayload = existing
      ? {
          ...existing,
          Part_Name_EN: existing.Part_Name_EN || payload.Part_Name_EN || '',
          Category: existing.Category || payload.Category || '',
          Unit: existing.Unit || payload.Unit || '',
          Unit_Price: existing.Unit_Price || toNumber(payload.Unit_Price),
          Location_Store: existing.Location_Store || payload.Location_Store || '',
          Stock_Qty: after,
          Status: getPartStockStatus(after, existing.Min_Qty),
        }
      : {
          Part_Code: partCode,
          Part_Name_TH: '',
          Part_Name_EN: payload.Part_Name_EN || partCode,
          Category: payload.Category || 'อะไหล่',
          Unit: payload.Unit || '',
          Stock_Qty: after,
          Min_Qty: 0,
          Location_Store: payload.Location_Store || '',
          Supplier: '',
          Unit_Price: toNumber(payload.Unit_Price),
          Compatible_Machines: [],
          Status: getPartStockStatus(after, 0),
          Remark: 'สร้างอัตโนมัติจากเมนูเคลื่อนไหวสต๊อก',
        }

    const saved = existing
      ? await SparePartAPI.update(existing.id || existing._id, partPayload)
      : await SparePartAPI.create(partPayload)

    await loadParts()
    return { before, after, partId: saved.id || saved._id || existing?.id || null }
  }

  const submit = async () => {
    if (!form.Part_Code) {
      toast.warning('กรุณากรอกข้อมูล', 'รหัสอะไหล่จำเป็นต้องกรอก')
      return
    }
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    try {
      let finalPayload = { ...form }
      if (!isEdit) {
        const { before, after, partId } = await applyMovementToSparePart(form)
        finalPayload = {
          ...finalPayload,
          TXN_ID: generateStockTxnId(new Date()),
          Part_ID: partId,
          Qty_Before: before,
          Qty_After: after,
          created_date: new Date().toISOString(),
        }
      }

      await save(buildStockPayload(finalPayload))
      toast.success(
        isEdit ? 'แก้ไขรายการเคลื่อนไหวสำเร็จ' : 'บันทึกเคลื่อนไหวสต๊อกสำเร็จ',
        `${finalPayload.Part_Code} (${finalPayload.TXN_Type})`
      )
      setModal(false)
      await load()
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('ยืนยันการลบรายการเคลื่อนไหวสต๊อกนี้?')) return
    try {
      await remove(id)
      toast.success('ลบรายการสำเร็จ')
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
  }

  const renderCellContent = (row, col) => {
    const val = col.field === 'ImageUrl' || col.field === 'ImagePreview'
      ? getStockPartImageUrl(row)
      : col.field === 'Category'
        ? getStockCategory(row)
        : row[col.field]

    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-300 dark:text-slate-700 font-mono text-center block">—</span>
    }

    if (col.field === 'TXN_ID') {
      return (
        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
          {String(val)}
        </span>
      )
    }

    if (col.field === 'TXN_Type') {
      const isRec = val === 'RECEIVE'
      const isAdj = val === 'ADJUST'
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
          isRec
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
            : isAdj
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
        }`}>
          {isRec ? <ArrowDownLeft size={11} /> : isAdj ? <RotateCcw size={11} /> : <ArrowUpRight size={11} />}
          <span>{val === 'RECEIVE' ? 'รับเข้า' : val === 'ISSUE' ? 'เบิกจ่าย' : 'ปรับสต๊อก'}</span>
        </span>
      )
    }

    if (col.field === 'Part_Code') {
      return <span className="font-mono font-black text-blue-600 dark:text-blue-400">{String(val)}</span>
    }

    if (col.field === 'Part_Name_EN') {
      return <span className="font-bold text-slate-800 dark:text-slate-100">{String(val)}</span>
    }

    if (col.field === 'Qty_Change') {
      const delta = getSignedStockDelta(row.TXN_Type, val)
      return (
        <span className={`font-mono font-black text-xs ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {delta > 0 ? `+${Number(val).toLocaleString()}` : `-${Number(val).toLocaleString()}`}
        </span>
      )
    }

    if (col.field === 'Qty_Before' || col.field === 'Qty_After') {
      return <span className="font-mono text-slate-600 dark:text-slate-400 text-xs">{Number(val).toLocaleString()}</span>
    }

    if (col.field === 'Unit_Price') {
      return <span className="font-mono text-slate-600 dark:text-slate-400 text-xs">฿{Number(val).toLocaleString()}</span>
    }

    if (col.type === 'datetime' || col.field === 'created_date') {
      try {
        return <span className="font-mono text-slate-500 text-[11px]">{format(new Date(val), 'dd/MM/yy HH:mm')}</span>
      } catch {
        return <span className="font-mono text-slate-500 text-[11px]">{String(val)}</span>
      }
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
          <ImageThumbnail
            url={imgUrl}
            alt={`${row.Part_Code} - ${row.Part_Name_EN || ''}`}
            onClick={() => setPreviewImageModal({ url: imgUrl, title: `${row.Part_Code} - ${row.Part_Name_EN || ''}` })}
          />
        </div>
      )
    }

    if (col.field === 'Note') {
      return <span className="text-slate-500 truncate max-w-[200px] block">{stripImageUrlFromNote(val)}</span>
    }

    return <span className="text-slate-700 dark:text-slate-300 text-xs">{String(val)}</span>
  }

  return (
    <div className="space-y-5">
      {/* ── SUMMARY STATS CARDS ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รายการเคลื่อนไหวทั้งหมด</div>
            <div className="text-xl font-black mt-0.5" style={{ color: 'var(--text-900)' }}>
              {stats.total} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <ArrowLeftRight size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รับเข้าสต๊อก (Receive)</div>
            <div className="text-xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
              {stats.receive} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <ArrowDownLeft size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">เบิกจ่ายสต๊อก (Issue)</div>
            <div className="text-xl font-black mt-0.5 text-rose-600 dark:text-rose-400">
              {stats.issue} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <ArrowUpRight size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ปรับปรุงสต๊อก (Adjust)</div>
            <div className="text-xl font-black mt-0.5 text-blue-600 dark:text-blue-400">
              {stats.adjust} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <RotateCcw size={18} />
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="ค้นหา เลขรายการ / รหัสอะไหล่ / ชื่ออะไหล่ / ผู้ดำเนินการ..."
            className="w-full sm:w-80"
          />
          <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
          <GoogleSheetSyncButton
            sheetName="เคลื่อนไหวสต๊อก"
            columns={cols}
            rows={displayRows}
            valueGetters={{
              Category: getStockCategory,
              ImageUrl: getStockPartImageUrl,
              ImagePreview: getStockPartImageUrl,
              Note: (row) => stripImageUrlFromNote(row.Note),
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
              <span>บันทึกเคลื่อนไหว</span>
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
                  <th key={c.field} style={getColumnWidthStyle(c)} className="py-3 px-3 text-left whitespace-nowrap">
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
              {!loading && displayRows.map((tx, i) => (
                <tr
                  key={tx._id || tx.id || i}
                  onClick={() => setDetailRec(tx)}
                  className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  {cols.map((c) => (
                    <td key={c.field} style={getColumnWidthStyle(c)} className="py-2.5 px-3 whitespace-nowrap">
                      {renderCellContent(tx, c)}
                    </td>
                  ))}
                  <td onClick={(e) => e.stopPropagation()} className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(tx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="แก้ไขรายการเคลื่อนไหว"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => del(tx._id || tx.id)}
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
                    <ArrowLeftRight size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">{t('no_data')}</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">กดปุ่ม "+ บันทึกเคลื่อนไหว" เพื่อเริ่มต้นทำรายการ</p>
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
        title={detailRec?.TXN_ID}
        subtitle={detailRec ? `${detailRec.Part_Code} · ${detailRec.Part_Name_EN || ''}` : ''}
        icon={ArrowLeftRight}
        accentColor="#2563eb"
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => {
          del(detailRec._id || detailRec.id)
          setDetailRec(null)
        }}
        groups={detailRec ? [
          {
            label: 'ข้อมูลรายการเคลื่อนไหว',
            fields: [
              { label: 'เลขรายการ', value: detailRec.TXN_ID, mono: true },
              { label: 'ประเภทรายการ', value: detailRec.TXN_Type === 'RECEIVE' ? 'รับเข้า' : detailRec.TXN_Type === 'ISSUE' ? 'เบิกจ่าย' : 'ปรับสต๊อก' },
              { label: 'วันที่ทำรายการ', value: detailRec.created_date ? format(new Date(detailRec.created_date), 'dd/MM/yyyy HH:mm') : null },
              { label: 'รหัสอะไหล่', value: detailRec.Part_Code, mono: true },
              { label: 'ชื่ออะไหล่', value: detailRec.Part_Name_EN },
              { label: 'หมวดหมู่', value: getStockCategory(detailRec) },
              { label: 'ลิงก์รูปภาพ', value: getStockPartImageUrl(detailRec), full: true },
            ].filter((f) => f.value),
          },
          {
            label: 'การเปลี่ยนแปลงสต๊อก',
            fields: [
              { label: 'จำนวนก่อนทำ', value: `${detailRec.Qty_Before} ${detailRec.Unit || ''}` },
              { label: 'จำนวนที่เปลี่ยนแปลง', value: `${getSignedStockDelta(detailRec.TXN_Type, detailRec.Qty_Change) > 0 ? '+' : ''}${getSignedStockDelta(detailRec.TXN_Type, detailRec.Qty_Change)} ${detailRec.Unit || ''}` },
              { label: 'จำนวนคงเหลือหลังทำ', value: `${detailRec.Qty_After} ${detailRec.Unit || ''}` },
              { label: 'คลัง/สถานที่เก็บ', value: detailRec.Location_Store },
            ].filter((f) => f.value),
          },
          {
            label: 'อ้างอิงและผู้ดำเนินการ',
            fields: [
              { label: 'เอกสารอ้างอิง', value: detailRec.Reference },
              { label: 'ประเภทอ้างอิง', value: detailRec.Reference_Type },
              { label: 'ผู้ทำรายการ', value: detailRec.Performed_By },
              { label: 'หมายเหตุ', value: stripImageUrlFromNote(detailRec.Note), full: true },
            ].filter((f) => f.value),
          },
        ].filter((g) => g.fields.length > 0) : []}
      />

      {/* ── ADD / EDIT MODAL ──────────────────────────────────── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form._id || form.id ? '✏️ แก้ไขรายการเคลื่อนไหวสต๊อก' : '➕ บันทึกเคลื่อนไหวสต๊อกใหม่'}
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
          {/* Section 1: Transaction Type & Part Picker */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <ArrowLeftRight size={14} className="text-blue-500" />
                <span>ประเภทรายการและอะไหล่</span>
              </div>
              {parts?.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">เลือกอะไหล่:</span>
                  <select
                    className="select text-[11px] py-0.5 px-2 max-w-[180px]"
                    onChange={(e) => applyPartToForm(e.target.value)}
                    value=""
                  >
                    <option value="">— เลือกอะไหล่ —</option>
                    {parts.map((p) => (
                      <option key={p.Part_Code} value={p.Part_Code}>
                        {p.Part_Code} - {p.Part_Name_EN}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <F form={form} setForm={setForm} label="ประเภทรายการ" id="TXN_Type" opts={TXN_TYPE} />
              <F form={form} setForm={setForm} label="รหัสอะไหล่ *" id="Part_Code" placeholder="เช่น SP-001" />
              <F form={form} setForm={setForm} label="ชื่ออะไหล่" id="Part_Name_EN" placeholder="ชื่ออะไหล่" />
              <F form={form} setForm={setForm} label="หมวดหมู่" id="Category" opts={CATEGORY_OPTIONS} />
            </div>
          </div>

          {/* Section 2: Quantities & Preview */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Package size={14} className="text-blue-500" />
              <span>การปรับจำนวนสต๊อก</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <div>
                <label className="label text-slate-500">คงเหลือก่อนทำ</label>
                <div className="font-mono font-bold text-base text-slate-700 dark:text-slate-300">
                  {Number(form.Qty_Before || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{form.Unit}</span>
                </div>
              </div>

              <div>
                <F form={form} setForm={setForm} label="จำนวนที่ทำรายการ *" id="Qty_Change" type="number" placeholder="0" />
              </div>

              <div>
                <label className="label text-slate-500">คงเหลือหลังทำ (คำนวณอัตโนมัติ)</label>
                <div className={`font-mono font-black text-base ${Number(form.Qty_After || 0) < 0 ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                  {Number(form.Qty_After || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{form.Unit}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <F form={form} setForm={setForm} label="หน่วยนับ" id="Unit" placeholder="เช่น ชิ้น, อัน" />
              <F form={form} setForm={setForm} label="ราคาต่อหน่วย" id="Unit_Price" type="number" placeholder="0" />
              <F form={form} setForm={setForm} label="คลัง/สถานที่เก็บ" id="Location_Store" opts={WAREHOUSE_OPTIONS} />
            </div>
          </div>

          {/* Section 3: Reference & Notes */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Tag size={14} className="text-emerald-500" />
              <span>เอกสารอ้างอิงและผู้ดำเนินการ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F form={form} setForm={setForm} label="เอกสารอ้างอิง / เลขที่งาน" id="Reference" placeholder="เช่น WO-2026-001 หรือ PO-001" />
              <F form={form} setForm={setForm} label="ผู้ทำรายการ" id="Performed_By" placeholder="ชื่อผู้เบิกหรือผู้รับของ" />
              <div className="sm:col-span-2">
                <F
                  form={form}
                  setForm={setForm}
                  label="หมายเหตุ (Note)"
                  id="Note"
                  placeholder="สาเหตุการเบิก การใช้งาน หรือข้อสังเกต"
                />
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
        title={previewImageModal?.title}
      />
    </div>
  )
}
