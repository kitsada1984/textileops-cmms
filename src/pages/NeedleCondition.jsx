import { useEffect, useMemo, useRef, useState } from 'react'
import {
  QrCode,
  Camera,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  ExternalLink,
  Upload,
  Check,
  X,
  Sparkles,
  Layers,
  Disc,
  History,
  FileSpreadsheet,
  Image as ImageIcon,
  Eye,
  SwitchCamera,
  Flame,
  Wrench,
  ChevronRight,
  Info,
} from 'lucide-react'
import jsQR from 'jsqr'
import { format } from 'date-fns'
import {
  CylinderAPI,
  MachineAPI,
  NeedleConditionAPI,
  NEEDLE_STATUSES,
  AuditLogAPI,
} from '../api/entities'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { useT } from '../contexts/LanguageContext'
import usePagePerms from '../hooks/usePagePerms'
import DetailDrawer from '../components/ui/DetailDrawer'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import FilterSortPanel, { INIT_FS } from '../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../components/ui/GoogleSheetSyncButton'
import ImageThumbnail from '../components/ui/ImageThumbnail'
import ImagePreviewModal from '../components/ui/ImagePreviewModal'
import { applyFilterSort } from '../utils/filterSort'
import { uploadImageToGoogleDrive } from '../utils/googleDriveUpload'
import { getDirectImageUrl } from '../utils/imageUrlUtils'

const NEEDLE_IMAGE_FOLDER = 'สภาพเข็ม'

const normalizeSerial = (val = '') =>
  String(val || '').toUpperCase().replace(/\s+/g, '').trim()

const normalizeMachine = (val = '') =>
  String(val || '').toUpperCase().replace(/\s+/g, '').replace(/-/g, '').trim()

export default function NeedleCondition() {
  const { t } = useT()
  const { user } = useAuth()
  const toast = useToast()
  const { canAdd, canEdit, canDelete } = usePagePerms('pm')

  const [records, setRecords] = useState([])
  const [cylinders, setCylinders] = useState([])
  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [filterSort, setFilterSort] = useState(INIT_FS)
  const [selectedType, setSelectedType] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')

  // Modals & Drawers
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [historyDrawerItem, setHistoryDrawerItem] = useState(null)
  const [detailItem, setDetailItem] = useState(null)
  const [previewImageModal, setPreviewImageModal] = useState(null) // { url, title }

  // Form State
  const initialForm = {
    id: null,
    serial: '',
    machine_mc: '',
    location: '',
    type: 'Single Jersey',
    doc_date: format(new Date(), 'yyyy-MM-dd'),
    counter: '',
    status: 'NORMAL',
    needle_condition: '',
    remark: '',
    images: [],
    inspector: user?.full_name || user?.username || 'ช่างประจำกะ',
  }
  const [formData, setFormData] = useState(initialForm)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)

  // Scanner Video & Stream State
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const animationFrameRef = useRef(null)
  const [facingMode, setFacingMode] = useState('environment') // 'environment' or 'user'
  const [cameraError, setCameraError] = useState('')
  const [scanning, setScanning] = useState(false)

  // Load all initial data
  const loadData = async () => {
    setLoading(true)
    try {
      const [ncData, cylData, mcData] = await Promise.allSettled([
        NeedleConditionAPI.list(),
        CylinderAPI.list(),
        MachineAPI.list(),
      ])

      const list = ncData.status === 'fulfilled' ? (ncData.value || []) : []
      const cyls = cylData.status === 'fulfilled' ? (cylData.value?.data || cylData.value || []) : []
      const mcs = mcData.status === 'fulfilled' ? (mcData.value?.data || mcData.value || []) : []

      setRecords(list)
      setCylinders(cyls)
      setMachines(mcs)
    } catch (e) {
      toast.error('โหลดข้อมูลสภาพเข็มไม่สำเร็จ', e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Fast Cylinder lookup map by Serial & Machine
  const cylinderMap = useMemo(() => {
    const map = new Map()
    cylinders.forEach((cyl) => {
      const sOld = normalizeSerial(cyl.Serial_OLD)
      const sNow = normalizeSerial(cyl.Serial_NOW)
      const mc = normalizeMachine(cyl.NewMC || cyl.Standard || cyl.Machine_Ref)
      if (sOld) map.set(sOld, cyl)
      if (sNow) map.set(sNow, cyl)
      if (mc && !map.has(mc)) map.set(mc, cyl)
    })
    return map
  }, [cylinders])

  // Group inspections to get the LATEST state per Serial/Cylinder
  // "เมื่อมีการเพิ่มข้อมูลเข้าไปใหม่ ให้แทนที่ด้วยข้อมูลล่าสุด"
  const { latestRecords, historyMap } = useMemo(() => {
    const history = new Map()
    const latest = new Map()

    // Sort all records by doc_date / created_at descending
    const sorted = [...records].sort((a, b) => {
      const dateA = new Date(a.doc_date || a.created_at || 0).getTime()
      const dateB = new Date(b.doc_date || b.created_at || 0).getTime()
      return dateB - dateA
    })

    sorted.forEach((rec) => {
      const key = normalizeSerial(rec.serial) || normalizeMachine(rec.machine_mc) || rec.id
      if (!history.has(key)) {
        history.set(key, [])
      }
      history.get(key).push(rec)

      // Only set latest once (first one encountered since sorted descending)
      if (!latest.has(key)) {
        latest.set(key, rec)
      }
    })

    return {
      latestRecords: Array.from(latest.values()),
      historyMap: history,
    }
  }, [records])

  // KPI Summary Counts
  const stats = useMemo(() => {
    const total = latestRecords.length
    const normal = latestRecords.filter((r) => r.status === 'NORMAL').length
    const watch = latestRecords.filter((r) => r.status === 'WATCH' || r.status === 'WORN').length
    const broken = latestRecords.filter((r) => r.status === 'BROKEN').length
    const replaced = latestRecords.filter((r) => r.status === 'REPLACED').length

    return { total, normal, watch, broken, replaced }
  }, [latestRecords])

  // Filtered & Searched Rows
  const filteredRows = useMemo(() => {
    return latestRecords.filter((r) => {
      // Type filter
      if (selectedType !== 'ALL') {
        const typeStr = String(r.type || '').toLowerCase()
        if (selectedType === 'Single' && !typeStr.includes('single') && typeStr !== 's') return false
        if (selectedType === 'Double' && !typeStr.includes('double') && typeStr !== 'd') return false
        if (selectedType === 'Jac' && !typeStr.includes('jac')) return false
      }

      // Status filter
      if (selectedStatus !== 'ALL' && r.status !== selectedStatus) {
        return false
      }

      // Search term
      if (search.trim()) {
        const term = search.toLowerCase()
        const match = [
          r.serial,
          r.machine_mc,
          r.location,
          r.type,
          r.counter,
          r.status,
          r.needle_condition,
          r.remark,
          r.inspector,
        ].some((v) => String(v || '').toLowerCase().includes(term))
        if (!match) return false
      }

      return true
    })
  }, [latestRecords, selectedType, selectedStatus, search])

  // Columns for Table & FilterSort
  const cols = useMemo(() => [
    { field: 'serial', label: 'ซีเรียล (Serial)', type: 'text', width: '130px' },
    { field: 'machine_mc', label: 'เครื่อง (MC)', type: 'text', width: '120px' },
    { field: 'location', label: 'ตำแหน่ง', type: 'text', width: '120px' },
    { field: 'type', label: 'ประเภท', type: 'text', width: '130px' },
    { field: 'counter', label: 'Counter ล่าสุด', type: 'number', width: '130px' },
    { field: 'status', label: 'สภาพเข็ม', type: 'select', width: '150px' },
    { field: 'images', label: 'รูปภาพ', type: 'text', width: '120px' },
    { field: 'doc_date', label: 'วันที่ตรวจล่าสุด', type: 'date', width: '130px' },
    { field: 'inspector', label: 'ผู้ตรวจ', type: 'text', width: '130px' },
    { field: 'needle_condition', label: 'รายละเอียดสภาพเข็ม', type: 'text', width: '180px' },
  ], [])

  const displayRows = useMemo(
    () => applyFilterSort(filteredRows, cols, filterSort),
    [filteredRows, cols, filterSort]
  )

  // Auto-populate when Serial is selected/scanned
  const populateFromSerial = (inputSerial) => {
    const raw = String(inputSerial || '').trim()
    if (!raw) return

    // Clean any URL scheme if scanned from QR URL (e.g. https://.../repair/SN-1234)
    let cleanCode = raw
    if (raw.includes('/repair/')) {
      const parts = raw.split('/repair/')
      cleanCode = decodeURIComponent(parts[1]?.split('?')[0] || raw)
    }

    const key = normalizeSerial(cleanCode) || normalizeMachine(cleanCode)
    const cyl = cylinderMap.get(key)
    const mcObj = machines.find((m) => normalizeMachine(m.Mc || m.Machine_MC || m.name) === key)

    // Lookup existing needle condition to get previous counter
    const prevCondition = latestRecords.find((r) => normalizeSerial(r.serial) === key)

    const serialOld = cyl?.Serial_OLD || cyl?.Serial_NOW || cleanCode
    const machineMc = cyl?.NewMC || cyl?.Standard || mcObj?.Mc || mcObj?.Machine_MC || ''
    const location = cyl?.Location || mcObj?.Location || 'In-use'
    const type = cyl?.Type || mcObj?.Type || 'Single Jersey'

    setFormData((prev) => ({
      ...prev,
      serial: serialOld,
      machine_mc: machineMc,
      location: location,
      type: type,
      doc_date: format(new Date(), 'yyyy-MM-dd'),
      inspector: user?.full_name || user?.username || 'ช่างประจำกะ',
      counter: prevCondition?.counter ? String(prevCondition.counter) : prev.counter,
    }))

    toast.success(
      'ดึงข้อมูลอัตโนมัติสำเร็จ',
      `ซีเรียล: ${serialOld} · เครื่อง: ${machineMc || '—'} · ตำแหน่ง: ${location}`
    )
  }

  // ── QR CAMERA SCANNER LOGIC ──────────────────────────────
  const startCamera = async (mode = facingMode) => {
    setCameraError('')
    setScanning(true)
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', true)
        videoRef.current.play()
        requestAnimationFrame(tickScan)
      }
    } catch (err) {
      console.error('Camera access error:', err)
      setCameraError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้อง หรือเลือกไฟล์รูป QR แทน')
      setScanning(false)
    }
  }

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  const tickScan = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })

        if (code && code.data) {
          // Success! Found QR code
          try {
            if (navigator.vibrate) navigator.vibrate(100)
          } catch {}

          stopCamera()
          setScannerOpen(false)
          populateFromSerial(code.data)
          setFormModalOpen(true)
          return
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tickScan)
  }

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    startCamera(nextMode)
  }

  // Scan QR code from uploaded image file
  const handleQrImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imgData.data, imgData.width, imgData.height)

        if (code && code.data) {
          setScannerOpen(false)
          populateFromSerial(code.data)
          setFormModalOpen(true)
        } else {
          toast.warning('ไม่พบ QR Code ในรูปภาพ', 'กรุณาลองเลือกรูปที่ชัดเจนกว่านี้')
        }
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  // Handle Photo upload for Needle Condition
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setUploadingImage(true)
    try {
      const newUrls = []
      for (const file of files) {
        try {
          const res = await uploadImageToGoogleDrive(file, { folderName: NEEDLE_IMAGE_FOLDER })
          const imgUrl = res?.imageUrl || res?.url
          if (imgUrl) {
            newUrls.push(imgUrl)
          } else {
            const dataUrl = await readFileAsDataUrl(file)
            newUrls.push(dataUrl)
          }
        } catch {
          const dataUrl = await readFileAsDataUrl(file)
          newUrls.push(dataUrl)
        }
      }

      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...newUrls],
      }))
      toast.success('อัปโหลดรูปสำเร็จ', `เพิ่ม ${newUrls.length} รูป (โฟลเดอร์: ${NEEDLE_IMAGE_FOLDER})`)
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

  const removePhoto = (idx) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }))
  }

  // Save / Submit Inspection Record
  const handleSubmitForm = async (e) => {
    e.preventDefault()
    if (!formData.serial && !formData.machine_mc) {
      return toast.warning('กรุณาระบุข้อมูล', 'กรุณาระบุซีเรียล หรือรหัสเครื่องจักร')
    }

    setSaving(true)
    try {
      const payload = {
        serial: formData.serial,
        machine_mc: formData.machine_mc,
        location: formData.location,
        type: formData.type,
        doc_date: formData.doc_date || format(new Date(), 'yyyy-MM-dd'),
        counter: Number(formData.counter) || 0,
        status: formData.status || 'NORMAL',
        needle_condition: formData.needle_condition || '',
        remark: formData.remark || '',
        images: formData.images || [],
        inspector: formData.inspector || user?.full_name || user?.username || 'ช่างประจำกะ',
      }

      if (formData.id) {
        await NeedleConditionAPI.update(formData.id, payload)
        toast.success('แก้ไขข้อมูลสภาพเข็มสำเร็จ')
      } else {
        await NeedleConditionAPI.create(payload)
        toast.success('บันทึกข้อมูลสภาพเข็มสำเร็จ', `อัปเดตสถานะล่าสุดของ ${payload.serial || payload.machine_mc} เรียบร้อย`)
      }

      // Log in AuditLog
      try {
        await AuditLogAPI.create({
          Module: 'PM_NEEDLE',
          ActionType: formData.id ? 'UPDATE' : 'CREATE',
          RecordID: payload.serial || payload.machine_mc,
          FieldName: 'NeedleCondition',
          NewValue: JSON.stringify(payload),
          User: user?.full_name || user?.username || 'system',
          Comment: `บันทึกสภาพเข็ม: ${payload.serial} (Counter: ${payload.counter}, สถานะ: ${payload.status})`,
        })
      } catch {}

      setFormModalOpen(false)
      setFormData(initialForm)
      await loadData()
    } catch (err) {
      toast.error('บันทึกข้อมูลไม่สำเร็จ', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setFormData({
      id: item.id,
      serial: item.serial || '',
      machine_mc: item.machine_mc || '',
      location: item.location || '',
      type: item.type || 'Single Jersey',
      doc_date: item.doc_date || format(new Date(), 'yyyy-MM-dd'),
      counter: item.counter ? String(item.counter) : '',
      status: item.status || 'NORMAL',
      needle_condition: item.needle_condition || '',
      remark: item.remark || '',
      images: Array.isArray(item.images) ? item.images : (item.images ? [item.images] : []),
      inspector: item.inspector || user?.full_name || user?.username || 'ช่างประจำกะ',
    })
    setFormModalOpen(true)
  }

  const handleDelete = async (id, serial) => {
    if (!confirm(`ต้องการลบรายการสภาพเข็มของ "${serial || 'รายการนี้'}" หรือไม่?`)) return
    try {
      await NeedleConditionAPI.delete(id)
      toast.success('ลบข้อมูลสภาพเข็มสำเร็จ')
      await loadData()
    } catch (err) {
      toast.error('ลบข้อมูลไม่สำเร็จ', err.message)
    }
  }

  // Open Scanner Modal
  const openQrScanner = () => {
    setScannerOpen(true)
    setTimeout(() => {
      startCamera('environment')
    }, 200)
  }

  const closeQrScanner = () => {
    stopCamera()
    setScannerOpen(false)
  }

  // Helper for Status Badge
  const renderStatusBadge = (statusValue) => {
    const config = NEEDLE_STATUSES.find((s) => s.value === statusValue) || {
      label: statusValue || 'ปกติ',
      bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${config.bg}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span>{config.label}</span>
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── TOP KPI STATS SUMMARY ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Inspected */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers size={13} className="text-blue-500" />
              <span>ตรวจสภาพเข็มแล้ว</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {stats.total} <span className="text-xs font-semibold text-slate-500">กระบอก</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Sparkles size={18} />
          </div>
        </div>

        {/* Normal */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              <span>ปกติ (Normal)</span>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.normal} <span className="text-xs font-semibold text-slate-500">กระบอก</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Check size={18} strokeWidth={2.5} />
          </div>
        </div>

        {/* Watch / Worn */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle size={13} />
              <span>เฝ้าระวัง / สึกหรอ</span>
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats.watch} <span className="text-xs font-semibold text-slate-500">กระบอก</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Clock size={18} />
          </div>
        </div>

        {/* Broken */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertOctagon size={13} />
              <span>เข็มหัก / ชำรุด</span>
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {stats.broken} <span className="text-xs font-semibold text-slate-500">กระบอก</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <Flame size={18} />
          </div>
        </div>
      </div>

      {/* ── TOOLBAR & ACTIONS ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="ค้นหา Serial, เครื่อง MC, ตำแหน่ง, ช่างผู้ตรวจ..."
            className="w-full sm:w-80"
          />

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="select text-xs font-semibold py-2 px-3 min-w-[130px]"
          >
            <option value="ALL">ทุกประเภทเครื่อง</option>
            <option value="Single">🔵 Single Jersey</option>
            <option value="Double">🟢 Double Jersey</option>
            <option value="Jac">✨ Jacquard</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="select text-xs font-semibold py-2 px-3 min-w-[130px]"
          >
            <option value="ALL">ทุกสภาพเข็ม</option>
            {NEEDLE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <GoogleSheetSyncButton
            sheetName="สภาพเข็ม"
            columns={cols}
            rows={displayRows}
            valueGetters={{
              images: (r) => (Array.isArray(r.images) ? r.images.join(', ') : r.images || ''),
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canAdd && (
            <>
              {/* QR Scanner Trigger */}
              <button
                type="button"
                onClick={openQrScanner}
                className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                title="เปิดกล้องสแกน QR Code ตัวกระบอก/เครื่องจักร"
              >
                <QrCode size={15} />
                <span>สแกน QR บันทึกสภาพเข็ม</span>
              </button>

              {/* Manual Form Trigger */}
              <button
                type="button"
                onClick={() => {
                  setFormData(initialForm)
                  setFormModalOpen(true)
                }}
                className="btn-outline text-xs px-3 py-2 flex items-center gap-1.5 font-bold"
                title="กรอกบันทึกสภาพเข็มด้วยตัวเอง"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">เพิ่มข้อมูล</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── DATA TABLE: LATEST INSPECTION PER CYLINDER ────────────── */}
      <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5 text-left whitespace-nowrap">ซีเรียล (Serial)</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">เครื่อง (MC)</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">ตำแหน่ง</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">ประเภท</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Counter ล่าสุด</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">สภาพเข็ม</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">รูปถ่าย</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">วันที่ตรวจล่าสุด</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">ผู้ตรวจ</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-28">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-50" />
                    <span>กำลังโหลดข้อมูลสภาพเข็ม...</span>
                  </td>
                </tr>
              )}
              {!loading && displayRows.map((row, idx) => {
                const key = normalizeSerial(row.serial) || normalizeMachine(row.machine_mc) || row.id
                const historyList = historyMap.get(key) || []
                const imagesList = Array.isArray(row.images) ? row.images : (row.images ? [row.images] : [])
                const firstImage = imagesList[0] || ''

                return (
                  <tr
                    key={row.id || idx}
                    onClick={() => setDetailItem(row)}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    {/* Serial */}
                    <td className="py-2.5 px-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {row.serial || '—'}
                    </td>

                    {/* Machine MC */}
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {row.machine_mc || '—'}
                    </td>

                    {/* Location */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-xs">
                        {row.location || '—'}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {row.type || 'Single Jersey'}
                      </span>
                    </td>

                    {/* Counter */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                      {row.counter ? Number(row.counter).toLocaleString() : '—'}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {renderStatusBadge(row.status)}
                    </td>

                    {/* Images thumbnail via standard ImageThumbnail component */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {firstImage ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <ImageThumbnail
                            url={firstImage}
                            alt={`สภาพเข็ม ${row.serial || row.machine_mc || ''}`}
                            size={32}
                            showLabel={true}
                            onClick={() =>
                              setPreviewImageModal({
                                url: firstImage,
                                title: `สภาพเข็ม: ${row.serial || row.machine_mc || ''} (Counter: ${row.counter ? Number(row.counter).toLocaleString() : '—'})`,
                              })
                            }
                          />
                          {imagesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setHistoryDrawerItem({ key, serial: row.serial, list: historyList })}
                              className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:scale-105 transition-transform"
                              title="ดูรูปทั้งหมด"
                            >
                              +{imagesList.length - 1}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 font-mono text-center block">—</span>
                      )}
                    </td>

                    {/* Last Inspection Date */}
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {row.doc_date ? format(new Date(row.doc_date), 'dd/MM/yyyy') : '—'}
                    </td>

                    {/* Inspector */}
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {row.inspector || '—'}
                    </td>

                    {/* Action buttons */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {/* History button */}
                        <button
                          type="button"
                          onClick={() => setHistoryDrawerItem({ key, serial: row.serial, list: historyList })}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="ดูประวัติการตรวจสภาพเข็มย้อนหลัง"
                        >
                          <History size={13} />
                        </button>

                        {/* Edit */}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                            title="แก้ไขข้อมูลสภาพเข็ม"
                          >
                            <Pencil size={13} />
                          </button>
                        )}

                        {/* Delete */}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id, row.serial)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="ลบข้อมูลสภาพเข็ม"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!loading && !displayRows.length && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <Sparkles size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">ยังไม่มีข้อมูลสภาพเข็ม</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">
                      กดปุ่ม "สแกน QR บันทึกสภาพเข็ม" เพื่อเริ่มบันทึกรายการแรก
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL 1: LIVE QR CAMERA SCANNER ───────────────────────── */}
      <Modal
        open={scannerOpen}
        onClose={closeQrScanner}
        title="สแกน QR Code บนตัวกระบอก / เครื่องจักร"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
                title="สลับกล้องหน้า/หลัง"
              >
                <SwitchCamera size={13} />
                <span>สลับกล้อง ({facingMode === 'environment' ? 'หลัง' : 'หน้า'})</span>
              </button>
            </div>
            <button type="button" className="btn-outline px-4" onClick={closeQrScanner}>
              ปิด
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {cameraError ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 space-y-2 text-center">
              <AlertTriangle size={28} className="mx-auto" />
              <p className="font-bold">{cameraError}</p>
              <p className="text-[11px]">หรือเลือกอัปโหลดรูปภาพ QR Code ด้านล่างนี้แทน</p>
            </div>
          ) : (
            <div className="relative w-full aspect-square sm:aspect-video max-h-[320px] rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder overlay box */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-dashed border-blue-400 rounded-3xl relative animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-blue-500" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-blue-500" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-blue-500" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-blue-500" />
                </div>
              </div>

              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className="px-3 py-1 rounded-full bg-slate-900/80 text-white font-semibold text-[11px] backdrop-blur-md">
                  ส่องกล้องไปที่ QR Code บนกระบอก
                </span>
              </div>
            </div>
          )}

          {/* Upload QR file fallback */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode size={18} className="text-blue-600" />
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">เลือกรูป QR จากแกลเลอรี</div>
                <div className="text-[11px] text-slate-500">กรณีไม่สะดวกเปิดกล้องถ่ายสด</div>
              </div>
            </div>
            <label className="btn-primary text-xs py-1.5 px-3 cursor-pointer">
              <span>เลือกไฟล์รูป QR</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleQrImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 2: ADD / EDIT NEEDLE INSPECTION FORM ─────────────── */}
      <Modal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={formData.id ? 'แก้ไขข้อมูลสภาพเข็ม' : 'บันทึกสภาพเข็ม (Needle Inspection)'}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              className="btn-outline px-4"
              onClick={() => setFormModalOpen(false)}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="btn-primary px-5"
              onClick={handleSubmitForm}
              disabled={saving || uploadingImage}
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>{formData.id ? 'บันทึกการแก้ไข' : 'ยืนยันบันทึกข้อมูลล่าสุด'}</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
          {/* Quick Select Autocomplete / Scan Hint */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-blue-600 flex-shrink-0" />
              <span>พิมพ์หรือเลือกซีเรียลเดิม/เครื่องเพื่อดึงข้อมูลกระบอกอัตโนมัติ</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormModalOpen(false)
                openQrScanner()
              }}
              className="btn-outline text-[11px] py-1 px-2 flex items-center gap-1 font-bold flex-shrink-0"
            >
              <QrCode size={12} />
              <span>สแกน QR ใหม่</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Serial */}
            <div className="sm:col-span-2">
              <label className="label font-bold">ซีเรียลกระบอก (Serial) *</label>
              <input
                type="text"
                list="needle-serial-datalist"
                value={formData.serial}
                onChange={(e) => {
                  setFormData({ ...formData, serial: e.target.value })
                  populateFromSerial(e.target.value)
                }}
                placeholder="เช่น SN-2024-001 หรือเลือกจากลิสต์"
                className="input font-mono font-bold text-blue-600 dark:text-blue-400"
                required
              />
              <datalist id="needle-serial-datalist">
                {cylinders.map((cyl, i) => (
                  <option
                    key={i}
                    value={cyl.Serial_OLD || cyl.Serial_NOW}
                    label={`${cyl.NewMC || cyl.Standard || ''} (${cyl.Type || ''})`}
                  />
                ))}
              </datalist>
            </div>

            {/* Machine MC */}
            <div>
              <label className="label font-bold">เครื่องจักร (MC)</label>
              <input
                type="text"
                list="needle-machine-datalist"
                value={formData.machine_mc}
                onChange={(e) => setFormData({ ...formData, machine_mc: e.target.value })}
                placeholder="เช่น MC-01"
                className="input font-bold"
              />
              <datalist id="needle-machine-datalist">
                {machines.map((m, i) => (
                  <option key={i} value={m.Mc || m.Machine_MC || m.name} />
                ))}
              </datalist>
            </div>

            {/* Location */}
            <div>
              <label className="label font-bold">ตำแหน่ง (Location)</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="เช่น In-use, คลัง"
                className="input"
              />
            </div>

            {/* Type */}
            <div>
              <label className="label font-bold">ประเภทเครื่อง / กระบอก</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="select"
              >
                <option value="Single Jersey">Single Jersey (S)</option>
                <option value="Double Jersey">Double Jersey (D)</option>
                <option value="Jacquard">Jacquard (Jac.)</option>
                <option value="Interlock">Interlock</option>
                <option value="Rib">Rib</option>
              </select>
            </div>

            {/* Date (Auto today) */}
            <div>
              <label className="label font-bold">วันที่ตรวจ (อัตโนมัติ) *</label>
              <input
                type="date"
                value={formData.doc_date}
                onChange={(e) => setFormData({ ...formData, doc_date: e.target.value })}
                className="input font-mono font-semibold"
                required
              />
            </div>

            {/* Counter */}
            <div>
              <label className="label font-bold text-teal-600 dark:text-teal-400">
                ตัวเลข Counter (รอบเครื่อง) *
              </label>
              <input
                type="number"
                min="0"
                value={formData.counter}
                onChange={(e) => setFormData({ ...formData, counter: e.target.value })}
                placeholder="เช่น 1540200"
                className="input font-mono font-black text-teal-600 dark:text-teal-400 text-sm"
                required
              />
            </div>

            {/* Status */}
            <div>
              <label className="label font-bold">สภาพเข็ม *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="select font-bold"
              >
                {NEEDLE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detailed Observations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label font-bold">รายละเอียดสภาพเข็ม / ข้อสังเกต</label>
              <input
                type="text"
                value={formData.needle_condition}
                onChange={(e) => setFormData({ ...formData, needle_condition: e.target.value })}
                placeholder="เช่น ลิ้นเข็มคลอนเล็กน้อย, เข็มคอดแถว 2, ปลายเข็มทู่"
                className="input"
              />
            </div>

            <div>
              <label className="label font-bold">ผู้ตรวจ / ช่างผู้บันทึก</label>
              <input
                type="text"
                value={formData.inspector}
                onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                placeholder="ชื่อช่างผู้ตรวจ"
                className="input"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label font-bold">หมายเหตุเพิ่มเติม</label>
              <textarea
                rows={2}
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="ข้อคิดเห็นหรือข้อความแจ้งเตือนเพิ่มเติม"
                className="input"
              />
            </div>
          </div>

          {/* Photo upload section */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Camera size={14} className="text-blue-500" />
                <span>รูปถ่ายสภาพเข็ม / ร่องเข็ม ({formData.images?.length || 0} รูป)</span>
              </div>

              <label className="btn-primary text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1.5">
                {uploadingImage ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>กำลังอัปโหลด...</span>
                  </>
                ) : (
                  <>
                    <Upload size={13} />
                    <span>ถ่ายรูป / แนบไฟล์</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingImage}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Photo thumbnails list with Google Drive direct preview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 min-h-[80px]">
              {(formData.images || []).length === 0 ? (
                <div className="col-span-2 sm:col-span-4 flex flex-col items-center justify-center py-6 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                  <ImageIcon size={24} className="opacity-40 mb-1" />
                  <span className="text-[11px]">ยังไม่มีรูปถ่ายสภาพเข็มแนบ</span>
                </div>
              ) : (
                formData.images.map((imgUrl, imgIdx) => (
                  <div
                    key={imgIdx}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video bg-slate-100 dark:bg-slate-800"
                  >
                    <img
                      src={getDirectImageUrl(imgUrl, 'w400')}
                      alt={`Needle condition ${imgIdx}`}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() =>
                        setPreviewImageModal({
                          url: imgUrl,
                          title: `รูปถ่ายสภาพเข็ม (${imgIdx + 1})`,
                        })
                      }
                      onError={(e) => {
                        e.currentTarget.src = imgUrl
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(imgIdx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="ลบรูปนี้"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 3: HISTORY TIMELINE DRAWER ──────────────────────── */}
      <Modal
        open={!!historyDrawerItem}
        onClose={() => setHistoryDrawerItem(null)}
        title={`ประวัติการตรวจสภาพเข็มย้อนหลัง (${historyDrawerItem?.serial || '—'})`}
        size="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="text-slate-500">
            แสดงประวัติการบันทึกสภาพเข็มและการเปลี่ยนแปลงรอบ Counter ทั้งหมดของกระบอกนี้
          </div>

          <div className="space-y-3">
            {(historyDrawerItem?.list || []).map((hRec, hIdx) => {
              const hImages = Array.isArray(hRec.images) ? hRec.images : (hRec.images ? [hRec.images] : [])
              return (
                <div
                  key={hRec.id || hIdx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-600">
                        {hRec.doc_date ? format(new Date(hRec.doc_date), 'dd/MM/yyyy') : '—'}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        เครื่อง: {hRec.machine_mc || '—'}
                      </span>
                    </div>
                    <div>{renderStatusBadge(hRec.status)}</div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-slate-400 text-[10px]">Counter:</span>
                      <div className="font-mono font-bold text-teal-600">
                        {hRec.counter ? Number(hRec.counter).toLocaleString() : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">ตำแหน่ง:</span>
                      <div className="font-semibold">{hRec.location || '—'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">ผู้ตรวจ:</span>
                      <div className="font-semibold">{hRec.inspector || '—'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">ข้อสังเกต:</span>
                      <div className="truncate">{hRec.needle_condition || hRec.remark || '—'}</div>
                    </div>
                  </div>

                  {/* Photos in history via ImageThumbnail */}
                  {hImages.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {hImages.map((img, i) => (
                        <ImageThumbnail
                          key={i}
                          url={img}
                          alt="History photo"
                          size={44}
                          onClick={() =>
                            setPreviewImageModal({
                              url: img,
                              title: `ประวัติสภาพเข็ม: ${historyDrawerItem.serial} (${format(new Date(hRec.doc_date || Date.now()), 'dd/MM/yyyy')})`,
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Modal>

      {/* ── DETAIL DRAWER FOR SINGLE NEEDLE RECORD ────────────────── */}
      {detailItem && (
        <DetailDrawer
          open={!!detailItem}
          onClose={() => setDetailItem(null)}
          title={`สภาพเข็ม: ${detailItem.serial || detailItem.machine_mc || '—'}`}
          subtitle={`เครื่อง: ${detailItem.machine_mc || '—'} · ตำแหน่ง: ${detailItem.location || '—'}`}
          icon={Sparkles}
          accentColor="#2563eb"
          badge={renderStatusBadge(detailItem.status)}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => {
            handleEdit(detailItem)
            setDetailItem(null)
          }}
          onDelete={() => {
            handleDelete(detailItem.id, detailItem.serial)
            setDetailItem(null)
          }}
          groups={[
            {
              label: 'ข้อมูลกระบอก & สภาพเข็มล่าสุด',
              fields: [
                { label: 'ซีเรียล (Serial)', value: detailItem.serial, mono: true },
                { label: 'เครื่องจักร (MC)', value: detailItem.machine_mc },
                { label: 'ตำแหน่ง (Location)', value: detailItem.location },
                { label: 'ประเภท (Type)', value: detailItem.type },
                { label: 'Counter ล่าสุด', value: detailItem.counter ? `${Number(detailItem.counter).toLocaleString()} รอบ` : '—', mono: true },
                { label: 'วันที่ตรวจล่าสุด', value: detailItem.doc_date ? format(new Date(detailItem.doc_date), 'dd/MM/yyyy') : '—', mono: true },
                { label: 'ช่างผู้ตรวจ', value: detailItem.inspector },
                { label: 'สถานะสภาพเข็ม', value: detailItem.status },
                ...((Array.isArray(detailItem.images) && detailItem.images.length > 0) ? [{
                  label: `รูปถ่ายสภาพเข็ม (${detailItem.images.length} รูป)`,
                  full: true,
                  node: (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {detailItem.images.map((img, idx) => (
                        <ImageThumbnail
                          key={idx}
                          url={img}
                          alt={`สภาพเข็ม ${detailItem.serial}`}
                          size={48}
                          onClick={() =>
                            setPreviewImageModal({
                              url: img,
                              title: `สภาพเข็ม: ${detailItem.serial}`,
                            })
                          }
                        />
                      ))}
                    </div>
                  ),
                }] : []),
              ].filter((f) => f && (f.node || f.value)),
            },
            {
              label: 'รายละเอียดและข้อสังเกต',
              single: true,
              fields: [
                { label: 'สภาพเข็ม / ข้อสังเกต', value: detailItem.needle_condition || '—', full: true },
                { label: 'หมายเหตุเพิ่มเติม', value: detailItem.remark || '—', full: true },
              ],
            },
          ]}
        />
      )}

      {/* ── STANDARD IMAGE PREVIEW MODAL (FULL SIZE & ZOOM) ────────── */}
      <ImagePreviewModal
        open={!!previewImageModal}
        onClose={() => setPreviewImageModal(null)}
        url={previewImageModal?.url}
        title={previewImageModal?.title || 'รูปถ่ายสภาพเข็ม'}
      />
    </div>
  )
}
