import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { NeedleKpiCards } from './needleKpiCards.jsx'
import { NeedleActivityStrip } from './needleActivityStrip.jsx'
import { createPortal } from 'react-dom'
import {
  Layers, Package, ScrollText, AlertTriangle,
  PackageCheck, ArrowDownLeft, ArrowUpRight, SlidersHorizontal, Trash2,
  Search, ChevronRight, X, LayoutGrid, Table, RotateCw, RotateCcw, Download, PlusCircle, ArrowLeftRight,
  Edit3, History, Camera, Upload, ZoomIn, ZoomOut, RefreshCw, Check, Sparkles, MapPin,
  ChevronDown, Image as ImageIcon, Eye, Cloud, ExternalLink, CheckCircle
} from 'lucide-react'
import { useRealtimeTables } from '../../api/realtimeSync'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import usePagePerms from '../../hooks/usePagePerms'
import {
  classifyNeedleAction,
  needleActionLabel,
  needleActionBadgeClass,
  sumNeedleLedger,
  VOID_ACTION_LABEL,
  isReversibleLedgerAction,
  findVoidEntry,
  buildVoidLedgerEntry,
  needleStatusForQuantity,
  formatSignedQty,
} from '../../utils/needleLedger'
import {
  NeedleSetAPI, NeedleHistoryAPI, SpareNeedleRequestAPI, normalizeNeedleSet, normalizeNeedleLog, normalizeSpareNeedleRequest
} from '../../api/entities'
import {
  StepPrepareSpareNeedle,
  StepAcknowledgeSpareNeedle,
} from '../../components/repair/SpareNeedleFlow'
import NeedleKeeperConfigModal from '../../components/repair/NeedleKeeperConfigModal'
import CreateSpareNeedleModal from '../../components/repair/CreateSpareNeedleModal'
import EditSpareNeedleModal from '../../components/repair/EditSpareNeedleModal'
import { uploadMedia } from '../../modules/media/mediaUploader'
import { getDirectImageUrl, isGoogleDriveUrl, getImageFallbackUrls, extractImageUrl, getFullResolutionImageUrl } from '../../utils/imageUrlUtils'
import { formatNeedleStockFileName } from '../../utils/needleStockUtils'
import initialNeedleSetsData from '../../data/initialNeedleSets.json'
import { StockTransactionModal, NeedleImage, NEEDLE_IMAGE_FOLDER } from './StockTransactionModal'
import { AddNewNeedleSetModal, UpdateGradeModal, TimelineHistoryModal, ImageGalleryModal, MACHINE_TYPES, GAUGES, GRADES, LOCATIONS } from './needleSetModals.jsx'
import { NeedleStockTabs } from './needleStockTabs.jsx'


export default function NeedleStock() {
  const toast = useToast()
  const { user } = useAuth()
  const { canAdd, canEdit, canDelete } = usePagePerms('needlestock')

  // Main state
  const [needleSets, setNeedleSets] = useState([])
  const [historyLogs, setHistoryLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Navigation & View state
  const [activeTab, setActiveTab] = useState('inventory') // 'inventory' | 'ledger' | 'spare_requests'
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'

  // Spare Requests State
  const [spareRequests, setSpareRequests] = useState([])
  const [spareFilterStatus, setSpareFilterStatus] = useState('ALL') // 'ALL' | 'PENDING' | 'PREPARED' | 'COMPLETED'
  const [spareSearchQuery, setSpareSearchQuery] = useState('')
  const [prepareModalOpen, setPrepareModalOpen] = useState(false)
  const [selectedSpareReq, setSelectedSpareReq] = useState(null)
  const [keeperConfigModalOpen, setKeeperConfigModalOpen] = useState(false)
  const [createSpareModalOpen, setCreateSpareModalOpen] = useState(false)
  const [editSpareModalOpen, setEditSpareModalOpen] = useState(false)
  const [selectedEditReq, setSelectedEditReq] = useState(null)
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false)
  const [deleteAckReturned, setDeleteAckReturned] = useState(false)

  // Ledger reversal (ยกเลิกรายการ + คืนยอด)
  const [voidTarget, setVoidTarget] = useState(null)
  const [voidReason, setVoidReason] = useState('')
  const [voidSaving, setVoidSaving] = useState(false)
  const [selectedDeleteReq, setSelectedDeleteReq] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Inventory Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterMachineType, setFilterMachineType] = useState('')
  const [filterGauge, setFilterGauge] = useState('')
  const [onlyLowStock, setOnlyLowStock] = useState(false)

  // Ledger Filters
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all') // 'all' | 'in' | 'out' | 'adjust' | 'scrap'
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('')

  // Modals state
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [currentStockSet, setCurrentStockSet] = useState(null)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [currentUpdateSet, setCurrentUpdateSet] = useState(null)

  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [currentHistorySet, setCurrentHistorySet] = useState(null)

  const [galleryModalOpen, setGalleryModalOpen] = useState(false)
  const [galleryImages, setGalleryImages] = useState([])
  const [galleryTitle, setGalleryTitle] = useState('')
  const [gallerySubtitle, setGallerySubtitle] = useState('')
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0)
  const [galleryZoom, setGalleryZoom] = useState(1)
  const [currentGallerySet, setCurrentGallerySet] = useState(null)

  // Auto-learning combobox store
  const [comboboxStore, setComboboxStore] = useState({
    machineId: new Set(['MC-01', 'MC-02', 'MC-03', 'MC-04', 'MC-05']),
    needleModel: new Set(['WO 146.41 G 01', 'WO 146.41 G 02', 'VO 104.41 G 01']),
    brand: new Set(['GROZ-BECKERT', 'MAYER&CIE', 'TERROT', 'SAMSUNG']),
    conditionDetail: new Set(['สมบูรณ์', 'สึกหรอปานกลาง', 'ตะของอเล็กน้อย', 'ปลายเข็มทู่', 'ชำรุดหนัก']),
    technician: new Set(['tuk', 'ช่างตั๊ก', 'ช่างหนึ่ง', 'ช่างเอก']),
    stockDetail: new Set(['PM', 'SPARE']),
  })

  // Load Data
  const loadData = async (isManual = false, { silent = false } = {}) => {
    try {
      if (isManual) setRefreshing(true)
      else if (!silent) setLoading(true)

      const [setsData, logsData, spareData] = await Promise.all([
        NeedleSetAPI.list(),
        NeedleHistoryAPI.list(),
        SpareNeedleRequestAPI.list(),
      ])

      const validSets = Array.isArray(setsData) && setsData.length > 0
        ? setsData
        : (initialNeedleSetsData || []).map(normalizeNeedleSet)

      setNeedleSets(validSets)
      setHistoryLogs(Array.isArray(logsData) ? logsData : [])
      setSpareRequests(Array.isArray(spareData) ? spareData : [])

      // Seed combobox store from loaded sets
      setComboboxStore(prev => {
        const next = {
          machineId: new Set(prev.machineId),
          needleModel: new Set(prev.needleModel),
          brand: new Set(prev.brand),
          conditionDetail: new Set(prev.conditionDetail),
          technician: new Set(prev.technician),
          stockDetail: new Set(prev.stockDetail),
        }
        validSets.forEach(s => {
          if (s.machineId) next.machineId.add(s.machineId)
          if (s.needleModel) next.needleModel.add(s.needleModel)
          if (s.brand) next.brand.add(s.brand)
          if (s.conditionDetail) next.conditionDetail.add(s.conditionDetail)
          if (s.inspector) next.technician.add(s.inspector)
        })
        return next
      })

      if (isManual) toast.success('รีเฟรชข้อมูลสต็อกเข็มสำเร็จ')
    } catch (err) {
      console.error('Failed to load needle stock data:', err)
      if (!silent) toast.error('ไม่สามารถโหลดข้อมูลสต็อกเข็มได้: ' + err.message)
    } finally {
      if (!silent) setLoading(false)
      setRefreshing(false)
    }
  }

  useRealtimeTables(['needle_sets', 'needle_history_logs', 'spare_needle_requests', 'appconfigs'], () => {
    loadData(false, { silent: true })
  })

  useEffect(() => {
    loadData()
  }, [])

  // Auto-learn helper
  const learnValues = (obj) => {
    setComboboxStore(prev => {
      const next = { ...prev }
      if (obj.machineId && obj.machineId.trim()) next.machineId = new Set([...prev.machineId, obj.machineId.trim()])
      if (obj.targetMachine && obj.targetMachine.trim()) next.machineId = new Set([...prev.machineId, obj.targetMachine.trim()])
      if (obj.needleModel && obj.needleModel.trim()) next.needleModel = new Set([...prev.needleModel, obj.needleModel.trim()])
      if (obj.brand && obj.brand.trim()) next.brand = new Set([...prev.brand, obj.brand.trim()])
      if (obj.conditionDetail && obj.conditionDetail.trim()) next.conditionDetail = new Set([...prev.conditionDetail, obj.conditionDetail.trim()])
      if (obj.technician && obj.technician.trim()) next.technician = new Set([...prev.technician, obj.technician.trim()])
      if (obj.inspector && obj.inspector.trim()) next.technician = new Set([...prev.technician, obj.inspector.trim()])
      if (obj.stockDetail && obj.stockDetail.trim()) next.stockDetail = new Set([...prev.stockDetail, obj.stockDetail.trim()])
      return next
    })
  }

  // Reverse a manual stock movement from the ledger (คืนยอด + เก็บบันทึกเดิมไว้)
  const handleConfirmVoidLedger = async () => {
    const log = voidTarget
    if (!log) return
    if (!voidReason.trim()) {
      toast.warning('กรุณาระบุเหตุผล', 'ต้องระบุเหตุผลในการยกเลิกรายการ เพื่อให้ตรวจสอบย้อนหลังได้')
      return
    }
    if (!isReversibleLedgerAction(log.actionType)) {
      toast.warning('ยกเลิกไม่ได้', 'รายการนี้ต้องยกเลิกผ่านใบเบิก (ลบใบเบิกเพื่อคืนสต็อกอัตโนมัติ)')
      return
    }
    if (findVoidEntry(historyLogs, log.logId || log.id)) {
      toast.warning('รายการนี้ถูกยกเลิกไปแล้ว', 'ไม่สามารถยกเลิกซ้ำได้')
      return
    }

    setVoidSaving(true)
    try {
      let setRecord = needleSets.find((x) => x.id === log.setId || x.setId === log.setId)
      if (!setRecord) {
        try { setRecord = await NeedleSetAPI.getById(log.setId) } catch {}
      }
      if (!setRecord) {
        toast.error('ไม่พบชุดเข็ม', `ไม่พบชุด ${log.setId} ในคลัง — ยกเลิกรายการไม่ได้`)
        return
      }

      const entry = buildVoidLedgerEntry({
        log,
        set: setRecord,
        technician: user?.full_name || user?.username || 'ผู้ดูแลสต็อก',
        reason: voidReason.trim(),
      })

      await NeedleSetAPI.update(setRecord.id || setRecord.setId, {
        ...setRecord,
        quantity: entry.balanceAfter,
        Quantity: entry.balanceAfter,
        status: needleStatusForQuantity(entry.balanceAfter),
      })
      await NeedleHistoryAPI.create(entry)

      setNeedleSets((prev) => prev.map((x) => (
        (x.id === setRecord.id || x.setId === setRecord.setId)
          ? { ...x, quantity: entry.balanceAfter, Quantity: entry.balanceAfter, status: needleStatusForQuantity(entry.balanceAfter) }
          : x
      )))
      setHistoryLogs((prev) => [entry, ...prev])
      setVoidTarget(null)
      setVoidReason('')
      toast.success('ยกเลิกรายการสำเร็จ', `คืนยอด ${Math.abs(entry.qtyChange).toLocaleString()} เล่ม → คงเหลือ ${entry.balanceAfter.toLocaleString()} เล่ม`)
      loadData(true)
    } catch (err) {
      console.error('Void ledger entry error:', err)
      toast.error('ยกเลิกรายการไม่สำเร็จ', err.message || String(err))
    } finally {
      setVoidSaving(false)
    }
  }

  // Handle Delete Spare Needle Request (with Automatic Stock Refund)
  const handleConfirmDeleteSpareRequest = async () => {
    if (!selectedDeleteReq) return
    const req = selectedDeleteReq
    const issuedItems = Array.isArray(req.issued_items) ? req.issued_items : []

    // A request the technician already received (COMPLETED) means the needles are
    // physically on the machine — refunding them without a real return would
    // overstate the store stock, so the keeper has to confirm the return first.
    if (req.status === 'COMPLETED' && issuedItems.length > 0 && !deleteAckReturned) {
      toast.warning('ต้องยืนยันการรับคืนก่อน', 'ใบเบิกนี้ช่างรับเข็มไปแล้ว — ต้องติ๊กยืนยันว่ารับเข็มคืนจากช่างแล้วก่อนจึงจะคืนสต็อกได้')
      return
    }

    setDeleteLoading(true)
    try {
      let returnedCount = 0
      const missingSets = []

      // If items were issued/deducted from stock, restore them to store stock
      if (Array.isArray(req.issued_items) && req.issued_items.length > 0) {
        for (const item of req.issued_items) {
          if (!item.setId || item.setId === 'OFF_SYSTEM' || item.isOffSystem || item.sourceType === 'OFF_SYSTEM') continue
          let setRecord = needleSets.find((s) => s.id === item.setId)
          if (!setRecord) {
            try {
              setRecord = await NeedleSetAPI.getById(item.setId)
            } catch {}
          }
          if (!setRecord) {
            missingSets.push(item.setId)
            continue
          }
          if (setRecord) {
            const currentBal = parseInt(setRecord.quantity, 10) || 0
            const returnQty = parseInt(item.quantity, 10) || 0
            const newBal = currentBal + returnQty
            returnedCount += returnQty

            // 1. Restore stock balance in store
            await NeedleSetAPI.update(item.setId, {
              ...setRecord,
              quantity: newBal,
              Quantity: newBal,
            })

            // 2. Create ledger history record (RETURN_SPARE)
            await NeedleHistoryAPI.create({
              id: `LOG-RETURN-SPARE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              setId: item.setId,
              actionType: 'RETURN_SPARE',
              oldGrade: setRecord.grade,
              newGrade: setRecord.grade,
              conditionDetail: setRecord.conditionDetail,
              quantity: returnQty,
              dateAction: new Date().toISOString().slice(0, 10),
              technician: user?.name || user?.username || 'ผู้ดูแลระบบ',
              remarks: `ยกเลิก/ลบใบเบิก ${req.request_no || req.id} คืนเข็ม Spare เข้าคลังสต็อกอัตโนมัติ${req.status === 'COMPLETED' ? ' (ยืนยันรับคืนจากช่างแล้ว)' : ''}`,
              targetMachine: req.machine_mc,
              qtyChange: `+${returnQty}`,
              balanceAfter: newBal,
              stockDetail: 'SPARE',
            })
          }
        }
      }

      // 3. Delete the request
      await SpareNeedleRequestAPI.delete(req.id)

      setSpareRequests((prev) => prev.filter((r) => r.id !== req.id))
      setDeleteConfirmModalOpen(false)
      setSelectedDeleteReq(null)
      loadData(true)

      if (returnedCount > 0) {
        toast.success(`ลบใบเบิก ${req.request_no || req.id} สำเร็จ พร้อมคืนเข็ม ${returnedCount} ตัวกลับเข้าคลังสต็อกเรียบร้อยแล้ว`)
      } else {
        toast.success(`ลบใบเบิก ${req.request_no || req.id} เรียบร้อยแล้ว`)
      }
      if (missingSets.length > 0) {
        toast.warning('คืนสต็อกไม่ครบ', `ไม่พบชุดเข็ม ${missingSets.join(', ')} ในคลัง — ยังไม่ได้คืนยอดให้ชุดเหล่านี้ กรุณาตรวจสอบ`)
      }
    } catch (err) {
      console.error('Delete spare needle request error:', err)
      toast.error('ไม่สามารถลบใบเบิกได้: ' + (err.message || err))
    } finally {
      setDeleteLoading(false)
    }
  }

  // KPIs calculation
  const kpis = useMemo(() => {
    let totalNeedles = 0
    let gradeAQty = 0
    let gradeASets = 0
    let gradeBQty = 0
    let gradeBSets = 0
    let waitQty = 0
    let waitSets = 0
    let scrapQty = 0
    let scrapSets = 0
    let lowStockCount = 0

    needleSets.forEach(s => {
      const qty = parseInt(s.quantity, 10) || 0
      totalNeedles += qty
      if (s.grade === 'เกรด A') {
        gradeAQty += qty
        gradeASets++
      } else if (s.grade === 'เกรด B') {
        gradeBQty += qty
        gradeBSets++
      } else if (s.grade === 'รอคัดแยก') {
        waitQty += qty
        waitSets++
      } else if (s.grade === 'ปลดระวาง') {
        scrapQty += qty
        scrapSets++
      }
      if (qty <= 100) lowStockCount++
    })

    // Ledger movements KPI (shared classifier covers the spare-needle codes too)
    const ledgerTotals = sumNeedleLedger(historyLogs)
    const totalReceived = ledgerTotals.received
    const totalIssued = ledgerTotals.issued
    const totalScrappedAccum = ledgerTotals.scrapped

    return {
      totalNeedles,
      totalSets: needleSets.length,
      gradeAQty,
      gradeASets,
      gradeBQty,
      gradeBSets,
      waitQty,
      waitSets,
      scrapQty,
      scrapSets,
      totalAvailable: gradeAQty + gradeBQty,
      totalReceived,
      totalIssued,
      totalScrappedAccum,
      lowStockCount,
    }
  }, [needleSets, historyLogs])

  // Filtered Needle Sets
  const filteredSets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return needleSets.filter(item => {
      if (onlyLowStock && (parseInt(item.quantity, 10) || 0) > 100) return false
      if (filterLocation && item.location !== filterLocation) return false
      if (filterGrade && item.grade !== filterGrade) return false
      if (filterMachineType && item.machineType !== filterMachineType) return false
      if (filterGauge && item.gauge !== filterGauge) return false

      if (q) {
        const text = `${item.setId} ${item.machineId} ${item.needleModel} ${item.brand} ${item.location} ${item.remarks} ${item.conditionDetail}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
  }, [needleSets, searchQuery, filterLocation, filterGrade, filterMachineType, filterGauge, onlyLowStock])

  // Filtered Ledger
  const filteredLedger = useMemo(() => {
    const q = ledgerSearchQuery.toLowerCase().trim()
    return historyLogs.filter(log => {
      const act = log.actionType || ''
      if (ledgerTypeFilter !== 'all' && classifyNeedleAction(act) !== ledgerTypeFilter) return false

      if (q) {
        const text = `${log.setId} ${log.targetMachine} ${log.technician} ${log.actionType} ${log.remarks} ${log.scrapReason} ${log.sourceFrom}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
  }, [historyLogs, ledgerTypeFilter, ledgerSearchQuery])

  // Grade badge helper
  const renderGradeBadge = (grade) => {
    if (grade === 'เกรด A') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          เกรด A
        </span>
      )
    } else if (grade === 'เกรด B') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          เกรด B
        </span>
      )
    } else if (grade === 'รอคัดแยก') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          รอคัดแยก
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
        ปลดระวาง
      </span>
    )
  }

  // Export CSV functions
  const exportSetsCSV = () => {
    const headers = [
      'Set_ID', 'Machine_ID', 'Machine_Type', 'Gauge', 'Brand', 'Needle_Model',
      'Grade', 'Condition_Detail', 'Quantity', 'Location', 'Inspector', 'Date_Recorded', 'Remarks'
    ]
    const rows = filteredSets.map(s => [
      `"${s.setId || ''}"`,
      `"${s.machineId || ''}"`,
      `"${s.machineType || ''}"`,
      `"${s.gauge || ''}"`,
      `"${s.brand || ''}"`,
      `"${(s.needleModel || '').replace(/"/g, '""')}"`,
      `"${s.grade || ''}"`,
      `"${(s.conditionDetail || '').replace(/"/g, '""')}"`,
      s.quantity || 0,
      `"${s.location || ''}"`,
      `"${s.inspector || ''}"`,
      `"${s.dateRecorded || ''}"`,
      `"${(s.remarks || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Needle_Stock_Inventory_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('ส่งออกไฟล์ CSV สำเร็จ')
  }

  const exportLedgerCSV = () => {
    const headers = [
      'Log_ID', 'Set_ID', 'Action_Type', 'Date_Action', 'Qty_Change', 'Balance_After',
      'Target_Machine', 'Source_From', 'Scrap_Reason', 'Stock_Detail', 'Technician', 'Remarks', 'Created_At'
    ]
    const rows = filteredLedger.map(l => [
      `"${l.logId || ''}"`,
      `"${l.setId || ''}"`,
      `"${l.actionType || ''}"`,
      `"${l.dateAction || ''}"`,
      l.qtyChange || 0,
      l.balanceAfter || 0,
      `"${l.targetMachine || ''}"`,
      `"${l.sourceFrom || ''}"`,
      `"${l.scrapReason || ''}"`,
      `"${l.stockDetail || ''}"`,
      `"${l.technician || ''}"`,
      `"${(l.remarks || '').replace(/"/g, '""')}"`,
      `"${l.createdAt || ''}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Needle_Stock_Ledger_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('ส่งออกไฟล์ CSV ประวัติสต็อกสำเร็จ')
  }

  // Open Image Gallery
  const openGallery = (set) => {
    const imgs = (set.images && set.images.length > 0)
      ? set.images.map(img => {
          const u = extractImageUrl(img)
          const n = typeof img === 'object' && img?.name ? img.name : 'รูปภาพ'
          return { url: u, name: n }
        }).filter(item => Boolean(item.url))
      : []

    setCurrentGallerySet(set)
    setGalleryImages(imgs)
    setGalleryTitle(`รูปภาพชุดเข็ม ${set.setId || set.id} (${set.machineId || 'ไม่ระบุ'})`)
    setGallerySubtitle(`${set.needleModel} • ${set.grade}`)
    setActiveGalleryIndex(0)
    setGalleryZoom(1)
    setGalleryModalOpen(true)
  }

  // Open Timeline History
  const openTimeline = (set) => {
    setCurrentHistorySet(set)
    setHistoryModalOpen(true)
  }

  // Open Update Grade / Inspect
  const openUpdate = (set) => {
    setCurrentUpdateSet(set)
    setUpdateModalOpen(true)
  }

  // Open Stock Modal
  const openStockModal = (set = null) => {
    setCurrentStockSet(set || needleSets[0] || null)
    setStockModalOpen(true)
  }

  return (
    <div className="w-full space-y-5 pb-16">
      {/* TOP HEADER / ACTION BAR */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Title & Icon */}
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">Needle Grade & Stock</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">ระบบบันทึกประวัติและสต็อกเข็มแต่ละเกรด</p>
          </div>
        </div>

        {/* Header Action Buttons in Scrollable/Responsive Strip */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 flex-nowrap w-full sm:w-auto justify-start sm:justify-end">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="btn-outline text-xs px-3 py-2 min-h-[44px] flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>

          <button
            type="button"
            onClick={activeTab === 'inventory' ? exportSetsCSV : exportLedgerCSV}
            className="btn-outline text-xs px-3 py-2 min-h-[44px] flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          {canAdd && (
            <>
              <button
                type="button"
                onClick={() => openStockModal(null)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 min-h-[44px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition shadow-blue-500/20 cursor-pointer flex-shrink-0"
                title="ทำรายการสต็อกเข็ม (เบิกออก / รับเข้า / ตัดยอด / ตัดทิ้ง)"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>ทำรายการสต็อก</span>
              </button>

              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 min-h-[44px] bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition shadow-sky-600/30 cursor-pointer flex-shrink-0 hidden sm:inline-flex"
              >
                <PlusCircle className="w-4 h-4" />
                <span>เพิ่มชุดเข็มใหม่</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="w-full space-y-5">
        {/* TABS: INVENTORY vs LEDGER */}
      <NeedleStockTabs activeTab={activeTab} setActiveTab={setActiveTab} needleSets={needleSets} historyLogs={historyLogs} spareRequests={spareRequests} />



        {/* LOW STOCK ALERT BANNER */}
        {kpis.lowStockCount > 0 && (
          <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between text-xs sm:text-sm text-amber-900 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold">
                  แจ้งเตือนสต็อกเข็มเหลือน้อย: พบ <span className="underline font-extrabold text-amber-950">{kpis.lowStockCount}</span> ชุดเข็มที่ต่ำกว่าเกณฑ์ขั้นต่ำ (&le; 100 เล่ม)
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">ควรตรวจสอบเพื่อจัดเตรียมสั่งซื้อหรือส่งคัดเกรดเพิ่ม</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('inventory')
                setOnlyLowStock(prev => !prev)
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 shadow-xs transition flex items-center space-x-1 cursor-pointer ${
                onlyLowStock ? 'bg-amber-800 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              <span>{onlyLowStock ? 'แสดงทั้งหมด' : 'ดูเฉพาะที่เหลือน้อย'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TOP KPI CARDS */}
      <NeedleKpiCards kpis={kpis} filterGrade={filterGrade} setActiveTab={setActiveTab} setFilterGrade={setFilterGrade} />


        {/* STOCK ACTIVITY STRIP */}
      <NeedleActivityStrip kpis={kpis} setActiveTab={setActiveTab} setOnlyLowStock={setOnlyLowStock} />


        {/* TAB 1: INVENTORY VIEW */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* SEARCH & FILTERS TOOLBAR */}
            <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {/* Search */}
                <div className="relative sm:col-span-2 lg:col-span-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหา: รหัสเครื่อง, รุ่นเข็ม, หมายเหตุ, ที่เก็บ"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  />
                </div>

                {/* Location Filter */}
                <div>
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition font-medium"
                  >
                    <option value="">ทุกตำแหน่ง (All Locations)</option>
                    {LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {/* Grade Filter */}
                <div>
                  <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  >
                    <option value="">ทุกเกรด (All Grades)</option>
                    {GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Machine Type Filter */}
                <div>
                  <select
                    value={filterMachineType}
                    onChange={(e) => setFilterMachineType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  >
                    <option value="">ทุกประเภทเครื่อง</option>
                    {MACHINE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Gauge Filter */}
                <div>
                  <select
                    value={filterGauge}
                    onChange={(e) => setFilterGauge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  >
                    <option value="">ทุกเบอร์เกจ</option>
                    {GAUGES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status bar & View toggle */}
              <div className="flex flex-wrap justify-between items-center pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center space-x-2">
                  <span>พบทั้งหมด: <strong className="text-slate-800 font-semibold">{filteredSets.length.toLocaleString()}</strong> รายการ</span>
                  <span className="text-slate-300">|</span>
                  <span>จำนวนเข็มรวม: <strong className="text-sky-600 font-semibold">{filteredSets.reduce((sum, s) => sum + (parseInt(s.quantity, 10) || 0), 0).toLocaleString()}</strong> เล่ม</span>
                </div>

                <div className="flex items-center space-x-3 mt-1 sm:mt-0">
                  {(searchQuery || filterLocation || filterGrade || filterMachineType || filterGauge || onlyLowStock) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setFilterLocation('')
                        setFilterGrade('')
                        setFilterMachineType('')
                        setFilterGauge('')
                        setOnlyLowStock(false)
                      }}
                      className="text-slate-500 hover:text-rose-600 transition flex items-center space-x-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>ล้างตัวกรอง</span>
                    </button>
                  )}

                  {/* View Mode Switcher */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition flex items-center space-x-1 ${
                        viewMode === 'grid' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>การ์ด</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition flex items-center space-x-1 ${
                        viewMode === 'table' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>ตาราง</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* CONTENT: LOADING / EMPTY / GRID / TABLE */}
            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-block animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mb-3"></div>
                <p className="text-sm text-slate-500">กำลังโหลดข้อมูลประวัติเข็ม...</p>
              </div>
            ) : filteredSets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Package className="w-8 h-8 opacity-60" />
                </div>
                <h4 className="text-base font-semibold text-slate-700">ไม่พบข้อมูลชุดเข็ม</h4>
                <p className="text-xs text-slate-400 mt-1">ลองปรับเปลี่ยนตัวกรอง หรือคลิก "เพิ่มชุดเข็มใหม่"</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID CARDS VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredSets.map(item => {
                  const hasImages = item.images && item.images.length > 0
                  const mainImg = hasImages ? extractImageUrl(item.images[0]) : ''
                  const imgCount = hasImages ? item.images.length : 0
                  const qty = parseInt(item.quantity, 10) || 0
                  const isOutOfStock = qty === 0
                  const isLowStock = qty > 0 && qty <= 100

                  return (
                    <div
                      key={item.id || item.setId}
                      className={`bg-white rounded-2xl border ${
                        isLowStock ? 'border-amber-300 ring-1 ring-amber-100' : isOutOfStock ? 'border-rose-300 ring-1 ring-rose-100' : 'border-slate-200/90'
                      } shadow-xs hover:shadow-md transition overflow-hidden flex flex-col`}
                    >
                      {/* Card Header */}
                      <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold text-slate-400">{item.setId}</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md text-xs">{item.machineId || 'ไม่ระบุ'}</span>
                            <span className="text-xs text-slate-500 font-medium">{item.machineType} • {item.gauge}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 mt-1.5 line-clamp-1" title={item.needleModel}>
                            {item.needleModel}
                          </h4>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="text-[11px] text-slate-400">{item.brand || 'MAYER&CIE'}</span>
                            {item.location && (
                              <>
                                <span className="text-[10px] text-slate-300">•</span>
                                <span className="inline-flex items-center text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 max-w-[140px] truncate" title={item.location}>
                                  <MapPin className="w-2.5 h-2.5 mr-0.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">{item.location}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-1">
                          {renderGradeBadge(item.grade)}
                          {isOutOfStock && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold border border-rose-200">
                              หมดสต็อก
                            </span>
                          )}
                          {isLowStock && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-200">
                              สต็อกเหลือน้อย
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 flex-1 space-y-3">
                        {/* Image Preview Thumbnail */}
                        <div
                          onClick={() => openGallery(item)}
                          className="relative h-36 bg-slate-100 rounded-xl overflow-hidden cursor-pointer group flex items-center justify-center"
                        >
                          {hasImages ? (
                            <>
                              <NeedleImage
                                src={mainImg}
                                alt={item.needleModel}
                                size="w600"
                                fallbackSrcs={(item.images || []).slice(1)}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                              />
                              {isGoogleDriveUrl(mainImg) && (
                                <div className="absolute top-2 left-2 bg-emerald-950/85 text-emerald-300 border border-emerald-500/40 text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center space-x-1 shadow-xs">
                                  <Cloud className="w-3 h-3 text-emerald-400" />
                                  <span>Google Drive</span>
                                </div>
                              )}
                              {imgCount > 1 && (
                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-medium px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center space-x-1">
                                  <ImageIcon className="w-3 h-3" />
                                  <span>+{imgCount - 1} รูป</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 group-hover:text-slate-600 transition">
                              <Camera className="w-8 h-8 mb-1 opacity-50" />
                              <span className="text-[11px]">คลิกเพื่อดู/เพิ่มรูปภาพ</span>
                            </div>
                          )}
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-50 p-2 rounded-xl">
                            <p className="text-[10px] text-slate-400">สภาพการสึกหรอ</p>
                            <p className="font-semibold text-slate-700 mt-0.5 line-clamp-1">{item.conditionDetail || '-'}</p>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-xl">
                            <p className="text-[10px] text-slate-400">จำนวนคงเหลือ</p>
                            <p className={`font-bold ${isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-sky-600'} mt-0.5`}>
                              {qty.toLocaleString()} เล่ม
                            </p>
                          </div>
                        </div>

                        {/* Location Row */}
                        <div className="flex items-center space-x-2 text-xs bg-slate-50 border border-slate-200/70 px-2.5 py-1.5 rounded-xl min-h-[44px]">
                          <MapPin className={`w-3.5 h-3.5 ${item.location ? 'text-emerald-600' : 'text-slate-300'} shrink-0`} />
                          <span className="text-[11px] text-slate-400 shrink-0">ตำแหน่งจัดเก็บ:</span>
                          <span className="font-semibold text-slate-700 truncate">{item.location || 'ไม่ระบุ'}</span>
                        </div>

                        {item.remarks && (
                          <p className="text-[11px] text-slate-500 bg-amber-50/60 border border-amber-100 p-2 rounded-xl">
                            <strong className="text-amber-800">หมายเหตุ:</strong> {item.remarks}
                          </p>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs gap-1">
                        <button
                          type="button"
                          onClick={() => openTimeline(item)}
                          className="px-2.5 py-1.5 text-slate-600 hover:text-sky-600 font-medium flex items-center space-x-1 transition cursor-pointer"
                          title="ดูประวัติการเคลื่อนไหว"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>ประวัติ</span>
                        </button>

                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => openStockModal(item)}
                            className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold shadow-xs transition flex items-center space-x-1 cursor-pointer"
                            title="ทำรายการสต็อก (เบิกออก / รับเข้า / ตัดยอด / ตัดทิ้ง)"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>สต็อก</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openUpdate(item)}
                            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-sky-500 text-slate-700 hover:text-sky-600 rounded-lg font-medium shadow-xs transition flex items-center space-x-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>ตรวจ/เกรด</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">รหัสชุด</th>
                        <th className="p-3.5">รูปภาพ</th>
                        <th className="p-3.5">เครื่องจักร</th>
                        <th className="p-3.5">รุ่นเข็ม / รายละเอียด</th>
                        <th className="p-3.5">เกรด / สภาพ</th>
                        <th className="p-3.5">ตำแหน่งจัดเก็บ</th>
                        <th className="p-3.5 text-right">จำนวน</th>
                        <th className="p-3.5 text-center">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSets.map(item => {
                        const hasImages = item.images && item.images.length > 0
                        const mainImg = hasImages ? extractImageUrl(item.images[0]) : ''
                        const imgCount = hasImages ? item.images.length : 0
                        const qty = parseInt(item.quantity, 10) || 0
                        const isOutOfStock = qty === 0
                        const isLowStock = qty > 0 && qty <= 100

                        return (
                          <tr key={item.id || item.setId} className={`hover:bg-slate-50 transition ${isLowStock ? 'bg-amber-50/20' : ''}`}>
                            <td className="p-3.5 font-mono text-xs font-semibold text-slate-500">{item.setId}</td>
                            <td className="p-3.5">
                              <div
                                onClick={() => openGallery(item)}
                                className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden cursor-pointer relative"
                              >
                                {hasImages ? (
                                  <>
                                    <NeedleImage
                                      src={mainImg}
                                      alt=""
                                      size="w160"
                                      fallbackSrcs={(item.images || []).slice(1)}
                                      className="w-full h-full object-cover"
                                    />
                                    {imgCount > 1 && (
                                      <span className="absolute bottom-0 right-0 bg-black/70 text-[9px] text-white px-1 font-bold rounded-tl">
                                        +{imgCount}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <ImageIcon className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="font-bold text-slate-800">{item.machineId}</div>
                              <div className="text-xs text-slate-400">{item.machineType} • {item.gauge}</div>
                            </td>
                            <td className="p-3.5">
                              <div className="font-medium text-slate-800">{item.needleModel}</div>
                              <div className="text-xs text-slate-400">{item.remarks || item.brand || '-'}</div>
                            </td>
                            <td className="p-3.5">
                              <div>{renderGradeBadge(item.grade)}</div>
                              <div className="text-xs text-slate-500 mt-1">{item.conditionDetail || '-'}</div>
                            </td>
                            <td className="p-3.5">
                              {item.location && (
                                <div className="inline-flex items-center space-x-1.5 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
                                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="font-medium">{item.location}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              <div className={`font-bold ${isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-sky-600'}`}>
                                {qty.toLocaleString()}
                              </div>
                              {isOutOfStock ? (
                                <span className="text-[10px] text-rose-600 font-semibold block">หมดสต็อก</span>
                              ) : isLowStock ? (
                                <span className="text-[10px] text-amber-600 font-semibold block">สต็อกเหลือน้อย</span>
                              ) : null}
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="inline-flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => openStockModal(item)}
                                  className="px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-semibold flex items-center space-x-1 cursor-pointer"
                                  title="ทำรายการสต็อก"
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                  <span>สต็อก</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openTimeline(item)}
                                  className="p-1.5 text-slate-500 hover:text-sky-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                                  title="ดูประวัติ"
                                >
                                  <History className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openUpdate(item)}
                                  className="p-1.5 text-slate-500 hover:text-sky-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                                  title="อัปเดตเกรด"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STOCK LEDGER VIEW */}
        {activeTab === 'ledger' && (
          <section className="space-y-4">
            {/* Ledger Toolbar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                {/* Movement Type Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLedgerTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                      ledgerTypeFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerTypeFilter('in')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1 ${
                      ledgerTypeFilter === 'in' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>รับเข้า (In)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerTypeFilter('out')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1 ${
                      ledgerTypeFilter === 'out' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>เบิกออก (Out)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerTypeFilter('adjust')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1 ${
                      ledgerTypeFilter === 'adjust' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-800'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>ตัดยอด (Adjust)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerTypeFilter('scrap')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1 ${
                      ledgerTypeFilter === 'scrap' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ตัดทิ้ง (Scrap)</span>
                  </button>
                </div>

                {/* Search & Actions */}
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={ledgerSearchQuery}
                      onChange={(e) => setLedgerSearchQuery(e.target.value)}
                      placeholder="ค้นหา: รหัสชุด, เครื่อง, ช่าง, สาเหตุ"
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => loadData(true)}
                    className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition cursor-pointer"
                    title="รีเฟรชประวัติสต็อก"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={exportLedgerCSV}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div>
                  <span>บันทึกการเคลื่อนไหวสต็อก: <strong className="text-slate-800 font-semibold">{filteredLedger.length}</strong> รายการ</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  แสดงข้อมูลเรียงจากรายการล่าสุด
                </div>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">วัน-เวลา</th>
                      <th className="p-3.5">รหัสชุดเข็ม</th>
                      <th className="p-3.5">ประเภทรายการ</th>
                      <th className="p-3.5">รายละเอียด</th>
                      <th className="p-3.5 text-right">จำนวนที่เปลี่ยน</th>
                      <th className="p-3.5 text-right">คงเหลือหลังทำ</th>
                      <th className="p-3.5">ปลายทาง / ที่มา / สาเหตุ</th>
                      <th className="p-3.5">ผู้ทำรายการ</th>
                      <th className="p-3.5 text-center">รูปถ่ายหลักฐาน</th>
                      <th className="p-3.5 text-center">ยกเลิกรายการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="py-16 text-center text-slate-400">
                          <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p className="font-semibold text-slate-600">ไม่พบรายการเคลื่อนไหวสต็อก</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">ลองปรับตัวกรอง หรือทำรายการสต็อกใหม่</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map(log => {
                        const act = log.actionType || ''
                        const change = parseInt(log.qtyChange, 10) || 0
                        const isPlus = change > 0
                        const hasImages = log.images && log.images.length > 0
                        const firstImg = hasImages ? extractImageUrl(log.images[0]) : ''

                        const typeBadgeClass = needleActionBadgeClass(act)

                        return (
                          <tr key={log.id || log.logId} className="hover:bg-slate-50 transition">
                            <td className="p-3.5 text-xs text-slate-500 whitespace-nowrap">
                              {log.dateAction || log.createdAt?.split('T')[0] || '-'}
                            </td>
                            <td className="p-3.5 font-mono text-xs font-bold text-sky-700">
                              {log.setId}
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${typeBadgeClass}`}>
                                {needleActionLabel(act)}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="font-semibold text-slate-700">{log.stockDetail || 'PM'}</span>
                              {log.remarks && <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{log.remarks}</p>}
                            </td>
                            <td className="p-3.5 text-right font-bold">
                              <span className={isPlus ? 'text-emerald-600' : change < 0 ? 'text-rose-600' : 'text-slate-600'}>
                                {isPlus ? `+${change.toLocaleString()}` : change.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-bold text-slate-800">
                              {log.balanceAfter?.toLocaleString() ?? '-'}
                            </td>
                            <td className="p-3.5 text-xs text-slate-600">
                              {log.targetMachine && <span>เครื่อง: <strong>{log.targetMachine}</strong></span>}
                              {log.sourceFrom && <span>แหล่งที่มา: {log.sourceFrom}</span>}
                              {log.scrapReason && <span className="text-rose-600 font-medium">สาเหตุ: {log.scrapReason}</span>}
                              {!log.targetMachine && !log.sourceFrom && !log.scrapReason && '-'}
                            </td>
                            <td className="p-3.5 text-xs text-slate-700 font-medium">
                              {log.technician || '-'}
                            </td>
                            <td className="p-3.5 text-center">
                              {hasImages ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const mappedImgs = log.images.map(img => ({
                                      url: extractImageUrl(img),
                                      name: typeof img === 'object' && img?.name ? img.name : 'หลักฐาน'
                                    })).filter(i => Boolean(i.url))
                                    setGalleryImages(mappedImgs)
                                    setGalleryTitle(`รูปถ่ายหลักฐาน ${log.logId || log.setId}`)
                                    setGallerySubtitle(`${log.actionType} โดย ${log.technician || 'ช่าง'}`)
                                    setActiveGalleryIndex(0)
                                    setGalleryZoom(1)
                                    setGalleryModalOpen(true)
                                  }}
                                  className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 inline-block hover:opacity-80 transition cursor-pointer"
                                >
                                  <NeedleImage src={firstImg} alt="" size="w160" fallbackSrcs={(log.images || []).slice(1)} className="w-full h-full object-cover" />
                                </button>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              {(() => {
                                if (!isReversibleLedgerAction(act)) {
                                  return <span className="text-slate-300 text-xs">-</span>
                                }
                                const voided = findVoidEntry(historyLogs, log.logId || log.id)
                                if (voided) {
                                  return (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200"
                                      title={`ยกเลิกแล้วเมื่อ ${voided.dateAction || ''} โดย ${voided.technician || ''}`}
                                    >
                                      <RotateCcw className="w-3 h-3" /> ยกเลิกแล้ว
                                    </span>
                                  )
                                }
                                return (
                                  <button
                                    type="button"
                                    onClick={() => { setVoidTarget(log); setVoidReason('') }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer"
                                    title="ยกเลิกรายการนี้ และคืนยอดกลับเข้าชุดเข็ม"
                                  >
                                    <RotateCcw className="w-3 h-3" /> ยกเลิก + คืนยอด
                                  </button>
                                )
                              })()}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: SPARE NEEDLE REQUESTS VIEW */}
        {activeTab === 'spare_requests' && (
          <section className="space-y-4">
            {/* Toolbar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                {/* Status Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { key: 'ALL', label: 'ทั้งหมด', count: spareRequests.length, activeClass: 'bg-slate-800 text-white' },
                    { key: 'PENDING', label: '⏳ รอจัดเตรียม (รอจ่าย)', count: spareRequests.filter(r => r.status === 'PENDING').length, activeClass: 'bg-amber-600 text-white' },
                    { key: 'PREPARED', label: '📦 จัดเตรียมแล้ว (รอรับ)', count: spareRequests.filter(r => r.status === 'PREPARED').length, activeClass: 'bg-blue-600 text-white' },
                    { key: 'COMPLETED', label: '✅ รับเข็มเรียบร้อย', count: spareRequests.filter(r => r.status === 'COMPLETED').length, activeClass: 'bg-emerald-600 text-white' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSpareFilterStatus(tab.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                        spareFilterStatus === tab.key ? `${tab.activeClass} font-bold shadow-xs` : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 font-bold">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search & Keeper Config */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={spareSearchQuery}
                      onChange={(e) => setSpareSearchQuery(e.target.value)}
                      placeholder="ค้นหาเลขที่, เครื่อง, ช่าง..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-sky-500 focus:outline-none transition"
                    />
                    {spareSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setSpareSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateSpareModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ ขอเบิกเข็ม Spare</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeeperConfigModalOpen(true)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                    title="ล็อค LINE USER ID คนคัดเข็มที่จะรับแจ้งเตือนเมื่อมีใบเบิกเข็ม Spare"
                  >
                    <span>🎯 ล็อคคนคัดเข็ม (LINE / TG)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* List / Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-3.5">วันที่ / เวลา</th>
                      <th className="p-3.5">เลขที่ใบเบิก</th>
                      <th className="p-3.5">เครื่องจักร (MC)</th>
                      <th className="p-3.5">ช่างผู้ขอ / กะ</th>
                      <th className="p-3.5">Track ที่ต้องการ</th>
                      <th className="p-3.5">หมายเหตุ</th>
                      <th className="p-3.5">สถานะ</th>
                      <th className="p-3.5 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {spareRequests
                      .filter(r => {
                        if (spareFilterStatus !== 'ALL' && r.status !== spareFilterStatus) return false
                        if (spareSearchQuery) {
                          const q = spareSearchQuery.toLowerCase()
                          const matchNo = (r.request_no || r.id || '').toLowerCase().includes(q)
                          const matchMc = (r.machine_mc || '').toLowerCase().includes(q)
                          const matchTech = (r.technician_name || '').toLowerCase().includes(q)
                          const matchComment = (r.request_comment || '').toLowerCase().includes(q)
                          if (!matchNo && !matchMc && !matchTech && !matchComment) return false
                        }
                        return true
                      })
                      .length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-sm">ไม่พบรายการขอเบิกเข็ม Spare</p>
                          <p className="text-xs text-slate-400 mt-1">ช่างสามารถสแกน QR Code ประจำเครื่องเพื่อส่งคำขอเบิกเข็มได้</p>
                        </td>
                      </tr>
                    ) : (
                      spareRequests
                        .filter(r => {
                          if (spareFilterStatus !== 'ALL' && r.status !== spareFilterStatus) return false
                          if (spareSearchQuery) {
                            const q = spareSearchQuery.toLowerCase()
                            const matchNo = (r.request_no || r.id || '').toLowerCase().includes(q)
                            const matchMc = (r.machine_mc || '').toLowerCase().includes(q)
                            const matchTech = (r.technician_name || '').toLowerCase().includes(q)
                            const matchComment = (r.request_comment || '').toLowerCase().includes(q)
                            if (!matchNo && !matchMc && !matchTech && !matchComment) return false
                          }
                          return true
                        })
                        .map((req) => {
                          const dial = req.tracks_requested?.dial || {}
                          const cyl = req.tracks_requested?.cylinder || {}

                          return (
                            <tr key={req.id} className="hover:bg-slate-50 transition">
                              <td className="p-3.5 text-xs text-slate-500 whitespace-nowrap">
                                {new Date(req.created_at).toLocaleString('th-TH', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </td>
                              <td className="p-3.5 font-mono text-xs font-bold text-indigo-700">
                                {req.request_no || req.id}
                              </td>
                              <td className="p-3.5">
                                <div className="font-bold text-slate-800">{req.machine_mc || '—'}</div>
                                <div className="text-[11px] text-slate-500">
                                  {req.gauge && <span className="text-sky-600 font-semibold">{req.gauge}</span>}
                                  {req.cylinder_serial && <span> · SN: {req.cylinder_serial}</span>}
                                </div>
                              </td>
                              <td className="p-3.5 text-xs text-slate-700">
                                <div className="font-semibold">{req.technician_name}</div>
                                <span className="text-[11px] text-slate-500">{req.shift}</span>
                              </td>
                              <td className="p-3.5">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {dial.single > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold">Dial Single: {dial.single}</span>}
                                  {dial.t1 > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold">Dial T1: {dial.t1}</span>}
                                  {dial.t2 > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold">Dial T2: {dial.t2}</span>}
                                  {(dial.singker > 0 || dial.sinker > 0) && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold">Dial Singker: {dial.singker || dial.sinker}</span>}
                                  {cyl.t1 > 0 && <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-bold">Cyl T1: {cyl.t1}</span>}
                                  {cyl.t2 > 0 && <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-bold">Cyl T2: {cyl.t2}</span>}
                                  {cyl.t3 > 0 && <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-bold">Cyl T3: {cyl.t3}</span>}
                                  {cyl.t4 > 0 && <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-bold">Cyl T4: {cyl.t4}</span>}
                                </div>
                              </td>
                              <td className="p-3.5 text-xs text-slate-600 max-w-xs">
                                {req.request_comment ? (
                                  <p className="line-clamp-2 italic text-amber-800 bg-amber-50/60 p-1 rounded">
                                    "{req.request_comment}"
                                  </p>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="p-3.5 whitespace-nowrap">
                                {req.status === 'PENDING' && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    ⏳ รอจัดเตรียม
                                  </span>
                                )}
                                {req.status === 'PREPARED' && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                    📦 เตรียมแล้ว (รอรับ)
                                  </span>
                                )}
                                {req.status === 'COMPLETED' && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    ✅ รับเข็มเรียบร้อย
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 text-center whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5 justify-center">
                                  {req.status === 'PENDING' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedSpareReq(req)
                                        setPrepareModalOpen(true)
                                      }}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                                      title="จัดเตรียมเข็มและตัดสต็อกออกจากคลัง"
                                    >
                                      <PackageCheck className="w-3.5 h-3.5" />
                                      <span>จัดเตรียม</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedSpareReq(req)
                                        setPrepareModalOpen(true)
                                      }}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                                      title="ดูรายละเอียดการตัดสต็อก"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>ดูข้อมูล</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedEditReq(req)
                                      setEditSpareModalOpen(true)
                                    }}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                                    title="แก้ไขข้อมูลใบเบิกเข็ม"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>แก้ไข</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDeleteReq(req)
                                      setDeleteAckReturned(false)
                                      setDeleteConfirmModalOpen(true)
                                    }}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                                    title={req.issued_items?.length > 0 ? "ลบใบเบิกและคืนเข็มเข้าคลังสต็อกอัตโนมัติ" : "ลบใบเบิก"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>ลบ</span>
                                  </button>
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
          </section>
        )}
      </div>

      {/* ================= MODALS ================= */}

      {/* PREPARE / VIEW SPARE NEEDLE MODAL */}
      {prepareModalOpen && selectedSpareReq && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setPrepareModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedSpareReq.status === 'PENDING' ? (
              <StepPrepareSpareNeedle
                snr={selectedSpareReq}
                cylinder={{ Machine: selectedSpareReq.machine_mc, Gauge: selectedSpareReq.gauge, Serial_NOW: selectedSpareReq.cylinder_serial }}
                onPrepared={(updated) => {
                  setSpareRequests(prev => prev.map(r => r.id === updated.id ? updated : r))
                  loadData(true)
                  setPrepareModalOpen(false)
                  toast.success('จัดเตรียมเข็มและตัดสต็อกเรียบร้อยแล้ว!')
                }}
                onClose={() => setPrepareModalOpen(false)}
              />
            ) : (
              <StepAcknowledgeSpareNeedle
                snr={selectedSpareReq}
                cylinder={{ Machine: selectedSpareReq.machine_mc, Gauge: selectedSpareReq.gauge, Serial_NOW: selectedSpareReq.cylinder_serial }}
                onAcknowledged={(updated) => {
                  setSpareRequests(prev => prev.map(r => r.id === updated.id ? updated : r))
                  loadData(true)
                  setPrepareModalOpen(false)
                  toast.success('บันทึกการรับเข็ม Spare เรียบร้อย!')
                }}
                onHome={() => setPrepareModalOpen(false)}
              />
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 0. NEEDLE KEEPER CONFIG MODAL */}
      <NeedleKeeperConfigModal
        isOpen={keeperConfigModalOpen}
        onClose={() => setKeeperConfigModalOpen(false)}
        onSuccess={() => toast.success('บันทึกการตั้งค่าผู้ดูแลเข็มเรียบร้อยแล้ว')}
      />

      {/* 0.1 CREATE SPARE NEEDLE REQUEST MODAL */}
      <CreateSpareNeedleModal
        isOpen={createSpareModalOpen}
        onClose={() => setCreateSpareModalOpen(false)}
        currentUser={user}
        onSuccess={(newReq) => {
          setSpareRequests((prev) => [newReq, ...prev])
          loadData(true)
          toast.success(`สร้างใบขอเบิกเข็ม ${newReq.request_no || newReq.id} เรียบร้อยแล้ว`)
        }}
      />

      {/* 0.2 EDIT SPARE NEEDLE REQUEST MODAL */}
      <EditSpareNeedleModal
        isOpen={editSpareModalOpen}
        req={selectedEditReq}
        onClose={() => {
          setEditSpareModalOpen(false)
          setSelectedEditReq(null)
        }}
        onSuccess={(updatedReq) => {
          setSpareRequests((prev) => prev.map((r) => (r.id === updatedReq.id ? updatedReq : r)))
          loadData(true)
          toast.success(`อัปเดตใบเบิกเข็ม ${updatedReq.request_no || updatedReq.id} เรียบร้อยแล้ว`)
        }}
      />

      {/* 0.2b LEDGER VOID CONFIRMATION (ยกเลิกรายการ + คืนยอด) */}
      {voidTarget && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => !voidSaving && setVoidTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">ยกเลิกรายการสต็อก &amp; คืนยอด</h3>
                <p className="text-xs text-slate-500 font-mono">{voidTarget.setId} · {voidTarget.logId || voidTarget.id}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs text-slate-700 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">ประเภทรายการ:</span>
                <span className="font-bold">{needleActionLabel(voidTarget.actionType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">จำนวนที่เปลี่ยน:</span>
                <span className={`font-bold ${(parseInt(voidTarget.qtyChange, 10) || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatSignedQty(voidTarget.qtyChange)} เล่ม
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ผู้ทำรายการ:</span>
                <span className="font-semibold">{voidTarget.technician || '—'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
                <span className="text-slate-500">ยอดคงเหลือหลังคืน:</span>
                <span className="font-bold text-amber-700">
                  {Math.max(0, (parseInt(needleSets.find((x) => x.id === voidTarget.setId || x.setId === voidTarget.setId)?.quantity, 10) || 0) - (parseInt(voidTarget.qtyChange, 10) || 0)).toLocaleString()} เล่ม
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-[11px] text-amber-800 leading-relaxed mb-4">
              ระบบจะ <strong>คืนยอดกลับเข้าชุดเข็ม</strong> และบันทึกประวัติการยกเลิกรายการใหม่ (รายการเดิมยังอยู่เพื่อตรวจสอบย้อนหลัง)
            </div>

            <label className="block text-xs font-bold text-slate-700 mb-1.5">เหตุผลในการยกเลิก *</label>
            <input
              className="input w-full mb-5"
              placeholder="เช่น บันทึกจำนวนผิด, เบิกซ้ำ"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={voidSaving}
                onClick={() => setVoidTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={voidSaving || !voidReason.trim()}
                onClick={handleConfirmVoidLedger}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {voidSaving ? (
                  <span>กำลังคืนยอด...</span>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ยืนยันยกเลิก &amp; คืนยอด</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 0.3 DELETE CONFIRMATION MODAL WITH AUTO STOCK RETURN */}
      {deleteConfirmModalOpen && selectedDeleteReq && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => !deleteLoading && setDeleteConfirmModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">ยืนยันการลบใบเบิกเข็ม Spare</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedDeleteReq.request_no || selectedDeleteReq.id}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs text-slate-700 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">เครื่องจักร (MC):</span>
                <span className="font-bold text-slate-800">{selectedDeleteReq.machine_mc || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ช่างผู้ขอ:</span>
                <span className="font-semibold">{selectedDeleteReq.technician_name} ({selectedDeleteReq.shift})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">สถานะ:</span>
                <span className="font-bold">
                  {selectedDeleteReq.status === 'PENDING' && '⏳ รอจัดเตรียม'}
                  {selectedDeleteReq.status === 'PREPARED' && '📦 เตรียมแล้ว (รอรับ)'}
                  {selectedDeleteReq.status === 'COMPLETED' && '✅ รับเข็มเรียบร้อย'}
                </span>
              </div>
            </div>

            {/* Auto Stock Return Alert */}
            {selectedDeleteReq.issued_items && selectedDeleteReq.issued_items.length > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-2 mb-5">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <RotateCw className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>คืนสต็อกเข้าคลังอัตโนมัติ (Auto Stock Return)</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  ใบเบิกนี้ได้ตัดจ่ายเข็มออกจากคลังสต็อกไปแล้ว ระบบจะทำการ <strong>คืนยอดเข็มกลับเข้าคลังสต็อก</strong> และบันทึกประวัติการรับคืน (RETURN_SPARE) ให้ทันที:
                </p>
                <div className="bg-white/80 rounded-lg p-2 border border-amber-200/60 space-y-1">
                  {selectedDeleteReq.issued_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px]">
                      <span className="font-medium text-slate-800">{item.needleModel || item.setId} ({item.grade})</span>
                      <span className="font-bold text-emerald-600">+{item.quantity} ตัว</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mb-5">
                ใบเบิกนี้ยังไม่ได้ตัดจ่ายสต็อกเข็ม การลบจะยกเลิกคำขอนี้โดยไม่มีผลกระทบต่อยอดสต็อก
              </p>
            )}

            {selectedDeleteReq.status === 'COMPLETED' && selectedDeleteReq.issued_items?.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 space-y-2 mb-5">
                <div className="flex items-center gap-1.5 font-bold text-rose-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span>ใบเบิกนี้ช่างรับเข็มไปแล้ว</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  เข็มชุดนี้อยู่ที่เครื่องจักรแล้ว การคืนยอดเข้าคลังจะถูกต้อง <strong>เฉพาะเมื่อได้รับเข็มคืนจากช่างจริง</strong>
                </p>
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deleteAckReturned}
                    onChange={(e) => setDeleteAckReturned(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-rose-600"
                  />
                  <span className="font-semibold">ยืนยันว่ารับเข็มคืนจากช่างแล้ว จึงให้คืนยอดเข้าคลังสต็อก</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeleteConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDeleteSpareRequest}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {deleteLoading ? (
                  <span>กำลังลบ & คืนสต็อก...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ยืนยันลบ {selectedDeleteReq.issued_items?.length > 0 ? '& คืนสต็อก' : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 1. STOCK TRANSACTION MODAL */}
      {stockModalOpen && (
        <StockTransactionModal
          isOpen={stockModalOpen}
          onClose={() => setStockModalOpen(false)}
          currentSet={currentStockSet}
          needleSets={needleSets}
          comboboxStore={comboboxStore}
          onLearnValues={learnValues}
          onSuccess={(updatedSet, newLog) => {
            setNeedleSets(prev => prev.map(s => {
              const isMatch = (
                (s.setId && updatedSet.setId && s.setId === updatedSet.setId) ||
                (s.id && updatedSet.id && s.id === updatedSet.id) ||
                (s.Set_ID && updatedSet.setId && s.Set_ID === updatedSet.setId) ||
                (s.id && updatedSet.setId && s.id === updatedSet.setId) ||
                (s.setId && updatedSet.id && s.setId === updatedSet.id)
              )
              return isMatch ? updatedSet : s
            }))
            if (newLog) setHistoryLogs(prev => [newLog, ...prev])
            setStockModalOpen(false)
            try {
              if (toast && typeof toast.success === 'function') {
                toast.success(`ทำรายการสต็อกชุดเข็ม ${updatedSet.setId} สำเร็จ! ยอดคงเหลือใหม่: ${(parseInt(updatedSet.quantity, 10) || 0).toLocaleString()} เล่ม`)
              }
            } catch {}
          }}
        />
      )}

      {/* 2. ADD NEW NEEDLE SET MODAL */}
      {addModalOpen && (
        <AddNewNeedleSetModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          needleSets={needleSets}
          comboboxStore={comboboxStore}
          onLearnValues={learnValues}
          onSuccess={(newSet) => {
            setNeedleSets(prev => [newSet, ...prev])
            setAddModalOpen(false)
            try {
              if (toast && typeof toast.success === 'function') {
                toast.success(`เพิ่มชุดเข็ม ${newSet.setId} (${newSet.needleModel}) สำเร็จแล้ว!`)
              }
            } catch {}

            // Log the opening stock so the ledger / "รับเข้าสะสม" KPI stay complete
            const openingQty = parseInt(newSet.quantity, 10) || 0
            if (openingQty > 0) {
              const openingLog = {
                id: `LOG-OPEN-${Date.now()}`,
                logId: `LOG-OPEN-${Date.now()}`,
                setId: newSet.setId,
                actionType: 'รับเข้า (Stock In)',
                movementType: 'IN',
                oldGrade: newSet.grade,
                newGrade: newSet.grade,
                conditionDetail: newSet.conditionDetail,
                quantity: openingQty,
                qtyChange: openingQty,
                balanceAfter: openingQty,
                dateAction: new Date().toISOString().slice(0, 10),
                technician: user?.full_name || user?.username || 'ผู้ดูแลสต็อก',
                remarks: `ตั้งต้นสต็อกชุดเข็มใหม่ ${newSet.setId}`,
                images: [],
                createdAt: new Date().toISOString(),
              }
              NeedleHistoryAPI.create(openingLog)
                .then(() => setHistoryLogs(prev => [openingLog, ...prev]))
                .catch((err) => console.warn('Stock opening log warning:', err))
            }
          }}
        />
      )}

      {/* 3. UPDATE GRADE / INSPECT MODAL */}
      {updateModalOpen && currentUpdateSet && (
        <UpdateGradeModal
          isOpen={updateModalOpen}
          onClose={() => setUpdateModalOpen(false)}
          currentSet={currentUpdateSet}
          comboboxStore={comboboxStore}
          onLearnValues={learnValues}
          onSuccess={(updatedSet, newLog) => {
            setNeedleSets(prev => prev.map(s => {
              const isMatch = (
                (s.setId && updatedSet.setId && s.setId === updatedSet.setId) ||
                (s.id && updatedSet.id && s.id === updatedSet.id) ||
                (s.Set_ID && updatedSet.setId && s.Set_ID === updatedSet.setId) ||
                (s.id && updatedSet.setId && s.id === updatedSet.setId) ||
                (s.setId && updatedSet.id && s.setId === updatedSet.id)
              )
              return isMatch ? updatedSet : s
            }))
            if (newLog) setHistoryLogs(prev => [newLog, ...prev])
            setUpdateModalOpen(false)
            try {
              if (toast && typeof toast.success === 'function') {
                toast.success(`อัปเดตเกรด/สภาพชุดเข็ม ${updatedSet.setId} สำเร็จแล้ว!`)
              }
            } catch {}
          }}
        />
      )}

      {/* 4. TIMELINE HISTORY MODAL */}
      {historyModalOpen && currentHistorySet && (
        <TimelineHistoryModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          currentSet={currentHistorySet}
          historyLogs={historyLogs.filter(l => l.setId === currentHistorySet.setId)}
          onViewImage={(imgs, title, sub) => {
            setGalleryImages(imgs)
            setGalleryTitle(title)
            setGallerySubtitle(sub)
            setActiveGalleryIndex(0)
            setGalleryZoom(1)
            setGalleryModalOpen(true)
          }}
        />
      )}

      {/* 5. IMAGE GALLERY & PAN/ZOOM MODAL */}
      {galleryModalOpen && (
        <ImageGalleryModal
          isOpen={galleryModalOpen}
          onClose={() => setGalleryModalOpen(false)}
          images={galleryImages}
          title={galleryTitle}
          subtitle={gallerySubtitle}
          activeIndex={activeGalleryIndex}
          setActiveIndex={setActiveGalleryIndex}
          zoom={galleryZoom}
          setZoom={setGalleryZoom}
          onOpenUpdate={() => {
            if (currentGallerySet) openUpdate(currentGallerySet)
          }}
        />
      )}

      {/* Mobile Floating Action Button (FAB) for Needle Stock */}
      {canAdd && (
        <button
          type="button"
          onClick={() => openStockModal(null)}
          className="btn-fab"
          title="ทำรายการสต็อกเข็ม"
          aria-label="ทำรายการสต็อกเข็ม"
        >
          <ArrowLeftRight size={24} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}


