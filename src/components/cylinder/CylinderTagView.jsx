import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Printer,
  Calendar,
  Disc,
  Search,
  ChevronLeft,
  ChevronRight,
  Tag,
  SlidersHorizontal,
  Maximize2,
  Type,
  RotateCcw,
  X,
  Check,
  Filter,
  Layers,
} from 'lucide-react'
import { format } from 'date-fns'
import gemmaLogo from '../../assets/logo-gemma.png'
import { stripCylinderImageMeta } from '../../utils/cylinderImage'

const STORAGE_KEY = 'textileops_tack_spare_settings'

export const DEFAULT_SPARE_SETTINGS = {
  widthCm: 29.7,
  heightCm: 21.0,
  heroHeightPx: 195,
  specsHeightPx: 145,
  remarkHeightPx: 65,
  fontMode: 'auto', // 'auto' | 'custom'
  heroFontSizePt: 58,
  specsFontSizePt: 48,
}

export const PAPER_PRESETS = [
  { label: 'A4 แนวนอน (29.7 × 21 cm)', widthCm: 29.7, heightCm: 21.0 },
  { label: 'A5 แนวนอน (21 × 14.8 cm)', widthCm: 21.0, heightCm: 14.8 },
]

export const PROPORTION_PRESETS = [
  { label: 'มาตรฐานล่าสุด', heroHeightPx: 195, specsHeightPx: 145, remarkHeightPx: 65 },
  { label: 'เน้นเครื่องใหญ่', heroHeightPx: 235, specsHeightPx: 130, remarkHeightPx: 55 },
  { label: 'เน้นสเปกกระบอก', heroHeightPx: 165, specsHeightPx: 180, remarkHeightPx: 55 },
]

export function getHeroFontSize(text = '') {
  const len = String(text || '').trim().length
  if (len <= 6) return '68pt'
  if (len <= 10) return '58pt'
  if (len <= 14) return '48pt'
  return '38pt'
}

export default function CylinderTagView({
  cylinders = [],
  selectedCylinder = null,
  onSelectCylinder,
}) {
  // ── 1. Spare Machine Filtering & Search ───────────────────────────────
  const [onlySpare, setOnlySpare] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchContainerRef = useRef(null)

  // Filter cylinders where Machine_Ref starts with 'Spare'
  const spareCylinders = useMemo(() => {
    return cylinders.filter((c) => c.Machine_Ref && String(c.Machine_Ref).startsWith('Spare'))
  }, [cylinders])

  // Active pool of candidate cylinders
  const candidateCylinders = useMemo(() => {
    return onlySpare ? (spareCylinders.length ? spareCylinders : cylinders) : cylinders
  }, [onlySpare, spareCylinders, cylinders])

  // Search autocomplete filtered cylinders
  const searchFilteredCylinders = useMemo(() => {
    if (!searchQuery.trim()) return candidateCylinders
    const q = searchQuery.toLowerCase().trim()
    return candidateCylinders.filter((c) => {
      const serial = String(c.Serial_NOW || '').toLowerCase()
      const mc = String(c.NewMC || '').toLowerCase()
      const standard = String(c.Standard || '').toLowerCase()
      const loc = String(c.Location || '').toLowerCase()
      const ref = String(c.Machine_Ref || '').toLowerCase()
      return serial.includes(q) || mc.includes(q) || standard.includes(q) || loc.includes(q) || ref.includes(q)
    })
  }, [candidateCylinders, searchQuery])

  // ── 2. Selection & Date State ─────────────────────────────────────────
  const [internalSelectedId, setInternalSelectedId] = useState(() => {
    return selectedCylinder?.id || selectedCylinder?._id || candidateCylinders[0]?.id || candidateCylinders[0]?._id || ''
  })
  const [printDate, setPrintDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [customRemark, setCustomRemark] = useState('')

  // Sync when selectedCylinder prop changes from outside
  useEffect(() => {
    if (selectedCylinder) {
      const id = selectedCylinder.id || selectedCylinder._id
      setInternalSelectedId(id)
    } else if (candidateCylinders.length > 0 && !internalSelectedId) {
      setInternalSelectedId(candidateCylinders[0].id || candidateCylinders[0]?._id)
    }
  }, [selectedCylinder, candidateCylinders])

  // Active cylinder object
  const currentCyl = useMemo(() => {
    return (
      candidateCylinders.find((c) => (c.id || c._id) === internalSelectedId) ||
      cylinders.find((c) => (c.id || c._id) === internalSelectedId) ||
      selectedCylinder ||
      candidateCylinders[0] ||
      cylinders[0] ||
      null
    )
  }, [candidateCylinders, cylinders, internalSelectedId, selectedCylinder])

  // Reset remark when cylinder changes
  useEffect(() => {
    if (currentCyl) {
      setCustomRemark(stripCylinderImageMeta(currentCyl.Comment || ''))
    }
  }, [currentCyl?.id, currentCyl?._id, currentCyl?.Comment])

  // ── 3. Configuration Settings & LocalStorage ─────────────────────────
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...DEFAULT_SPARE_SETTINGS, ...parsed }
      }
    } catch {}
    return DEFAULT_SPARE_SETTINGS
  })

  const [settingsOpen, setSettingsOpen] = useState(false)

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {}
  }, [settings])

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleResetSettings = () => {
    setSettings(DEFAULT_SPARE_SETTINGS)
  }

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── 4. Navigation & Selection Handlers ────────────────────────────────
  const handleSelect = (cyl) => {
    if (!cyl) return
    const id = cyl.id || cyl._id
    setInternalSelectedId(id)
    setShowDropdown(false)
    setSearchQuery('')
    if (onSelectCylinder) onSelectCylinder(cyl)
  }

  const currentIndex = useMemo(() => {
    return candidateCylinders.findIndex((c) => (c.id || c._id) === (currentCyl?.id || currentCyl?._id))
  }, [candidateCylinders, currentCyl])

  const handlePrev = () => {
    if (currentIndex > 0) handleSelect(candidateCylinders[currentIndex - 1])
  }

  const handleNext = () => {
    if (currentIndex < candidateCylinders.length - 1) handleSelect(candidateCylinders[currentIndex + 1])
  }

  const handlePrint = () => {
    window.print()
  }

  // Format date for display
  const displayDate = useMemo(() => {
    try {
      if (!printDate) return format(new Date(), 'dd/MM/yyyy')
      const [y, m, d] = printDate.split('-')
      if (y && m && d) return `${d}/${m}/${y}`
      return format(new Date(printDate), 'dd/MM/yyyy')
    } catch {
      return format(new Date(), 'dd/MM/yyyy')
    }
  }, [printDate])

  // ── 5. Computed Font Sizes ────────────────────────────────────────────
  const machineFontSize = useMemo(() => {
    if (settings.fontMode === 'custom') return `${settings.heroFontSizePt}pt`
    return getHeroFontSize(currentCyl?.NewMC)
  }, [settings.fontMode, settings.heroFontSizePt, currentCyl?.NewMC])

  const serialFontSize = useMemo(() => {
    if (settings.fontMode === 'custom') return `${settings.heroFontSizePt}pt`
    return getHeroFontSize(currentCyl?.Serial_NOW)
  }, [settings.fontMode, settings.heroFontSizePt, currentCyl?.Serial_NOW])

  const specsFontSize = useMemo(() => {
    if (settings.fontMode === 'custom') return `${settings.specsFontSizePt}pt`
    return '48pt'
  }, [settings.fontMode, settings.specsFontSizePt])

  const needlesFontSize = useMemo(() => {
    if (settings.fontMode === 'custom') return `${Math.max(22, settings.specsFontSizePt - 6)}pt`
    return '42pt'
  }, [settings.fontMode, settings.specsFontSizePt])

  return (
    <div className="space-y-4">
      {/* ── PRINT MEDIA STYLES ────────────────────────────────────────── */}
      <style>{`
        @media print {
          /* Hide all application elements */
          body * {
            visibility: hidden !important;
          }
          /* Show only the printable cylinder tag */
          #printable-cylinder-tag, #printable-cylinder-tag * {
            visibility: visible !important;
          }
          #printable-cylinder-tag {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${settings.widthCm}cm !important;
            height: ${settings.heightCm}cm !important;
            max-width: ${settings.widthCm}cm !important;
            max-height: ${settings.heightCm}cm !important;
            margin: 0 !important;
            padding: 8mm 12mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: 4px solid #0f172a !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            z-index: 999999 !important;
          }
          @page {
            size: ${settings.widthCm}cm ${settings.heightCm}cm;
            margin: 0;
          }
        }
      `}</style>

      {/* ── TOP CONTROL PANEL (SCREEN ONLY) ───────────────────────────── */}
      <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Left: Cylinder Selector, Spare Filter & Search */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Tag size={16} />
              <span>เครื่อง Spare:</span>
            </div>

            {/* Spare Filter Toggle */}
            <button
              type="button"
              onClick={() => setOnlySpare(!onlySpare)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                onlySpare
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
              title={onlySpare ? 'กำลังกรองเฉพาะเครื่อง/กระบอก Spare (คลิกเพื่อดูทั้งหมด)' : 'กำลังแสดงกระบอกทั้งหมด'}
            >
              <Filter size={12} />
              <span>{onlySpare ? 'เฉพาะ Spare' : 'กระบอกทั้งหมด'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white dark:bg-slate-900 shadow-xs">
                {candidateCylinders.length}
              </span>
            </button>

            {/* Searchable Autocomplete Combobox */}
            <div ref={searchContainerRef} className="relative min-w-[260px] flex-1 max-w-md">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="พิมพ์ค้นหาเครื่องหรือรหัสกระบอก (เช่น MC-02, CYL-2026)..."
                  value={
                    searchQuery ||
                    (showDropdown
                      ? ''
                      : currentCyl
                      ? `[${currentCyl.NewMC ? `MC: ${currentCyl.NewMC}` : 'ไม่มีเครื่อง'}] ${currentCyl.Serial_NOW || ''} (${currentCyl.Location || 'คลัง'})`
                      : '')
                  }
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  aria-label="เลือกกระบอกที่ต้องการพิมพ์ Tack Spare"
                  className="input pl-8.5 pr-8 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 w-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown List */}
              {showDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {searchFilteredCylinders.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">
                      ไม่พบกระบอกหรือเครื่องที่ค้นหา
                    </div>
                  ) : (
                    searchFilteredCylinders.map((c) => {
                      const isSelected = (c.id || c._id) === (currentCyl?.id || currentCyl?._id)
                      return (
                        <div
                          key={c.id || c._id}
                          onClick={() => handleSelect(c)}
                          className={`p-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400">
                              {c.NewMC ? `MC: ${c.NewMC}` : 'ไม่มีเครื่อง'}
                            </span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {c.Serial_NOW || 'ไม่มีซีเรียล'}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-[11px] text-slate-500">
                              {c.Diameter ? `${c.Diameter}"` : ''} {c.Gauge ? `${c.Gauge}G` : ''}
                            </span>
                            {c.Location && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {c.Location}
                              </span>
                            )}
                          </div>
                          {isSelected && <Check size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* Prev / Next Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="btn-outline p-1.5 text-xs disabled:opacity-30 rounded-lg"
                title="กระบอกก่อนหน้า"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-[11px] font-mono font-semibold px-1 text-slate-500">
                {currentIndex >= 0 ? currentIndex + 1 : 0} / {candidateCylinders.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= candidateCylinders.length - 1}
                className="btn-outline p-1.5 text-xs disabled:opacity-30 rounded-lg"
                title="กระบอกถัดไป"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Right: Date, Settings Toggle & Print Action */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Calendar size={13} /> วันที่:
              </span>
              <input
                type="date"
                value={printDate}
                onChange={(e) => setPrintDate(e.target.value)}
                aria-label="วันที่พิมพ์"
                className="input py-1 px-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700"
                title="ระบุวันที่ที่ต้องการพิมพ์ลงบนป้าย"
              />
            </div>

            {/* Settings Toggle Button */}
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`btn text-xs py-1.5 px-3 rounded-xl border transition-all flex items-center gap-1.5 font-bold ${
                settingsOpen
                  ? 'bg-slate-800 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
              title="ตั้งค่าขนาดป้าย, สัดส่วนแต่ละส่วน, และขนาดตัวอักษร"
            >
              <SlidersHorizontal size={14} />
              <span>ตั้งค่าป้าย</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="btn bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs py-1.5 px-4 rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition-all"
              title="สั่งพิมพ์เอกสารติดกระบอก A4 แนวนอน"
            >
              <Printer size={15} />
              <span>สั่งพิมพ์เอกสารติดกระบอก (A4 แนวนอน)</span>
            </button>
          </div>
        </div>

        {/* ── EXPANDABLE SETTINGS PANEL ───────────────────────────────── */}
        {settingsOpen && (
          <div className="mt-3.5 pt-3.5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
            {/* 1. ขนาดกระดาษ (กว้าง-ยาว cm) */}
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Maximize2 size={13} className="text-amber-600" /> ขนาดกระดาษ (กว้าง × ยาว)
                </span>
                <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 font-bold">
                  {settings.widthCm} × {settings.heightCm} cm
                </span>
              </div>

              {/* Paper Presets */}
              <div className="flex flex-wrap gap-1">
                {PAPER_PRESETS.map((p) => {
                  const isActive = settings.widthCm === p.widthCm && settings.heightCm === p.heightCm
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        updateSetting('widthCm', p.widthCm)
                        updateSetting('heightCm', p.heightCm)
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all border ${
                        isActive
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {p.label.split(' ')[0]} {p.label.split(' ')[1]}
                    </button>
                  )
                })}
              </div>

              {/* Custom W x H cm inputs */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">กว้าง (cm)</label>
                  <input
                    type="number"
                    min="10"
                    max="60"
                    step="0.1"
                    value={settings.widthCm}
                    onChange={(e) => updateSetting('widthCm', Math.max(5, Number(e.target.value) || 29.7))}
                    className="input py-1 px-2 text-xs font-mono font-bold w-full rounded-lg"
                  />
                </div>
                <span className="text-slate-400 pt-3">×</span>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">ยาว (cm)</label>
                  <input
                    type="number"
                    min="10"
                    max="60"
                    step="0.1"
                    value={settings.heightCm}
                    onChange={(e) => updateSetting('heightCm', Math.max(5, Number(e.target.value) || 21.0))}
                    className="input py-1 px-2 text-xs font-mono font-bold w-full rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 2. สัดส่วนแต่ละส่วน (Section Heights px) */}
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Layers size={13} className="text-blue-600" /> สัดส่วนแต่ละส่วน (ความสูง)
                </span>
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="text-[10px] text-slate-400 hover:text-rose-600 flex items-center gap-0.5 font-semibold"
                  title="คืนค่าขนาดและสัดส่วนเริ่มต้นของเวอร์ชันล่าสุด"
                >
                  <RotateCcw size={10} /> รีเซ็ตค่าเริ่มต้น
                </button>
              </div>

              {/* Proportion Presets */}
              <div className="flex flex-wrap gap-1">
                {PROPORTION_PRESETS.map((p) => {
                  const isActive =
                    settings.heroHeightPx === p.heroHeightPx &&
                    settings.specsHeightPx === p.specsHeightPx &&
                    settings.remarkHeightPx === p.remarkHeightPx
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        updateSetting('heroHeightPx', p.heroHeightPx)
                        updateSetting('specsHeightPx', p.specsHeightPx)
                        updateSetting('remarkHeightPx', p.remarkHeightPx)
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all border ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>

              {/* Individual Section Height Sliders */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
                  <span>กล่องเครื่อง/ซีเรียล (Hero):</span>
                  <span className="font-mono font-bold">{settings.heroHeightPx}px</span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="280"
                  step="5"
                  value={settings.heroHeightPx}
                  onChange={(e) => updateSetting('heroHeightPx', Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-1.5"
                />

                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 pt-0.5">
                  <span>กล่องสเปก (Specs):</span>
                  <span className="font-mono font-bold">{settings.specsHeightPx}px</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="220"
                  step="5"
                  value={settings.specsHeightPx}
                  onChange={(e) => updateSetting('specsHeightPx', Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-1.5"
                />

                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 pt-0.5">
                  <span>กล่อง Remark:</span>
                  <span className="font-mono font-bold">{settings.remarkHeightPx}px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="120"
                  step="5"
                  value={settings.remarkHeightPx}
                  onChange={(e) => updateSetting('remarkHeightPx', Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-1.5"
                />
              </div>
            </div>

            {/* 3. ขนาดตัวอักษร (Typography Sizing) */}
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Type size={13} className="text-purple-600" /> ขนาดตัวอักษร
                </span>
                <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                  {settings.fontMode === 'auto' ? 'Auto (เวอร์ชันล่าสุด)' : `${settings.heroFontSizePt}/${settings.specsFontSizePt} pt`}
                </span>
              </div>

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-1 bg-slate-200 dark:bg-slate-900 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => updateSetting('fontMode', 'auto')}
                  className={`py-1 rounded-md transition-all ${
                    settings.fontMode === 'auto'
                      ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  ⚡ อัตโนมัติ (ล่าสุด)
                </button>
                <button
                  type="button"
                  onClick={() => updateSetting('fontMode', 'custom')}
                  className={`py-1 rounded-md transition-all ${
                    settings.fontMode === 'custom'
                      ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  ✏️ กำหนดเอง
                </button>
              </div>

              {/* Slider for Custom pt */}
              {settings.fontMode === 'custom' ? (
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
                      <span>ฟอนต์เครื่อง/ซีเรียล:</span>
                      <span className="font-mono font-bold">{settings.heroFontSizePt}pt</span>
                    </div>
                    <input
                      type="range"
                      min="36"
                      max="90"
                      step="2"
                      value={settings.heroFontSizePt}
                      onChange={(e) => updateSetting('heroFontSizePt', Number(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer h-1.5"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
                      <span>ฟอนต์สเปกกระบอก:</span>
                      <span className="font-mono font-bold">{settings.specsFontSizePt}pt</span>
                    </div>
                    <input
                      type="range"
                      min="28"
                      max="64"
                      step="2"
                      value={settings.specsFontSizePt}
                      onChange={(e) => updateSetting('specsFontSizePt', Number(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer h-1.5"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 pt-1 leading-relaxed">
                  ใช้สัดส่วนฟอนต์อัตโนมัติตามเวอร์ชันล่าสุด: หมายเลขเครื่องและซีเรียล 48–68pt ตามความยาวข้อความ, สเปกกระบอก 48pt คมชัดพิเศษ
                </p>
              )}
            </div>
          </div>
        )}

        {/* Live Remark Edit Bar */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
            หมายเหตุ (Remark):
          </span>
          <input
            type="text"
            value={customRemark}
            onChange={(e) => setCustomRemark(e.target.value)}
            placeholder="พิมพ์ข้อความหมายเหตุเพิ่มเติมสำหรับติดกระบอก..."
            className="input py-1.5 px-3 text-xs rounded-xl flex-1 border border-slate-300 dark:border-slate-700"
          />
          {customRemark !== stripCylinderImageMeta(currentCyl?.Comment || '') && (
            <button
              type="button"
              onClick={() => setCustomRemark(stripCylinderImageMeta(currentCyl?.Comment || ''))}
              className="btn-outline py-1 px-2 text-[11px] rounded-lg"
              title="คืนค่าหมายเหตุเดิมจากระบบ"
            >
              คืนค่าเดิม
            </button>
          )}
        </div>
      </div>

      {/* ── PREVIEW CANVAS (SCREEN PREVIEW & PRINTABLE TARGET) ──────────── */}
      <div className="flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-100 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {!currentCyl ? (
          <div className="card p-12 text-center text-slate-400">
            <Disc size={36} className="mx-auto mb-2 opacity-40" />
            <p className="font-bold">ไม่พบข้อมูลกระบอกสำหรับพิมพ์ Tack Spare</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Dimension Marker Header */}
            <div
              className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1 px-1 print:hidden select-none"
              style={{ width: `${settings.widthCm * 37.8}px`, maxWidth: '100%' }}
            >
              <span>|← 0 cm</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                ขนาดเอกสาร {settings.widthCm} × {settings.heightCm} cm
              </span>
              <span>{settings.widthCm} cm →|</span>
            </div>

            {/* ── CUSTOMIZABLE A4 / CUSTOM LANDSCAPE SHEET ── */}
            <div
              id="printable-cylinder-tag"
              className="bg-white text-slate-900 shadow-2xl rounded-sm border-4 border-slate-950 flex flex-col justify-between select-none relative transition-all duration-200"
              style={{
                width: `${settings.widthCm}cm`,
                height: `${settings.heightCm}cm`,
                minWidth: `${settings.widthCm}cm`,
                minHeight: `${settings.heightCm}cm`,
                padding: '8mm 12mm',
                boxSizing: 'border-box',
                fontFamily: 'Inter, Prompt, sans-serif',
              }}
            >
              {/* Top Bar Accent */}
              <div className="absolute top-0 left-0 right-0 h-[6px] bg-slate-950" />

              {/* ── HEADER: LOGO, TITLE, DATE ─────────────────────────── */}
              <div className="flex items-center justify-between border-b-3 border-slate-950 pb-2.5 mb-2">
                <div className="flex items-center gap-3.5">
                  <img
                    src={gemmaLogo}
                    alt="Gemma Knits Logo"
                    className="h-12 w-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div>
                    <h1 className="text-2xl font-black uppercase tracking-wider text-slate-950 leading-tight">
                      เอกสารติดกระบอกเข็ม
                    </h1>
                    <p className="text-xs font-mono font-bold tracking-widest text-slate-600 uppercase">
                      CYLINDER IDENTIFICATION TAG
                    </p>
                  </div>
                </div>

                {/* วันที่ (Field 1 of 7) */}
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    วันที่ (DATE)
                  </span>
                  <span className="text-2xl font-mono font-black text-slate-950">
                    {displayDate}
                  </span>
                </div>
              </div>

              {/* ── HIGHLIGHT SECTION: เครื่องปัจจุบัน & ซีเรียลปัจจุบัน ────── */}
              {/* (Fields 2 & 3 of 7) */}
              <div
                className="grid grid-cols-2 gap-3.5 mb-2 transition-all"
                style={{ height: `${settings.heroHeightPx}px` }}
              >
                {/* เครื่องปัจจุบัน (Current Machine) */}
                <div
                  className="border-3 border-slate-900 bg-slate-50/80 p-3.5 rounded-xl flex flex-col justify-between h-full"
                >
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                    <span className="text-base font-black text-slate-900 uppercase tracking-wide">
                      เครื่องปัจจุบัน (CURRENT M/C)
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-800">
                      MACHINE
                    </span>
                  </div>
                  <div className="my-auto text-center py-1">
                    <div
                      className="font-mono font-black tracking-tight text-slate-950 truncate"
                      style={{ fontSize: machineFontSize, lineHeight: 1 }}
                    >
                      {currentCyl.NewMC || '—'}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 font-bold text-right">
                    ตำแหน่ง: {currentCyl.Location || '—'}
                  </div>
                </div>

                {/* ซีเรียลปัจจุบัน (Current Serial) */}
                <div
                  className="border-3 border-slate-900 bg-slate-50/80 p-3.5 rounded-xl flex flex-col justify-between h-full"
                >
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                    <span className="text-base font-black text-slate-900 uppercase tracking-wide">
                      ซีเรียลปัจจุบัน (SERIAL NOW)
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-800">
                      SERIAL
                    </span>
                  </div>
                  <div className="my-auto text-center py-1">
                    <div
                      className="font-mono font-black tracking-tight text-slate-950 truncate"
                      style={{ fontSize: serialFontSize, lineHeight: 1 }}
                    >
                      {currentCyl.Serial_NOW || '—'}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 font-bold text-right">
                    มาตรฐาน: {currentCyl.Standard || '—'}
                  </div>
                </div>
              </div>

              {/* ── SPECS SECTION: เส้นผ่าศูนย์กลาง, เกจ, จำนวนเข็ม ────────── */}
              {/* (Fields 4, 5, 6 of 7) */}
              <div
                className="grid grid-cols-3 gap-3.5 mb-2 transition-all"
                style={{ height: `${settings.specsHeightPx}px` }}
              >
                {/* เส้นผ่าศูนย์กลาง (Diameter) */}
                <div className="border-3 border-slate-900 bg-white p-3 rounded-xl text-center flex flex-col justify-between h-full">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-wider block">
                    เส้นผ่าศูนย์กลาง (DIAMETER)
                  </span>
                  <div
                    className="font-mono font-black text-slate-950 my-auto"
                    style={{ fontSize: specsFontSize, lineHeight: 1 }}
                  >
                    {currentCyl.Diameter ? `${currentCyl.Diameter}"` : '—'}
                  </div>
                  <span className="text-xs text-slate-500 font-bold block">
                    นิ้ว (Inches)
                  </span>
                </div>

                {/* เกจ (Gauge) */}
                <div className="border-3 border-slate-900 bg-white p-3 rounded-xl text-center flex flex-col justify-between h-full">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-wider block">
                    เกจ (GAUGE)
                  </span>
                  <div
                    className="font-mono font-black text-slate-950 my-auto"
                    style={{ fontSize: specsFontSize, lineHeight: 1 }}
                  >
                    {currentCyl.Gauge ? `${currentCyl.Gauge}G` : '—'}
                  </div>
                  <span className="text-xs text-slate-500 font-bold block">
                    เข็มต่อนิ้ว (Gauge)
                  </span>
                </div>

                {/* จำนวนเข็ม (Total Needles) */}
                <div className="border-3 border-slate-900 bg-white p-3 rounded-xl text-center flex flex-col justify-between h-full">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-wider block">
                    จำนวนเข็ม (TOTAL NEEDLES)
                  </span>
                  <div
                    className="font-mono font-black text-slate-950 my-auto truncate px-1"
                    style={{ fontSize: needlesFontSize, lineHeight: 1 }}
                  >
                    {currentCyl.Needle ? `${Number(currentCyl.Needle).toLocaleString()} เล่ม` : '—'}
                  </div>
                  <span className="text-xs text-slate-500 font-bold block">
                    เล่ม (Needles)
                  </span>
                </div>
              </div>

              {/* ── REMARK SECTION (Field 7 of 7) ────────────────────────── */}
              <div
                className="border-3 border-slate-900 bg-slate-50/70 px-5 py-2 rounded-xl flex items-center gap-3.5 transition-all overflow-hidden"
                style={{ height: `${settings.remarkHeightPx}px` }}
              >
                <span className="text-sm font-black text-slate-900 uppercase tracking-wider flex-shrink-0">
                  หมายเหตุ (REMARK):
                </span>
                <div className="text-base font-bold text-slate-800 flex-1 truncate line-clamp-2 leading-snug">
                  {customRemark || '—'}
                </div>
              </div>

              {/* ── FOOTER NOTE ────────────────────────────────────────── */}
              <div className="pt-1.5 mt-1 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>TextileOps Platform · เอกสารประจำกระบอกเข็มโรงงาน</span>
                <span>พิมพ์เมื่อ: {displayDate} · GEMMA KNITS</span>
              </div>
            </div>

            {/* Hint message under preview */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 print:hidden">
              <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xs">
                📐 ขนาดกระดาษ: <strong>{settings.widthCm} × {settings.heightCm} cm</strong>
              </span>
              <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xs">
                📊 สัดส่วน: Hero {settings.heroHeightPx}px · Specs {settings.specsHeightPx}px · Remark {settings.remarkHeightPx}px
              </span>
              <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xs">
                🔤 ฟอนต์: {settings.fontMode === 'auto' ? 'Auto (เวอร์ชันล่าสุด)' : `${settings.heroFontSizePt}/${settings.specsFontSizePt} pt`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
