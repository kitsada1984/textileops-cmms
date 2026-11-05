import { useEffect, useMemo, useRef, useState } from 'react'
import {
  QrCode,
  Plus,
  Search,
  Sliders,
  AlertTriangle,
  ExternalLink,
  X,
  Disc,
  FileSpreadsheet,
  Printer,
  Eye,
  SwitchCamera,
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
} from '../../api/entities'
import { useAuth } from '../../contexts/AuthContext'
import { useRealtimeTables } from '../../api/realtimeSync'
import { useToast } from '../../components/ui/Toast'
import { useT } from '../../contexts/LanguageContext'
import usePagePerms from '../../hooks/usePagePerms'
import Modal from '../../components/ui/Modal'
import SearchInput from '../../components/ui/SearchInput'
import FilterSortPanel, { INIT_FS } from '../../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../../components/ui/GoogleSheetSyncButton'
import { applyFilterSort } from '../../utils/filterSort'
import { getDirectImageUrl, getImageFallbackUrls } from '../../utils/imageUrlUtils'
import { uploadMediaBatch, convertHeicDataUrlIfNeeded } from '../../modules/media'
import {
  buildCylinderInspectionSync,
  sortInspectionsNewestFirst,
  normalizeCylinderType,
  getCylinderTypeOptions,
} from '../../utils/needleConditionSync'
import { buildCounterFields, computeCounterDiff, normalizeCounter, pickPreviousWithCounter } from '../../utils/counterDiff'

import { NEEDLE_IMAGE_FOLDER, normalizeSerial, normalizeMachine } from './needleConditionParts.jsx'
import { NeedleConditionStats } from './needleConditionStats.jsx'
import { NeedleConditionTable } from './needleConditionTable.jsx'
import { NeedleConditionForm } from './needleConditionForm.jsx'
import { NeedleHistoryDrawer } from './needleHistoryDrawer.jsx'
import { NeedleDetailDrawer } from './needleDetailDrawer.jsx'
import { NeedleImageModal } from './needleImageModal.jsx'
import { NeedlePdfModal } from './needlePdfModal.jsx'

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
  const [pdfItem, setPdfItem] = useState(null)

  // Form State
  const initialForm = {
    id: null,
    serial: '',
    machine_mc: '',
    location: '',
    type: 'Single Jersey',
    doc_date: format(new Date(), 'yyyy-MM-dd'),
    counter: '',
    counter_prev: '',
    counter_prev_date: '',
    counter_diff: 0,
    status: 'สึกเล็กน้อย',
    custom_status: '',
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
  const loadData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
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
      if (!silent) toast.error('โหลดข้อมูลสภาพเข็มไม่สำเร็จ', e.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useRealtimeTables(['needle_conditions', 'cylinders', 'machines', 'appconfigs'], () => {
    loadData({ silent: true })
  })

  useEffect(() => {
    loadData()
  }, [])

  // Fast Cylinder lookup map by Serial & Machine
  const cylinderMap = useMemo(() => {
    const map = new Map()
    cylinders.forEach((cyl) => {
      const sOld = normalizeSerial(cyl.Serial_OLD)
      const sNow = normalizeSerial(cyl.Serial_NOW)
      const sId = cyl.id ? String(cyl.id).toUpperCase() : ''
      if (sOld) map.set(sOld, cyl)
      if (sNow) map.set(sNow, cyl)
      if (sId) map.set(sId, cyl)

      const mcNew = normalizeMachine(cyl.NewMC)
      const mcStd = normalizeMachine(cyl.Standard)
      const mcRef = normalizeMachine(cyl.Machine_Ref)
      if (mcNew && !map.has(mcNew)) map.set(mcNew, cyl)
      if (mcStd && !map.has(mcStd)) map.set(mcStd, cyl)
      if (mcRef && !map.has(mcRef)) map.set(mcRef, cyl)
    })
    return map
  }, [cylinders])

  // Dynamic Cylinder Types from DB + knitting standards
  const cylinderTypeOptions = useMemo(() => {
    return getCylinderTypeOptions(cylinders)
  }, [cylinders])

  // Group inspections to get the LATEST state per Serial/Cylinder
  // "เมื่อมีการเพิ่มข้อมูลเข้าไปใหม่ ให้แทนที่ด้วยข้อมูลล่าสุด"
  const { latestRecords, historyMap } = useMemo(() => {
    const history = new Map()
    const latest = new Map()

    // Newest first: inspection date, then save time — two inspections on the
    // same day must not fall back to insertion order (the older one used to win).
    const sorted = sortInspectionsNewestFirst(records)

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
    const normal = latestRecords.filter((r) => r.status === 'สึกเล็กน้อย' || r.status === 'NORMAL').length
    const watch = latestRecords.filter((r) => r.status === 'สึกปานกลาง' || r.status === 'สึกมาก' || r.status === 'WATCH' || r.status === 'WORN').length
    const broken = latestRecords.filter((r) => r.status === 'สึกมาก(ควรเปลี่ยน)' || r.status === 'BROKEN').length
    const custom = latestRecords.filter((r) => !['สึกเล็กน้อย', 'สึกปานกลาง', 'สึกมาก', 'สึกมาก(ควรเปลี่ยน)', 'NORMAL', 'WATCH', 'WORN', 'BROKEN'].includes(r.status)).length

    return { total, normal, watch, broken, custom }
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
  const populateFromSerial = (inputSerial, { silent = false } = {}) => {
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

    // If typing manually and no matching cylinder/machine is resolved yet, do not overwrite fields
    if (!cyl && !mcObj && silent) {
      return
    }

    // Lookup the most recent earlier inspection that actually has a counter,
    // so the difference can be worked out when the new reading is typed in.
    const prevCondition = pickPreviousWithCounter(records, {
      matches: (r) => normalizeSerial(r.serial) === key || normalizeMachine(r.machine_mc) === key,
      excludeId: formData.id || undefined,
      getCounter: (r) => r.counter,
    })

    const serialOld = cyl?.Serial_OLD || cyl?.Serial_NOW || cleanCode
    const machineMc = cyl?.NewMC || cyl?.Standard || mcObj?.Mc || mcObj?.Machine_MC || ''
    const location = cyl?.Location || mcObj?.Location || 'In-use'
    const resolvedType = normalizeCylinderType(cyl?.Type || mcObj?.Type)

    setFormData((prev) => ({
      ...prev,
      serial: serialOld,
      machine_mc: machineMc || prev.machine_mc,
      location: location || prev.location,
      type: resolvedType || prev.type || 'Single Jersey',
      doc_date: prev.doc_date || format(new Date(), 'yyyy-MM-dd'),
      inspector: prev.inspector || user?.full_name || user?.username || 'ช่างประจำกะ',
      counter: prev.counter || '',
      counter_prev: prevCondition ? String(normalizeCounter(prevCondition.counter)) : (prev.counter_prev || ''),
      counter_prev_date: prevCondition?.doc_date || prev.counter_prev_date || '',
      counter_diff: prev.counter ? computeCounterDiff(prev.counter, prevCondition?.counter) : 0,
    }))

    if (!silent || cyl || mcObj) {
      toast.success(
        'ดึงข้อมูลกระบอกอัตโนมัติสำเร็จ',
        `ซีเรียล: ${serialOld} · เครื่อง: ${machineMc || '—'} · ประเภท: ${resolvedType}`
      )
    }
  }

  // Auto-populate when Machine MC is selected/changed
  const populateFromMachine = (inputMachine) => {
    const raw = String(inputMachine || '').trim()
    if (!raw) return

    const key = normalizeMachine(raw)
    const cyl = cylinderMap.get(key)
    const mcObj = machines.find((m) => normalizeMachine(m.Mc || m.Machine_MC || m.name) === key)

    if (!cyl && !mcObj) return

    const serialOld = cyl?.Serial_OLD || cyl?.Serial_NOW || ''
    const location = cyl?.Location || mcObj?.Location || 'In-use'
    const resolvedType = normalizeCylinderType(cyl?.Type || mcObj?.Type)

    const prevCondition = pickPreviousWithCounter(records, {
      matches: (r) => normalizeMachine(r.machine_mc) === key || (serialOld && normalizeSerial(r.serial) === normalizeSerial(serialOld)),
      excludeId: formData.id || undefined,
      getCounter: (r) => r.counter,
    })

    setFormData((prev) => ({
      ...prev,
      machine_mc: raw,
      serial: prev.serial || serialOld,
      location: prev.location || location,
      type: resolvedType || prev.type || 'Single Jersey',
      counter_prev: prevCondition ? String(normalizeCounter(prevCondition.counter)) : prev.counter_prev,
      counter_prev_date: prevCondition?.doc_date || prev.counter_prev_date,
      counter_diff: prev.counter ? computeCounterDiff(prev.counter, prevCondition?.counter) : prev.counter_diff,
    }))

    toast.success(
      'ดึงข้อมูลเครื่องและกระบอกสำเร็จ',
      `เครื่อง: ${raw} · กระบอก: ${serialOld || '—'} · ประเภท: ${resolvedType}`
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
    if (e.target) e.target.value = ''
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
    if (e.target) e.target.value = ''
    if (!files.length) return

    setUploadingImage(true)
    try {
      const results = await uploadMediaBatch(files, {
        folderName: NEEDLE_IMAGE_FOLDER,
        fallbackToLocal: true,
      })
      const newUrls = results.map((r) => r.imageUrl || r.url || r.dataUrl).filter(Boolean)

      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...newUrls],
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
      const finalStatus = formData.status === 'ระบุเอง'
        ? (formData.custom_status?.trim() || 'ระบุเอง')
        : (formData.status || 'สึกเล็กน้อย')

      const payload = {
        serial: formData.serial,
        machine_mc: formData.machine_mc,
        location: formData.location,
        type: formData.type,
        doc_date: formData.doc_date || format(new Date(), 'yyyy-MM-dd'),
        counter: Number(formData.counter) || 0,
        counter_prev: normalizeCounter(formData.counter_prev),
        counter_diff: computeCounterDiff(formData.counter, formData.counter_prev),
        counter_prev_date: formData.counter_prev_date || '',
        status: finalStatus,
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

      // Auto-Sync Q3: Update matching cylinder's Last_Check_Date and status
      const targetSerial = payload.serial
      if (targetSerial && Array.isArray(cylinders)) {
        try {
          const matchingCyl = cylinders.find(
            (c) => c.Serial_NOW === targetSerial || c.Serial_OLD === targetSerial || c.Serial === targetSerial
          )
          if (matchingCyl) {
            const cylId = matchingCyl.id || matchingCyl._id
            const updateFields = buildCylinderInspectionSync({
              docDate: payload.doc_date || new Date().toISOString().slice(0, 10),
              inspectionStatus: payload.status,
              currentStatus: matchingCyl.Status_Now,
            })
            await CylinderAPI.update(cylId, updateFields)
          }
        } catch (cylSyncErr) {
          console.warn('Cylinder auto-update from NeedleCondition warning:', cylSyncErr)
        }
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

  const STANDARD_NEEDLE_STATUSES = ['สึกเล็กน้อย', 'สึกปานกลาง', 'สึกมาก', 'สึกมาก(ควรเปลี่ยน)']

  const handleEdit = (item) => {
    const rawStatus = item.status === 'NORMAL' ? 'สึกเล็กน้อย' :
      item.status === 'WATCH' ? 'สึกปานกลาง' :
      item.status === 'WORN' ? 'สึกมาก' :
      item.status === 'BROKEN' ? 'สึกมาก(ควรเปลี่ยน)' :
      item.status || 'สึกเล็กน้อย'

    const isStandard = STANDARD_NEEDLE_STATUSES.includes(rawStatus)
    setFormData({
      id: item.id,
      serial: item.serial || '',
      machine_mc: item.machine_mc || '',
      location: item.location || '',
      type: normalizeCylinderType(item.type) || 'Single Jersey',
      doc_date: item.doc_date || format(new Date(), 'yyyy-MM-dd'),
      counter: item.counter ? String(item.counter) : '',
      counter_prev: item.counter_prev ? String(item.counter_prev) : '',
      counter_prev_date: item.counter_prev_date || '',
      counter_diff: Number(item.counter_diff ?? item.counter_total ?? 0) || 0,
      status: isStandard ? rawStatus : 'ระบุเอง',
      custom_status: isStandard ? '' : rawStatus,
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
    const normalized = statusValue === 'NORMAL' ? 'สึกเล็กน้อย' :
      statusValue === 'WATCH' ? 'สึกปานกลาง' :
      statusValue === 'WORN' ? 'สึกมาก' :
      statusValue === 'BROKEN' ? 'สึกมาก(ควรเปลี่ยน)' :
      statusValue

    const config = NEEDLE_STATUSES.find((s) => s.value === normalized || s.value === statusValue) || {
      label: normalized || statusValue || 'สึกเล็กน้อย',
      bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
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
      <NeedleConditionStats stats={stats} />


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

      <NeedleConditionTable displayRows={displayRows} loading={loading} canEdit={canEdit} canDelete={canDelete} historyMap={historyMap} setDetailItem={setDetailItem} setHistoryDrawerItem={setHistoryDrawerItem} setPdfItem={setPdfItem} setPreviewImageModal={setPreviewImageModal} handleEdit={handleEdit} handleDelete={handleDelete} renderStatusBadge={renderStatusBadge} />


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

      <NeedleConditionForm formModalOpen={formModalOpen} setFormModalOpen={setFormModalOpen} formData={formData} setFormData={setFormData} saving={saving} uploadingImage={uploadingImage} cylinders={cylinders} machines={machines} cylinderTypeOptions={cylinderTypeOptions} handleSubmitForm={handleSubmitForm} handlePhotoUpload={handlePhotoUpload} removePhoto={removePhoto} openQrScanner={openQrScanner} populateFromSerial={populateFromSerial} populateFromMachine={populateFromMachine} setPreviewImageModal={setPreviewImageModal} t={t} />


      {/* ── MODAL 3: HISTORY TIMELINE DRAWER ──────────────────────── */}
      <NeedleHistoryDrawer historyDrawerItem={historyDrawerItem} setHistoryDrawerItem={setHistoryDrawerItem} renderStatusBadge={renderStatusBadge} setPreviewImageModal={setPreviewImageModal} setPdfItem={setPdfItem} />


      {/* ── DETAIL DRAWER FOR SINGLE NEEDLE RECORD ────────────────── */}
      <NeedleDetailDrawer detailItem={detailItem} setDetailItem={setDetailItem} canEdit={canEdit} canDelete={canDelete} handleEdit={handleEdit} handleDelete={handleDelete} setPdfItem={setPdfItem} setPreviewImageModal={setPreviewImageModal} renderStatusBadge={renderStatusBadge} t={t} />


      <NeedleImageModal previewImageModal={previewImageModal} setPreviewImageModal={setPreviewImageModal} />

      <NeedlePdfModal pdfItem={pdfItem} setPdfItem={setPdfItem} historyMap={historyMap} cylinders={cylinders} />

    </div>
  )
}
