import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar,
  CalendarRange,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  TrendingUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  Trash2,
  Printer,
  RefreshCw,
  FileText,
  Check,
  X,
  Layers,
  Sparkles,
  Users,
  Search,
} from 'lucide-react'
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns'
import { AppConfigAPI } from '../../api/entities'
import { useToast } from '../ui/Toast'
import Modal from '../ui/Modal'

// Thai Month Names
export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

export const SHORT_THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.',
  'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.',
  'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
]

export const SCHEDULE_STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'ตามแผน', badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { value: 'IN_PROGRESS', label: 'กำลังทำ', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { value: 'COMPLETED', label: 'เสร็จสิ้น', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { value: 'DELAYED', label: 'ล่าช้า', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  { value: 'POSTPONED', label: 'เลื่อนแผน', badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
]

export function getStatusMeta(status = 'SCHEDULED') {
  return SCHEDULE_STATUS_OPTIONS.find(s => s.value === status) || SCHEDULE_STATUS_OPTIONS[0]
}

/**
 * Calculates working days in a month (Monday to Saturday, Day 0 Sunday excluded).
 * Returns an array of date objects.
 */
export function getMonthlyWorkingDays(year, month1Indexed) {
  const daysInMonth = new Date(year, month1Indexed, 0).getDate()
  const workingDays = []

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month1Indexed - 1, day)
    // 0 = Sunday (Non-working day in 12h factory shift)
    if (d.getDay() !== 0) {
      workingDays.push({
        date: d,
        dateStr: format(d, 'yyyy-MM-dd'),
        dayNumber: day,
        dayOfWeek: d.getDay(),
      })
    }
  }
  return workingDays
}

/**
 * Groups working days into continuous 3-working-day blocks.
 */
export function buildThreeDayBlocks(workingDays = []) {
  const blocks = []
  for (let i = 0; i < workingDays.length; i += 3) {
    const slice = workingDays.slice(i, i + 3)
    if (slice.length > 0) {
      blocks.push({
        blockIndex: blocks.length + 1,
        startDate: slice[0].dateStr,
        endDate: slice[slice.length - 1].dateStr,
        workingDaysCount: slice.length,
        days: slice,
      })
    }
  }
  return blocks
}

/**
 * Auto-generates a 1-month PM plan (3 working days per machine, skipping Sundays).
 */
export function autoGenerateMonthlySchedule(year, month1Indexed, machines = []) {
  const workingDays = getMonthlyWorkingDays(year, month1Indexed)
  const blocks = buildThreeDayBlocks(workingDays)
  const monthKey = `${year}-${String(month1Indexed).padStart(2, '0')}`

  // Pick unique machines from available machines list or generate slots
  const availableMachines = Array.isArray(machines) && machines.length > 0
    ? machines
    : []

  return blocks.map((block, idx) => {
    const machine = availableMachines[idx % availableMachines.length] || null
    const mc = machine?.Machine_MC || machine?.Mc || machine?.mc || `MC-${String(idx + 1).padStart(2, '0')}`
    const ki = machine?.Machine_KI || machine?.Serial_OLD || machine?.ki || ''
    const location = machine?.Location || machine?.location || 'GMK1'
    const type = machine?.Type || machine?.type || 'Double'

    return {
      id: `PMSCH-${monthKey.replace('-', '')}-${String(idx + 1).padStart(2, '0')}`,
      sequence: idx + 1,
      mc,
      ki,
      location,
      type,
      plannedStartDate: block.startDate,
      plannedEndDate: block.endDate,
      workingDays: block.workingDaysCount,
      status: 'SCHEDULED',
      assignedTech: machine?.Assigned_Tech || 'ช.หนึ่ง',
      actualStartDate: '',
      actualEndDate: '',
      actualTech: '',
      notes: '',
      isOnTime: true,
      updatedAt: new Date().toISOString(),
    }
  })
}

/**
 * Calculates monthly schedule statistics.
 */
export function calculateMonthlyStats(items = []) {
  const total = items.length
  let completed = 0
  let inProgress = 0
  let delayed = 0
  let scheduled = 0
  let postponed = 0
  let onTimeCount = 0

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  items.forEach(item => {
    const status = item.status || 'SCHEDULED'
    if (status === 'COMPLETED') {
      completed++
      if (item.isOnTime !== false) onTimeCount++
    } else if (status === 'IN_PROGRESS') {
      inProgress++
      // If plannedEndDate is past today, flag as delayed
      if (item.plannedEndDate && item.plannedEndDate < todayStr) delayed++
    } else if (status === 'DELAYED') {
      delayed++
    } else if (status === 'POSTPONED') {
      postponed++
    } else {
      scheduled++
      if (item.plannedEndDate && item.plannedEndDate < todayStr) delayed++
    }
  })

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
  const onTimeRate = completed > 0 ? Math.round((onTimeCount / completed) * 100) : 100

  return {
    total,
    completed,
    inProgress,
    delayed,
    scheduled,
    postponed,
    completionRate,
    onTimeCount,
    onTimeRate,
  }
}

export default function PMMonthlyScheduleView({
  machinesList = [],
  onBackToPlan,
  canAdd = true,
  canEdit = true,
  canDelete = true,
}) {
  const toast = useToast()

  // Date selection state
  const currentDate = useMemo(() => new Date(), [])
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1) // 1 - 12
  const [viewMode, setViewMode] = useState('monthly') // 'monthly' | 'annual'

  // Schedule data per month: Map<string, Array>
  const [allSchedules, setAllSchedules] = useState({})
  const [loadingSchedule, setLoadingSchedule] = useState(true)
  const [savingSchedule, setSavingSchedule] = useState(false)

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modals state
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [updateForm, setUpdateForm] = useState({
    status: 'COMPLETED',
    actualStartDate: '',
    actualEndDate: '',
    actualTech: '',
    notes: '',
  })

  const [addEditModalOpen, setAddEditModalOpen] = useState(false)
  const [editItemForm, setEditItemForm] = useState({
    id: '',
    mc: '',
    ki: '',
    location: '',
    type: '',
    plannedStartDate: '',
    plannedEndDate: '',
    assignedTech: '',
    workingDays: 3,
    status: 'SCHEDULED',
  })

  // Selected month key: e.g. "2026-10"
  const monthKey = useMemo(() => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
  }, [selectedYear, selectedMonth])

  const configKey = useMemo(() => `pm_monthly_schedule_${monthKey}`, [monthKey])

  // Load schedule for selected year and month
  const loadMonthSchedule = useCallback(async (key) => {
    setLoadingSchedule(true)
    try {
      // 1. Try loading from AppConfigAPI
      const list = await AppConfigAPI.list().catch(() => [])
      const found = list.find(c => c.key === key)
      if (found && found.value) {
        let parsed = []
        try { parsed = JSON.parse(found.value) } catch { parsed = [] }
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllSchedules(prev => ({ ...prev, [key]: parsed }))
          setLoadingSchedule(false)
          return parsed
        }
      }

      // 2. Try loading from localStorage fallback
      const local = localStorage.getItem(key)
      if (local) {
        try {
          const parsedLocal = JSON.parse(local)
          if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
            setAllSchedules(prev => ({ ...prev, [key]: parsedLocal }))
            setLoadingSchedule(false)
            return parsedLocal
          }
        } catch {}
      }

      // If no schedule exists yet, return empty
      setAllSchedules(prev => ({ ...prev, [key]: [] }))
    } catch (err) {
      console.warn('Failed to load monthly schedule:', err)
      setAllSchedules(prev => ({ ...prev, [key]: [] }))
    } finally {
      setLoadingSchedule(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadMonthSchedule(configKey)
  }, [configKey, loadMonthSchedule])

  // Current items for the selected month
  const currentItems = useMemo(() => {
    return allSchedules[configKey] || []
  }, [allSchedules, configKey])

  // Save schedule to remote and local storage
  const saveSchedule = async (itemsToSave, targetConfigKey = configKey) => {
    setSavingSchedule(true)
    try {
      const jsonStr = JSON.stringify(itemsToSave)
      // Save local
      localStorage.setItem(targetConfigKey, jsonStr)
      setAllSchedules(prev => ({ ...prev, [targetConfigKey]: itemsToSave }))

      // Upsert to AppConfigAPI
      await AppConfigAPI.upsertBy('key', {
        key: targetConfigKey,
        value: jsonStr,
      }).catch(err => {
        console.warn('AppConfigAPI save fallback to local:', err)
      })

      toast.success('บันทึกแผนงานสำเร็จ', 'ตาราง PM รายเดือนได้รับการอัปเดตเรียบร้อย')
    } catch (err) {
      toast.error('ไม่สามารถบันทึกแผนงานได้', err.message)
    } finally {
      setSavingSchedule(false)
    }
  }

  // Handle Auto-generate schedule
  const handleAutoGenerate = () => {
    if (currentItems.length > 0) {
      if (!window.confirm(`มีแผนงานของเดือน ${THAI_MONTHS[selectedMonth - 1]} ${selectedYear} อยู่แล้ว ${currentItems.length} เครื่อง\nคุณต้องการสร้างแผนงานใหม่ทับข้อมูลเดิมหรือไม่?`)) {
        return
      }
    }
    const generated = autoGenerateMonthlySchedule(selectedYear, selectedMonth, machinesList)
    saveSchedule(generated)
    toast.success('สร้างแผนงานอัตโนมัติสำเร็จ', `จัดคิวเครื่องละ 3 วันทำการ (ข้ามวันอาทิตย์) รวม ${generated.length} เครื่อง`)
  }

  // Handle open actual execution update modal
  const handleOpenUpdateModal = (item) => {
    setSelectedItem(item)
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    setUpdateForm({
      status: item.status === 'SCHEDULED' ? 'COMPLETED' : item.status,
      actualStartDate: item.actualStartDate || item.plannedStartDate || todayStr,
      actualEndDate: item.actualEndDate || todayStr,
      actualTech: item.actualTech || item.assignedTech || 'ช.หนึ่ง',
      notes: item.notes || '',
    })
    setUpdateModalOpen(true)
  }

  // Submit actual execution update
  const handleSubmitUpdate = (e) => {
    e?.preventDefault()
    if (!selectedItem) return

    // Evaluate on-time: if completed, check if actualEndDate <= plannedEndDate
    const isCompleted = updateForm.status === 'COMPLETED'
    let isOnTime = true
    if (isCompleted && updateForm.actualEndDate && selectedItem.plannedEndDate) {
      isOnTime = updateForm.actualEndDate <= selectedItem.plannedEndDate
    }

    const updatedItems = currentItems.map(item => {
      if (item.id === selectedItem.id) {
        return {
          ...item,
          status: updateForm.status,
          actualStartDate: updateForm.actualStartDate,
          actualEndDate: updateForm.actualEndDate,
          actualTech: updateForm.actualTech,
          notes: updateForm.notes,
          isOnTime,
          updatedAt: new Date().toISOString(),
        }
      }
      return item
    })

    saveSchedule(updatedItems)
    setUpdateModalOpen(false)
    setSelectedItem(null)
  }

  // Handle Add/Edit scheduled machine manually
  const handleOpenAddModal = () => {
    const workingDays = getMonthlyWorkingDays(selectedYear, selectedMonth)
    const firstDay = workingDays[0]?.dateStr || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
    const thirdDay = workingDays[2]?.dateStr || firstDay

    setEditItemForm({
      id: '',
      mc: '',
      ki: '',
      location: 'GMK1',
      type: 'Double',
      plannedStartDate: firstDay,
      plannedEndDate: thirdDay,
      assignedTech: 'ช.หนึ่ง',
      workingDays: 3,
      status: 'SCHEDULED',
    })
    setAddEditModalOpen(true)
  }

  const handleOpenEditItemModal = (item) => {
    setEditItemForm({
      id: item.id,
      mc: item.mc,
      ki: item.ki || '',
      location: item.location || 'GMK1',
      type: item.type || 'Double',
      plannedStartDate: item.plannedStartDate || '',
      plannedEndDate: item.plannedEndDate || '',
      assignedTech: item.assignedTech || '',
      workingDays: item.workingDays || 3,
      status: item.status || 'SCHEDULED',
    })
    setAddEditModalOpen(true)
  }

  const handleSaveItem = (e) => {
    e?.preventDefault()
    if (!editItemForm.mc.trim()) {
      toast.error('กรุณาระบุรหัสเครื่อง (MC)')
      return
    }

    if (editItemForm.id) {
      // Edit existing
      const updated = currentItems.map(i => i.id === editItemForm.id ? { ...i, ...editItemForm } : i)
      saveSchedule(updated)
    } else {
      // Add new
      const newItem = {
        ...editItemForm,
        id: `PMSCH-${monthKey.replace('-', '')}-${String(currentItems.length + 1).padStart(2, '0')}`,
        sequence: currentItems.length + 1,
        actualStartDate: '',
        actualEndDate: '',
        actualTech: '',
        notes: '',
        isOnTime: true,
        updatedAt: new Date().toISOString(),
      }
      saveSchedule([...currentItems, newItem])
    }
    setAddEditModalOpen(false)
  }

  const handleDeleteItem = (itemId) => {
    if (!window.confirm('คุณต้องการลบเครื่องนี้ออกจากแผนงานประจำเดือนหรือไม่?')) return
    const filtered = currentItems.filter(i => i.id !== itemId)
    saveSchedule(filtered)
    toast.success('ลบรายการออกจากแผนสำเร็จ')
  }

  // Monthly stats
  const monthlyStats = useMemo(() => {
    return calculateMonthlyStats(currentItems)
  }, [currentItems])

  // Filtered items
  const filteredItems = useMemo(() => {
    return currentItems.filter(item => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchMc = String(item.mc || '').toLowerCase().includes(q)
        const matchKi = String(item.ki || '').toLowerCase().includes(q)
        const matchLoc = String(item.location || '').toLowerCase().includes(q)
        const matchTech = String(item.assignedTech || item.actualTech || '').toLowerCase().includes(q)
        return matchMc || matchKi || matchLoc || matchTech
      }
      return true
    })
  }, [currentItems, statusFilter, searchTerm])

  // Annual 12-Month Summary Aggregator
  const annualSummary = useMemo(() => {
    let totalPlanned = 0
    let totalCompleted = 0
    let totalInProgress = 0
    let totalDelayed = 0
    let totalOnTime = 0

    const monthsData = []

    for (let m = 1; m <= 12; m++) {
      const key = `pm_monthly_schedule_${selectedYear}-${String(m).padStart(2, '0')}`
      // Check loaded or localStorage
      let items = allSchedules[key]
      if (!items) {
        const cached = localStorage.getItem(key)
        if (cached) {
          try { items = JSON.parse(cached) } catch { items = [] }
        }
      }
      items = items || []
      const stats = calculateMonthlyStats(items)

      totalPlanned += stats.total
      totalCompleted += stats.completed
      totalInProgress += stats.inProgress
      totalDelayed += stats.delayed
      totalOnTime += stats.onTimeCount

      monthsData.push({
        monthNumber: m,
        monthName: THAI_MONTHS[m - 1],
        shortName: SHORT_THAI_MONTHS[m - 1],
        stats,
        itemsCount: stats.total,
        completedCount: stats.completed,
        completionRate: stats.completionRate,
      })
    }

    const overallCompletionRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0
    const overallOnTimeRate = totalCompleted > 0 ? Math.round((totalOnTime / totalCompleted) * 100) : 100

    return {
      year: selectedYear,
      totalPlanned,
      totalCompleted,
      totalInProgress,
      totalDelayed,
      totalOnTime,
      overallCompletionRate,
      overallOnTimeRate,
      monthsData,
    }
  }, [selectedYear, allSchedules])

  return (
    <div className="space-y-6">
      {/* ── TOP CONTROLS & NAVIGATION BAR ────────────────────── */}
      <div className="card p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <CalendarRange size={20} />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight" style={{ color: 'var(--text-900)' }}>
                  จัดทำแผน PM รายเดือน (Monthly PM Schedule)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  วางแผนบำรุงรักษาเครื่องละ 3 วันทำการ (ไม่รวมวันอาทิตย์) ติดตามผลงานจริง และสรุปภาพรวม 12 เดือน
                </p>
              </div>
            </div>
          </div>

          {/* Mode Switcher Toggle: Monthly vs Annual */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Calendar size={14} />
              <span>แผนประจำเดือน</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('annual')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === 'annual'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 size={14} />
              <span>สรุปภาพรวมทั้งปี (12 เดือน)</span>
            </button>
          </div>
        </div>

        {/* Year & Month Selection Ribbon */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">ปี:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="select text-xs font-bold font-mono py-1.5 px-3 min-w-[100px]"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* 12-Month Selector Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {SHORT_THAI_MONTHS.map((name, idx) => {
              const mNum = idx + 1
              const isSelected = selectedMonth === mNum
              return (
                <button
                  key={mNum}
                  type="button"
                  onClick={() => {
                    setSelectedMonth(mNum)
                    if (viewMode === 'annual') setViewMode('monthly')
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs scale-105'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {viewMode === 'monthly' && canAdd && (
              <button
                type="button"
                onClick={handleAutoGenerate}
                disabled={savingSchedule}
                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="สร้างตารางแผน PM 3 วันต่อเครื่องให้อัตโนมัติ โดยข้ามวันอาทิตย์"
              >
                <Sparkles size={14} />
                <span>สร้างแผนอัตโนมัติ (3 วัน/เครื่อง)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
              title="พิมพ์ตารางแผน PM"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">พิมพ์แผนงาน</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── VIEW 1: MONTHLY VIEW (มุมมองแผนประจำเดือน) ───────────── */}
      {viewMode === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly Dashboard KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Planned */}
            <div className="card p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Layers size={13} className="text-blue-500" />
                <span>แผนทั้งหมด</span>
              </div>
              <div className="text-xl font-black mt-1 font-mono" style={{ color: 'var(--text-900)' }}>
                {monthlyStats.total} <span className="text-xs font-normal text-slate-400">เครื่อง</span>
              </div>
            </div>

            {/* Completed */}
            <div className="card p-3.5 border border-emerald-500/20 bg-emerald-500/5 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={13} />
                <span>เสร็จสิ้น</span>
              </div>
              <div className="text-xl font-black mt-1 font-mono text-emerald-600 dark:text-emerald-400">
                {monthlyStats.completed} <span className="text-xs font-normal text-slate-400">เครื่อง</span>
              </div>
            </div>

            {/* In Progress */}
            <div className="card p-3.5 border border-amber-500/20 bg-amber-500/5 shadow-xs">
              <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Play size={13} />
                <span>กำลังทำ</span>
              </div>
              <div className="text-xl font-black mt-1 font-mono text-amber-600 dark:text-amber-400">
                {monthlyStats.inProgress} <span className="text-xs font-normal text-slate-400">เครื่อง</span>
              </div>
            </div>

            {/* Delayed / Overdue */}
            <div className="card p-3.5 border border-rose-500/20 bg-rose-500/5 shadow-xs">
              <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle size={13} />
                <span>ล่าช้า/เกินกำหนด</span>
              </div>
              <div className="text-xl font-black mt-1 font-mono text-rose-600 dark:text-rose-400">
                {monthlyStats.delayed} <span className="text-xs font-normal text-slate-400">เครื่อง</span>
              </div>
            </div>

            {/* Monthly Completion Rate */}
            <div className="card p-3.5 border border-blue-500/20 bg-blue-500/5 shadow-xs">
              <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <TrendingUp size={13} />
                <span>ความสำเร็จเดือนนี้</span>
              </div>
              <div className="text-xl font-black mt-1 font-mono text-blue-600 dark:text-blue-400">
                {monthlyStats.completionRate}%
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${monthlyStats.completionRate}%` }}
                />
              </div>
            </div>

            {/* On-Time Rate */}
            <div className="card p-3.5 border border-purple-500/20 bg-purple-500/5 shadow-xs">
              <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <Clock size={13} />
                <span>ตรงตามเวลา (SLA)</span>
              </div>
              <div className="text-xl font-black mt-1 font-mono text-purple-600 dark:text-purple-400">
                {monthlyStats.onTimeRate}%
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-2 overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${monthlyStats.onTimeRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Table Header Controls */}
          <div className="card p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative min-w-[200px] flex-1 sm:flex-none">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาเครื่อง, รหัส, ช่าง..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-8 py-1.5 text-xs w-full"
                  />
                </div>

                {/* Status filter tabs */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'ALL'
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    ทั้งหมด ({currentItems.length})
                  </button>
                  {SCHEDULE_STATUS_OPTIONS.map(opt => {
                    const count = currentItems.filter(i => i.status === opt.value).length
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatusFilter(opt.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          statusFilter === opt.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {opt.label} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>

              {canAdd && (
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="btn-outline text-xs px-3 py-1.5 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus size={14} />
                  <span>เพิ่มเครื่องในแผน</span>
                </button>
              )}
            </div>

            {/* Schedule Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">ลำดับ</th>
                    <th className="py-2.5 px-3">เครื่องจักร (MC)</th>
                    <th className="py-2.5 px-3">ตำแหน่ง / ประเภท</th>
                    <th className="py-2.5 px-3">กำหนดตามแผน (3 วันทำการ)</th>
                    <th className="py-2.5 px-3">ช่วงเวลาทำจริง</th>
                    <th className="py-2.5 px-3">ช่างผู้รับผิดชอบ</th>
                    <th className="py-2.5 px-3">สถานะ</th>
                    <th className="py-2.5 px-3">ประเมิน SLA</th>
                    <th className="py-2.5 px-3 text-right">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        {loadingSchedule ? (
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw size={16} className="animate-spin text-blue-500" />
                            <span>กำลังโหลดข้อมูลแผนงาน...</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p>ยังไม่มีรายการแผน PM สำหรับเดือน {THAI_MONTHS[selectedMonth - 1]} {selectedYear}</p>
                            {canAdd && (
                              <button
                                type="button"
                                onClick={handleAutoGenerate}
                                className="btn-primary text-xs px-3.5 py-1.5 inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Sparkles size={14} />
                                <span>คลิกสร้างแผนอัตโนมัติ (3 วัน/เครื่อง)</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const statusMeta = getStatusMeta(item.status)
                      const isCompleted = item.status === 'COMPLETED'
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{item.mc}</span>
                              {item.ki && <span className="text-[10px] font-mono text-slate-400">({item.ki})</span>}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-slate-600 dark:text-slate-300 font-medium">{item.location || '—'}</span>
                            {item.type && <span className="ml-1 text-[10px] text-slate-400">· {item.type}</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-mono text-slate-700 dark:text-slate-300">
                              {item.plannedStartDate} → {item.plannedEndDate}
                            </div>
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                              3 วันทำการ (ไม่รวมอาทิตย์)
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {item.actualStartDate ? (
                              <div className="font-mono text-slate-800 dark:text-slate-200">
                                {item.actualStartDate} → {item.actualEndDate || 'กำลังทำ'}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                              <Users size={12} className="text-slate-400" />
                              <span>{item.actualTech || item.assignedTech || '—'}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.badgeClass}`}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {isCompleted ? (
                              item.isOnTime !== false ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  ✓ ทันกำหนด
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                  ⚠ เกินกำหนด
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenUpdateModal(item)}
                                  className="btn-primary text-xs px-2.5 py-1 flex items-center gap-1 cursor-pointer"
                                  title="อัปเดตงานทำจริง"
                                >
                                  <Edit3 size={12} />
                                  <span>อัปเดตงานจริง</span>
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditItemModal(item)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                  title="แก้ไขแผน"
                                >
                                  <Calendar size={13} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                                  title="ลบออกจากแผน"
                                >
                                  <Trash2 size={13} />
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

      {/* ── VIEW 2: ANNUAL 12-MONTH SUMMARY (แดชบอร์ดสรุปภาพรวมทั้งปี) ─ */}
      {viewMode === 'annual' && (
        <div className="space-y-6">
          {/* Annual KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                แผน PM รวมทั้งปี ({annualSummary.year})
              </div>
              <div className="text-2xl font-black mt-1 font-mono text-blue-600 dark:text-blue-400">
                {annualSummary.totalPlanned} <span className="text-sm font-normal text-slate-400">เครื่อง</span>
              </div>
            </div>

            <div className="card p-5 border border-emerald-500/20 bg-emerald-500/5 shadow-xs">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ทำสำเร็จแล้วทั้งปี
              </div>
              <div className="text-2xl font-black mt-1 font-mono text-emerald-600 dark:text-emerald-400">
                {annualSummary.totalCompleted} <span className="text-sm font-normal text-slate-400">เครื่อง</span>
              </div>
            </div>

            <div className="card p-5 border border-blue-500/20 bg-blue-500/5 shadow-xs">
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                อัตราความสำเร็จสะสมทั้งปี (Annual %)
              </div>
              <div className="text-2xl font-black mt-1 font-mono text-blue-600 dark:text-blue-400">
                {annualSummary.overallCompletionRate}%
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${annualSummary.overallCompletionRate}%` }}
                />
              </div>
            </div>

            <div className="card p-5 border border-purple-500/20 bg-purple-500/5 shadow-xs">
              <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                อัตราตรงเวลา SLA ทั้งปี (On-Time %)
              </div>
              <div className="text-2xl font-black mt-1 font-mono text-purple-600 dark:text-purple-400">
                {annualSummary.overallOnTimeRate}%
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-2 overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${annualSummary.overallOnTimeRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* 12-Month Comparison Grid & Table */}
          <div className="card p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  ตารางเปรียบเทียบผลงาน PM รายเดือน (มกราคม - ธันวาคม {annualSummary.year})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  สรุปความก้าวหน้าและการทำ PM ในแต่ละเดือน สามารถกดเพื่อดูรายละเอียดของเดือนนั้นได้
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">เดือน</th>
                    <th className="py-2.5 px-3 text-center">แผนทั้งหมด</th>
                    <th className="py-2.5 px-3 text-center">ทำเสร็จแล้ว</th>
                    <th className="py-2.5 px-3 text-center">กำลังทำ</th>
                    <th className="py-2.5 px-3 text-center">ล่าช้า</th>
                    <th className="py-2.5 px-3 text-center">ความสำเร็จ (%)</th>
                    <th className="py-2.5 px-3 text-right">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {annualSummary.monthsData.map(m => {
                    const isSelected = selectedMonth === m.monthNumber
                    return (
                      <tr
                        key={m.monthNumber}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${
                          isSelected ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                          {m.monthName} ({m.shortName})
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">
                          {m.itemsCount}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {m.completedCount}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-amber-600 dark:text-amber-400">
                          {m.stats.inProgress}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-rose-600 dark:text-rose-400">
                          {m.stats.delayed}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {m.completionRate}%
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${m.completionRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMonth(m.monthNumber)
                              setViewMode('monthly')
                            }}
                            className="btn-outline text-[11px] px-2.5 py-1 cursor-pointer"
                          >
                            ดูรายละเอียดเดือนนี้ →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: UPDATE ACTUAL EXECUTION ─────────────────────── */}
      <Modal
        open={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title={`อัปเดตงานทำจริง: ${selectedItem?.mc || ''}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setUpdateModalOpen(false)}
              className="btn-outline text-xs px-3 py-1.5 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSubmitUpdate}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1 cursor-pointer"
            >
              <Check size={14} />
              <span>บันทึกความคืบหน้า</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmitUpdate} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200">
              เครื่อง {selectedItem?.mc} {selectedItem?.ki ? `(${selectedItem?.ki})` : ''} · {selectedItem?.location}
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              แผนที่กำหนด: {selectedItem?.plannedStartDate} ถึง {selectedItem?.plannedEndDate} (3 วันทำการ)
            </div>
          </div>

          <div>
            <label className="label">สถานะการทำงาน *</label>
            <select
              value={updateForm.status}
              onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
              className="select font-semibold text-xs"
            >
              {SCHEDULE_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">วันที่เริ่มทำจริง *</label>
              <input
                type="date"
                value={updateForm.actualStartDate}
                onChange={(e) => setUpdateForm({ ...updateForm, actualStartDate: e.target.value })}
                className="input text-xs font-mono font-semibold"
                required
              />
            </div>
            <div>
              <label className="label">วันที่เสร็จจริง</label>
              <input
                type="date"
                value={updateForm.actualEndDate}
                onChange={(e) => setUpdateForm({ ...updateForm, actualEndDate: e.target.value })}
                className="input text-xs font-mono font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="label">ช่างผู้ปฏิบัติงานจริง</label>
            <input
              type="text"
              placeholder="ระบุชื่อช่าง..."
              value={updateForm.actualTech}
              onChange={(e) => setUpdateForm({ ...updateForm, actualTech: e.target.value })}
              className="input text-xs font-semibold"
            />
          </div>

          <div>
            <label className="label">ผลการทำ / หมายเหตุ / รายละเอียดเพิ่มเติม</label>
            <textarea
              rows={3}
              placeholder="บันทึกสภาพเครื่อง, อะไหล่ที่เปลี่ยน, หรือข้อควรระวัง..."
              value={updateForm.notes}
              onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
              className="input text-xs"
            />
          </div>
        </form>
      </Modal>

      {/* ── MODAL: ADD / EDIT SCHEDULED MACHINE ───────────────── */}
      <Modal
        open={addEditModalOpen}
        onClose={() => setAddEditModalOpen(false)}
        title={editItemForm.id ? `แก้ไขแผน: ${editItemForm.mc}` : `เพิ่มเครื่องจักรในแผน (${THAI_MONTHS[selectedMonth - 1]} ${selectedYear})`}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddEditModalOpen(false)}
              className="btn-outline text-xs px-3 py-1.5 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSaveItem}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1 cursor-pointer"
            >
              <Check size={14} />
              <span>บันทึก</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">รหัสเครื่องจักร (MC) *</label>
              <input
                type="text"
                placeholder="เช่น MC-01"
                value={editItemForm.mc}
                onChange={(e) => setEditItemForm({ ...editItemForm, mc: e.target.value.toUpperCase() })}
                className="input font-bold font-mono text-xs uppercase"
                required
              />
            </div>
            <div>
              <label className="label">รหัสงาน (KI) / ซีเรียล</label>
              <input
                type="text"
                placeholder="เช่น KI-9012"
                value={editItemForm.ki}
                onChange={(e) => setEditItemForm({ ...editItemForm, ki: e.target.value.toUpperCase() })}
                className="input font-mono text-xs uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">สถานที่ (Location)</label>
              <input
                type="text"
                placeholder="เช่น GMK1"
                value={editItemForm.location}
                onChange={(e) => setEditItemForm({ ...editItemForm, location: e.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">ประเภทเครื่อง</label>
              <input
                type="text"
                placeholder="Single / Double"
                value={editItemForm.type}
                onChange={(e) => setEditItemForm({ ...editItemForm, type: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">วันเริ่มตามแผน (Start Date) *</label>
              <input
                type="date"
                value={editItemForm.plannedStartDate}
                onChange={(e) => setEditItemForm({ ...editItemForm, plannedStartDate: e.target.value })}
                className="input font-mono text-xs font-semibold"
                required
              />
            </div>
            <div>
              <label className="label">วันเสร็จตามแผน (End Date) *</label>
              <input
                type="date"
                value={editItemForm.plannedEndDate}
                onChange={(e) => setEditItemForm({ ...editItemForm, plannedEndDate: e.target.value })}
                className="input font-mono text-xs font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">ช่างผู้รับผิดชอบ</label>
            <input
              type="text"
              placeholder="ระบุชื่อช่าง..."
              value={editItemForm.assignedTech}
              onChange={(e) => setEditItemForm({ ...editItemForm, assignedTech: e.target.value })}
              className="input text-xs font-semibold"
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
