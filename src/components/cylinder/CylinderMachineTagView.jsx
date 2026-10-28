import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Printer,
  ChevronLeft,
  ChevronRight,
  Tag,
  Disc,
  RotateCcw,
  Maximize2,
  SlidersHorizontal,
  Search,
  Check,
  Palette,
  Type,
  X,
  Filter,
} from 'lucide-react'

const STORAGE_KEY = 'textileops_machine_tag_settings'

export const DEFAULT_SETTINGS = {
  widthCm: 20,
  heightCm: 7,
  fontMode: 'auto', // 'auto' | 'custom'
  fontSizePt: 88,
  bgColor: '#bbf7d0', // Light green
  textColor: '#000000', // Black
}

export const SIZE_PRESETS = [
  { label: '20 × 7 cm (มาตรฐาน)', widthCm: 20, heightCm: 7 },
  { label: '15 × 5 cm (ขนาดกลาง)', widthCm: 15, heightCm: 5 },
  { label: '10 × 5 cm (ขนาดเล็ก)', widthCm: 10, heightCm: 5 },
]

export const BG_COLOR_PALETTE = [
  { label: 'เขียวอ่อน', value: '#bbf7d0', border: '#86efac' },
  { label: 'เหลืองอ่อน', value: '#fef08a', border: '#fde047' },
  { label: 'ส้มอ่อน', value: '#fed7aa', border: '#fdba74' },
  { label: 'ฟ้าอ่อน', value: '#bae6fd', border: '#7dd3fc' },
  { label: 'ขาว', value: '#ffffff', border: '#cbd5e1' },
  { label: 'ชมพูอ่อน', value: '#fbcfe8', border: '#f9a8d4' },
]

export const TEXT_COLOR_PALETTE = [
  { label: 'ดำ', value: '#000000' },
  { label: 'ขาว', value: '#ffffff' },
  { label: 'กรมท่า', value: '#0f172a' },
  { label: 'เขียวเข้ม', value: '#14532d' },
]

/**
 * Calculates optimal font size (in pt) based on text length and custom width/height in cm.
 */
export function getDynamicFontSize(text, widthCm = 20, heightCm = 7) {
  const str = String(text || '').trim()
  const len = Math.max(str.length, 1)

  // 1 cm ≈ 28.3465 pt
  const usableHeightPt = Math.max(heightCm * 28.3465 * 0.72, 12)
  const usableWidthPt = Math.max(widthCm * 28.3465 * 0.88, 20)

  // Character width factor (~0.6 of font size in bold sans-serif)
  const widthConstrainedPt = usableWidthPt / (len * 0.58)

  const optimalPt = Math.min(usableHeightPt, widthConstrainedPt)
  return Math.round(Math.max(16, Math.min(optimalPt, 220)))
}

export default function CylinderMachineTagView({
  cylinders = [],
  selectedCylinder = null,
  onSelectCylinder,
}) {
  // ── 1. In-Use Machine Filter ──────────────────────────────────────────
  const [onlyInUse, setOnlyInUse] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchContainerRef = useRef(null)

  // Filter cylinders by in-use machine_ref
  const inUseCylinders = useMemo(() => {
    return cylinders.filter((c) => c.Machine_Ref && String(c.Machine_Ref).startsWith('In-use'))
  }, [cylinders])

  // Active pool of cylinders based on filter
  const candidateCylinders = useMemo(() => {
    return onlyInUse ? (inUseCylinders.length ? inUseCylinders : cylinders) : cylinders
  }, [onlyInUse, inUseCylinders, cylinders])

  // Extract unique machine list from candidate cylinders
  const machineList = useMemo(() => {
    const map = new Map()
    candidateCylinders.forEach((c) => {
      const mc = String(c.NewMC || '').trim()
      if (mc && !map.has(mc)) {
        map.set(mc, {
          machine: mc,
          serial: c.Serial_NOW || '',
          location: c.Location || '',
          machineRef: c.Machine_Ref || '',
          cylinder: c,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) =>
      a.machine.localeCompare(b.machine, undefined, { numeric: true, sensitivity: 'base' })
    )
  }, [candidateCylinders])

  // Filtered machines for search input
  const filteredMachines = useMemo(() => {
    if (!searchQuery.trim()) return machineList
    const q = searchQuery.toLowerCase().trim()
    return machineList.filter(
      (m) =>
        m.machine.toLowerCase().includes(q) ||
        m.serial.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        m.machineRef.toLowerCase().includes(q)
    )
  }, [machineList, searchQuery])

  // ── 2. Selection & Live Text State ────────────────────────────────────
  const [selectedMachine, setSelectedMachine] = useState('')
  const [machineText, setMachineText] = useState('')

  // Initialize selection
  useEffect(() => {
    if (selectedCylinder?.NewMC) {
      setSelectedMachine(selectedCylinder.NewMC)
      setMachineText(selectedCylinder.NewMC)
    } else if (machineList.length && !selectedMachine) {
      setSelectedMachine(machineList[0].machine)
      setMachineText(machineList[0].machine)
    }
  }, [selectedCylinder, machineList])

  // ── 3. Configuration Settings & LocalStorage ─────────────────────────
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch {}
    return DEFAULT_SETTINGS
  })

  const [settingsOpen, setSettingsOpen] = useState(false)

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {}
  }, [settings])

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
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

  // ── 4. Navigation & Actions ──────────────────────────────────────────
  const currentMachineIndex = useMemo(() => {
    return machineList.findIndex((m) => m.machine === selectedMachine)
  }, [machineList, selectedMachine])

  const handleSelectMachine = (mcItem) => {
    setSelectedMachine(mcItem.machine)
    setMachineText(mcItem.machine)
    setShowDropdown(false)
    setSearchQuery('')
    if (mcItem.cylinder) {
      onSelectCylinder?.(mcItem.cylinder)
    }
  }

  const handlePrev = () => {
    if (currentMachineIndex > 0) {
      handleSelectMachine(machineList[currentMachineIndex - 1])
    }
  }

  const handleNext = () => {
    if (currentMachineIndex < machineList.length - 1) {
      handleSelectMachine(machineList[currentMachineIndex + 1])
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // ── 5. Computed Font Size ─────────────────────────────────────────────
  const effectiveFontSizePt = useMemo(() => {
    if (settings.fontMode === 'custom') {
      return Number(settings.fontSizePt) || 88
    }
    return getDynamicFontSize(machineText, settings.widthCm, settings.heightCm)
  }, [machineText, settings.fontMode, settings.fontSizePt, settings.widthCm, settings.heightCm])

  return (
    <div className="space-y-4">
      {/* ── PRINT MEDIA STYLES ────────────────────────────────────────── */}
      <style>{`
        @media print {
          /* Hide everything except printable machine tag */
          body * {
            visibility: hidden !important;
          }
          #printable-machine-tag, #printable-machine-tag * {
            visibility: visible !important;
          }
          #printable-machine-tag {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${settings.widthCm}cm !important;
            height: ${settings.heightCm}cm !important;
            max-width: ${settings.widthCm}cm !important;
            max-height: ${settings.heightCm}cm !important;
            margin: 0 !important;
            padding: 4mm 6mm !important;
            box-sizing: border-box !important;
            background-color: ${settings.bgColor} !important;
            color: ${settings.textColor} !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            border: 2px solid ${settings.textColor === '#ffffff' ? '#ffffff' : '#16a34a'} !important;
            border-radius: 0 !important;
            box-shadow: none !important;
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
          {/* Left: Machine Searchable Combobox & In-Use Filter */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <Tag size={16} />
              <span>เครื่อง In-use:</span>
            </div>

            {/* In-Use Filter Toggle */}
            <button
              type="button"
              onClick={() => setOnlyInUse(!onlyInUse)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                onlyInUse
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
              title={onlyInUse ? 'กำลังกรองเฉพาะเครื่อง In-use (คลิกเพื่อดูทั้งหมด)' : 'กำลังแสดงเครื่องทั้งหมด'}
            >
              <Filter size={12} />
              <span>{onlyInUse ? 'เฉพาะ In-use' : 'เครื่องทั้งหมด'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white dark:bg-slate-900 shadow-xs">
                {machineList.length}
              </span>
            </button>

            {/* Searchable Combobox Container */}
            <div ref={searchContainerRef} className="relative min-w-[240px] flex-1 max-w-sm">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="พิมพ์ค้นหาชื่อเครื่อง (เช่น MC-12, 01)..."
                  value={searchQuery || (showDropdown ? '' : (selectedMachine ? `[เครื่อง: ${selectedMachine}]` : ''))}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
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
                  {filteredMachines.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">
                      ไม่พบหมายเลขเครื่องที่ค้นหา
                    </div>
                  ) : (
                    filteredMachines.map((m) => {
                      const isSelected = m.machine === selectedMachine
                      return (
                        <div
                          key={m.machine}
                          onClick={() => handleSelectMachine(m)}
                          className={`p-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
                              {m.machine}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              กระบอก: {m.serial || '—'}
                            </span>
                            {m.location && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {m.location}
                              </span>
                            )}
                          </div>
                          {isSelected && <Check size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
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
                disabled={currentMachineIndex <= 0}
                className="btn-outline p-1.5 text-xs disabled:opacity-30 rounded-lg"
                title="เครื่องก่อนหน้า"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-[11px] font-mono font-semibold px-1 text-slate-500">
                {currentMachineIndex >= 0 ? currentMachineIndex + 1 : 0} / {machineList.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentMachineIndex >= machineList.length - 1}
                className="btn-outline p-1.5 text-xs disabled:opacity-30 rounded-lg"
                title="เครื่องถัดไป"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Right: Quick Machine Text Edit, Settings Toggle & Print Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">ข้อความป้าย:</span>
              <input
                type="text"
                value={machineText}
                onChange={(e) => setMachineText(e.target.value)}
                placeholder="ระบุข้อความ"
                className="input py-1 px-2 text-xs font-black font-mono rounded-xl border border-slate-300 dark:border-slate-700 w-32 text-center"
                title="ปรับแก้ข้อความที่จะพิมพ์ลงบนป้าย"
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
              title="ตั้งค่าขนาดป้าย, ฟอนต์, และสี"
            >
              <SlidersHorizontal size={14} />
              <span>ตั้งค่าป้าย</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="btn bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white font-bold text-xs py-1.5 px-4 rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition-all"
              title="สั่งพิมพ์ Tack เครื่องปัจจุบัน"
            >
              <Printer size={15} />
              <span>พิมพ์ Tack</span>
            </button>
          </div>
        </div>

        {/* ── EXPANDABLE SETTINGS PANEL ───────────────────────────────── */}
        {settingsOpen && (
          <div className="mt-3.5 pt-3.5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
            {/* 1. ขนาดป้าย (กว้าง-ยาว cm) */}
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Maximize2 size={13} className="text-emerald-600" /> ขนาดป้าย (กว้าง × ยาว)
                </span>
                <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                  {settings.widthCm} × {settings.heightCm} cm
                </span>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1">
                {SIZE_PRESETS.map((p) => {
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
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {p.widthCm} × {p.heightCm} cm
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
                    min="4"
                    max="50"
                    step="0.5"
                    value={settings.widthCm}
                    onChange={(e) => updateSetting('widthCm', Math.max(1, Number(e.target.value) || 20))}
                    className="input py-1 px-2 text-xs font-mono font-bold w-full rounded-lg"
                  />
                </div>
                <span className="text-slate-400 pt-3">×</span>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">ยาว (cm)</label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    step="0.5"
                    value={settings.heightCm}
                    onChange={(e) => updateSetting('heightCm', Math.max(1, Number(e.target.value) || 7))}
                    className="input py-1 px-2 text-xs font-mono font-bold w-full rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 2. ขนาดตัวอักษร (Auto-fit vs Custom pt) */}
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Type size={13} className="text-blue-600" /> ขนาดตัวอักษร
                </span>
                <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                  {effectiveFontSizePt} pt {settings.fontMode === 'auto' && '(Auto)'}
                </span>
              </div>

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-1 bg-slate-200 dark:bg-slate-900 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => updateSetting('fontMode', 'auto')}
                  className={`py-1 rounded-md transition-all ${
                    settings.fontMode === 'auto'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  ⚡ อัตโนมัติ (Auto-Fit)
                </button>
                <button
                  type="button"
                  onClick={() => updateSetting('fontMode', 'custom')}
                  className={`py-1 rounded-md transition-all ${
                    settings.fontMode === 'custom'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  ✏️ กำหนดเอง
                </button>
              </div>

              {/* Slider / Input for Custom pt */}
              {settings.fontMode === 'custom' ? (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="20"
                      max="180"
                      step="2"
                      value={settings.fontSizePt}
                      onChange={(e) => updateSetting('fontSizePt', Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold w-12 text-right">{settings.fontSizePt}pt</span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 pt-1">
                  ระบบคำนวณขนาดตัวหนังสือให้อัตโนมัติ เพื่อให้ใหญ่เด่นชัดและเต็มพื้นที่ป้ายพอดี 100%
                </p>
              )}
            </div>

            {/* 3. เลือกสีพื้นหลัง และ สีตัวอักษร */}
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Palette size={13} className="text-purple-600" /> สีพื้นหลัง และ ตัวหนังสือ
                </span>
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="text-[10px] text-slate-400 hover:text-rose-600 flex items-center gap-0.5 font-semibold"
                  title="คืนค่าขนาดและสีเริ่มต้นทั้งหมด"
                >
                  <RotateCcw size={10} /> รีเซ็ตค่าเริ่มต้น
                </button>
              </div>

              {/* Background Color Swatches */}
              <div>
                <label className="text-[10px] text-slate-500 block mb-1 font-medium">สีพื้นหลัง:</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {BG_COLOR_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => updateSetting('bgColor', c.value)}
                      style={{ backgroundColor: c.value, borderColor: c.border }}
                      className={`w-6 h-6 rounded-md border-2 transition-transform shadow-2xs ${
                        settings.bgColor.toLowerCase() === c.value.toLowerCase() ? 'scale-125 ring-2 ring-emerald-500 z-10' : 'hover:scale-110'
                      }`}
                      title={`สีพื้นหลัง: ${c.label}`}
                    />
                  ))}
                  {/* Native Color Picker for BG */}
                  <label className="relative cursor-pointer w-6 h-6 rounded-md border border-slate-300 flex items-center justify-center bg-white dark:bg-slate-900" title="เลือกสีพื้นหลังเอง">
                    <input
                      type="color"
                      value={settings.bgColor}
                      onChange={(e) => updateSetting('bgColor', e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Palette size={12} className="text-slate-500" />
                  </label>
                </div>
              </div>

              {/* Text Color Swatches */}
              <div className="pt-1">
                <label className="text-[10px] text-slate-500 block mb-1 font-medium">สีตัวหนังสือ:</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TEXT_COLOR_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => updateSetting('textColor', c.value)}
                      style={{ backgroundColor: c.value }}
                      className={`w-6 h-6 rounded-md border border-slate-300 transition-transform shadow-2xs ${
                        settings.textColor.toLowerCase() === c.value.toLowerCase() ? 'scale-125 ring-2 ring-blue-500 z-10' : 'hover:scale-110'
                      }`}
                      title={`สีตัวหนังสือ: ${c.label}`}
                    />
                  ))}
                  {/* Native Color Picker for Text */}
                  <label className="relative cursor-pointer w-6 h-6 rounded-md border border-slate-300 flex items-center justify-center bg-white dark:bg-slate-900" title="เลือกสีตัวหนังสือเอง">
                    <input
                      type="color"
                      value={settings.textColor}
                      onChange={(e) => updateSetting('textColor', e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Type size={12} className="text-slate-500" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── PREVIEW CANVAS (SCREEN PREVIEW & PRINTABLE TARGET) ──────────── */}
      <div className="flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-100 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto min-h-[360px]">
        {!machineText ? (
          <div className="card p-12 text-center text-slate-400">
            <Disc size={36} className="mx-auto mb-2 opacity-40" />
            <p className="font-bold">ไม่พบข้อมูลหมายเลขเครื่องสำหรับพิมพ์ Tack</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Dimension Marker (Width) */}
            <div
              className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1 px-1 print:hidden select-none"
              style={{ width: `${Math.min(settings.widthCm * 37.8, 800)}px`, maxWidth: '100%' }}
            >
              <span>|← 0 cm</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                ความกว้าง {settings.widthCm} cm
              </span>
              <span>{settings.widthCm} cm →|</span>
            </div>

            <div className="flex items-center">
              {/* Dimension Marker (Height) */}
              <div
                className="flex flex-col items-center justify-between text-[10px] font-mono text-slate-400 mr-2 py-1 print:hidden select-none"
                style={{ height: `${Math.min(settings.heightCm * 37.8, 400)}px` }}
              >
                <span>↑</span>
                <span className="rotate-[-90deg] whitespace-nowrap font-bold text-emerald-700 dark:text-emerald-400">
                  ยาว {settings.heightCm} cm
                </span>
                <span>↓</span>
              </div>

              {/* ── CUSTOMIZABLE PRINTABLE CONTAINER ── */}
              <div
                id="printable-machine-tag"
                className="relative flex items-center justify-center select-none shadow-2xl border-2 border-dashed border-emerald-600 transition-all duration-200"
                style={{
                  width: `${settings.widthCm}cm`,
                  height: `${settings.heightCm}cm`,
                  maxWidth: `${settings.widthCm}cm`,
                  maxHeight: `${settings.heightCm}cm`,
                  backgroundColor: settings.bgColor,
                  color: settings.textColor,
                  boxSizing: 'border-box',
                  padding: '4mm 6mm',
                  overflow: 'hidden',
                }}
              >
                {/* Main Hero Machine Text */}
                <span
                  className="font-black tracking-tight select-all text-center leading-none"
                  style={{
                    fontSize: `${effectiveFontSizePt}pt`,
                    color: settings.textColor,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    fontFamily:
                      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  }}
                >
                  {machineText}
                </span>
              </div>
            </div>

            {/* Hint message under preview */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 print:hidden">
              <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xs">
                📐 ขนาด: <strong>{settings.widthCm} × {settings.heightCm} cm</strong>
              </span>
              <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xs">
                🔤 ขนาดฟอนต์: <strong>{effectiveFontSizePt} pt</strong>
              </span>
              <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xs">
                🎨 สี: <span className="w-3 h-3 rounded-full border border-slate-300 inline-block" style={{ backgroundColor: settings.bgColor }} />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
