import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  RefreshCw,
  ArrowLeftRight,
  Pencil,
  Trash2,
  Package,
  Image as ImageIcon,
  Upload,
  X,
  Layers,
  Sparkles,
  User,
  Cpu,
} from 'lucide-react'
import { format } from 'date-fns'
import useEntity from '../../hooks/useEntity'
import { useRealtimeTables } from '../../api/realtimeSync'
import { StockTxnAPI, SparePartAPI, MachineAPI } from '../../api/entities'
import useWebBuilderMenu, { useFieldOptions } from '../../hooks/useWebBuilderMenu'
import StatusBadge from '../../components/ui/StatusBadge'
import SearchInput from '../../components/ui/SearchInput'
import { useT } from '../../contexts/LanguageContext'
import usePagePerms from '../../hooks/usePagePerms'
import DetailDrawer from '../../components/ui/DetailDrawer'
import { useToast } from '../../components/ui/Toast'
import F from '../../components/ui/FormField'
import FilterSortPanel, { INIT_FS } from '../../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../../components/ui/GoogleSheetSyncButton'
import { generateStockTxnId, getPartStockStatus, getSignedStockDelta, toNumber } from '../../utils/inventory'
import { getSparePartImageUrl } from '../../utils/sparePartImage'
import { applyFilterSort, buildFilterSortColumns } from '../../utils/filterSort'
import ImagePreviewModal from '../../components/ui/ImagePreviewModal'
import MachinePartsHistoryModal from '../../components/inventory/MachinePartsHistoryModal'
import { useSparePartCategories, DEFAULT_SPARE_PART_CATEGORIES } from '../../modules/sparePart'
import {
  getMovementMC,
  appendMCMetaToNote,
  stripMCMetaFromNote,
  MC_NOTE_PREFIX,
  MACHINE_MC_NOTE_PREFIX,
  getStockTxnDate,
  toInputDateValue,
  formatStockTxnDate,
  DATE_NOTE_PREFIX,
  NO_MC_VALUE,
  SM_TXN_TYPE_OPTIONS,
  buildStockMovementMCOptions,
  matchStockMovementMC,
  matchStockMovementType,
  buildStockMovementPartCodeOptions,
  buildStockMovementWarehousePartOptions,
  buildStockMovementPartNameOptions,
  matchStockMovementPartCode,
  matchStockMovementPartName,
  findMatchingSparePart,
} from '../../utils/stockMovementMC'

export * from './stockMovementHelpers.jsx'
import { StockMovementStats } from './stockMovementStats.jsx'
import { StockEditModal } from './stockEditModal.jsx'
import {
  SM_FILTER_KEYS,
  WAREHOUSE_OPTIONS,
  EMPTY,
  resolveSMColumns,
  getColumnWidthStyle,
  stripImageUrlFromNote,
  parseStockDateInput,
  getHiddenStockCategory,
  buildStockPayload,
  omitKeys,
  getMissingStockColumn,
} from './stockMovementHelpers.jsx'
import { findExistingSparePart, buildSparePartPayloadFromMovement } from './stockMovementPayload.js'
import { resolveStockCellValue, renderStockMCButton, renderStockTxnTypeCell, renderStockQtyChangeCell, renderStockImageUrlCell, renderStockImagePreviewCell } from './stockCellRender.jsx'


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
  const [filterSort, setFilterSort] = useState(() => ({
    ...INIT_FS,
    sort: { key: 'created_date', dir: 'desc' },
  }))
  const [detailRec, setDetailRec] = useState(null)
  const [previewImageModal, setPreviewImageModal] = useState(null)
  const [selectedMachineForHistory, setSelectedMachineForHistory] = useState(null)
  const [machineList, setMachineList] = useState([])

  useEffect(() => {
    MachineAPI.list()
      .then((res) => {
        const rows = res?.data || res || []
        setMachineList(rows)
      })
      .catch(() => {})
  }, [])

  useRealtimeTables(['machines'], () => {
    MachineAPI.list()
      .then((res) => {
        const rows = res?.data || res || []
        setMachineList(rows)
      })
      .catch(() => {})
  })

  const mcOptions = useMemo(() => {
    const fromData = data.map((tx) => getMovementMC(tx)).filter(Boolean)
    const fromMachines = machineList.map((m) => String(m.MC || m.Machine_MC || m.Machine_ID || m.name || '').trim()).filter(Boolean)
    const values = Array.from(new Set([...fromData, ...fromMachines])).sort()
    return values.map((v) => ({ value: v, label: v }))
  }, [data, machineList])

  const mcFilterOptions = useMemo(() => buildStockMovementMCOptions(mcOptions), [mcOptions])

  const partCodeOptions = useMemo(
    () => buildStockMovementPartCodeOptions(parts, data),
    [parts, data]
  )

  const partNameOptions = useMemo(
    () => buildStockMovementPartNameOptions(parts, data),
    [parts, data]
  )

  const warehousePartOptions = useMemo(
    () => buildStockMovementWarehousePartOptions(parts),
    [parts]
  )

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
      [
        tx.TXN_ID,
        tx.Part_Code,
        tx.Part_Name_EN,
        tx.TXN_Type,
        tx.TXN_Type === 'RECEIVE' ? 'รับเข้า' : tx.TXN_Type === 'ISSUE' ? 'เบิกจ่าย' : tx.TXN_Type === 'ADJUST' ? 'ปรับสต๊อก' : '',
        getStockCategory(tx),
        getMovementMC(tx),
        formatStockTxnDate(getStockTxnDate(tx)),
        tx.Reference,
        tx.Performed_By,
        stripImageUrlFromNote(tx.Note),
      ]
        .some((v) => String(v || '').toLowerCase().includes(search.toLowerCase()))
    )
  }, [data, parts, search])

  const { categories: sparePartCategories } = useSparePartCategories(parts)

  const categoryOptions = useMemo(() => {
    const set = new Set(sparePartCategories || DEFAULT_SPARE_PART_CATEGORIES)
    if (Array.isArray(parts)) {
      parts.forEach((p) => {
        if (p?.Category && typeof p.Category === 'string' && p.Category.trim()) {
          set.add(p.Category.trim())
        }
      })
    }
    if (Array.isArray(data)) {
      data.forEach((row) => {
        const cat = getStockCategory ? getStockCategory(row) : (row?.Category || '')
        if (cat && cat !== '—') set.add(cat.trim())
      })
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' })
    )
  }, [sparePartCategories, parts, data])

  const wbCols = useWebBuilderMenu('/stock-movement')
  const cols = useMemo(() => resolveSMColumns(wbCols, t, categoryOptions), [wbCols, t, categoryOptions])

  const FS_COLS = useMemo(() => buildFilterSortColumns(cols, {
    include: SM_FILTER_KEYS,
    selectOptions: {
      TXN_Type: SM_TXN_TYPE_OPTIONS,
      Category: categoryOptions,
      MC: mcFilterOptions,
      Part_Code: partCodeOptions,
      Part_Name_EN: partNameOptions,
    },
    matchers: {
      TXN_Type: matchStockMovementType,
      MC: matchStockMovementMC,
      Part_Code: matchStockMovementPartCode,
      Part_Name_EN: matchStockMovementPartName,
    },
    valueGetters: {
      created_date: (row) => getStockTxnDate(row),
      Category: getStockCategory,
      MC: getMovementMC,
      Part_Code: (row) => row.Part_Code,
      Part_Name_EN: (row) => row.Part_Name_EN || row.Part_Name_TH,
    },
  }), [cols, categoryOptions, mcFilterOptions, partCodeOptions, partNameOptions])

  const displayRows = useMemo(() => applyFilterSort(baseRows, FS_COLS, filterSort), [baseRows, FS_COLS, filterSort])

  const openNew = () => {
    setForm({
      ...EMPTY,
      created_date: toInputDateValue(new Date()),
    })
    setModal(true)
  }

  const openEdit = (tx) => {
    setForm({
      ...EMPTY,
      ...tx,
      created_date: toInputDateValue(getStockTxnDate(tx)),
      MC: getMovementMC(tx),
      Note: stripImageUrlFromNote(tx.Note),
      Category: getStockCategory(tx),
      ImageUrl: getStockPartImageUrl(tx),
    })
    setModal(true)
    setDetailRec(null)
  }

  useEffect(() => {
    const code = String(form.Part_Code || '').trim()
    const loc = String(form.Location_Store || '').trim()
    const part = code
      ? (findMatchingSparePart(parts, code, loc) || parts.find((item) => String(item.Part_Code || '').toLowerCase() === code.toLowerCase()))
      : null
    if (!part) return
    const before = toNumber(part.Stock_Qty)
    const after = before + getSignedStockDelta(form.TXN_Type, form.Qty_Change)
    if (toNumber(form.Qty_Before) !== before || toNumber(form.Qty_After) !== after) {
      setForm((prev) => ({ ...prev, Qty_Before: before, Qty_After: after }))
    }
  }, [form.Part_Code, form.Location_Store, form.Qty_Change, form.TXN_Type, parts])

  const applyPartToForm = (partCode, targetLocation = '') => {
    const code = String(partCode || '').trim()
    const loc = String(targetLocation || form.Location_Store || '').trim()
    const part = findMatchingSparePart(parts, code, loc) || parts.find((item) => String(item.Part_Code || '').toLowerCase() === code.toLowerCase())
    setForm((prev) => ({
      ...prev,
      Part_Code: partCode,
      Part_Name_EN: part ? (part.Part_Name_EN || part.Part_Name_TH || prev.Part_Name_EN) : prev.Part_Name_EN,
      Category: part?.Category || prev.Category,
      Qty_Before: part ? toNumber(part.Stock_Qty) : prev.Qty_Before,
      Qty_After: part ? toNumber(part.Stock_Qty) + getSignedStockDelta(prev.TXN_Type, prev.Qty_Change) : prev.Qty_After,
      Unit: part?.Unit || prev.Unit,
      Unit_Price: part?.Unit_Price !== undefined && part?.Unit_Price !== null ? toNumber(part.Unit_Price) : prev.Unit_Price,
      Location_Store: targetLocation || part?.Location_Store || prev.Location_Store,
    }))
  }

  const applyPartNameToForm = (partName) => {
    const name = String(partName || '').trim()
    const part = findMatchingSparePart(parts, name, form.Location_Store)
    setForm((prev) => ({
      ...prev,
      Part_Name_EN: partName,
      Part_Code: part?.Part_Code || prev.Part_Code,
      Category: part?.Category || prev.Category,
      Qty_Before: part ? toNumber(part.Stock_Qty) : prev.Qty_Before,
      Qty_After: part ? toNumber(part.Stock_Qty) + getSignedStockDelta(prev.TXN_Type, prev.Qty_Change) : prev.Qty_After,
      Unit: part?.Unit || prev.Unit,
      Unit_Price: part?.Unit_Price !== undefined && part?.Unit_Price !== null ? toNumber(part.Unit_Price) : prev.Unit_Price,
      Location_Store: part?.Location_Store || prev.Location_Store,
    }))
  }

  const applyMovementToSparePart = async (payload) => {
    const partCode = String(payload.Part_Code || '').trim()
    if (!partCode) throw new Error('กรุณากรอกรหัสอะไหล่')

    const targetLoc = String(payload.Location_Store || '').trim().toLowerCase()
    const allParts = await SparePartAPI.list()
    // Match by both Part_Code and Location_Store so different warehouses for the same part code remain isolated
    const existing = findExistingSparePart(allParts, partCode, targetLoc)

    const delta = getSignedStockDelta(payload.TXN_Type, payload.Qty_Change)
    if (!existing && delta < 0) {
      throw new Error(`ไม่พบอะไหล่ ${partCode}${payload.Location_Store ? ` ในคลัง "${payload.Location_Store}"` : ''} ในระบบ`)
    }

    const before = toNumber(existing?.Stock_Qty)
    const after = before + delta
    const partPayload = buildSparePartPayloadFromMovement(existing, payload, after, getPartStockStatus)

    const saved = existing
      ? await SparePartAPI.update(existing.id || existing._id, partPayload)
      : await SparePartAPI.create(partPayload)

    await loadParts()
    return { before, after, partId: saved.id || saved._id || existing?.id || null }
  }

  const saveStockTxnWithFallback = async (payload) => {
    let toSave = { ...payload }
    while (true) {
      try {
        await save(toSave)
        return
      } catch (error) {
        const missingColumn = getMissingStockColumn(error)
        if (missingColumn && ['MC', 'Machine_MC', 'Category', 'ImageUrl', 'created_date', 'Date'].includes(missingColumn)) {
          toSave = omitKeys(toSave, [missingColumn])
          continue
        }
        throw error
      }
    }
  }

  const submit = async () => {
    if (!form.Part_Code) {
      toast.warning('กรุณากรอกข้อมูล', 'รหัสอะไหล่จำเป็นต้องกรอก')
      return
    }
    if (!form.created_date) {
      toast.warning('กรุณาระบุวันที่', 'กรุณาเลือกวันที่ทำรายการ')
      return
    }
    if (form.TXN_Type === 'ISSUE' && !String(form.MC || '').trim()) {
      toast.warning('กรุณาระบุเลขเครื่องจักร', 'รายการเบิกจ่าย (ISSUE) จำเป็นต้องระบุเครื่องจักร (M/C)')
      return
    }
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    try {
      let finalPayload = { ...form }
      const dateObj = parseStockDateInput(form.created_date)
      if (!isEdit) {
        const { before, after, partId } = await applyMovementToSparePart(form)
        finalPayload = {
          ...finalPayload,
          TXN_ID: generateStockTxnId(dateObj),
          Part_ID: partId,
          Qty_Before: before,
          Qty_After: after,
          created_date: dateObj.toISOString(),
        }
      } else {
        finalPayload = {
          ...finalPayload,
          created_date: dateObj.toISOString(),
        }
      }

      await saveStockTxnWithFallback(buildStockPayload(finalPayload))
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
    const val = resolveStockCellValue(row, col, { getStockPartImageUrl, getStockCategory, getMovementMC, getStockTxnDate })

    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-300 dark:text-slate-700 font-mono text-center block">—</span>
    }

    if (col.field === 'MC') {
      return renderStockMCButton(val, setSelectedMachineForHistory)
    }

    if (col.field === 'TXN_ID') {
      return (
        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
          {String(val)}
        </span>
      )
    }

    if (col.field === 'TXN_Type') {
      return renderStockTxnTypeCell(val)
    }

    if (col.field === 'Part_Code') {
      return <span className="font-mono font-black text-blue-600 dark:text-blue-400">{String(val)}</span>
    }

    if (col.field === 'Part_Name_EN') {
      return <span className="font-bold text-slate-800 dark:text-slate-100">{String(val)}</span>
    }

    if (col.field === 'Qty_Change') {
      return renderStockQtyChangeCell(val, row)
    }

    if (col.field === 'Qty_Before' || col.field === 'Qty_After') {
      return <span className="font-mono text-slate-600 dark:text-slate-400 text-xs">{Number(val).toLocaleString()}</span>
    }

    if (col.field === 'Unit_Price') {
      return <span className="font-mono text-slate-600 dark:text-slate-400 text-xs">฿{Number(val).toLocaleString()}</span>
    }

    if (col.type === 'datetime' || col.field === 'created_date') {
      return <span className="font-mono text-slate-500 text-[11px]">{formatStockTxnDate(val)}</span>
    }

    if (col.field === 'ImageUrl') {
      return renderStockImageUrlCell(val, (e) => e.stopPropagation())
    }

    if (col.field === 'ImagePreview') {
      return renderStockImagePreviewCell(val, row, { setPreviewImageModal, onStop: (e) => e.stopPropagation() })
    }

    if (col.field === 'Note') {
      return <span className="text-slate-500 truncate max-w-[200px] block">{stripImageUrlFromNote(val)}</span>
    }

    return <span className="text-slate-700 dark:text-slate-300 text-xs">{String(val)}</span>
  }

  return (
    <div className="space-y-5">
      {/* ── SUMMARY STATS CARDS ──────────────────────────────── */}
      <StockMovementStats stats={stats} />


      {/* ── TOOLBAR ───────────────────────────────────────────── */}
      <div className="space-y-2">
        {/* Tier 1: Search & Desktop Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="ค้นหา เลขรายการ / รหัสอะไหล่ / ชื่ออะไหล่ / M/C / ผู้ดำเนินการ..."
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={load}
              className="btn-outline text-xs px-3 py-2 min-h-[44px] flex items-center gap-1.5"
              title={t('refresh')}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{t('refresh')}</span>
            </button>

            {canAdd && (
              <button
                type="button"
                onClick={openNew}
                className="btn-primary text-xs px-3.5 sm:px-4 py-2 min-h-[44px] hidden sm:flex items-center gap-1.5 shadow-md shadow-blue-500/20"
              >
                <Plus size={15} />
                <span>บันทึกเคลื่อนไหว</span>
              </button>
            )}
          </div>
        </div>

        {/* Tier 2: Horizontal Utility Scroll Strip */}
        <div className="toolbar-scroll-strip text-xs">
          <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
          <GoogleSheetSyncButton
            sheetName="เคลื่อนไหวสต๊อก"
            columns={cols}
            rows={displayRows}
            totalCount={data.length}
            valueGetters={{
              created_date: (row) => formatStockTxnDate(getStockTxnDate(row)),
              Category: getStockCategory,
              MC: getMovementMC,
              ImageUrl: getStockPartImageUrl,
              ImagePreview: getStockPartImageUrl,
              Note: (row) => stripImageUrlFromNote(row.Note),
            }}
          />
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
              { label: 'วันที่ทำรายการ', value: formatStockTxnDate(getStockTxnDate(detailRec)) || null },
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
              ...(getMovementMC(detailRec) ? [{
                label: 'เครื่องจักร (M/C)',
                mono: true,
                node: (
                  <button
                    type="button"
                    onClick={() => setSelectedMachineForHistory(getMovementMC(detailRec))}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors shadow-xs"
                    title={`ดูประวัติอะไหล่เครื่อง ${getMovementMC(detailRec)}`}
                  >
                    <Cpu size={13} className="text-blue-500" />
                    <span>{getMovementMC(detailRec)}</span>
                    <span className="text-[10px] font-normal text-blue-500 underline ml-1">ดูประวัติเครื่อง</span>
                  </button>
                ),
              }] : []),
              { label: 'เอกสารอ้างอิง', value: detailRec.Reference },
              { label: 'ประเภทอ้างอิง', value: detailRec.Reference_Type },
              { label: 'ผู้ทำรายการ', value: detailRec.Performed_By },
              { label: 'หมายเหตุ', value: stripImageUrlFromNote(detailRec.Note), full: true },
            ].filter((f) => f && (f.node || f.value)),
          },
        ].filter((g) => g.fields.length > 0) : []}
      />

      {/* ── ADD / EDIT MODAL ──────────────────────────────────── */}
      <StockEditModal modal={modal} setModal={setModal} form={form} setForm={setForm} saving={saving} submit={submit} parts={parts} t={t} applyPartNameToForm={applyPartNameToForm} applyPartToForm={applyPartToForm} categoryOptions={categoryOptions} mcOptions={mcOptions} partCodeOptions={partCodeOptions} partNameOptions={partNameOptions} warehousePartOptions={warehousePartOptions} />


      {/* ── IMAGE PREVIEW MODAL ───────────────────────────────── */}
      <ImagePreviewModal
        open={!!previewImageModal}
        onClose={() => setPreviewImageModal(null)}
        url={previewImageModal?.url}
        title={previewImageModal?.title}
      />

      {/* ── MACHINE PARTS HISTORY MODAL ───────────────────────── */}
      <MachinePartsHistoryModal
        open={!!selectedMachineForHistory}
        onClose={() => setSelectedMachineForHistory(null)}
        machineCode={selectedMachineForHistory}
        transactions={data}
        onSelectTxn={(tx) => {
          setSelectedMachineForHistory(null)
          setDetailRec(tx)
        }}
      />

      {/* Mobile Floating Action Button (FAB) for Stock Movement */}
      {canAdd && (
        <button
          type="button"
          onClick={openNew}
          className="btn-fab"
          title="บันทึกเคลื่อนไหว"
          aria-label="บันทึกเคลื่อนไหว"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
