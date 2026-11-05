import { useState, useMemo, useEffect } from 'react'
import {
  Plus,
  RefreshCw,
  Search,
  FileSpreadsheet,
  XCircle,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Sliders,
  Image as ImageIcon,
} from 'lucide-react'
import { format, differenceInCalendarDays, addDays } from 'date-fns'
import useEntity from '../../hooks/useEntity'
import { useRealtimeTables } from '../../api/realtimeSync'
import {
  CenterCheckAPI,
  CenterCheckStandardsAPI,
  PMPlanAPI,
  AuditLogAPI,
  MachineAPI,
  CylinderAPI,
  TechnicianAPI,
  DEFAULT_SINGLE_CHECKLIST_ITEMS,
  DEFAULT_DOUBLE_CHECKLIST_ITEMS,
  generateCenterCheckDocNo,
} from '../../api/entities'
import SearchInput from '../../components/ui/SearchInput'
import { useT } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import usePagePerms from '../../hooks/usePagePerms'
import { useToast } from '../../components/ui/Toast'
import GoogleSheetSyncButton from '../../components/ui/GoogleSheetSyncButton'
import { uploadImageToGoogleDrive } from '../../utils/googleDriveUpload'
import initialCenterChecks from '../../data/initialCenterChecks.json'
import { getDirectImageUrl, getImageFallbackUrls } from '../../utils/imageUrlUtils'
import { uploadMediaBatch, convertHeicDataUrlIfNeeded } from '../../modules/media'
import { buildCylinderInspectionSync } from '../../utils/needleConditionSync'
import { pickPreviousWithCounter } from '../../utils/counterDiff'
import { CENTER_CHECK_IMAGE_FOLDER } from './centerCheckParts.jsx'
import { CenterCheckToolbar } from './centerCheckToolbar.jsx'
import { CenterCheckTabs } from './centerCheckTabs.jsx'
import { CenterCheckForm } from './centerCheckForm.jsx'
import { CenterCheckTable } from './centerCheckTable.jsx'
import { CenterCheckViewModal } from './centerCheckViewModal.jsx'
import { CenterCheckStandardsModal } from './centerCheckStandardsModal.jsx'
import { CenterCheckSqlModal } from './centerCheckSqlModal.jsx'
import { CenterCheckPrintModal } from './centerCheckPrintModal.jsx'
import { CenterCheckImageModal } from './centerCheckImageModal.jsx'
import { CenterCheckStats } from './centerCheckStats.jsx'

export default function CenterCheck({ initialPreset, onClearPreset, onBackToPMPlan, onRecordSaved }) {
  const { t } = useT()
  const { user } = useAuth()
  const toast = useToast()
  const { canAdd, canEdit, canDelete } = usePagePerms('pm')

  // Center Checks Entity
  const {
    data: rawRecords,
    loading: recordsLoading,
    load: loadRecords,
    save: saveRecord,
    remove: removeRecord,
  } = useEntity(CenterCheckAPI)

  // Auxiliary entities for quick pickers
  const { data: rawMachines } = useEntity(MachineAPI)
  const { data: rawCylinders } = useEntity(CylinderAPI)
  const { data: rawTechs } = useEntity(TechnicianAPI)

  // Sub-tabs: 'history' | 'single_form' | 'double_form'
  const [activeSubTab, setActiveSubTab] = useState('history')

  // Search & Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL') // 'ALL' | 'Single' | 'Double'
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'ผ่าน' | 'ไม่ผ่าน'

  // Form State
  const [editingId, setEditingId] = useState(null)
  const [formType, setFormType] = useState('Single') // 'Single' | 'Double'
  const [formData, setFormData] = useState({
    doc_no: '',
    doc_date: format(new Date(), 'yyyy-MM-dd'),
    mechanic: '',
    mc: '',
    serial: '',
    location: '',
    needle_cond: 'สึกเล็กน้อย',
    needle_arr: '',
    needle_images: [],
    comment: '',
    counter_latest: '',
    counter_prev: '',
    counter_total: '',
    prev_doc_date: '',
    days_since_last: 0,
    items: [],
    greasing: false,
    oil_change: false,
    belt_tape1: false,
    belt_tape2: false,
    belt_tape3: false,
    belt_tape4: false,
    belt_tape5: false,
    remark: '',
    sign_name: '',
    sign_date: format(new Date(), 'yyyy-MM-dd'),
    sup_name: '',
    sup_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'ผ่าน',
  })

  // Modals
  const [viewRecord, setViewRecord] = useState(null)
  const [printRecord, setPrintRecord] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [sqlModalOpen, setSqlModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Standards configuration state
  const [standardsConfig, setStandardsConfig] = useState({
    Single: DEFAULT_SINGLE_CHECKLIST_ITEMS,
    Double: DEFAULT_DOUBLE_CHECKLIST_ITEMS,
  })
  const [standardsModalOpen, setStandardsModalOpen] = useState(false)
  const [standardsDraft, setStandardsDraft] = useState({
    Single: DEFAULT_SINGLE_CHECKLIST_ITEMS,
    Double: DEFAULT_DOUBLE_CHECKLIST_ITEMS,
  })
  const [standardsTab, setStandardsTab] = useState('Double')
  const [savingStandards, setSavingStandards] = useState(false)

  // Load custom standards from Supabase / localStorage
  useEffect(() => {
    CenterCheckStandardsAPI.getStandards().then((stds) => {
      if (stds) {
        setStandardsConfig(stds)
        setStandardsDraft(stds)
      }
    }).catch((err) => console.warn('Failed to load standards:', err))
  }, [])

  useRealtimeTables(['appconfigs'], () => {
    CenterCheckStandardsAPI.getStandards().then((stds) => {
      if (stds) {
        setStandardsConfig(stds)
        setStandardsDraft(stds)
      }
    }).catch(() => {})
  })

  // Normalized list of records
  const records = useMemo(() => {
    const list = rawRecords && rawRecords.length > 0 ? rawRecords : initialCenterChecks
    // D1 returns booleans as strings "1"/"0"/"1.0"/"0.0" — coerce properly
    // ("0" is truthy as a string, so !!val would wrongly show ✅ everywhere)
    const toBool = (val) => val === true || val === 1 || String(val).trim() === '1' || String(val).trim() === '1.0' || String(val).trim().toLowerCase() === 'true'
    const parseJsonArray = (val) => {
      if (Array.isArray(val)) return val
      if (typeof val === 'string' && val.trim()) {
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed)) return parsed
        } catch {}
      }
      return []
    }
    return list.map((r) => ({
      ...r,
      type: r.type || 'Single',
      doc_no: r.doc_no || r.Doc_No || '—',
      doc_date: r.doc_date || r.Doc_Date || r.created_at?.split('T')[0] || '—',
      mc: r.mc || r.MC || '—',
      mechanic: r.mechanic || r.Mechanic || r.sign_name || '—',
      status: r.status || r.Status || 'ผ่าน',
      counter_total: Number(r.counter_total || 0),
      items: parseJsonArray(r.items),
      needle_images: parseJsonArray(r.needle_images),
      greasing: toBool(r.greasing),
      oil_change: toBool(r.oil_change),
      belt_tape1: toBool(r.belt_tape1),
      belt_tape2: toBool(r.belt_tape2),
      belt_tape3: toBool(r.belt_tape3),
      belt_tape4: toBool(r.belt_tape4),
      belt_tape5: toBool(r.belt_tape5),
      greasing_text: r.greasing ? 'ดำเนินการแล้ว' : '—',
      oil_change_text: r.oil_change ? 'ดำเนินการแล้ว' : '—',
      yarn_belts_text: [1, 2, 3, 4, 5].filter((n) => r[`belt_tape${n}`]).map((n) => `เทป ${n}`).join(', ') || '—',
    }))
  }, [rawRecords])

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        r.doc_no.toLowerCase().includes(q) ||
        r.mc.toLowerCase().includes(q) ||
        r.mechanic.toLowerCase().includes(q) ||
        (r.serial && r.serial.toLowerCase().includes(q))

      const matchType = typeFilter === 'ALL' || r.type === typeFilter
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter

      return matchSearch && matchType && matchStatus
    })
  }, [records, search, typeFilter, statusFilter])

  // Statistics
  const stats = useMemo(() => {
    const total = records.length
    const singleCount = records.filter((r) => r.type === 'Single').length
    const doubleCount = records.filter((r) => r.type === 'Double').length
    const passedCount = records.filter((r) => r.status === 'ผ่าน').length
    const passRate = total > 0 ? Math.round((passedCount / total) * 100) : 100
    return { total, singleCount, doubleCount, passedCount, passRate }
  }, [records])

  // Initialize from initialPreset (e.g. triggered from PM Plan table)
  useEffect(() => {
    if (initialPreset && initialPreset.type) {
      const type = initialPreset.type === 'Double' ? 'Double' : 'Single'
      setEditingId(null)
      setFormType(type)
      const activeStandards = type === 'Double' ? standardsConfig.Double : standardsConfig.Single
      const defaults = Array.isArray(activeStandards) && activeStandards.length > 0
        ? activeStandards
        : (type === 'Double' ? DEFAULT_DOUBLE_CHECKLIST_ITEMS : DEFAULT_SINGLE_CHECKLIST_ITEMS)
      const defaultItems = defaults.map((d, idx) => ({
        no: d.no || idx + 1,
        item: d.item,
        std: d.std || '0.03',
        val_before: '',
        val_after: '',
        result: 'ผ่าน',
        remark: '',
      }))

      const newDocNo = generateCenterCheckDocNo(type, records)
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      const daysSince = initialPreset.prev_doc_date
        ? Math.max(0, differenceInCalendarDays(new Date(todayStr), new Date(initialPreset.prev_doc_date)))
        : 0

      // Look up the previous counter (skip checks saved without a reading)
      const cleanMc = String(initialPreset.mc || '').trim().toUpperCase()
      let prevVal = 0
      if (cleanMc) {
        const prevCheck = pickPreviousWithCounter(records, {
          matches: (r) => r.mc && r.mc.toUpperCase() === cleanMc,
          getCounter: (r) => r.counter_latest,
        })
        prevVal = Number(prevCheck?.counter_latest || 0)
      }

      setFormData({
        doc_no: newDocNo,
        doc_date: todayStr,
        mechanic: initialPreset.mechanic || '',
        mc: initialPreset.mc || '',
        serial: initialPreset.serial || '',
        location: initialPreset.location || '',
        needle_cond: 'สึกเล็กน้อย',
        needle_arr: 'ตามแบบมาตรฐาน',
        needle_images: [],
        comment: '',
        counter_latest: '',
        counter_prev: prevVal > 0 ? String(prevVal) : '',
        counter_total: 0,
        prev_doc_date: initialPreset.prev_doc_date || '',
        days_since_last: daysSince,
        items: defaultItems,
        greasing: !!initialPreset.greasing,
        oil_change: !!initialPreset.oil_change,
        belt_tape1: !!initialPreset.belt_tape1,
        belt_tape2: !!initialPreset.belt_tape2,
        belt_tape3: !!initialPreset.belt_tape3,
        belt_tape4: !!initialPreset.belt_tape4,
        belt_tape5: !!initialPreset.belt_tape5,
        remark: initialPreset.remark || '',
        sign_name: initialPreset.mechanic || '',
        sign_date: todayStr,
        sup_name: '',
        sup_date: todayStr,
        status: 'ผ่าน',
      })
      setActiveSubTab(type === 'Double' ? 'double_form' : 'single_form')
      if (onClearPreset) onClearPreset()
    }
  }, [initialPreset, records, standardsConfig])

  // Save customized standards
  const handleSaveStandards = async () => {
    setSavingStandards(true)
    try {
      const saved = await CenterCheckStandardsAPI.saveStandards(standardsDraft)
      setStandardsConfig(saved)
      toast.success('บันทึกค่ามาตรฐานระบบสำเร็จ', 'ค่ามาตรฐานใหม่จะถูกนำไปใช้เป็นค่าเริ่มต้นสำหรับใบตรวจเช็ค')

      // Sync active form items if in new form
      if (!editingId && (activeSubTab === 'single_form' || activeSubTab === 'double_form')) {
        const activeStds = formType === 'Double' ? saved.Double : saved.Single
        if (Array.isArray(activeStds)) {
          setFormData((prev) => ({
            ...prev,
            items: activeStds.map((stdItem, idx) => {
              const existingItem = (prev.items || [])[idx]
              return {
                no: stdItem.no || idx + 1,
                item: stdItem.item,
                std: stdItem.std,
                val_before: existingItem?.val_before || '',
                val_after: existingItem?.val_after || '',
                result: existingItem?.result || 'ผ่าน',
                remark: existingItem?.remark || '',
              }
            }),
          }))
        }
      }
      setStandardsModalOpen(false)
    } catch (err) {
      toast.error('ไม่สามารถบันทึกค่ามาตรฐานได้', err.message)
    } finally {
      setSavingStandards(false)
    }
  }

  // Reset standards to factory defaults
  const handleResetStandards = async () => {
    if (!confirm('ต้องการคืนค่ามาตรฐานเริ่มต้นโรงงานทั้งหมดใช่หรือไม่?')) return
    setSavingStandards(true)
    try {
      const reset = await CenterCheckStandardsAPI.resetStandards()
      setStandardsConfig(reset)
      setStandardsDraft(reset)
      toast.info('คืนค่ามาตรฐานเริ่มต้นโรงงานเรียบร้อยแล้ว')
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการคืนค่า', err.message)
    } finally {
      setSavingStandards(false)
    }
  }

  // Standards draft item mutation handlers
  const handleDraftItemChange = (tab, idx, field, value) => {
    setStandardsDraft((prev) => {
      const list = [...(prev[tab] || [])]
      list[idx] = { ...list[idx], [field]: value }
      return { ...prev, [tab]: list }
    })
  }

  const handleAddDraftItem = (tab) => {
    setStandardsDraft((prev) => {
      const list = [...(prev[tab] || [])]
      list.push({
        no: list.length + 1,
        item: '',
        std: '0.03',
      })
      return { ...prev, [tab]: list }
    })
  }

  const handleRemoveDraftItem = (tab, idx) => {
    setStandardsDraft((prev) => {
      const list = (prev[tab] || []).filter((_, i) => i !== idx).map((it, i) => ({
        ...it,
        no: i + 1,
      }))
      return { ...prev, [tab]: list }
    })
  }

  // Initialize new form
  const initNewForm = (type = 'Single') => {
    setEditingId(null)
    setFormType(type)
    const activeStandards = type === 'Double' ? standardsConfig.Double : standardsConfig.Single
    const defaults = Array.isArray(activeStandards) && activeStandards.length > 0
      ? activeStandards
      : (type === 'Double' ? DEFAULT_DOUBLE_CHECKLIST_ITEMS : DEFAULT_SINGLE_CHECKLIST_ITEMS)
    const defaultItems = defaults.map((d, idx) => ({
      no: d.no || idx + 1,
      item: d.item,
      std: d.std || '0.03',
      val_before: '',
      val_after: '',
      result: 'ผ่าน',
      remark: '',
    }))

    const newDocNo = generateCenterCheckDocNo(type, records)
    const todayStr = format(new Date(), 'yyyy-MM-dd')

    setFormData({
      doc_no: newDocNo,
      doc_date: todayStr,
      mechanic: 'ช.หนึ่ง',
      mc: '',
      serial: '',
      location: '',
      needle_cond: 'สึกเล็กน้อย',
      needle_arr: 'ตามแบบมาตรฐาน',
      needle_images: [],
      comment: '',
      counter_latest: '',
      counter_prev: '',
      counter_total: 0,
      prev_doc_date: '',
      days_since_last: 0,
      items: defaultItems,
      greasing: false,
      oil_change: false,
      belt_tape1: false,
      belt_tape2: false,
      belt_tape3: false,
      belt_tape4: false,
      belt_tape5: false,
      remark: '',
      sign_name: 'ช.หนึ่ง',
      sign_date: todayStr,
      sup_name: '',
      sup_date: todayStr,
      status: 'ผ่าน',
    })
    setActiveSubTab(type === 'Double' ? 'double_form' : 'single_form')
  }

  // Edit existing record
  const handleEditRecord = (record) => {
    setEditingId(record.id || record._id)
    setFormType(record.type || 'Single')

    const activeStandards = record.type === 'Double' ? standardsConfig.Double : standardsConfig.Single
    const defaults = Array.isArray(activeStandards) && activeStandards.length > 0
      ? activeStandards
      : (record.type === 'Double' ? DEFAULT_DOUBLE_CHECKLIST_ITEMS : DEFAULT_SINGLE_CHECKLIST_ITEMS)
    const currentItems = Array.isArray(record.items) && record.items.length > 0
      ? record.items
      : defaults.map((d, idx) => ({
          no: d.no || idx + 1,
          item: d.item,
          std: d.std || '0.03',
          val_before: '',
          val_after: '',
          result: 'ผ่าน',
          remark: '',
        }))

    setFormData({
      doc_no: record.doc_no || '',
      doc_date: record.doc_date || format(new Date(), 'yyyy-MM-dd'),
      mechanic: record.mechanic || '',
      mc: record.mc || '',
      serial: record.serial || '',
      location: record.location || '',
      needle_cond: record.needle_cond === 'ปกติ' ? 'สึกเล็กน้อย' : (record.needle_cond || 'สึกเล็กน้อย'),
      needle_arr: record.needle_arr || 'ตามแบบมาตรฐาน',
      needle_images: Array.isArray(record.needle_images) ? record.needle_images : [],
      comment: record.comment || '',
      counter_latest: record.counter_latest !== undefined ? String(record.counter_latest) : '',
      counter_prev: record.counter_prev !== undefined ? String(record.counter_prev) : '',
      counter_total: record.counter_total || 0,
      prev_doc_date: record.prev_doc_date || '',
      days_since_last: record.days_since_last || 0,
      items: currentItems,
      greasing: !!record.greasing,
      oil_change: !!record.oil_change,
      belt_tape1: !!record.belt_tape1,
      belt_tape2: !!record.belt_tape2,
      belt_tape3: !!record.belt_tape3,
      belt_tape4: !!record.belt_tape4,
      belt_tape5: !!record.belt_tape5,
      remark: record.remark || '',
      sign_name: record.sign_name || record.mechanic || '',
      sign_date: record.sign_date || record.doc_date || format(new Date(), 'yyyy-MM-dd'),
      sup_name: record.sup_name || '',
      sup_date: record.sup_date || record.doc_date || format(new Date(), 'yyyy-MM-dd'),
      status: record.status || 'ผ่าน',
    })
    setActiveSubTab(record.type === 'Double' ? 'double_form' : 'single_form')
  }

  const normalizeCode = (val = '') =>
    String(val || '').toUpperCase().replace(/\s+/g, '').replace(/-/g, '').trim()

  const getLatestLocation = (mcVal, serialVal, fallback = '') => {
    const cleanMc = normalizeCode(mcVal)
    const cleanSerial = String(serialVal || '').toUpperCase().replace(/\s+/g, '').trim()

    // 1. Check CylinderAPI (Cylinders have Location, NewMC, Serial_NOW, Serial_OLD)
    if (rawCylinders && rawCylinders.length > 0) {
      if (cleanSerial) {
        const found = rawCylinders.find((c) => {
          const sNow = String(c.Serial_NOW || c.serial || '').toUpperCase().trim()
          const sOld = String(c.Serial_OLD || '').toUpperCase().trim()
          return (sNow && sNow === cleanSerial) || (sOld && sOld === cleanSerial)
        })
        if (found && (found.Location || found.location)) {
          return found.Location || found.location
        }
      }
      if (cleanMc) {
        const found = rawCylinders.find((c) => {
          const cMc = normalizeCode(c.NewMC || c.Standard || c.Machine_Ref || c.mc)
          return cMc && cMc === cleanMc
        })
        if (found && (found.Location || found.location)) {
          return found.Location || found.location
        }
      }
    }

    // 2. Check MachineAPI (Machines have Location, Machine_MC, MC, name)
    if (rawMachines && rawMachines.length > 0 && cleanMc) {
      const found = rawMachines.find((m) => {
        const mCode = normalizeCode(m.Machine_MC || m.MC || m.name)
        return mCode && mCode === cleanMc
      })
      if (found && (found.Location || found.location)) {
        return found.Location || found.location
      }
    }

    // 3. Check past CenterCheck records
    if (records && records.length > 0) {
      if (cleanMc) {
        const past = records.find((r) => normalizeCode(r.mc) === cleanMc && r.location && r.location !== '—')
        if (past) return past.location
      }
      if (cleanSerial) {
        const past = records.find(
          (r) => String(r.serial || '').toUpperCase().trim() === cleanSerial && r.location && r.location !== '—'
        )
        if (past) return past.location
      }
    }

    return fallback || ''
  }

  // Handle M/C change and lookup previous Counter & Date & Location
  const handleMcChange = (mcVal) => {
    const cleanMc = String(mcVal || '').trim().toUpperCase()
    let prevVal = 0
    let prevDate = ''

    if (cleanMc) {
      const lastCheck = pickPreviousWithCounter(records, {
        matches: (r) => r.mc && r.mc.toUpperCase() === cleanMc,
        excludeId: editingId || undefined,
        getCounter: (r) => r.counter_latest,
      })
      if (lastCheck) {
        prevVal = Number(lastCheck.counter_latest || 0)
        prevDate = lastCheck.doc_date || ''
      }
    }

    let daysDiff = 0
    if (prevDate && formData.doc_date) {
      try {
        daysDiff = Math.max(0, differenceInCalendarDays(new Date(formData.doc_date), new Date(prevDate)))
      } catch (e) {}
    }

    const currentLatest = parseFloat(formData.counter_latest) || 0
    const diff = currentLatest > 0 && prevVal > 0 ? Math.max(0, currentLatest - prevVal) : 0

    // Auto lookup latest Location and Serial for this Machine
    const autoLoc = getLatestLocation(mcVal, formData.serial, formData.location)
    let autoSerial = formData.serial
    if (!autoSerial && cleanMc && rawCylinders) {
      const normMc = normalizeCode(mcVal)
      const matchCyl = rawCylinders.find((c) => normalizeCode(c.NewMC || c.Standard) === normMc)
      if (matchCyl && matchCyl.Serial_NOW) {
        autoSerial = matchCyl.Serial_NOW
      }
    }

    setFormData((prev) => ({
      ...prev,
      mc: mcVal,
      serial: autoSerial,
      location: autoLoc || prev.location || '',
      counter_prev: prevVal > 0 ? String(prevVal) : '',
      prev_doc_date: prevDate,
      days_since_last: daysDiff,
      counter_total: diff,
    }))
  }

  // Handle Serial change and lookup latest Location
  const handleSerialChange = (serialVal) => {
    const autoLoc = getLatestLocation(formData.mc, serialVal, formData.location)
    setFormData((prev) => ({
      ...prev,
      serial: serialVal,
      location: autoLoc || prev.location || '',
    }))
  }

  // Handle counter latest change
  const handleCounterLatestChange = (val) => {
    const latest = parseFloat(val) || 0
    const prev = parseFloat(formData.counter_prev) || 0
    const diff = latest > 0 && prev > 0 ? Math.max(0, latest - prev) : 0

    setFormData((prevForm) => ({
      ...prevForm,
      counter_latest: val,
      counter_total: diff,
    }))
  }

  // Handle item change
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }

    // Re-evaluate overall status (Pass only if every item is 'ผ่าน')
    const allPassed = updatedItems.every((it) => it.result === 'ผ่าน')
    const overallStatus = allPassed ? 'ผ่าน' : 'ไม่ผ่าน'

    setFormData({
      ...formData,
      items: updatedItems,
      status: overallStatus,
    })
  }

  // Handle Image Upload (Auto HEIC normalize & Google Drive with Base64 fallback)
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (e.target) e.target.value = ''
    if (!files.length) return

    setUploadingImage(true)
    try {
      const results = await uploadMediaBatch(files, {
        folderName: CENTER_CHECK_IMAGE_FOLDER,
        fallbackToLocal: true,
      })
      const newUrls = results.map((r) => r.imageUrl || r.url || r.dataUrl).filter(Boolean)

      setFormData((prev) => ({
        ...prev,
        needle_images: [...(prev.needle_images || []), ...newUrls],
      }))
      toast.success('อัปโหลดรูปสำเร็จ', `เพิ่ม ${newUrls.length} รูป (แปลงเป็น JPEG คมชัดเรียบร้อย)`)
    } catch (err) {
      toast.error('อัปโหลดรูปไม่สำเร็จ', err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (ev) => resolve(ev.target.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const removeImage = (imgIdx) => {
    setFormData((prev) => ({
      ...prev,
      needle_images: (prev.needle_images || []).filter((_, idx) => idx !== imgIdx),
    }))
  }

  // Save Record Form
  const handleSubmitForm = async (e) => {
    e.preventDefault()
    if (saving) return
    if (!formData.mc?.trim()) {
      toast.warning('กรุณาระบุรหัสเครื่องจักร (M/C)')
      return
    }

    setSaving(true)
    const payload = {
      ...formData,
      type: formType,
      counter_latest: parseFloat(formData.counter_latest) || 0,
      counter_prev: parseFloat(formData.counter_prev) || 0,
      counter_total: parseFloat(formData.counter_total) || 0,
      days_since_last: parseInt(formData.days_since_last, 10) || 0,
      timestamp: new Date().toISOString(),
    }

    try {
      if (editingId) {
        await CenterCheckAPI.update(editingId, payload)
        toast.success('อัปเดตใบบันทึกเช็คศูนย์สำเร็จ', `${payload.doc_no} (M/C: ${payload.mc})`)
      } else {
        await CenterCheckAPI.create(payload)
        toast.success('บันทึกการเช็คศูนย์เรียบร้อยแล้ว', `${payload.doc_no} (M/C: ${payload.mc})`)
      }

      // Auto-Sync Q3: Update matching cylinder's Last_Check_Date and status
      const targetSerial = payload.serial || formData.serial
      if (targetSerial && Array.isArray(rawCylinders)) {
        try {
          const matchingCyl = rawCylinders.find(
            (c) => c.Serial_NOW === targetSerial || c.Serial_OLD === targetSerial || c.Serial === targetSerial
          )
          if (matchingCyl) {
            const cylId = matchingCyl.id || matchingCyl._id
            const updateFields = buildCylinderInspectionSync({
              docDate: payload.doc_date || new Date().toISOString().slice(0, 10),
              inspectionStatus: payload.needle_cond,
              forceWorn: payload.status === 'FAILED',
              currentStatus: matchingCyl.Status_Now,
            })
            await CylinderAPI.update(cylId, updateFields)
          }
        } catch (cylSyncErr) {
          console.warn('Cylinder auto-update from CenterCheck warning:', cylSyncErr)
        }
      }

      // Auto-Sync to PM Plan (pmplans) so user never has to re-enter!
      try {
        const pmPlansList = await PMPlanAPI.list()
        const targetMc = (payload.mc || formData.mc || '').trim()
        const targetSerialClean = (payload.serial || formData.serial || '').trim()

        // Machine type: derive from the doc number prefix first (CS-S-* / CS-D-*),
        // then fall back to the form selection — keeps Single and Double plans separate.
        const machineType = String(payload.doc_no || '').startsWith('CS-D-')
          ? 'Double'
          : String(payload.doc_no || '').startsWith('CS-S-')
            ? 'Single'
            : (payload.type || formType || 'Single')

        const normalizeCode = (val) => String(val || '').toUpperCase().replace(/\s+/g, '').replace(/-/g, '').trim()
        const normalizeS = (val) => String(val || '').toUpperCase().replace(/\s+/g, '').trim()
        const normalizePlanType = (val) => {
          const t = String(val || '').trim().toLowerCase()
          if (t.startsWith('d') || t === 'double jersey') return 'Double'
          if (t.startsWith('s') || t === 'single jersey') return 'Single'
          return '' // legacy plan without a type — still matchable
        }

        const matchingPlan = (Array.isArray(pmPlansList) ? pmPlansList : [])
          .filter((p) => {
            const mcMatch = targetMc && normalizeCode(p.Machine_MC) === normalizeCode(targetMc)
            const serialMatch = targetSerialClean && normalizeS(p.Machine_KI) === normalizeS(targetSerialClean)
            return mcMatch || serialMatch
          })
          .filter((p) => {
            const planType = normalizePlanType(p.Type)
            return !planType || planType === machineType
          })
          // prefer plans whose type already matches exactly over legacy untyped ones
          .sort((a, b) => (normalizePlanType(b.Type) === machineType ? 1 : 0) - (normalizePlanType(a.Type) === machineType ? 1 : 0))
          [0]

        const lastPmDate = payload.doc_date || format(new Date(), 'yyyy-MM-dd')
        const cycleDays = matchingPlan ? (Number(matchingPlan.Frequency_Value) || Number(matchingPlan.PM_Type) || 30) : 30
        const nextPmDate = format(addDays(new Date(lastPmDate), cycleDays), 'yyyy-MM-dd')
        const techName = payload.mechanic || (matchingPlan ? matchingPlan.Assigned_Tech : '') || ''

        if (matchingPlan) {
          const planId = matchingPlan.id || matchingPlan._id
          const cleanRemark = String(matchingPlan.Remark || '')
            .split('\n')
            .filter((line) => !line.trim().startsWith('เช็คศูนย์ล่าสุด:'))
            .join('\n')
            .trim()
          const updatedRemark = [
            cleanRemark,
            `เช็คศูนย์ล่าสุด: ${payload.doc_no} (${payload.status || 'PASS'}) เมื่อ ${lastPmDate}`,
          ].filter(Boolean).join('\n')

          await PMPlanAPI.update(planId, {
            Last_PM_Date: lastPmDate,
            Next_PM_Date: nextPmDate,
            Assigned_Tech: techName,
            Status: 'COMPLETED',
            Type: machineType,
            Remark: updatedRemark,
            Location: payload.location || matchingPlan.Location || '',
            updated_at: new Date().toISOString(),
          })
        } else if (targetMc || targetSerialClean) {
          await PMPlanAPI.create({
            PM_ID: `PM-${targetMc || targetSerialClean || Date.now()}`,
            Machine_MC: targetMc,
            Machine_KI: targetSerialClean,
            Location: payload.location || '',
            Type: machineType,
            PM_Type: '30',
            Frequency_Type: 'CALENDAR',
            Frequency_Value: 30,
            Last_PM_Date: lastPmDate,
            Next_PM_Date: nextPmDate,
            Estimated_Hours: 1,
            Assigned_Tech: techName,
            Priority: 'MEDIUM',
            Status: 'COMPLETED',
            Remark: `สร้างอัตโนมัติจากการเช็คศูนย์ ${payload.doc_no} (${payload.status || 'PASS'})`,
          })
        }

        // Log to AuditLog for PM Log table
        try {
          await AuditLogAPI.create({
            Module: 'PM',
            ActionType: 'CHECK_PLAN',
            RecordID: targetSerialClean || targetMc,
            FieldName: 'CenterCheck',
            NewValue: JSON.stringify({
              Machine_MC: targetMc,
              Machine_KI: targetSerialClean,
              Location: payload.location || matchingPlan?.Location || '',
              Last_PM_Date: lastPmDate,
              Next_PM_Date: nextPmDate,
              DocNo: payload.doc_no,
            }),
            User: user?.full_name || user?.username || techName || 'system',
            Comment: `บันทึกเช็คศูนย์: ${payload.doc_no} (M/C: ${targetMc || '-'}, ผล: ${payload.status || 'PASS'})`,
          })
        } catch {}
      } catch (pmSyncErr) {
        console.warn('PM Plan auto-sync from CenterCheck warning:', pmSyncErr)
      }

      if (typeof onRecordSaved === 'function') {
        try {
          onRecordSaved(payload)
        } catch {}
      }

      await loadRecords()
      setActiveSubTab('history')
    } catch (err) {
      console.error(err)
      toast.error('เกิดข้อผิดพลาดในการบันทึก', err.message)
    } finally {
      setSaving(false)
    }
  }

  // Delete Record
  const handleDeleteRecord = async (record) => {
    const id = record.id || record._id
    if (!confirm(`ยืนยันการลบใบบันทึกเช็คศูนย์ ${record.doc_no} เครื่อง ${record.mc}?`)) return

    try {
      await CenterCheckAPI.delete(id)
      toast.success('ลบใบบันทึกเช็คศูนย์สำเร็จ', record.doc_no)
      await loadRecords()
    } catch (err) {
      toast.error('ไม่สามารถลบข้อมูลได้', err.message)
    }
  }

  // Columns for Google Sheet export
  const sheetColumns = [
    { key: 'doc_no', label: 'เลขที่เอกสาร' },
    { key: 'doc_date', label: 'วันที่ตรวจ' },
    { key: 'type', label: 'ประเภท' },
    { key: 'mc', label: 'เครื่องจักร' },
    { key: 'serial', label: 'Serial No.' },
    { key: 'mechanic', label: 'ช่างตั้งศูนย์' },
    { key: 'counter_latest', label: 'Counter ล่าสุด' },
    { key: 'counter_prev', label: 'Counter ครั้งก่อน' },
    { key: 'counter_total', label: 'ผลต่างรอบ' },
    { key: 'days_since_last', label: 'ระยะห่าง(วัน)' },
    { key: 'status', label: 'ผลการตรวจ' },
    { key: 'greasing_text', label: 'อัดจารบี' },
    { key: 'oil_change_text', label: 'ถ่ายน้ำมันเกียร์' },
    { key: 'yarn_belts_text', label: 'สายพานส่งด้าย' },
    { key: 'needle_cond', label: 'สภาพเข็ม' },
    { key: 'needle_arr', label: 'การเรียงเข็ม' },
    { key: 'remark', label: 'หมายเหตุ' },
  ]

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER & SUB-TABS ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--text-900)' }}>
            <span className="p-2 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Layers size={22} />
            </span>
            <span>บันทึกประวัติการตั้งศูนย์เครื่องถักกลม</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-500)' }}>
            ตรวจสอบความเที่ยงตรง Cylinder, Cambox, Sinker, Dail และบันทึกผลต่างรอบเครื่องจักร
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onBackToPMPlan && (
            <button
              type="button"
              onClick={onBackToPMPlan}
              className="btn-outline text-xs px-3 py-2 flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300"
              title="กลับไปยังหน้าแผน PM"
            >
              <ArrowLeft size={14} />
              <span>กลับไปแผน PM</span>
            </button>
          )}

          {canAdd && (
            <>
              <button
                type="button"
                onClick={() => initNewForm('Single')}
                className={`btn text-xs font-bold transition-all shadow-sm ${
                  activeSubTab === 'single_form' && !editingId
                    ? 'bg-blue-600 text-white shadow-blue-500/25'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800'
                }`}
              >
                <Plus size={14} />
                <span>เช็คศูนย์ Single Jersey</span>
              </button>

              <button
                type="button"
                onClick={() => initNewForm('Double')}
                className={`btn text-xs font-bold transition-all shadow-sm ${
                  activeSubTab === 'double_form' && !editingId
                    ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                    : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                <Plus size={14} />
                <span>เช็คศูนย์ Double Jersey</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setStandardsDraft(JSON.parse(JSON.stringify(standardsConfig)))
              setStandardsTab(formType === 'Double' ? 'Double' : 'Single')
              setStandardsModalOpen(true)
            }}
            className="btn-outline text-xs px-2.5 flex items-center gap-1.5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            title="ตั้งค่ามาตรฐานเริ่มต้น (Center Check Standards)"
          >
            <Sliders size={13} />
            <span className="hidden sm:inline">ตั้งค่ามาตรฐาน</span>
          </button>

          <button
            type="button"
            onClick={() => setSqlModalOpen(true)}
            className="btn-outline text-xs px-2.5 flex items-center gap-1.5 text-slate-600 dark:text-slate-400"
            title="ดูคำสั่ง SQL สำหรับสร้างตารางบน Supabase"
          >
            <Sliders size={13} />
            <span className="hidden md:inline">SQL Schema</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('history')
              loadRecords()
            }}
            className="btn-outline p-2 text-xs"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={14} className={recordsLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── STATS SUMMARY CARDS ────────────────────────────── */}
      <CenterCheckStats stats={stats} />


      <CenterCheckTabs activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} editingId={editingId} formType={formType} count={filteredRecords.length} />
      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB CONTENT: 1. HISTORY LOG ──────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <CenterCheckToolbar search={search} setSearch={setSearch} typeFilter={typeFilter} setTypeFilter={setTypeFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} sheetColumns={sheetColumns} filteredRecords={filteredRecords} />


          {/* Records Table */}
          <CenterCheckTable filteredRecords={filteredRecords} canEdit={canEdit} canDelete={canDelete} setViewRecord={setViewRecord} setPrintRecord={setPrintRecord} handleEditRecord={handleEditRecord} handleDeleteRecord={handleDeleteRecord} />
        </div>

      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB CONTENT: 2. FORM (Single & Double Jersey) ────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <CenterCheckForm activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} formType={formType} editingId={editingId} formData={formData} setFormData={setFormData} saving={saving} uploadingImage={uploadingImage} standardsConfig={standardsConfig} rawMachines={rawMachines} rawTechs={rawTechs} handleSubmitForm={handleSubmitForm} handleMcChange={handleMcChange} handleSerialChange={handleSerialChange} handleCounterLatestChange={handleCounterLatestChange} handleItemChange={handleItemChange} handleImageUpload={handleImageUpload} removeImage={removeImage} setPreviewImage={setPreviewImage} setStandardsDraft={setStandardsDraft} setStandardsTab={setStandardsTab} setStandardsModalOpen={setStandardsModalOpen} />


      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: 1. VIEW RECORD DETAILS ────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <CenterCheckViewModal viewRecord={viewRecord} setViewRecord={setViewRecord} setPrintRecord={setPrintRecord} getLatestLocation={getLatestLocation} setPreviewImage={setPreviewImage} />


      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: 2. PRINT A4 SHEET (PDF PREVIEW MODAL) ──────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <CenterCheckPrintModal printRecord={printRecord} setPrintRecord={setPrintRecord} getLatestLocation={getLatestLocation} rawCylinders={rawCylinders} rawRecords={rawRecords} />


      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: 2.5 STANDARDS CONFIG MODAL ────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <CenterCheckStandardsModal standardsModalOpen={standardsModalOpen} setStandardsModalOpen={setStandardsModalOpen} standardsDraft={standardsDraft} setStandardsDraft={setStandardsDraft} standardsTab={standardsTab} setStandardsTab={setStandardsTab} savingStandards={savingStandards} handleSaveStandards={handleSaveStandards} handleResetStandards={handleResetStandards} handleAddDraftItem={handleAddDraftItem} handleDraftItemChange={handleDraftItemChange} handleRemoveDraftItem={handleRemoveDraftItem} />


      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: 3. SQL SCHEMA SCRIPT MODAL ─────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <CenterCheckSqlModal sqlModalOpen={sqlModalOpen} setSqlModalOpen={setSqlModalOpen} toast={toast} />


      {/* ── MODAL: 4. IMAGE PREVIEW MODAL ───────────────────────── */}
      <CenterCheckImageModal previewImage={previewImage} setPreviewImage={setPreviewImage} />

    </div>
  )
}
