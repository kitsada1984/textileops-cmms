import { useState, useMemo, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  Camera,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Check,
  X,
  FileText,
  Sliders,
} from 'lucide-react'
import { format, differenceInCalendarDays } from 'date-fns'
import useEntity from '../hooks/useEntity'
import {
  CenterCheckAPI,
  MachineAPI,
  TechnicianAPI,
  DEFAULT_SINGLE_CHECKLIST_ITEMS,
  DEFAULT_DOUBLE_CHECKLIST_ITEMS,
  generateCenterCheckDocNo,
} from '../api/entities'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import { useT } from '../contexts/LanguageContext'
import usePagePerms from '../hooks/usePagePerms'
import { useToast } from '../components/ui/Toast'
import GoogleSheetSyncButton from '../components/ui/GoogleSheetSyncButton'
import { uploadImageToGoogleDrive } from '../utils/googleDriveUpload'
import PdfPreviewModal from '../components/ui/PdfPreviewModal'
import { generateCenterCheckPdfProps } from '../utils/pdfDocGenerators'
import initialCenterChecks from '../data/initialCenterChecks.json'

const CENTER_CHECK_IMAGE_FOLDER = 'ประวัติเช็คศูนย์'

export default function CenterCheck({ initialPreset, onClearPreset, onBackToPMPlan }) {
  const { t } = useT()
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
    needle_cond: '',
    needle_arr: '',
    needle_images: [],
    comment: '',
    counter_latest: '',
    counter_prev: '',
    counter_total: '',
    prev_doc_date: '',
    days_since_last: 0,
    items: [],
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
  const [sqlModalOpen, setSqlModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Normalized list of records
  const records = useMemo(() => {
    const list = rawRecords && rawRecords.length > 0 ? rawRecords : initialCenterChecks
    return list.map((r) => ({
      ...r,
      type: r.type || 'Single',
      doc_no: r.doc_no || r.Doc_No || '—',
      doc_date: r.doc_date || r.Doc_Date || r.created_at?.split('T')[0] || '—',
      mc: r.mc || r.MC || '—',
      mechanic: r.mechanic || r.Mechanic || r.sign_name || '—',
      status: r.status || r.Status || 'ผ่าน',
      counter_total: Number(r.counter_total || 0),
      items: Array.isArray(r.items) ? r.items : [],
      needle_images: Array.isArray(r.needle_images) ? r.needle_images : [],
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
      const defaults =
        type === 'Double' ? DEFAULT_DOUBLE_CHECKLIST_ITEMS : DEFAULT_SINGLE_CHECKLIST_ITEMS
      const defaultItems = defaults.map((d) => ({
        no: d.no,
        item: d.item,
        std: d.std,
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

      // Look up previous counter if available
      const cleanMc = String(initialPreset.mc || '').trim().toUpperCase()
      let prevVal = 0
      if (cleanMc) {
        const pastChecks = records
          .filter((r) => r.mc && r.mc.toUpperCase() === cleanMc)
          .sort((a, b) => new Date(b.doc_date || 0) - new Date(a.doc_date || 0))
        if (pastChecks.length > 0) {
          prevVal = Number(pastChecks[0].counter_latest || 0)
        }
      }

      setFormData({
        doc_no: newDocNo,
        doc_date: todayStr,
        mechanic: initialPreset.mechanic || '',
        mc: initialPreset.mc || '',
        serial: initialPreset.serial || '',
        location: initialPreset.location || '',
        needle_cond: 'ปกติ',
        needle_arr: 'ตามแบบมาตรฐาน',
        needle_images: [],
        comment: '',
        counter_latest: '',
        counter_prev: prevVal > 0 ? String(prevVal) : '',
        counter_total: 0,
        prev_doc_date: initialPreset.prev_doc_date || '',
        days_since_last: daysSince,
        items: defaultItems,
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
  }, [initialPreset, records])

  // Initialize new form
  const initNewForm = (type = 'Single') => {
    setEditingId(null)
    setFormType(type)
    const defaults =
      type === 'Double' ? DEFAULT_DOUBLE_CHECKLIST_ITEMS : DEFAULT_SINGLE_CHECKLIST_ITEMS
    const defaultItems = defaults.map((d) => ({
      no: d.no,
      item: d.item,
      std: d.std,
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
      needle_cond: 'ปกติ',
      needle_arr: 'ตามแบบมาตรฐาน',
      needle_images: [],
      comment: '',
      counter_latest: '',
      counter_prev: '',
      counter_total: 0,
      prev_doc_date: '',
      days_since_last: 0,
      items: defaultItems,
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

    const defaults =
      record.type === 'Double' ? DEFAULT_DOUBLE_CHECKLIST_ITEMS : DEFAULT_SINGLE_CHECKLIST_ITEMS
    const currentItems = Array.isArray(record.items) && record.items.length > 0
      ? record.items
      : defaults.map((d) => ({
          no: d.no,
          item: d.item,
          std: d.std,
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
      needle_cond: record.needle_cond || 'ปกติ',
      needle_arr: record.needle_arr || 'ตามแบบมาตรฐาน',
      needle_images: Array.isArray(record.needle_images) ? record.needle_images : [],
      comment: record.comment || '',
      counter_latest: record.counter_latest !== undefined ? String(record.counter_latest) : '',
      counter_prev: record.counter_prev !== undefined ? String(record.counter_prev) : '',
      counter_total: record.counter_total || 0,
      prev_doc_date: record.prev_doc_date || '',
      days_since_last: record.days_since_last || 0,
      items: currentItems,
      remark: record.remark || '',
      sign_name: record.sign_name || record.mechanic || '',
      sign_date: record.sign_date || record.doc_date || format(new Date(), 'yyyy-MM-dd'),
      sup_name: record.sup_name || '',
      sup_date: record.sup_date || record.doc_date || format(new Date(), 'yyyy-MM-dd'),
      status: record.status || 'ผ่าน',
    })
    setActiveSubTab(record.type === 'Double' ? 'double_form' : 'single_form')
  }

  // Handle M/C change and lookup previous Counter & Date
  const handleMcChange = (mcVal) => {
    const cleanMc = String(mcVal || '').trim().toUpperCase()
    let prevVal = 0
    let prevDate = ''

    if (cleanMc) {
      const pastChecks = records
        .filter((r) => r.mc && r.mc.toUpperCase() === cleanMc && (editingId ? r.id !== editingId : true))
        .sort((a, b) => new Date(b.doc_date || 0) - new Date(a.doc_date || 0))

      if (pastChecks.length > 0) {
        const lastCheck = pastChecks[0]
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

    setFormData((prev) => ({
      ...prev,
      mc: mcVal,
      counter_prev: prevVal > 0 ? String(prevVal) : '',
      prev_doc_date: prevDate,
      days_since_last: daysDiff,
      counter_total: diff,
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

  // Handle Image Upload (Google Drive with Base64 fallback)
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setUploadingImage(true)
    for (const file of files) {
      try {
        const { imageUrl } = await uploadImageToGoogleDrive(file, { folderName: CENTER_CHECK_IMAGE_FOLDER })
        setFormData((prev) => ({
          ...prev,
          needle_images: [...(prev.needle_images || []), imageUrl],
        }))
        toast.success('อัปโหลดรูปลง Google Drive สำเร็จ', `โฟลเดอร์ ${CENTER_CHECK_IMAGE_FOLDER}`)
      } catch (err) {
        // Fallback to local Base64
        const reader = new FileReader()
        reader.onload = (event) => {
          const base64Url = event.target.result
          setFormData((prev) => ({
            ...prev,
            needle_images: [...(prev.needle_images || []), base64Url],
          }))
        }
        reader.readAsDataURL(file)
      }
    }
    setUploadingImage(false)
  }

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500">ประวัติการตรวจทั้งหมด</div>
            <div className="text-xl font-black mt-0.5" style={{ color: 'var(--text-900)' }}>
              {stats.total} <span className="text-xs font-normal text-slate-400">ครั้ง</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <FileText size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Single Jersey</div>
            <div className="text-xl font-black mt-0.5 text-blue-600 dark:text-blue-400">
              {stats.singleCount} <span className="text-xs font-normal text-slate-400">ใบ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
            1-Cy
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Double Jersey</div>
            <div className="text-xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
              {stats.doubleCount} <span className="text-xs font-normal text-slate-400">ใบ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
            2-Cy
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500">อัตราผ่านเกณฑ์มาตรฐาน</div>
            <div className="text-xl font-black mt-0.5 text-teal-600 dark:text-teal-400">
              {stats.passRate}% <span className="text-xs font-normal text-slate-400">({stats.passedCount}/{stats.total})</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      {/* ── SUB-TAB SWITCHER (History vs Form) ──────────────── */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[36px] ${
            activeSubTab === 'history'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <FileText size={14} />
          <span>ประวัติการตรวจ (History Log)</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${
            activeSubTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {filteredRecords.length}
          </span>
        </button>

        {(activeSubTab === 'single_form' || activeSubTab === 'double_form') && (
          <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-blue-600 border border-slate-200 dark:border-slate-700">
            <Pencil size={13} />
            <span>{editingId ? 'แก้ไขใบบันทึก' : 'ฟอร์มบันทึกใหม่'} ({formType} Jersey)</span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB CONTENT: 1. HISTORY LOG ──────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="ค้นหาเลขที่เอกสาร, เครื่อง M/C, ช่าง หรือ Serial..."
                className="max-w-md"
              />

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="select text-xs font-semibold py-2 px-3 min-w-[130px]"
              >
                <option value="ALL">ทุกประเภทเครื่อง</option>
                <option value="Single">🔵 Single Jersey</option>
                <option value="Double">🟢 Double Jersey</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select text-xs font-semibold py-2 px-3 min-w-[130px]"
              >
                <option value="ALL">ทุกผลการตรวจ</option>
                <option value="ผ่าน">✅ ผ่านมาตรฐาน</option>
                <option value="ไม่ผ่าน">❌ ไม่ผ่านมาตรฐาน</option>
              </select>
            </div>

            <GoogleSheetSyncButton
              sheetName="ประวัติการเช็คศูนย์"
              columns={sheetColumns}
              rows={filteredRecords}
            />
          </div>

          {/* Records Table */}
          <div className="card overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                    <th className="py-3 px-4 text-left">เลขที่เอกสาร</th>
                    <th className="py-3 px-4 text-left">วันที่ตรวจ</th>
                    <th className="py-3 px-4 text-center">ประเภท</th>
                    <th className="py-3 px-4 text-left">เครื่อง (M/C)</th>
                    <th className="py-3 px-4 text-right">Counter ล่าสุด</th>
                    <th className="py-3 px-4 text-right">ผลต่างรอบ</th>
                    <th className="py-3 px-4 text-left">ช่างตั้งศูนย์</th>
                    <th className="py-3 px-4 text-center">ผลการตรวจ</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Layers size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="font-semibold">ยังไม่มีประวัติการเช็คศูนย์</p>
                        <p className="text-[11px] mt-0.5">กดปุ่ม "เช็คศูนย์ Single" หรือ "Double" ด้านบนเพื่อบันทึกรายการแรก</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => {
                      const isPassed = r.status === 'ผ่าน'
                      return (
                        <tr key={r.id || r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {r.doc_no}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {r.doc_date}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`badge text-[10px] font-bold ${
                                r.type === 'Double'
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                                  : 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                              }`}
                            >
                              {r.type} Jersey
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-1.5">
                              <span>{r.mc}</span>
                              {r.serial && (
                                <span className="text-[10px] font-mono text-slate-400">({r.serial})</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {r.counter_latest ? Number(r.counter_latest).toLocaleString() : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                            {r.counter_total ? `+${Number(r.counter_total).toLocaleString()}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {r.mechanic || '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`badge text-[10px] font-bold ${
                                isPassed
                                  ? 'badge-green'
                                  : 'badge-red'
                              }`}
                            >
                              {isPassed ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewRecord(r)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                title="ดูรายละเอียดข้อตรวจ"
                              >
                                <Eye size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setPrintRecord(r)}
                                className="px-2 py-1 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 transition-colors flex items-center gap-1 font-bold text-[11px]"
                                title="ดู PDF / พิมพ์รายงานตรวจเช็คศูนย์"
                              >
                                <FileText size={12} />
                                <span>PDF</span>
                              </button>

                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleEditRecord(r)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                                  title="แก้ไขข้อมูล"
                                >
                                  <Pencil size={14} />
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(r)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                  title="ลบรายการ"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB CONTENT: 2. FORM (Single & Double Jersey) ────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'single_form' || activeSubTab === 'double_form') && (
        <form onSubmit={handleSubmitForm} className="space-y-6">
          <div className="card p-6 space-y-6 border border-blue-500/20">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wide text-white ${
                    formType === 'Double' ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}>
                    {formType} Jersey
                  </span>
                  <h2 className="text-base font-extrabold" style={{ color: 'var(--text-900)' }}>
                    {editingId ? 'แก้ไขใบบันทึกการตั้งศูนย์' : 'แบบบันทึกการตั้งศูนย์เครื่องถักกลม'}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  กรอกข้อมูลเครื่องจักร ค่าการตรวจ 10 รายการ และลายมือชื่อช่างผู้ตรวจ
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400">เลขที่เอกสาร</div>
                  <div className="text-sm font-mono font-black text-blue-600 dark:text-blue-400">
                    {formData.doc_no}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('history')}
                  className="btn-outline text-xs px-3"
                >
                  <X size={14} />
                  <span>ยกเลิก</span>
                </button>
              </div>
            </div>

            {/* Section 1: Basic info & Counter */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="label font-bold">วันที่ตรวจ *</label>
                <input
                  type="date"
                  value={formData.doc_date}
                  onChange={(e) => setFormData({ ...formData, doc_date: e.target.value })}
                  className="input font-mono"
                  required
                />
              </div>

              <div>
                <label className="label font-bold">เครื่องจักร (M/C) *</label>
                <input
                  type="text"
                  placeholder="เช่น MC-01, M05"
                  value={formData.mc}
                  onChange={(e) => handleMcChange(e.target.value)}
                  className="input font-bold"
                  required
                  list="mc-datalist"
                />
                <datalist id="mc-datalist">
                  {(rawMachines || []).map((m, idx) => (
                    <option key={idx} value={m.Machine_MC || m.MC || m.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="label font-bold">Serial No.</label>
                <input
                  type="text"
                  placeholder="เช่น SN-2024-889"
                  value={formData.serial}
                  onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                  className="input font-mono"
                />
              </div>

              <div>
                <label className="label font-bold">ช่างตั้งศูนย์ *</label>
                <input
                  type="text"
                  placeholder="ชื่อช่างผู้ปฏิบัติงาน"
                  value={formData.mechanic}
                  onChange={(e) => setFormData({ ...formData, mechanic: e.target.value, sign_name: e.target.value })}
                  className="input"
                  required
                  list="tech-datalist"
                />
                <datalist id="tech-datalist">
                  {(rawTechs || []).map((t, idx) => (
                    <option key={idx} value={t.Name || t.name} />
                  ))}
                </datalist>
              </div>

              {/* Counter Analytics Box */}
              <div className="col-span-1 md:col-span-3 lg:col-span-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="label font-bold text-slate-500">Counter ล่าสุด (รอบ)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.counter_latest}
                    onChange={(e) => handleCounterLatestChange(e.target.value)}
                    className="input font-mono font-bold text-blue-600"
                  />
                </div>

                <div>
                  <label className="label font-bold text-slate-500">Counter ครั้งก่อน</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.counter_prev}
                    onChange={(e) => {
                      const prev = parseFloat(e.target.value) || 0
                      const latest = parseFloat(formData.counter_latest) || 0
                      const diff = latest > 0 && prev > 0 ? Math.max(0, latest - prev) : 0
                      setFormData({ ...formData, counter_prev: e.target.value, counter_total: diff })
                    }}
                    className="input font-mono bg-slate-100 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="label font-bold text-slate-500">ผลต่างรอบเครื่อง (Diff)</label>
                  <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 font-mono font-black text-teal-600 dark:text-teal-400 text-sm text-center">
                    +{Number(formData.counter_total || 0).toLocaleString()} รอบ
                  </div>
                </div>

                <div>
                  <label className="label font-bold text-slate-500">ระยะห่างจากการตรวจก่อน</label>
                  <div className="p-2.5 rounded-xl bg-slate-200/60 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300 text-xs text-center">
                    {formData.days_since_last || 0} วัน {formData.prev_doc_date ? `(${formData.prev_doc_date})` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: 10 Checklist Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text-900)' }}>
                  <Sliders size={16} className="text-blue-500" />
                  <span>รายการตรวจสอบ 10 ข้อมาตรฐาน ({formType} Jersey)</span>
                </h3>
                <span className={`badge text-xs font-bold ${
                  formData.status === 'ผ่าน' ? 'badge-green' : 'badge-red'
                }`}>
                  ผลรวม: {formData.status === 'ผ่าน' ? '✅ ผ่านมาตรฐาน' : '❌ ไม่ผ่าน'}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="table w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-900 text-slate-600 font-bold border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2.5 px-3 text-center w-12">ข้อ</th>
                      <th className="py-2.5 px-3 text-left">รายการตรวจ</th>
                      <th className="py-2.5 px-3 text-center w-28">ค่ามาตรฐาน</th>
                      <th className="py-2.5 px-3 text-center w-28">ก่อนทำ</th>
                      <th className="py-2.5 px-3 text-center w-28">หลังทำ</th>
                      <th className="py-2.5 px-3 text-center w-32">ผลการตรวจ</th>
                      <th className="py-2.5 px-3 text-left">ข้อสังเกต / หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(formData.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          {item.no || idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {item.item}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 bg-slate-50 dark:bg-slate-900/40">
                          {item.std || '—'}
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            placeholder="ก่อนทำ"
                            value={item.val_before || ''}
                            onChange={(e) => handleItemChange(idx, 'val_before', e.target.value)}
                            className="input text-center font-mono text-xs py-1"
                          />
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            placeholder="หลังทำ"
                            value={item.val_after || ''}
                            onChange={(e) => handleItemChange(idx, 'val_after', e.target.value)}
                            className="input text-center font-mono text-xs py-1 font-bold text-blue-600"
                          />
                        </td>
                        <td className="py-1 px-2 text-center">
                          <select
                            value={item.result || 'ผ่าน'}
                            onChange={(e) => handleItemChange(idx, 'result', e.target.value)}
                            className={`select text-xs font-bold py-1 px-2 text-center ${
                              item.result === 'ผ่าน'
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                : 'text-red-600 dark:text-red-400 bg-red-500/10'
                            }`}
                          >
                            <option value="ผ่าน">ผ่าน</option>
                            <option value="ไม่ผ่าน">ไม่ผ่าน</option>
                          </select>
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            placeholder="ระบุข้อสังเกต (ถ้ามี)"
                            value={item.remark || ''}
                            onChange={(e) => handleItemChange(idx, 'remark', e.target.value)}
                            className="input text-xs py-1"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Needle Condition & Photos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div className="space-y-3">
                <div>
                  <label className="label font-bold">สภาพเข็ม (Needle Condition)</label>
                  <input
                    type="text"
                    placeholder="เช่น ปกติ, เข็มหัก 2 เล่ม, ลิ้นเข็มคลอน"
                    value={formData.needle_cond}
                    onChange={(e) => setFormData({ ...formData, needle_cond: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label font-bold">การเรียงเข็ม (Needle Arrangement)</label>
                  <input
                    type="text"
                    placeholder="เช่น ลายเรียง 1-1, ตามแบบมาตรฐาน"
                    value={formData.needle_arr}
                    onChange={(e) => setFormData({ ...formData, needle_arr: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label font-bold">หมายเหตุเพิ่มเติม</label>
                  <textarea
                    rows={2}
                    placeholder="ข้อคิดเห็น ชิ้นส่วนที่ต้องเฝ้าระวัง หรือข้อมูลอื่นๆ"
                    value={formData.remark}
                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              {/* Photos upload */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="label font-bold flex items-center gap-1.5 mb-0">
                    <Camera size={15} className="text-blue-500" />
                    <span>รูปถ่ายสภาพเข็ม / ชิ้นส่วน</span>
                  </label>
                  <label className="btn-primary text-xs py-1.5 px-3 cursor-pointer">
                    {uploadingImage ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>กำลังอัปโหลด...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>แนบรูปถ่าย</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploadingImage}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2 min-h-[90px]">
                  {(formData.needle_images || []).length === 0 ? (
                    <div className="col-span-3 flex flex-col items-center justify-center py-6 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                      <Camera size={24} className="opacity-40 mb-1" />
                      <span className="text-[11px]">ยังไม่มีรูปถ่ายแนบ</span>
                    </div>
                  ) : (
                    formData.needle_images.map((img, imgIdx) => (
                      <div key={imgIdx} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video bg-slate-100">
                        <img src={img} alt="Needle preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(imgIdx)}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Signatures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="space-y-2">
                <label className="label font-bold text-slate-700 dark:text-slate-300">
                  ✍️ ช่างผู้ตั้งศูนย์ (Mechanic)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="ชื่อผู้ลงนามช่าง"
                    value={formData.sign_name}
                    onChange={(e) => setFormData({ ...formData, sign_name: e.target.value })}
                    className="input"
                  />
                  <input
                    type="date"
                    value={formData.sign_date}
                    onChange={(e) => setFormData({ ...formData, sign_date: e.target.value })}
                    className="input font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label font-bold text-slate-700 dark:text-slate-300">
                  👑 หัวหน้างาน / ผู้ตรวจสอบ (Supervisor)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="ชื่อหัวหน้างาน"
                    value={formData.sup_name}
                    onChange={(e) => setFormData({ ...formData, sup_name: e.target.value })}
                    className="input"
                  />
                  <input
                    type="date"
                    value={formData.sup_date}
                    onChange={(e) => setFormData({ ...formData, sup_date: e.target.value })}
                    className="input font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSubTab('history')}
                className="btn-outline px-4"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-6"
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>{editingId ? 'บันทึกการแก้ไข' : 'บันทึกใบบันทึกเช็คศูนย์'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: 1. VIEW RECORD DETAILS ────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {viewRecord && (
        <Modal
          open={!!viewRecord}
          onClose={() => setViewRecord(null)}
          title={`รายละเอียดใบบันทึก ${viewRecord.doc_no} (M/C: ${viewRecord.mc})`}
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-400 font-semibold">เลขที่เอกสาร:</span>
                <div className="font-mono font-bold text-blue-600">{viewRecord.doc_no}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">วันที่ตรวจ:</span>
                <div className="font-semibold">{viewRecord.doc_date}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">ประเภทเครื่อง:</span>
                <div>
                  <span className="badge badge-blue font-bold">{viewRecord.type} Jersey</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">ผลรวมการตรวจ:</span>
                <div>
                  <span className={`badge ${viewRecord.status === 'ผ่าน' ? 'badge-green' : 'badge-red'}`}>
                    {viewRecord.status === 'ผ่าน' ? '✅ ผ่านมาตรฐาน' : '❌ ไม่ผ่าน'}
                  </span>
                </div>
              </div>
            </div>

            {/* Counter info */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-800 dark:text-teal-300">
              <div>
                <span className="text-slate-500 text-[10px]">Counter ล่าสุด:</span>
                <div className="font-mono font-bold">{Number(viewRecord.counter_latest || 0).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Counter ครั้งก่อน:</span>
                <div className="font-mono">{Number(viewRecord.counter_prev || 0).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">ผลต่างรอบ:</span>
                <div className="font-mono font-bold text-teal-600">+{Number(viewRecord.counter_total || 0).toLocaleString()} รอบ</div>
              </div>
            </div>

            {/* 10 Items List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                    <th className="py-2 px-3 text-center w-10">ข้อ</th>
                    <th className="py-2 px-3 text-left">รายการตรวจ</th>
                    <th className="py-2 px-3 text-center">มาตรฐาน</th>
                    <th className="py-2 px-3 text-center">ก่อนทำ</th>
                    <th className="py-2 px-3 text-center">หลังทำ</th>
                    <th className="py-2 px-3 text-center">ผล</th>
                    <th className="py-2 px-3 text-left">ข้อสังเกต</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(viewRecord.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 text-center font-bold text-slate-400">{it.no || idx + 1}</td>
                      <td className="py-2 px-3 font-semibold">{it.item}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-500">{it.std || '—'}</td>
                      <td className="py-2 px-3 text-center font-mono">{it.val_before || '—'}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-blue-600">{it.val_after || '—'}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`badge ${it.result === 'ผ่าน' ? 'badge-green' : 'badge-red'}`}>
                          {it.result}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500">{it.remark || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Needle & Photos */}
            {viewRecord.needle_images?.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">รูปถ่ายสภาพเข็ม:</span>
                <div className="grid grid-cols-3 gap-2">
                  {viewRecord.needle_images.map((img, i) => (
                    <img key={i} src={img} alt="Needle" className="rounded-xl border border-slate-200 aspect-video object-cover" />
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewRecord(null)}
                className="btn-outline"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrintRecord(viewRecord)
                  setViewRecord(null)
                }}
                className="btn-primary"
              >
                <Printer size={14} />
                <span>พิมพ์เอกสาร A4</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: 2. PRINT A4 SHEET (PDF PREVIEW MODAL) ──────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {printRecord && (
        <PdfPreviewModal
          open={!!printRecord}
          onClose={() => setPrintRecord(null)}
          {...generateCenterCheckPdfProps(printRecord)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: 3. SQL SCHEMA SCRIPT MODAL ─────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {sqlModalOpen && (
        <Modal
          open={sqlModalOpen}
          onClose={() => setSqlModalOpen(false)}
          title="คำสั่ง SQL สร้างตารางในฐานข้อมูล Supabase"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-200 text-xs leading-relaxed">
              💡 คัดลอกคำสั่ง SQL ด้านล่างนี้ แล้วนำไปวางใน <b>Supabase Dashboard &gt; SQL Editor</b> แล้วกด <b>Run</b> เพื่อสร้างตาราง <code>center_checks</code> และ <code>checklist_configs</code> บนคลาวด์
            </div>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-[300px] border border-slate-700 select-all leading-relaxed">
{`-- สร้างตาราง center_checks
CREATE TABLE IF NOT EXISTS public.center_checks (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  timestamp text DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  type text NOT NULL DEFAULT 'Single',
  doc_no text NOT NULL UNIQUE,
  doc_date text DEFAULT to_char(current_date, 'YYYY-MM-DD'),
  mechanic text,
  mc text NOT NULL,
  serial text,
  needle_cond text,
  needle_arr text,
  needle_images jsonb DEFAULT '[]'::jsonb,
  comment text,
  counter_latest numeric DEFAULT 0,
  counter_prev numeric DEFAULT 0,
  counter_total numeric DEFAULT 0,
  prev_doc_date text,
  days_since_last integer DEFAULT 0,
  items jsonb DEFAULT '[]'::jsonb,
  remark text,
  sign_name text,
  sign_date text,
  sup_name text,
  sup_date text,
  status text DEFAULT 'ผ่าน'
);

ALTER TABLE public.center_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for center_checks" ON public.center_checks;
CREATE POLICY "Allow all operations for center_checks" ON public.center_checks FOR ALL USING (true) WITH CHECK (true);`}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSqlModalOpen(false)}
                className="btn-outline"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => {
                  const sqlText = `-- สร้างตาราง center_checks
CREATE TABLE IF NOT EXISTS public.center_checks (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  timestamp text DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  type text NOT NULL DEFAULT 'Single',
  doc_no text NOT NULL UNIQUE,
  doc_date text DEFAULT to_char(current_date, 'YYYY-MM-DD'),
  mechanic text,
  mc text NOT NULL,
  serial text,
  needle_cond text,
  needle_arr text,
  needle_images jsonb DEFAULT '[]'::jsonb,
  comment text,
  counter_latest numeric DEFAULT 0,
  counter_prev numeric DEFAULT 0,
  counter_total numeric DEFAULT 0,
  prev_doc_date text,
  days_since_last integer DEFAULT 0,
  items jsonb DEFAULT '[]'::jsonb,
  remark text,
  sign_name text,
  sign_date text,
  sup_name text,
  sup_date text,
  status text DEFAULT 'ผ่าน'
);

ALTER TABLE public.center_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for center_checks" ON public.center_checks;
CREATE POLICY "Allow all operations for center_checks" ON public.center_checks FOR ALL USING (true) WITH CHECK (true);`
                  navigator.clipboard.writeText(sqlText)
                  toast.success('คัดลอกคำสั่ง SQL แล้ว!', 'นำไปวางใน Supabase Dashboard > SQL Editor')
                }}
                className="btn-primary"
              >
                <Check size={14} />
                <span>คัดลอกคำสั่ง SQL</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
