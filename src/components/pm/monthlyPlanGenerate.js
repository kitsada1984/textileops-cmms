import { format } from 'date-fns'

/**
 * Sorts machines by Countdown Priority:
 * Most Overdue First (e.g. -100 days > -98 days > 0 days > +5 days > null / no plan).
 * Tie-breaker: natural sorting by machine code.
 */
export function sortMachinesByCountdownPriority(machines = []) {
  return [...machines].sort((a, b) => {
    const daysA = typeof a.countdownDays === 'number' ? a.countdownDays : null
    const daysB = typeof b.countdownDays === 'number' ? b.countdownDays : null

    if (daysA !== null && daysB !== null) {
      if (daysA !== daysB) {
        return daysA - daysB // Ascending: -100 comes before -98, which comes before 0, which comes before 5
      }
    } else if (daysA !== null) {
      return -1
    } else if (daysB !== null) {
      return 1
    }

    const mcA = String(a.mc || a.NewMC || a.Machine_MC || '')
    const mcB = String(b.mc || b.NewMC || b.Machine_MC || '')
    return mcA.localeCompare(mcB, undefined, { numeric: true, sensitivity: 'base' })
  })
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

export const AVAILABLE_LOCATIONS = [
  { id: 'GMK1', label: 'GMK1 (โรง 1)', alias: ['GK1', 'GMK1', '1'] },
  { id: 'GMK3', label: 'GMK3 (โรง 3)', alias: ['GK3', 'GMK3', '3'] },
  { id: 'GMK4', label: 'GMK4 (โรง 4)', alias: ['GK4', 'GMK4', '4'] },
]

export function matchesLocation(itemLocation = '', selectedLocations = []) {
  if (!selectedLocations || selectedLocations.length === 0 || selectedLocations.includes('ALL')) {
    return true
  }
  const normItem = String(itemLocation || '').trim().toUpperCase()
  return selectedLocations.some((sel) => {
    const normSel = String(sel || '').trim().toUpperCase()
    if (normSel === 'ALL') return true
    const locConfig = AVAILABLE_LOCATIONS.find(l => l.id === normSel)
    if (locConfig) {
      return locConfig.alias.some(a => normItem === a || normItem.includes(a))
    }
    return normItem === normSel
  })
}

export const SCHEDULE_STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'ตามแผน', badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { value: 'IN_PROGRESS', label: 'กำลังทำ', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { value: 'COMPLETED', label: 'เสร็จสิ้น', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { value: 'DELAYED', label: 'ล่าช้า', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  { value: 'POSTPONED', label: 'เลื่อนแผน', badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
]

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

// Pure block builders moved verbatim from autoGenerateMonthlySchedule
// (field resolution only — block iteration stays in the caller).

export function resolveBlockMachineFields(machine, idx) {
  return {
    mc: machine?.NewMC || machine?.mc || machine?.Machine_MC || machine?.Mc || `MC-${String(idx + 1).padStart(2, '0')}`,
    ki: machine?.Serial_OLD || machine?.ki || machine?.Machine_KI || '',
    location: machine?.Location || machine?.location || 'GMK1',
    type: machine?.Type || machine?.type || 'Double',
  }
}

export function resolveBlockScheduleFields(machine) {
  return {
    nextPmDate: machine?.nextPmDate || '',
    lastPmDate: machine?.lastPmDate || '',
    countdownDays: machine?.countdownDays ?? null,
    countdownLabel: machine?.countdownLabel || '',
    countdownColor: machine?.countdownColor || 'gray',
  }
}

export function buildPlannedBlockItem(block, idx, machine, monthKey, daysPerMachine) {
  const { mc, ki, location, type } = resolveBlockMachineFields(machine, idx)
  const { nextPmDate, lastPmDate, countdownDays, countdownLabel, countdownColor } = resolveBlockScheduleFields(machine)

  return {
    id: `PMSCH-${monthKey.replace('-', '')}-${String(idx + 1).padStart(2, '0')}`,
    mc,
    ki,
    location,
    type,
    nextPmDate,
    lastPmDate,
    countdownDays,
    countdownLabel,
    countdownColor,
    plannedStartDate: block.startDate,
    plannedEndDate: block.endDate,
    actualStartDate: '',
    actualEndDate: '',
    assignedTech: '',
    actualTech: '',
    status: 'SCHEDULED',
    notes: '',
    workingDays: block.workingDaysCount || daysPerMachine,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function matchScheduleFilter(item, { statusFilter, viewLocationFilter, searchQuery }) {
  // Status filter
  if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
  // Location View Filter
  if (!matchesLocation(item.location, viewLocationFilter)) return false
  // Search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase().trim()
    const matchMC = String(item.mc || '').toLowerCase().includes(q)
    const matchKI = String(item.ki || '').toLowerCase().includes(q)
    const matchLoc = String(item.location || '').toLowerCase().includes(q)
    const matchTech = String(item.actualTech || item.assignedTech || '').toLowerCase().includes(q)
    if (!matchMC && !matchKI && !matchLoc && !matchTech) return false
  }
  return true
}
