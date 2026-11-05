import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  Layers,
  FileText,
  Printer,
  Camera,
} from 'lucide-react'
import useEntity from '../../hooks/useEntity'
import { SparePartAPI, PART_STATUS } from '../../api/entities'
import { useAuth } from '../../contexts/AuthContext'
import useWebBuilderMenu, { useFieldOptions } from '../../hooks/useWebBuilderMenu'
import Modal from '../../components/ui/Modal'
import StatusBadge from '../../components/ui/StatusBadge'
import SearchInput from '../../components/ui/SearchInput'
import { useT } from '../../contexts/LanguageContext'
import usePagePerms from '../../hooks/usePagePerms'
import { useToast } from '../../components/ui/Toast'
import F from '../../components/ui/FormField'
import { useSparePartCategories, DEFAULT_SPARE_PART_CATEGORIES } from '../../modules/sparePart'
import FilterSortPanel, { INIT_FS } from '../../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../../components/ui/GoogleSheetSyncButton'
import {
  generatePartCode,
  getPartStockStatus,
  findDuplicatePartInWarehouse,
  getOtherWarehousesForPart,
  findBasePartInfo,
  getTotalStockAcrossWarehouses,
} from '../../utils/inventory'
import { uploadMedia } from '../../modules/media'
import { applyFilterSort, buildFilterSortColumns } from '../../utils/filterSort'
import PdfPreviewModal from '../../components/ui/PdfPreviewModal'
import SparePartsReportModal from '../../components/inventory/SparePartsReportModal'
import VisualSparePartSearchModal from '../../components/inventory/VisualSparePartSearchModal'
import {
  prewarmSparePartEmbeddings,
  computeImageEmbedding,
  setCachedVector,
  savePersistedVectorCache,
  parseEmbedding,
} from '../../utils/imageSearch'
import { generateSparePartPdfProps } from '../../utils/pdfDocGenerators'
import ImagePreviewModal from '../../components/ui/ImagePreviewModal'
import ImageThumbnail from '../../components/ui/ImageThumbnail'
import {
  appendSparePartImageMeta,
  buildSparePartImagePayload,
  getSparePartImageUrl,
  preserveRemarkWithSparePartImageMeta,
  stripSparePartImageMeta,
} from '../../utils/sparePartImage'

export * from './sparePartHelpers.jsx'
import { SparePartsStats } from './sparePartsStats.jsx'
import { SpareEditModal } from './spareEditModal.jsx'
import { SpareCategoryModal } from './spareCategoryModal.jsx'
import { SparePartsTable } from './sparePartsTable.jsx'
import { SpareDetailDrawer } from './spareDetailDrawer.jsx'
import {
  SPARE_PART_IMAGE_FOLDER,
  WAREHOUSE_OPTIONS,
  SP_FILTER_KEYS,
  SP_SORT_ONLY_KEYS,
  SP_INIT_FS,
  buildSparePartFilterOptions,
  resolveSPColumns,
  getColumnWidthStyle,
  getSparePartName,
  getSparePartStatus,
  EMPTY,
  omitKeys,
  getMissingSparePartColumn,
} from './sparePartHelpers.jsx'

export default function SpareParts() {
  const { t } = useT()
  const navigate = useNavigate()
  const { canAdd, canEdit, canDelete } = usePagePerms('spareparts')
  const { user } = useAuth()
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(SparePartAPI)

  const {
    categories: allCategories,
    defaultCategories,
    categoryCounts,
    addCategory,
    editCategory,
    deleteCategory,
    resetToDefaults,
    isDefaultCategory,
  } = useSparePartCategories(data)

  // Idle background pre-warming for Visual Product Search vectors
  useEffect(() => {
    if (data && data.length > 0 && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(() => {
            prewarmSparePartEmbeddings(data, { concurrency: 4 }).catch(() => {})
          }, { timeout: 4000 })
        } else {
          prewarmSparePartEmbeddings(data, { concurrency: 4 }).catch(() => {})
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [data])

  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [filterSort, setFilterSort] = useState(SP_INIT_FS)
  const [detailRec, setDetailRec] = useState(null)
  const [pdfItem, setPdfItem] = useState(null)
  const [visualSearchOpen, setVisualSearchOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [previewImageModal, setPreviewImageModal] = useState(null)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingCategoryValue, setEditingCategoryValue] = useState('')
  const [categoryActionLoading, setCategoryActionLoading] = useState(false)

  const handleAddCategory = async (e) => {
    e?.preventDefault?.()
    const trimmed = String(newCategoryInput || '').trim()
    if (!trimmed) {
      toast.warning('กรุณากรอกชื่อหมวดหมู่', 'ชื่อหมวดหมู่ต้องไม่เป็นค่าว่าง')
      return
    }
    setCategoryActionLoading(true)
    try {
      const res = await addCategory(trimmed)
      if (res.success) {
        if (res.existed) {
          toast.info('หมวดหมู่นี้มีอยู่ในระบบแล้ว', `หมวดหมู่ "${res.name}" พร้อมใช้งาน`)
        } else {
          toast.success('เพิ่มหมวดหมู่สำเร็จ', `เพิ่มหมวดหมู่ "${res.name}" เรียบร้อยแล้ว`)
        }
        setNewCategoryInput('')
      } else {
        toast.error('ไม่สามารถเพิ่มหมวดหมู่ได้', res.error || '')
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด', err.message)
    } finally {
      setCategoryActionLoading(false)
    }
  }

  const startEditCategory = (cat) => {
    setEditingCategory(cat)
    setEditingCategoryValue(cat)
  }

  const cancelEditCategory = () => {
    setEditingCategory(null)
    setEditingCategoryValue('')
  }

  const handleSaveEditCategory = async (oldName) => {
    const trimmed = String(editingCategoryValue || '').trim()
    if (!trimmed) {
      toast.warning('กรุณากรอกชื่อหมวดหมู่', 'ชื่อหมวดหมู่ต้องไม่เป็นค่าว่าง')
      return
    }
    if (trimmed.toLowerCase() === oldName.trim().toLowerCase()) {
      setEditingCategory(null)
      return
    }

    setCategoryActionLoading(true)
    try {
      const matchingParts = data.filter(
        (p) => (p?.Category || '').trim().toLowerCase() === oldName.trim().toLowerCase()
      )

      let shouldUpdateParts = false
      if (matchingParts.length > 0) {
        shouldUpdateParts = confirm(
          `พบอะไหล่จำนวน ${matchingParts.length} รายการที่กำลังใช้หมวดหมู่ "${oldName}"\nต้องการเปลี่ยนหมวดหมู่ของอะไหล่ทั้งหมดให้เป็น "${trimmed}" ด้วยหรือไม่?`
        )
      }

      const res = await editCategory(oldName, trimmed)
      if (res.success) {
        if (shouldUpdateParts) {
          let updatedCount = 0
          for (const part of matchingParts) {
            try {
              await SparePartAPI.update(part.id || part._id, { Category: trimmed })
              updatedCount++
            } catch (err) {
              console.warn('Failed to update part category:', part, err)
            }
          }
          await load()
          toast.success(
            'แก้ไขหมวดหมู่สำเร็จ',
            `เปลี่ยนเป็น "${trimmed}" และอัปเดตอะไหล่ ${updatedCount} รายการเรียบร้อยแล้ว`
          )
        } else {
          toast.success('แก้ไขหมวดหมู่สำเร็จ', `เปลี่ยนหมวดหมู่เป็น "${trimmed}" เรียบร้อยแล้ว`)
        }

        if (form.Category?.trim().toLowerCase() === oldName.trim().toLowerCase()) {
          setForm((prev) => ({ ...prev, Category: trimmed }))
        }

        setEditingCategory(null)
        setEditingCategoryValue('')
      } else {
        toast.error('ไม่สามารถแก้ไขหมวดหมู่ได้', res.error || '')
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด', err.message)
    } finally {
      setCategoryActionLoading(false)
    }
  }

  const handleDeleteCategory = async (categoryName) => {
    const count = categoryCounts[categoryName] || 0
    if (count > 0) {
      if (!confirm(`มีอะไหล่จำนวน ${count} รายการที่กำลังใช้งานหมวดหมู่ "${categoryName}" อยู่\nต้องการลบหมวดหมู่นี้ออกจากตัวเลือกดรอปดาวน์ใช่หรือไม่? (ข้อมูลอะไหล่เดิมจะไม่ถูกลบ)`)) {
        return
      }
    } else {
      if (!confirm(`ต้องการลบหมวดหมู่ "${categoryName}" ออกจากตัวเลือกดรอปดาวน์ใช่หรือไม่?`)) {
        return
      }
    }

    setCategoryActionLoading(true)
    try {
      const res = await deleteCategory(categoryName)
      if (res.success) {
        toast.success('ลบหมวดหมู่สำเร็จ', `ลบหมวดหมู่ "${categoryName}" เรียบร้อยแล้ว`)
        if (form.Category?.trim().toLowerCase() === categoryName.trim().toLowerCase()) {
          setForm((prev) => ({ ...prev, Category: 'อะไหล่' }))
        }
      } else {
        toast.error('ไม่สามารถลบหมวดหมู่ได้', res.error || '')
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด', err.message)
    } finally {
      setCategoryActionLoading(false)
    }
  }

  const handleResetDefaults = async () => {
    if (!confirm('ต้องการรีเซ็ตหมวดหมู่อะไหล่กลับเป็นค่าเริ่มต้น (อะไหล่, เครื่องมือช่าง) ใช่หรือไม่?')) {
      return
    }
    setCategoryActionLoading(true)
    try {
      await resetToDefaults()
      toast.success('รีเซ็ตสำเร็จ', 'คืนค่าหมวดหมู่เริ่มต้นเรียบร้อยแล้ว')
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด', err.message)
    } finally {
      setCategoryActionLoading(false)
    }
  }

  // 1-Click Purchase Request from Low Stock
  const handle1ClickPR = (part) => {
    if (!part) return
    const currentStock = Number(part.Stock_Qty || 0)
    const minStock = Number(part.Min_Qty || 0)
    const deficit = Math.max(1, (minStock * 2) - currentStock)
    navigate('/purchasing', {
      state: {
        autoOpen: true,
        partCode: part.Part_Code || '',
        partName: getSparePartName(part),
        qty: deficit,
        price: Number(part.Unit_Price || 0),
        supplier: part.Supplier || '',
        category: part.Category || 'อะไหล่',
      },
    })
  }

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

  const locationFilterOptions = useMemo(
    () => buildSparePartFilterOptions(data, 'Location_Store', WAREHOUSE_OPTIONS),
    [data]
  )
  const categoryFilterOptions = useMemo(
    () => buildSparePartFilterOptions(data, 'Category', allCategories),
    [data, allCategories]
  )
  const statusFilterOptions = useMemo(
    () => buildSparePartFilterOptions(data, 'Status', statusOpts || PART_STATUS),
    [data, statusOpts]
  )

  const FS_COLS = useMemo(() => buildFilterSortColumns(cols, {
    include: SP_FILTER_KEYS,
    sortOnly: SP_SORT_ONLY_KEYS,
    selectOptions: {
      Location_Store: locationFilterOptions,
      Status: statusFilterOptions,
      Category: categoryFilterOptions,
    },
    valueGetters: {
      Part_Name_EN: getSparePartName,
      ImageUrl: getSparePartImageUrl,
      ImagePreview: getSparePartImageUrl,
      Remark: (row) => stripSparePartImageMeta(row.Remark),
      Status: getSparePartStatus,
    },
  }), [categoryFilterOptions, cols, locationFilterOptions, statusFilterOptions])

  const displayRows = useMemo(() => applyFilterSort(baseRows, FS_COLS, filterSort), [baseRows, FS_COLS, filterSort])

  const reportFilterContext = useMemo(() => {
    const parts = []
    if (search?.trim()) parts.push(`ค้นหา: "${search.trim()}"`)
    if (filterSort?.filters) {
      Object.entries(filterSort.filters).forEach(([key, val]) => {
        if (val) {
          const col = FS_COLS.find((c) => c.key === key)
          const label = col?.label || key
          parts.push(`${label}: ${val}`)
        }
      })
    }
    return parts.length ? parts.join(' | ') : ''
  }, [search, filterSort, FS_COLS])

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

  const otherWarehousesForForm = useMemo(() => {
    return getOtherWarehousesForPart(data, form.Part_Code, form.Location_Store, form.id || form._id)
  }, [data, form.Part_Code, form.Location_Store, form.id, form._id])

  const basePartForForm = useMemo(() => {
    return findBasePartInfo(data, form.Part_Code)
  }, [data, form.Part_Code])

  const handleCopyBasePartInfo = () => {
    if (!basePartForForm) return
    setForm((prev) => ({
      ...prev,
      Part_Name_EN: basePartForForm.Part_Name_EN || basePartForForm.Part_Name_TH || prev.Part_Name_EN,
      Category: basePartForForm.Category || prev.Category,
      Unit: basePartForForm.Unit || prev.Unit,
      Unit_Price: basePartForForm.Unit_Price !== undefined ? basePartForForm.Unit_Price : prev.Unit_Price,
      Supplier: basePartForForm.Supplier || prev.Supplier,
      Compatible_Machines: Array.isArray(basePartForForm.Compatible_Machines)
        ? basePartForForm.Compatible_Machines.join(',')
        : basePartForForm.Compatible_Machines || prev.Compatible_Machines,
      ImageUrl: getSparePartImageUrl(basePartForForm) || prev.ImageUrl,
      Remark: preserveRemarkWithSparePartImageMeta(
        prev.Remark,
        stripSparePartImageMeta(basePartForForm.Remark)
      ),
    }))
    toast.success(
      'คัดลอกรายละเอียดอะไหล่สำเร็จ',
      `คัดลอกข้อมูลจากรหัส ${form.Part_Code} เรียบร้อยแล้ว`
    )
  }

  const onPickImageFile = async (file) => {
    if (!file) return
    setUploadingImage(true)
    try {
      // 1. Calculate 128-D vector locally immediately (< 15ms)
      let localVector = null
      try {
        localVector = await computeImageEmbedding(file)
      } catch (embErr) {
        console.warn('Local image embedding computation warning:', embErr)
      }

      // 2. Upload media to cloud
      const { imageUrl } = await uploadMedia(file, { folderName: SPARE_PART_IMAGE_FOLDER })

      // 3. Pre-cache vector locally in memory & localStorage
      if (localVector && form.Part_Code) {
        setCachedVector(form.Part_Code, imageUrl, localVector)
        savePersistedVectorCache()
      }

      setForm((prev) => ({
        ...prev,
        ImageUrl: imageUrl,
        ImageEmbedding: localVector || prev.ImageEmbedding,
        Remark: appendSparePartImageMeta(prev.Remark, {
          imageUrl,
          embedding: localVector || parseEmbedding(prev.ImageEmbedding),
        }),
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
        if (missingColumn === 'ImageEmbedding') {
          removedColumns.push(missingColumn)
          nextPayload = {
            ...omitKeys(nextPayload, ['ImageEmbedding']),
            Remark: appendSparePartImageMeta(nextPayload.Remark, {
              imageUrl: getSparePartImageUrl(nextPayload),
              embedding: parseEmbedding(nextPayload.ImageEmbedding),
            }),
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
    if (saving) return
    if (!form.Part_Code || !form.Part_Name_EN) {
      toast.warning('กรุณากรอกข้อมูล', t('sp_req'))
      return
    }

    // Check if the exact same Part_Code already exists in the same warehouse/location
    const duplicate = findDuplicatePartInWarehouse(
      data,
      form.Part_Code,
      form.Location_Store,
      form.id || form._id
    )
    if (duplicate) {
      toast.warning(
        'รหัสอะไหล่ซ้ำในคลังเดียวกัน',
        `รหัส ${form.Part_Code} มีอยู่ในคลัง "${form.Location_Store || 'ไม่ระบุคลัง'}" แล้ว หากต้องการแยกคลังสินค้า กรุณาเลือกคลังสินค้าอื่น`
      )
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

      // Ensure local vector cache is updated for this spare part
      const finalVector = parseEmbedding(payload.ImageEmbedding || form.ImageEmbedding)
      if (Array.isArray(finalVector) && finalVector.length === 128 && form.Part_Code) {
        setCachedVector(form.Part_Code, form.ImageUrl || getSparePartImageUrl(form), finalVector)
        savePersistedVectorCache()
      }

      if (form.Category) {
        addCategory(form.Category).catch(() => {})
      }
      if (removedColumns.length > 0) {
        toast.warning(
          isEdit ? 'แก้ไขสำเร็จ (บางคอลัมน์บันทึกลงหมายเหตุ)' : 'เพิ่มสำเร็จ (บางคอลัมน์บันทึกลงหมายเหตุ)',
          `คอลัมน์ที่ฐานข้อมูลยังไม่มี: ${removedColumns.join(', ')}`
        )
      } else {
        toast.success(
          isEdit ? t('sp_edit_success') : t('sp_add_success'),
          `${form.Part_Code} - ${getSparePartName(form)} (${form.Location_Store || 'ไม่ระบุคลัง'})`
        )
      }
      setModal(false)
    } catch (e) {
      if (String(e?.message || '').includes('spareparts_Part_Code_key')) {
        toast.error(
          'รหัสอะไหล่ซ้ำในฐานข้อมูล',
          'ฐานข้อมูล Supabase ยังมี constraint ห้ามรหัสซ้ำ กรุณารันคำสั่ง SQL ใน Supabase SQL Editor เพื่อปลดล็อคให้รหัสเดียวกันอยู่คนละคลังได้'
        )
      } else {
        toast.error('เกิดข้อผิดพลาด', e.message)
      }
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
      const codeStr = String(val)
      const sameCodeCount = data.filter(
        (p) => String(p?.Part_Code || '').trim().toLowerCase() === codeStr.trim().toLowerCase()
      ).length
      return (
        <span className="inline-flex items-center gap-1.5 font-mono">
          <span className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
            {codeStr}
          </span>
          {sameCodeCount > 1 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
              title={`รหัสนี้มีจัดเก็บใน ${sameCodeCount} คลังสินค้า (สต๊อกแยกกัน)`}
            >
              {sameCodeCount} คลัง
            </span>
          )}
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
      const locStr = String(val || '').trim()
      const isStore = locStr.toLowerCase() === 'store'
      const isGMK = locStr.toLowerCase().startsWith('gmk')
      return (
        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1 ${
          isStore
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            : isGMK
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
        }`}>
          {locStr || '—'}
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
          <ImageThumbnail
            url={imgUrl}
            alt={`${row.Part_Code} - ${getSparePartName(row)}`}
            onClick={() => setPreviewImageModal({ url: imgUrl, title: `${row.Part_Code} - ${getSparePartName(row)}` })}
          />
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
      <SparePartsStats stats={stats} />


      {/* ── TOOLBAR ───────────────────────────────────────────── */}
      <div className="space-y-2">
        {/* Tier 1: Search & Primary Desktop Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('sp_search')}
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
                <span>{t('sp_add')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tier 2: Horizontal Utility Scroll Strip */}
        <div className="toolbar-scroll-strip text-xs">
          <button
            type="button"
            onClick={() => setVisualSearchOpen(true)}
            className="btn-outline text-xs px-3 py-2 min-h-[44px] flex items-center gap-1.5 border-blue-200 dark:border-blue-800 hover:border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30 shadow-xs font-semibold rounded-xl transition-all flex-shrink-0"
            title="ค้นหาอะไหล่ด้วยภาพถ่าย (Visual Reverse Image Search)"
            aria-label="ค้นหาอะไหล่ด้วยภาพถ่าย"
          >
            <Camera size={14} className="text-blue-600 dark:text-blue-400" />
            <span>ค้นหาด้วยรูป</span>
          </button>

          <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />

          <GoogleSheetSyncButton
            sheetName="อะไหล่"
            columns={cols}
            rows={displayRows}
            totalCount={data.length}
            valueGetters={{
              Part_Name_EN: getSparePartName,
              ImageUrl: getSparePartImageUrl,
              ImagePreview: getSparePartImageUrl,
              Remark: (row) => stripSparePartImageMeta(row.Remark),
              Status: getSparePartStatus,
            }}
          />

          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="btn-outline text-xs px-3 py-2 min-h-[44px] flex items-center gap-1.5 border-slate-300 dark:border-slate-700 hover:border-blue-400 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 shadow-xs flex-shrink-0"
            title="พิมพ์รายงานตารางรายการอะไหล่ (A4 Portrait)"
          >
            <Printer size={14} className="text-blue-600 dark:text-blue-400" />
            <span>พิมพ์รายงาน A4</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryModalOpen(true)}
            className="btn-outline text-xs px-3 py-2 min-h-[44px] flex items-center gap-1.5 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-semibold flex-shrink-0"
            title="จัดการหมวดหมู่อะไหล่ (เพิ่ม ลบ แก้ไข)"
          >
            <Layers size={14} className="text-blue-600 dark:text-blue-400" />
            <span>จัดการหมวดหมู่</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-[10px] font-bold">
              {allCategories.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── DATA TABLE ────────────────────────────────────────── */}
      <SparePartsTable displayRows={displayRows} cols={cols} loading={loading} canEdit={canEdit} canDelete={canDelete} setDetailRec={setDetailRec} handle1ClickPR={handle1ClickPR} setPdfItem={setPdfItem} openEdit={openEdit} del={del} renderCellContent={renderCellContent} t={t} />

      {/* ── DETAIL DRAWER ─────────────────────────────────────── */}
      <SpareDetailDrawer detailRec={detailRec} setDetailRec={setDetailRec} canEdit={canEdit} canDelete={canDelete} openEdit={openEdit} del={del} setPdfItem={setPdfItem} getSparePartImageUrl={getSparePartImageUrl} setPreviewImageModal={setPreviewImageModal} getSparePartName={getSparePartName} getSparePartStatus={getSparePartStatus} handle1ClickPR={handle1ClickPR} data={data} t={t} />


      {/* ── ADD / EDIT MODAL ──────────────────────────────────── */}
      <SpareEditModal modal={modal} setModal={setModal} form={form} setForm={setForm} saving={saving} uploadingImage={uploadingImage} submit={submit} handleCopyBasePartInfo={handleCopyBasePartInfo} onPickImageFile={onPickImageFile} t={t} otherWarehousesForForm={otherWarehousesForForm} setCategoryModalOpen={setCategoryModalOpen} allCategories={allCategories} />


      <SpareCategoryModal categoryModalOpen={categoryModalOpen} setCategoryModalOpen={setCategoryModalOpen} newCategoryInput={newCategoryInput} setNewCategoryInput={setNewCategoryInput} editingCategory={editingCategory} editingCategoryValue={editingCategoryValue} setEditingCategoryValue={setEditingCategoryValue} categoryActionLoading={categoryActionLoading} handleAddCategory={handleAddCategory} startEditCategory={startEditCategory} cancelEditCategory={cancelEditCategory} handleSaveEditCategory={handleSaveEditCategory} handleDeleteCategory={handleDeleteCategory} handleResetDefaults={handleResetDefaults} allCategories={allCategories} isDefaultCategory={isDefaultCategory} categoryCounts={categoryCounts} t={t} />


      {/* ── IMAGE PREVIEW MODAL ───────────────────────────────── */}
      <ImagePreviewModal
        open={!!previewImageModal}
        onClose={() => setPreviewImageModal(null)}
        url={previewImageModal?.url}
        title={previewImageModal?.title}
      />

      {/* ── PDF PREVIEW & PRINT MODAL ───────────────────────── */}
      {pdfItem && (
        <PdfPreviewModal
          open={!!pdfItem}
          onClose={() => setPdfItem(null)}
          {...generateSparePartPdfProps(pdfItem)}
        />
      )}

      {/* ── SPARE PARTS TABLE REPORT MODAL (A4 PORTRAIT) ──────── */}
      {reportModalOpen && (
        <SparePartsReportModal
          open={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          items={displayRows}
          filterContext={reportFilterContext}
          currentUserName={user?.name || user?.username || ''}
        />
      )}

      {/* ── VISUAL PRODUCT SEARCH (REVERSE IMAGE & VECTOR SEARCH) ── */}
      {visualSearchOpen && (
        <VisualSparePartSearchModal
          isOpen={visualSearchOpen}
          onClose={() => setVisualSearchOpen(false)}
          spareParts={data}
          onSelectPart={(part) => {
            setSearch(part?.Part_Code || '')
            setVisualSearchOpen(false)
            toast.info('กรองข้อมูลอะไหล่สำเร็จ', `แสดงเฉพาะ ${part?.Part_Code} - ${getSparePartName(part)}`)
          }}
          onViewDetail={(part) => {
            setVisualSearchOpen(false)
            setDetailRec(part)
          }}
          onOrderPart={(part) => {
            setVisualSearchOpen(false)
            handle1ClickPR(part)
          }}
        />
      )}

      {/* Mobile Floating Action Button (FAB) for Adding Spare Part */}
      {canAdd && (
        <button
          type="button"
          onClick={openNew}
          className="btn-fab"
          title={t('sp_add')}
          aria-label={t('sp_add')}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
