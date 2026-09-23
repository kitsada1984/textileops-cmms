import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Layers, Package, ScrollText, AlertTriangle, Box, ShieldCheck, CheckCircle2, Clock,
  AlertOctagon, PackageCheck, ArrowDownLeft, ArrowUpRight, SlidersHorizontal, Trash2,
  Search, ChevronRight, X, LayoutGrid, Table, RotateCw, Download, PlusCircle, ArrowLeftRight,
  Edit3, History, Camera, Upload, ZoomIn, ZoomOut, RefreshCw, Check, Sparkles, MapPin,
  ChevronDown, Image as ImageIcon, Eye, Cloud, ExternalLink, CheckCircle
} from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import {
  NeedleSetAPI, NeedleHistoryAPI, normalizeNeedleSet, normalizeNeedleLog
} from '../api/entities'
import { uploadMedia } from '../modules/media/mediaUploader'
import { getDirectImageUrl, isGoogleDriveUrl } from '../utils/imageUrlUtils'
import initialNeedleSetsData from '../data/initialNeedleSets.json'

const NEEDLE_IMAGE_FOLDER = 'Stock-เข็ม'

const MACHINE_TYPES = [
  'Single',
  'Double',
  'Single Jacquard',
  'Double Jacquard',
  'Mecmor Jacquard',
]

const GAUGES = ['16G', '18G', '24G', '28G', '32G', '38G', '44G', '50G']

const GRADES = ['เกรด A', 'เกรด B', 'รอคัดแยก', 'ปลดระวาง']

const LOCATIONS = ['GMK1', 'STORE', 'GMK3']

export default function NeedleStock() {
  const { toast } = useToast()
  const { user } = useAuth()

  // Main state
  const [needleSets, setNeedleSets] = useState([])
  const [historyLogs, setHistoryLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Navigation & View state
  const [activeTab, setActiveTab] = useState('inventory') // 'inventory' | 'ledger'
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'

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
  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true)
      else setLoading(true)

      const [setsData, logsData] = await Promise.all([
        NeedleSetAPI.list(),
        NeedleHistoryAPI.list(),
      ])

      const validSets = Array.isArray(setsData) && setsData.length > 0
        ? setsData
        : (initialNeedleSetsData || []).map(normalizeNeedleSet)

      setNeedleSets(validSets)
      setHistoryLogs(Array.isArray(logsData) ? logsData : [])

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
      toast.error('ไม่สามารถโหลดข้อมูลสต็อกเข็มได้: ' + err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

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

    // Ledger movements KPI
    let totalReceived = 0
    let totalIssued = 0
    let totalScrappedAccum = 0

    historyLogs.forEach(l => {
      const act = l.actionType || ''
      const change = Math.abs(parseInt(l.qtyChange, 10) || 0)
      if (act.includes('รับเข้า') || act.includes('Stock In')) {
        totalReceived += change
      } else if (act.includes('เบิกออก') || act.includes('Stock Out')) {
        totalIssued += change
      } else if (act.includes('ตัดทิ้ง') || act.includes('Scrap') || act.includes('ปลดระวาง')) {
        totalScrappedAccum += change
      }
    })

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
      if (ledgerTypeFilter === 'in' && !act.includes('รับเข้า') && !act.includes('Stock In')) return false
      if (ledgerTypeFilter === 'out' && !act.includes('เบิกออก') && !act.includes('Stock Out')) return false
      if (ledgerTypeFilter === 'adjust' && !act.includes('ตัดยอด') && !act.includes('Adjustment')) return false
      if (ledgerTypeFilter === 'scrap' && !act.includes('ตัดทิ้ง') && !act.includes('Scrap')) return false

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
      ? set.images.map(img => typeof img === 'string' ? { url: img, name: 'รูปภาพ' } : img)
      : [{ url: `https://placehold.co/800x600/e2e8f0/64748b?text=ยังไม่มีรูปภาพ+${set.setId}`, name: 'ยังไม่มีรูปภาพ' }]

    setGalleryImages(imgs)
    setGalleryTitle(`รูปภาพชุดเข็ม ${set.setId} (${set.machineId || 'ไม่ระบุ'})`)
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

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RotateCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={activeTab === 'inventory' ? exportSetsCSV : exportLedgerCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => openStockModal(null)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition shadow-blue-500/20 cursor-pointer"
            title="ทำรายการสต็อกเข็ม (เบิกออก / รับเข้า / ตัดยอด / ตัดทิ้ง)"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>ทำรายการสต็อก</span>
          </button>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition shadow-sky-600/30 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>เพิ่มชุดเข็มใหม่</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="w-full space-y-5">
        {/* TABS: INVENTORY vs LEDGER */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3" role="tablist">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Package className="w-4 h-4 text-sky-600" />
            <span>รายการชุดเข็ม & สต็อก</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 font-semibold">
              {needleSets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-white text-slate-900 border border-slate-200 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <ScrollText className="w-4 h-4 text-slate-500" />
            <span>สมุดบันทึกการเคลื่อนไหวสต็อก (Ledger)</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              {historyLogs.length}
            </span>
          </button>
        </div>

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
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Needles */}
          <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">เข็มทั้งหมดในระบบ</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{kpis.totalNeedles.toLocaleString()}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{kpis.totalSets} ชุดเข็ม</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Box className="w-6 h-6" />
            </div>
          </div>

          {/* Grade A */}
          <div
            onClick={() => { setActiveTab('inventory'); setFilterGrade(filterGrade === 'เกรด A' ? '' : 'เกรด A') }}
            className={`bg-gradient-to-br from-emerald-50 to-white p-4 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition ${
              filterGrade === 'เกรด A' ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-emerald-200 hover:border-emerald-400'
            }`}
          >
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <p className="text-xs font-medium text-emerald-800">เกรด A (พร้อมใช้)</p>
              </div>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{kpis.gradeAQty.toLocaleString()}</h3>
              <p className="text-[11px] text-emerald-600 mt-0.5">{kpis.gradeASets} ชุด</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Grade B */}
          <div
            onClick={() => { setActiveTab('inventory'); setFilterGrade(filterGrade === 'เกรด B' ? '' : 'เกรด B') }}
            className={`bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition ${
              filterGrade === 'เกรด B' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-200 hover:border-blue-400'
            }`}
          >
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <p className="text-xs font-medium text-blue-800">เกรด B (คัดแล้ว)</p>
              </div>
              <h3 className="text-2xl font-bold text-blue-700 mt-1">{kpis.gradeBQty.toLocaleString()}</h3>
              <p className="text-[11px] text-blue-600 mt-0.5">{kpis.gradeBSets} ชุด</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Pending Sorting */}
          <div
            onClick={() => { setActiveTab('inventory'); setFilterGrade(filterGrade === 'รอคัดแยก' ? '' : 'รอคัดแยก') }}
            className={`bg-gradient-to-br from-amber-50 to-white p-4 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition ${
              filterGrade === 'รอคัดแยก' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-amber-200 hover:border-amber-400'
            }`}
          >
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <p className="text-xs font-medium text-amber-800">รอคัดแยก</p>
              </div>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">{kpis.waitQty.toLocaleString()}</h3>
              <p className="text-[11px] text-amber-600 mt-0.5">{kpis.waitSets} ชุด</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Scrap */}
          <div
            onClick={() => { setActiveTab('inventory'); setFilterGrade(filterGrade === 'ปลดระวาง' ? '' : 'ปลดระวาง') }}
            className={`bg-gradient-to-br from-rose-50 to-white p-4 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition ${
              filterGrade === 'ปลดระวาง' ? 'border-rose-500 ring-2 ring-rose-200' : 'border-rose-200 hover:border-rose-400'
            }`}
          >
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <p className="text-xs font-medium text-rose-800">ปลดระวาง</p>
              </div>
              <h3 className="text-2xl font-bold text-rose-700 mt-1">{kpis.scrapQty.toLocaleString()}</h3>
              <p className="text-[11px] text-rose-600 mt-0.5">{kpis.scrapSets} ชุด</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertOctagon className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* STOCK ACTIVITY STRIP */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">สต็อกพร้อมใช้ (A+B)</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mt-0.5">{kpis.totalAvailable.toLocaleString()}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">เข็มสภาพใช้งานได้</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50/80 to-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">รับเข้าสะสม (In)</p>
              <h3 className="text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5">{kpis.totalReceived.toLocaleString()}</h3>
              <p className="text-[10px] text-emerald-600 mt-0.5">เล่มที่นำเข้าคลัง</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50/80 to-white p-3.5 sm:p-4 rounded-2xl border border-blue-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">เบิกออกสะสม (Out)</p>
              <h3 className="text-xl sm:text-2xl font-bold text-blue-700 mt-0.5">{kpis.totalIssued.toLocaleString()}</h3>
              <p className="text-[10px] text-blue-600 mt-0.5">เล่มที่ขึ้นเครื่อง</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => { setActiveTab('inventory'); setOnlyLowStock(prev => !prev) }}
            className="bg-gradient-to-br from-amber-50/80 to-white p-3.5 sm:p-4 rounded-2xl border border-amber-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
          >
            <div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">สต็อกเหลือน้อย</p>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-amber-700 mt-0.5">{kpis.lowStockCount} ชุด</h3>
              <p className="text-[10px] text-amber-600 mt-0.5">ตัดทิ้งสะสม: {kpis.totalScrappedAccum.toLocaleString()} เล่ม</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </section>

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
                  const mainImg = hasImages ? (typeof item.images[0] === 'string' ? item.images[0] : item.images[0].url) : ''
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
                              <img
                                src={getDirectImageUrl(mainImg, 'w600')}
                                alt={item.needleModel}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                onError={(e) => {
                                  e.target.src = `https://placehold.co/600x400/e2e8f0/64748b?text=เข็ม+${item.machineId || item.setId}`
                                }}
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
                        <div className="flex items-center space-x-2 text-xs bg-slate-50 border border-slate-200/70 px-2.5 py-1.5 rounded-xl min-h-[34px]">
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
                        const mainImg = hasImages ? (typeof item.images[0] === 'string' ? item.images[0] : item.images[0].url) : ''
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
                                    <img src={getDirectImageUrl(mainImg, 'w160')} alt="" className="w-full h-full object-cover" />
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
                        const firstImg = hasImages ? (typeof log.images[0] === 'string' ? log.images[0] : log.images[0].url) : ''

                        let typeBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200'
                        if (act.includes('รับเข้า') || act.includes('Stock In')) {
                          typeBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold'
                        } else if (act.includes('เบิกออก') || act.includes('Stock Out')) {
                          typeBadgeClass = 'bg-blue-100 text-blue-800 border-blue-200 font-bold'
                        } else if (act.includes('ตัดยอด') || act.includes('Adjustment')) {
                          typeBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200 font-bold'
                        } else if (act.includes('ตัดทิ้ง') || act.includes('Scrap')) {
                          typeBadgeClass = 'bg-rose-100 text-rose-800 border-rose-200 font-bold'
                        }

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
                                {act}
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
                                    setGalleryImages(log.images.map(img => typeof img === 'string' ? { url: img, name: 'หลักฐาน' } : img))
                                    setGalleryTitle(`รูปถ่ายหลักฐาน ${log.logId || log.setId}`)
                                    setGallerySubtitle(`${log.actionType} โดย ${log.technician || 'ช่าง'}`)
                                    setActiveGalleryIndex(0)
                                    setGalleryZoom(1)
                                    setGalleryModalOpen(true)
                                  }}
                                  className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 inline-block hover:opacity-80 transition cursor-pointer"
                                >
                                  <img src={getDirectImageUrl(firstImg, 'w160')} alt="" className="w-full h-full object-cover" />
                                </button>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
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
            setNeedleSets(prev => prev.map(s => s.setId === updatedSet.setId ? updatedSet : s))
            setHistoryLogs(prev => [newLog, ...prev])
            setStockModalOpen(false)
            toast.success(`ทำรายการสต็อกชุดเข็ม ${updatedSet.setId} สำเร็จ! ยอดคงเหลือใหม่: ${updatedSet.quantity.toLocaleString()} เล่ม`)
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
            toast.success(`เพิ่มชุดเข็ม ${newSet.setId} (${newSet.needleModel}) สำเร็จแล้ว!`)
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
            setNeedleSets(prev => prev.map(s => s.setId === updatedSet.setId ? updatedSet : s))
            if (newLog) setHistoryLogs(prev => [newLog, ...prev])
            setUpdateModalOpen(false)
            toast.success(`อัปเดตเกรด/สภาพชุดเข็ม ${updatedSet.setId} สำเร็จแล้ว!`)
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
        />
      )}
    </div>
  )
}

/* =========================================================================
   SUB-MODALS IMPLEMENTATION
   ========================================================================= */

/**
 * 1. Stock Transaction Modal (IN, OUT, ADJUST, SCRAP)
 */
function StockTransactionModal({ isOpen, onClose, currentSet, needleSets, comboboxStore, onLearnValues, onSuccess }) {
  const [selectedSetId, setSelectedSetId] = useState(currentSet?.setId || needleSets[0]?.setId || '')
  const [movementType, setMovementType] = useState('OUT') // 'IN' | 'OUT' | 'ADJUST' | 'SCRAP'
  const [quantity, setQuantity] = useState('')
  const [isDirectCount, setIsDirectCount] = useState(false)
  const [targetMachine, setTargetMachine] = useState(currentSet?.machineId || '')
  const [shiftPurpose, setShiftPurpose] = useState('กะเช้า (งานประจำ)')
  const [sourceFrom, setSourceFrom] = useState('สั่งซื้อของใหม่ (PO)')
  const [adjustReason, setAdjustReason] = useState('ตรวจนับสต็อกประจำเดือน (ยอดจริงไม่ตรง)')
  const [scrapReason, setScrapReason] = useState('เข็มหัก (ลิ้นเข็ม/ตัวเข็มหัก)')
  const [stockDetail, setStockDetail] = useState('PM')
  const [technician, setTechnician] = useState('tuk')
  const [dateAction, setDateAction] = useState(new Date().toISOString().split('T')[0])
  const [remarks, setRemarks] = useState('')
  const [attachedFiles, setAttachedFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const activeSet = useMemo(() => {
    return needleSets.find(s => s.setId === selectedSetId) || currentSet
  }, [needleSets, selectedSetId, currentSet])

  useEffect(() => {
    if (activeSet) {
      if (!targetMachine) setTargetMachine(activeSet.machineId || '')
    }
  }, [activeSet])

  const currentQty = parseInt(activeSet?.quantity, 10) || 0
  const inputQtyNum = parseInt(quantity, 10)

  // Realtime calculation
  let newBalance = currentQty
  let diffText = ''
  let isError = false

  if (!isNaN(inputQtyNum) && inputQtyNum >= 0) {
    if (movementType === 'IN') {
      newBalance = currentQty + inputQtyNum
      diffText = `+${inputQtyNum.toLocaleString()}`
    } else if (movementType === 'OUT') {
      if (inputQtyNum > currentQty) {
        isError = true
        diffText = `สต็อกไม่พอเบิก (ขาด ${(inputQtyNum - currentQty).toLocaleString()})`
      } else {
        newBalance = currentQty - inputQtyNum
        diffText = `-${inputQtyNum.toLocaleString()}`
      }
    } else if (movementType === 'ADJUST') {
      if (isDirectCount) {
        newBalance = inputQtyNum
        const diff = newBalance - currentQty
        diffText = diff >= 0 ? `ผลต่าง: +${diff.toLocaleString()}` : `ผลต่าง: ${diff.toLocaleString()}`
      } else {
        if (inputQtyNum > currentQty) {
          isError = true
          diffText = 'ยอดตัดเกินสต็อกคงเหลือ'
        } else {
          newBalance = currentQty - inputQtyNum
          diffText = `-${inputQtyNum.toLocaleString()}`
        }
      }
    } else if (movementType === 'SCRAP') {
      if (inputQtyNum > currentQty) {
        isError = true
        diffText = 'ยอดตัดทิ้งเกินสต็อกคงเหลือ'
      } else {
        newBalance = currentQty - inputQtyNum
        diffText = `-${inputQtyNum.toLocaleString()}`
      }
    }
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!activeSet) return
    if (isNaN(inputQtyNum) || inputQtyNum < 0) {
      alert('กรุณากรอกจำนวนให้ถูกต้อง')
      return
    }
    if ((movementType === 'OUT' || movementType === 'SCRAP') && inputQtyNum <= 0) {
      alert('จำนวนต้องมากกว่า 0')
      return
    }
    if (isError) {
      alert('ยอดที่ระบุไม่ถูกต้อง ไม่สามารถทำรายการได้')
      return
    }
    if (!technician.trim()) {
      alert('กรุณาระบุชื่อช่างผู้ทำรายการ')
      return
    }

    try {
      setSubmitting(true)
      onLearnValues({ targetMachine, technician, stockDetail })

      // Upload photos if any
      const uploadedImages = []
      for (const file of attachedFiles) {
        try {
          const res = await uploadMedia(file, { folderName: NEEDLE_IMAGE_FOLDER, fallbackToLocal: true })
          uploadedImages.push({ url: res.imageUrl || res.url, name: file.name })
        } catch (uploadErr) {
          console.warn('Image upload error:', uploadErr)
        }
      }

      let actionLabel = ''
      let qtyChange = 0
      if (movementType === 'IN') {
        actionLabel = 'รับเข้า (Stock In)'
        qtyChange = inputQtyNum
      } else if (movementType === 'OUT') {
        actionLabel = 'เบิกออก (Stock Out)'
        qtyChange = -inputQtyNum
      } else if (movementType === 'ADJUST') {
        actionLabel = 'ตัดยอด (Adjustment)'
        qtyChange = isDirectCount ? (newBalance - currentQty) : -inputQtyNum
      } else if (movementType === 'SCRAP') {
        actionLabel = 'ตัดทิ้ง (Scrap)'
        qtyChange = -inputQtyNum
      }

      const updatedSetData = {
        ...activeSet,
        quantity: Math.max(0, newBalance),
        status: newBalance === 0 ? 'หมดสต็อก' : newBalance <= 100 ? 'สต็อกเหลือน้อย' : 'พร้อมใช้งาน',
      }

      const newLogData = {
        id: `LOG-${Date.now()}`,
        logId: `LOG-${Date.now()}`,
        setId: activeSet.setId,
        actionType: actionLabel,
        movementType,
        oldGrade: activeSet.grade,
        newGrade: activeSet.grade,
        conditionDetail: activeSet.conditionDetail,
        quantity: Math.max(0, newBalance),
        qtyChange,
        balanceAfter: Math.max(0, newBalance),
        dateAction,
        technician: technician.trim(),
        targetMachine: movementType === 'OUT' ? targetMachine.trim() : '',
        sourceFrom: movementType === 'IN' ? sourceFrom : '',
        scrapReason: movementType === 'SCRAP' ? scrapReason : (movementType === 'ADJUST' ? adjustReason : ''),
        stockDetail: stockDetail.trim(),
        remarks: remarks.trim(),
        images: uploadedImages,
        createdAt: new Date().toISOString(),
      }

      // Persist to API
      await Promise.all([
        NeedleSetAPI.update(activeSet.id || activeSet.setId, updatedSetData),
        NeedleHistoryAPI.create(newLogData),
      ])

      onSuccess(updatedSetData, newLogData)
    } catch (err) {
      console.error('Stock transaction failed:', err)
      alert('บันทึกรายการสต็อกไม่สำเร็จ: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className={`px-5 py-4 text-white flex justify-between items-center transition-colors duration-200 ${
          movementType === 'IN' ? 'bg-emerald-900' :
          movementType === 'OUT' ? 'bg-slate-900' :
          movementType === 'ADJUST' ? 'bg-amber-950' : 'bg-rose-950'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-base font-bold">
                {movementType === 'IN' ? 'รับเข้าสต็อกเข็ม (Stock In)' :
                 movementType === 'OUT' ? 'เบิกออกสต็อกเข็ม (Stock Out)' :
                 movementType === 'ADJUST' ? 'ตัดยอด / ปรับปรุงสต็อก (Adjustment)' : 'ตัดทิ้ง / ปลดระวาง (Scrap)'}
              </h4>
              <p className="text-xs text-slate-300">
                {movementType === 'IN' ? 'บันทึกการรับเข็มใหม่หรือรับคืนจากเครื่องเข้าสู่คลัง' :
                 movementType === 'OUT' ? 'บันทึกการเบิกเข็มไปใช้งานตามเครื่องจักรและกะทำงาน' :
                 movementType === 'ADJUST' ? 'บันทึกผลการตรวจนับจริง หรือปรับปรุงยอดสูญหาย' : 'บันทึกเข็มชำรุด หัก งอ สึกหรอ เพื่อตัดออกจากระบบ'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Set Selector & Stock callout */}
        <div className="px-5 pt-4 pb-2 bg-slate-50/80 border-b border-slate-200 space-y-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">เลือกชุดเข็มที่ต้องการทำรายการ *</label>
            <select
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {needleSets.map(s => (
                <option key={s.setId} value={s.setId}>
                  {s.setId} - {s.machineId || 'ไม่ระบุ MC'} ({s.needleModel}) [คงเหลือ: {s.quantity} เล่ม]
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">ชุดเข็มที่เลือก</span>
              <span className="font-bold text-slate-800 text-xs sm:text-sm font-mono">{activeSet?.setId}</span>
              <span className="text-xs text-slate-500 ml-1.5">{activeSet?.machineId} • {activeSet?.machineType} {activeSet?.gauge} ({activeSet?.grade})</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">ยอดคงเหลือปัจจุบัน</span>
              <span className="text-base sm:text-lg font-black text-sky-700">{currentQty.toLocaleString()}</span>
              <span className="text-xs text-slate-500 ml-0.5">เล่ม</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {/* Segmented Control for Movement Type */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">เลือกประเภทการทำรายการ *</label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMovementType('IN')}
                className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer ${
                  movementType === 'IN' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>รับเข้า</span>
              </button>
              <button
                type="button"
                onClick={() => setMovementType('OUT')}
                className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer ${
                  movementType === 'OUT' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                <span>เบิกออก</span>
              </button>
              <button
                type="button"
                onClick={() => setMovementType('ADJUST')}
                className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer ${
                  movementType === 'ADJUST' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                <span>ตัดยอด</span>
              </button>
              <button
                type="button"
                onClick={() => setMovementType('SCRAP')}
                className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer ${
                  movementType === 'SCRAP' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>ตัดทิ้ง</span>
              </button>
            </div>
          </div>

          {/* Quantity Input & Chips */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700">
                {movementType === 'IN' ? 'จำนวนที่ต้องการรับเข้า (เล่ม) *' :
                 movementType === 'OUT' ? 'จำนวนที่ต้องการเบิก (เล่ม) *' :
                 movementType === 'ADJUST' ? (isDirectCount ? 'ยอดตรวจนับได้จริง (เล่ม) *' : 'จำนวนที่ต้องการปรับลด (เล่ม) *') :
                 'จำนวนที่ต้องการตัดทิ้ง (เล่ม) *'}
              </label>
              <div className="flex items-center space-x-1 text-[11px]">
                <button type="button" onClick={() => setQuantity(50)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium cursor-pointer">50</button>
                <button type="button" onClick={() => setQuantity(100)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium cursor-pointer">100</button>
                <button type="button" onClick={() => setQuantity(500)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium cursor-pointer">500</button>
                <button type="button" onClick={() => setQuantity(currentQty)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium cursor-pointer">ทั้งหมด</button>
              </div>
            </div>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              min="0"
              placeholder="กรอกจำนวน เช่น 100"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
            />
          </div>

          {/* ADJUST Direct Count Toggle */}
          {movementType === 'ADJUST' && (
            <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between">
              <span className="text-xs text-amber-900 font-medium">ต้องการกรอกเป็น "ยอดที่ตรวจนับได้จริง" ใช่หรือไม่?</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDirectCount}
                  onChange={(e) => setIsDirectCount(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          )}

          {/* Realtime Calculation Preview Box */}
          <div className={`p-3 rounded-xl border text-xs transition-all ${
            isError ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-slate-600">
              <span>ยอดเดิม: <strong className="text-slate-800 font-bold">{currentQty.toLocaleString()}</strong></span>
              <span className={`font-bold ${isError ? 'text-rose-600' : 'text-slate-600'}`}>
                {diffText || 'รอระบุจำนวน'}
              </span>
              <span>คงเหลือใหม่: <strong className="text-slate-800 font-bold">{Math.max(0, newBalance).toLocaleString()}</strong> เล่ม</span>
            </div>
          </div>

          {/* Type-Specific Fields */}
          {movementType === 'OUT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">เบิกไปใส่เครื่องจักร (Machine ID) *</label>
                <input
                  type="text"
                  value={targetMachine}
                  onChange={(e) => setTargetMachine(e.target.value)}
                  placeholder="พิมพ์หรือเลือกเบอร์เครื่อง"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">กะ / วัตถุประสงค์การเบิก</label>
                <select
                  value={shiftPurpose}
                  onChange={(e) => setShiftPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="กะเช้า (งานประจำ)">กะเช้า (งานประจำ)</option>
                  <option value="กะดึก (งานประจำ)">กะดึก (งานประจำ)</option>
                  <option value="เปลี่ยนรอบผลิต (Order ใหม่)">เปลี่ยนรอบผลิต (Order ใหม่)</option>
                  <option value="เปลี่ยนแทนเข็มชำรุด">เปลี่ยนแทนเข็มชำรุด</option>
                  <option value="ทดสอบเครื่องจักร">ทดสอบเครื่องจักร</option>
                </select>
              </div>
            </div>
          )}

          {movementType === 'IN' && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">แหล่งที่มาของเข็มที่รับเข้า *</label>
              <select
                value={sourceFrom}
                onChange={(e) => setSourceFrom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="สั่งซื้อของใหม่ (PO)">สั่งซื้อของใหม่ (PO)</option>
                <option value="รับคืนจากเครื่องจักร">รับคืนจากเครื่องจักร (ถอดออก)</option>
                <option value="รับจากการคัดเกรด">รับจากการคัดเกรดเสร็จสิ้น</option>
                <option value="โอนย้ายจากคลังกลาง">โอนย้ายจากคลังกลาง</option>
              </select>
            </div>
          )}

          {movementType === 'ADJUST' && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">สาเหตุการปรับยอด / ตัดยอด *</label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="ตรวจนับสต็อกประจำเดือน (ยอดจริงไม่ตรง)">ตรวจนับสต็อกประจำเดือน (ยอดจริงไม่ตรง)</option>
                <option value="ตัดยอดเข็มสูญหาย">ตัดยอดเข็มสูญหาย</option>
                <option value="ปรับปรุงยอดตามรายการบัญชี">ปรับปรุงยอดตามรายการบัญชี</option>
                <option value="แก้ไขยอดที่บันทึกผิดพลาดก่อนหน้า">แก้ไขยอดที่บันทึกผิดพลาดก่อนหน้า</option>
              </select>
            </div>
          )}

          {movementType === 'SCRAP' && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">สาเหตุการตัดทิ้ง / ปลดระวาง *</label>
              <select
                value={scrapReason}
                onChange={(e) => setScrapReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="เข็มหัก (ลิ้นเข็ม/ตัวเข็มหัก)">เข็มหัก (ลิ้นเข็ม/ตัวเข็มหัก)</option>
                <option value="เข็มงอ/บิดตัวผิดรูป">เข็มงอ/บิดตัวผิดรูป</option>
                <option value="สึกหรอเกินเกณฑ์ใช้งาน">สึกหรอเกินเกณฑ์ใช้งาน</option>
                <option value="สนิมเกาะผิวเข็ม">สนิมเกาะผิวเข็ม</option>
                <option value="ตกร่อง/ลิ้นเข็มไม่ดีดกลับ">ตกร่อง/ลิ้นเข็มไม่ดีดกลับ</option>
                <option value="สปริงหลุด/ชำรุด">สปริงหลุด/ชำรุด</option>
              </select>
            </div>
          )}

          {/* Common Fields: Detail (PM/SPARE) & Technician */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-slate-700">รายละเอียด *</label>
                <div className="flex items-center space-x-1 text-[11px]">
                  <button type="button" onClick={() => setStockDetail('PM')} className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-semibold cursor-pointer border border-indigo-200/60 transition">PM</button>
                  <button type="button" onClick={() => setStockDetail('SPARE')} className="px-2 py-0.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-md font-semibold cursor-pointer border border-cyan-200/60 transition">SPARE</button>
                </div>
              </div>
              <input
                type="text"
                value={stockDetail}
                onChange={(e) => setStockDetail(e.target.value)}
                placeholder="เลือก 'PM', 'SPARE' หรือกรอกเอง"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">ชื่อช่าง / ผู้ทำรายการ *</label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="ระบุชื่อช่าง"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Common Fields: Date & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">วันที่ทำรายการ</label>
              <input
                type="date"
                value={dateAction}
                onChange={(e) => setDateAction(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Photos Upload Section */}
          <div className="border border-dashed border-sky-300 rounded-2xl p-3.5 bg-sky-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-sky-600" />
                  <span>แนบรูปถ่ายหลักฐาน (ถ้ามี)</span>
                  <span className="inline-flex items-center space-x-1 text-[11px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-normal">
                    <Cloud className="w-3 h-3" />
                    <span>Google Drive: {NEEDLE_IMAGE_FOLDER}</span>
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">รูปเข็มชำรุด, สภาพเข็มที่รับเข้า/เบิกออก จัดเก็บลง Google Drive โฟลเดอร์: {NEEDLE_IMAGE_FOLDER}</p>
              </div>
              <label className="cursor-pointer px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-medium inline-flex items-center space-x-1 shadow-xs transition">
                <Upload className="w-3.5 h-3.5" />
                <span>เลือกรูป</span>
                <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachedFiles.map((f, idx) => {
                  const previewUrl = URL.createObjectURL(f)
                  return (
                    <div key={idx} className="relative w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 group">
                      <img src={previewUrl} alt={f.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                        <span className="text-[9px] text-white text-center truncate">{f.name}</span>
                      </div>
                      <span className="absolute bottom-0.5 left-0.5 bg-blue-600/90 text-white rounded px-1 py-0.2 text-[8px] flex items-center space-x-0.5 shadow-xs">
                        <Cloud className="w-2.5 h-2.5" />
                        <span>Drive</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting || isError}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{attachedFiles.length > 0 ? 'กำลังบันทึกรูปภาพลง Google Drive...' : 'กำลังบันทึก...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>ยืนยันทำรายการ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * 2. Add New Needle Set Modal
 */
function AddNewNeedleSetModal({ isOpen, onClose, needleSets, comboboxStore, onLearnValues, onSuccess }) {
  const [machineType, setMachineType] = useState('Single')
  const [gauge, setGauge] = useState('28G')
  const [machineId, setMachineId] = useState('')
  const [brand, setBrand] = useState('')
  const [needleModel, setNeedleModel] = useState('')
  const [grade, setGrade] = useState('เกรด B')
  const [conditionDetail, setConditionDetail] = useState('สภาพปานกลาง')
  const [quantity, setQuantity] = useState('')
  const [inspector, setInspector] = useState('tuk')
  const [location, setLocation] = useState('STORE')
  const [remarks, setRemarks] = useState('')
  const [attachedFiles, setAttachedFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)

  // Smart suggestions for needle models based on selected machine type and gauge
  const modelSuggestions = useMemo(() => {
    const list = []
    needleSets.forEach(s => {
      if (s.machineType === machineType && s.gauge === gauge && s.needleModel && !list.includes(s.needleModel)) {
        list.push(s.needleModel)
      }
    })
    return list
  }, [needleSets, machineType, gauge])

  // Smart autofill when choosing machineId
  const handleMachineIdChange = (val) => {
    setMachineId(val)
    const existing = needleSets.find(s => s.machineId && s.machineId.trim().toLowerCase() === val.trim().toLowerCase())
    if (existing) {
      if (existing.machineType) setMachineType(existing.machineType)
      if (existing.gauge) setGauge(existing.gauge)
      if (existing.brand && !brand) setBrand(existing.brand)
      if (existing.needleModel && !needleModel) setNeedleModel(existing.needleModel)
    }
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!needleModel.trim()) {
      alert('กรุณาระบุรหัสรุ่นเข็ม')
      return
    }
    const qtyNum = parseInt(quantity, 10)
    if (isNaN(qtyNum) || qtyNum < 0) {
      alert('กรุณาระบุจำนวนเข็มให้ถูกต้อง')
      return
    }

    try {
      setSubmitting(true)
      onLearnValues({ machineId, brand, needleModel, conditionDetail, inspector })

      // Upload photos
      const uploadedImages = []
      for (const file of attachedFiles) {
        try {
          const res = await uploadMedia(file, { folderName: NEEDLE_IMAGE_FOLDER, fallbackToLocal: true })
          uploadedImages.push({ url: res.imageUrl || res.url, name: file.name })
        } catch (uploadErr) {
          console.warn('Image upload error:', uploadErr)
        }
      }

      // Generate Set ID: NS-0202...
      const nextNum = String(needleSets.length + 1).padStart(4, '0')
      const newSetId = `NS-${nextNum}`

      const newSetRecord = normalizeNeedleSet({
        id: newSetId,
        setId: newSetId,
        machineType,
        gauge,
        machineId: machineId.trim(),
        brand: brand.trim(),
        needleModel: needleModel.trim(),
        grade,
        conditionDetail: conditionDetail.trim(),
        status: qtyNum === 0 ? 'หมดสต็อก' : qtyNum <= 100 ? 'สต็อกเหลือน้อย' : 'พร้อมใช้งาน',
        quantity: qtyNum,
        dateRecorded: new Date().toISOString().split('T')[0],
        inspector: inspector.trim(),
        remarks: remarks.trim(),
        images: uploadedImages,
        location,
      })

      await NeedleSetAPI.create(newSetRecord)
      onSuccess(newSetRecord)
    } catch (err) {
      console.error('Failed to create needle set:', err)
      alert('บันทึกชุดเข็มไม่สำเร็จ: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-sky-700 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <PlusCircle className="w-5 h-5 text-sky-200" />
            <h4 className="text-base font-bold">บันทึกชุดเข็มใหม่เข้าระบบ</h4>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-sky-200 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Machine Type */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">ประเภทเครื่องจักร *</label>
              <select
                value={machineType}
                onChange={(e) => setMachineType(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
              >
                {MACHINE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Gauge */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">เบอร์เกจ (Gauge) *</label>
              <select
                value={gauge}
                onChange={(e) => setGauge(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
              >
                {GAUGES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Machine ID */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">รหัสเครื่องจักร (Machine ID) *</label>
              <input
                type="text"
                value={machineId}
                onChange={(e) => handleMachineIdChange(e.target.value)}
                placeholder="เช่น MC-01, MC-14"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">ยี่ห้อ / ผู้ผลิต</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="เช่น MAYER&CIE, GROZ-BECKERT"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
              />
            </div>

            {/* Needle Model */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-slate-700">รหัสรุ่นเข็ม / ชนิดเข็ม *</label>
                {modelSuggestions.length > 0 && (
                  <span className="text-[11px] text-amber-600 flex items-center">
                    <Sparkles className="w-3 h-3 mr-1" />
                    แนะนำสำหรับ {machineType} {gauge}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={needleModel}
                onChange={(e) => setNeedleModel(e.target.value)}
                placeholder="เช่น WO 146.41 G 01"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition font-medium"
              />
              {modelSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {modelSuggestions.slice(0, 4).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setNeedleModel(m)}
                      className="px-2 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-medium border border-sky-200 transition"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Grade */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">เกรดเข็ม *</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
              >
                {GRADES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Condition Detail */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">ลักษณะสภาพเข็ม</label>
              <input
                type="text"
                value={conditionDetail}
                onChange={(e) => setConditionDetail(e.target.value)}
                placeholder="เช่น สภาพดี, สึกหรอปานกลาง"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">จำนวน (เล่ม) *</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="เช่น 660, 1320"
                required
                min="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Inspector */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">ชื่อช่าง / ผู้บันทึก *</label>
              <input
                type="text"
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                placeholder="เช่น tuk"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">ตำแหน่งจัดเก็บ (Location)</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
              >
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Remarks */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="เช่น เข็มเรียง 1214, งาน Cotton"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Photos Upload Section */}
          <div className="border border-dashed border-sky-300 rounded-2xl p-4 bg-sky-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-sky-600" />
                  <span>รูปภาพประกอบชุดเข็ม (ถ่ายจากกล้อง หรือเลือกไฟล์)</span>
                  <span className="inline-flex items-center space-x-1 text-[11px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-normal">
                    <Cloud className="w-3 h-3" />
                    <span>Google Drive: {NEEDLE_IMAGE_FOLDER}</span>
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">อัปโหลดได้หลายรูป จัดเก็บลง Google Drive โฟลเดอร์: {NEEDLE_IMAGE_FOLDER}</p>
              </div>
              <label className="cursor-pointer px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-medium inline-flex items-center space-x-1 shadow-xs transition">
                <Upload className="w-3.5 h-3.5" />
                <span>เลือก/ถ่ายรูป</span>
                <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachedFiles.map((f, idx) => {
                  const previewUrl = URL.createObjectURL(f)
                  return (
                    <div key={idx} className="relative w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 group">
                      <img src={previewUrl} alt={f.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                        <span className="text-[9px] text-white text-center truncate">{f.name}</span>
                      </div>
                      <span className="absolute bottom-0.5 left-0.5 bg-blue-600/90 text-white rounded px-1 py-0.2 text-[8px] flex items-center space-x-0.5 shadow-xs">
                        <Cloud className="w-2.5 h-2.5" />
                        <span>Drive</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{attachedFiles.length > 0 ? 'กำลังบันทึกรูปภาพลง Google Drive...' : 'กำลังบันทึก...'}</span>
                </>
              ) : (
                <span>บันทึกเข้าระบบ</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * 3. Update Grade / Inspect Modal
 */
function UpdateGradeModal({ isOpen, onClose, currentSet, comboboxStore, onLearnValues, onSuccess }) {
  const [actionType, setActionType] = useState('คัดแยก/เปลี่ยนเกรดเข็ม')
  const [grade, setGrade] = useState(currentSet?.grade || 'เกรด B')
  const [conditionDetail, setConditionDetail] = useState(currentSet?.conditionDetail || '')
  const [quantity, setQuantity] = useState(currentSet?.quantity ?? '')
  const [technician, setTechnician] = useState('tuk')
  const [location, setLocation] = useState(currentSet?.location || 'STORE')
  const [remarks, setRemarks] = useState('')
  const [attachedFiles, setAttachedFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentSet) return
    const qtyNum = parseInt(quantity, 10)
    if (isNaN(qtyNum) || qtyNum < 0) {
      alert('กรุณาระบุจำนวนคงเหลือให้ถูกต้อง')
      return
    }

    try {
      setSubmitting(true)
      onLearnValues({ conditionDetail, technician })

      // Upload photos
      const uploadedImages = []
      for (const file of attachedFiles) {
        try {
          const res = await uploadMedia(file, { folderName: NEEDLE_IMAGE_FOLDER, fallbackToLocal: true })
          uploadedImages.push({ url: res.imageUrl || res.url, name: file.name })
        } catch (uploadErr) {
          console.warn('Image upload error:', uploadErr)
        }
      }

      const mergedImages = [...(currentSet.images || []), ...uploadedImages]

      const updatedSet = {
        ...currentSet,
        grade,
        conditionDetail: conditionDetail.trim(),
        quantity: qtyNum,
        location,
        remarks: remarks.trim() || currentSet.remarks,
        images: mergedImages,
        status: qtyNum === 0 ? 'หมดสต็อก' : qtyNum <= 100 ? 'สต็อกเหลือน้อย' : 'พร้อมใช้งาน',
      }

      const newLog = {
        id: `LOG-${Date.now()}`,
        logId: `LOG-${Date.now()}`,
        setId: currentSet.setId,
        actionType,
        oldGrade: currentSet.grade,
        newGrade: grade,
        conditionDetail: conditionDetail.trim(),
        quantity: qtyNum,
        qtyChange: qtyNum - (parseInt(currentSet.quantity, 10) || 0),
        balanceAfter: qtyNum,
        dateAction: new Date().toISOString().split('T')[0],
        technician: technician.trim(),
        remarks: remarks.trim(),
        images: uploadedImages,
        createdAt: new Date().toISOString(),
      }

      await Promise.all([
        NeedleSetAPI.update(currentSet.id || currentSet.setId, updatedSet),
        NeedleHistoryAPI.create(newLog),
      ])

      onSuccess(updatedSet, newLog)
    } catch (err) {
      console.error('Update grade failed:', err)
      alert('อัปเดตเกรดไม่สำเร็จ: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-800 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <Edit3 className="w-5 h-5 text-sky-400" />
            <div>
              <h4 className="text-base font-bold">อัปเดตเกรด / บันทึกการตรวจสภาพ</h4>
              <p className="text-xs text-slate-400">{currentSet?.setId} ({currentSet?.machineId}) • {currentSet?.needleModel}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">ประเภทการทำรายการ *</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
              >
                <option value="คัดแยก/เปลี่ยนเกรดเข็ม">คัดแยก / เปลี่ยนเกรดเข็ม</option>
                <option value="ตรวจสภาพตามรอบ">ตรวจสภาพตามรอบ</option>
                <option value="เบิกเข็มไปใช้งาน">เบิกเข็มไปใช้งาน</option>
                <option value="ปลดระวาง/คัดทิ้ง">ปลดระวาง / คัดทิ้ง</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">เกรดเข็มใหม่ *</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium"
              >
                {GRADES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">ลักษณะสภาพเข็ม *</label>
              <input
                type="text"
                value={conditionDetail}
                onChange={(e) => setConditionDetail(e.target.value)}
                placeholder="เลือกหรือพิมพ์สภาพเข็ม"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">จำนวนคงเหลือ (เล่ม)</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 font-bold"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">ชื่อช่าง / ผู้ทำรายการ *</label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="ระบุชื่อช่าง"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">ตำแหน่งจัดเก็บ (Location)</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
              >
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">บันทึกผลการตรวจสอบ / หมายเหตุ</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows="2"
              placeholder="ระบุผลตรวจสภาพ เช่น ตะขอเข็มงอ 5 เล่ม, ผ่านการคัดแล้วพร้อมขึ้นเครื่อง"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
            ></textarea>
          </div>

          {/* Photo attachment */}
          <div className="border border-dashed border-sky-300 rounded-2xl p-4 bg-sky-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-sky-600" />
                  <span>ถ่ายรูป/แนบรูปภาพสภาพเข็มในรอบนี้</span>
                  <span className="inline-flex items-center space-x-1 text-[11px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-normal">
                    <Cloud className="w-3 h-3" />
                    <span>Google Drive: {NEEDLE_IMAGE_FOLDER}</span>
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">รูปภาพใหม่จะถูกบันทึกลง Google Drive โฟลเดอร์: {NEEDLE_IMAGE_FOLDER} และแสดงใน Timeline ประวัติ</p>
              </div>
              <label className="cursor-pointer px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-medium inline-flex items-center space-x-1 shadow-xs transition">
                <Upload className="w-3.5 h-3.5" />
                <span>เลือก/ถ่ายรูป</span>
                <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachedFiles.map((f, idx) => {
                  const previewUrl = URL.createObjectURL(f)
                  return (
                    <div key={idx} className="relative w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 group">
                      <img src={previewUrl} alt={f.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                        <span className="text-[9px] text-white text-center truncate">{f.name}</span>
                      </div>
                      <span className="absolute bottom-0.5 left-0.5 bg-blue-600/90 text-white rounded px-1 py-0.2 text-[8px] flex items-center space-x-0.5 shadow-xs">
                        <Cloud className="w-2.5 h-2.5" />
                        <span>Drive</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{attachedFiles.length > 0 ? 'กำลังบันทึกรูปภาพลง Google Drive...' : 'กำลังบันทึก...'}</span>
                </>
              ) : (
                <span>บันทึกการเปลี่ยนแปลง</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * 4. Timeline History Modal
 */
function TimelineHistoryModal({ isOpen, onClose, currentSet, historyLogs, onViewImage }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">ประวัติ Timeline ชุดเข็ม {currentSet?.setId}</h4>
              <p className="text-xs text-slate-500">{currentSet?.machineId} • {currentSet?.needleModel} ({currentSet?.grade})</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {historyLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-slate-600">ยังไม่มีประวัติการทำรายการเพิ่มเติมสำหรับชุดนี้</p>
              <p className="text-xs text-slate-400 mt-1">ข้อมูลตั้งต้นนำเข้าจากสต็อกระบบเดิม</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-sky-100 ml-3.5 space-y-6">
              {historyLogs.map((log, idx) => {
                const act = log.actionType || ''
                const change = parseInt(log.qtyChange, 10) || 0
                const hasImgs = log.images && log.images.length > 0

                let dotColor = 'bg-sky-500 ring-sky-100'
                if (act.includes('รับเข้า')) dotColor = 'bg-emerald-500 ring-emerald-100'
                else if (act.includes('เบิกออก')) dotColor = 'bg-blue-500 ring-blue-100'
                else if (act.includes('ตัดทิ้ง') || act.includes('Scrap')) dotColor = 'bg-rose-500 ring-rose-100'

                return (
                  <div key={log.id || log.logId || idx} className="relative pl-6">
                    {/* Timeline dot */}
                    <div className={`absolute -left-2 top-1 w-4 h-4 rounded-full border-2 border-white ring-4 ${dotColor}`}></div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
                      <div className="flex flex-wrap justify-between items-start gap-1">
                        <div>
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">{act}</span>
                          <span className="text-[11px] text-slate-400 ml-2">{log.dateAction || log.createdAt?.split('T')[0]}</span>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                          คงเหลือ: {log.balanceAfter?.toLocaleString() ?? log.quantity} เล่ม
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        {change !== 0 && (
                          <div>
                            <span className="text-slate-400 text-[10px] block">จำนวนที่เปลี่ยน</span>
                            <span className={`font-bold ${change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {change > 0 ? `+${change.toLocaleString()}` : change.toLocaleString()} เล่ม
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-400 text-[10px] block">ผู้ทำรายการ</span>
                          <span className="font-medium text-slate-800">{log.technician || '-'}</span>
                        </div>
                        {log.targetMachine && (
                          <div>
                            <span className="text-slate-400 text-[10px] block">เบิกไปเครื่องจักร</span>
                            <span className="font-semibold text-slate-800">{log.targetMachine}</span>
                          </div>
                        )}
                        {log.scrapReason && (
                          <div className="col-span-2">
                            <span className="text-slate-400 text-[10px] block">สาเหตุตัดทิ้ง</span>
                            <span className="font-medium text-rose-600">{log.scrapReason}</span>
                          </div>
                        )}
                      </div>

                      {log.remarks && (
                        <p className="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                          {log.remarks}
                        </p>
                      )}

                      {hasImgs && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {log.images.map((img, imgIdx) => {
                            const url = typeof img === 'string' ? img : img.url
                            return (
                              <button
                                key={imgIdx}
                                type="button"
                                onClick={() => onViewImage(log.images, `หลักฐาน ${act}`, `${log.dateAction} โดย ${log.technician}`)}
                                className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition cursor-pointer relative"
                              >
                                <img src={getDirectImageUrl(url, 'w240')} alt="" className="w-full h-full object-cover" />
                                {isGoogleDriveUrl(url) && (
                                  <span className="absolute bottom-0.5 right-0.5 bg-blue-600/80 text-white rounded p-0.5" title="Google Drive">
                                    <Cloud className="w-2.5 h-2.5" />
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 5. Image Gallery & Pan / Zoom Modal
 */
function ImageGalleryModal({ isOpen, onClose, images, title, subtitle, activeIndex, setActiveIndex, zoom, setZoom }) {
  const currentImg = images[activeIndex]?.url || images[activeIndex] || ''

  const handleZoom = (delta) => {
    setZoom(prev => Math.min(3, Math.max(0.5, prev + delta)))
  }

  const resetZoom = () => {
    setZoom(1)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center text-white">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-sky-400" />
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-semibold">{title}</h4>
                {isGoogleDriveUrl(currentImg) && (
                  <span className="inline-flex items-center space-x-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                    <Cloud className="w-3 h-3 text-emerald-400" />
                    <span>Google Drive</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>
          {/* Controls */}
          <div className="flex items-center space-x-2">
            {isGoogleDriveUrl(currentImg) && (
              <a
                href={currentImg}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition"
                title="เปิดดูไฟล์ต้นฉบับบน Google Drive"
              >
                <Cloud className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">เปิดบน Google Drive</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            )}
            <button
              type="button"
              onClick={() => handleZoom(0.25)}
              className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 transition"
              title="ซูมเข้า"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-0.25)}
              className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 transition"
              title="ซูมออก"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 transition"
              title="รีเซ็ตขนาด"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-rose-600/80 hover:bg-rose-600 rounded-lg text-white ml-2 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-[380px] bg-slate-950 select-none">
          <img
            src={getDirectImageUrl(currentImg, 'w1600')}
            alt=""
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease-out' }}
            className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg cursor-grab active:cursor-grabbing"
          />
        </div>

        {/* Thumbnail Carousel */}
        {images.length > 1 && (
          <div className="p-3 bg-slate-800 border-t border-slate-700 flex items-center space-x-2 overflow-x-auto">
            {images.map((img, idx) => {
              const url = typeof img === 'string' ? img : img.url
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { setActiveIndex(idx); resetZoom() }}
                  className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition cursor-pointer relative ${
                    activeIndex === idx ? 'border-sky-500 scale-105' : 'border-slate-600 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={getDirectImageUrl(url, 'w160')} alt="" className="w-full h-full object-cover" />
                  {isGoogleDriveUrl(url) && (
                    <span className="absolute bottom-0.5 right-0.5 bg-blue-600/80 text-white rounded p-0.5" title="Google Drive">
                      <Cloud className="w-2 h-2" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
