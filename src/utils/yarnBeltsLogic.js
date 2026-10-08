/**
 * src/utils/yarnBeltsLogic.js
 * Logic and aggregation utilities for Yarn Feeding Belts (สายพานส่งด้าย เทป 1-5)
 */

/**
 * Extract Tape 5 number from remark if not in standard column
 */
export function extractTape5FromRemark(note = '') {
  const match = String(note || '').match(/Tape5:\s*([^\r\n]+)/i)
  return match?.[1]?.trim() || ''
}

/**
 * Normalize belt number (cleans whitespace, dashes, and invalid values)
 */
export function normalizeBeltNo(val) {
  if (val === null || val === undefined) return ''
  const str = String(val).trim()
  if (!str || str === '-' || str === '—' || str.toLowerCase() === 'n/a' || str === 'null' || str === 'undefined') {
    return ''
  }
  return str
}

/**
 * Get all 5 tape numbers for a single machine
 * @param {Object} m Machine record
 * @returns {{ 1: string, 2: string, 3: string, 4: string, 5: string }}
 */
export function getMachineTapes(m = {}) {
  const t1 = normalizeBeltNo(m.Tape1_No ?? m.tape1_no)
  const t2 = normalizeBeltNo(m.Tape2_No ?? m.tape2_no)
  const t3 = normalizeBeltNo(m.Tape3_No ?? m.tape3_no)
  const t4 = normalizeBeltNo(m.Tape4_No ?? m.tape4_no)
  const t5 = normalizeBeltNo(m.Tape5_No ?? m.tape5_no ?? extractTape5FromRemark(m.Remark))
  return { 1: t1, 2: t2, 3: t3, 4: t4, 5: t5 }
}

/**
 * Check if a machine has at least one valid yarn belt
 */
export function machineHasBelts(m = {}) {
  const tapes = getMachineTapes(m)
  return Boolean(tapes[1] || tapes[2] || tapes[3] || tapes[4] || tapes[5])
}

/**
 * Sort belt numbers: natural sort with numeric priority (e.g. 7200, 8200, 9800, 10400, 11000)
 */
export function sortBeltNumbers(a, b) {
  const numA = parseFloat(a)
  const numB = parseFloat(b)
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
    return numA - numB
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

/**
 * Aggregates all yarn belts from a list of machines
 * @param {Array} machines List of machine objects
 * @param {Object} options Options for filtering
 * @returns {Object} Full aggregated breakdown, overall totals, and filtered list
 */
export function aggregateYarnBelts(machines = [], { locationFilter = '', search = '', selectedBelt = '' } = {}) {
  const rawList = Array.isArray(machines) ? machines : []

  // Extract all distinct locations for filter dropdown
  const locationSet = new Set()
  rawList.forEach((m) => {
    const loc = String(m.Location || '').trim()
    if (loc && loc !== '-' && loc !== '—') locationSet.add(loc)
  })
  const locationOptions = Array.from(locationSet).sort((a, b) => a.localeCompare(b, 'th'))

  // Filter machines by location
  let locationFiltered = rawList
  if (locationFilter && locationFilter !== 'ALL') {
    locationFiltered = rawList.filter((m) => String(m.Location || '').trim() === String(locationFilter).trim())
  }

  // Data structures for aggregation
  // overallMap: beltNo -> { beltNo, totalQty, machineIds: Set, machines: [], tapePositions: { 1: qty, 2: qty, 3: qty, 4: qty, 5: qty } }
  const overallMap = new Map()

  // tapeMap: tapeIndex (1..5) -> Map(beltNo -> { beltNo, qty, machineIds: Set, machines: [] })
  const tapeMap = {
    1: new Map(),
    2: new Map(),
    3: new Map(),
    4: new Map(),
    5: new Map(),
  }

  let totalBeltsCount = 0
  let machinesWithBeltsCount = 0

  locationFiltered.forEach((m) => {
    const tapes = getMachineTapes(m)
    let mHasBelt = false
    const mcName = m.Mc || m.mc || m.id || '—'

    for (let pos = 1; pos <= 5; pos++) {
      const beltNo = tapes[pos]
      if (!beltNo) continue

      mHasBelt = true
      totalBeltsCount++

      // 1. Overall Aggregation
      if (!overallMap.has(beltNo)) {
        overallMap.set(beltNo, {
          beltNo,
          totalQty: 0,
          machineIds: new Set(),
          machines: [],
          tapePositions: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        })
      }
      const overallItem = overallMap.get(beltNo)
      overallItem.totalQty++
      overallItem.tapePositions[pos]++
      if (!overallItem.machineIds.has(mcName)) {
        overallItem.machineIds.add(mcName)
        overallItem.machines.push(m)
      }

      // 2. Tape Position Breakdown
      const currentTapeMap = tapeMap[pos]
      if (!currentTapeMap.has(beltNo)) {
        currentTapeMap.set(beltNo, {
          beltNo,
          qty: 0,
          machineIds: new Set(),
          machines: [],
        })
      }
      const tapeItem = currentTapeMap.get(beltNo)
      tapeItem.qty++
      if (!tapeItem.machineIds.has(mcName)) {
        tapeItem.machineIds.add(mcName)
        tapeItem.machines.push(m)
      }
    }

    if (mHasBelt) {
      machinesWithBeltsCount++
    }
  })

  // Format overall summary array (sorted by numeric belt size ascending)
  const overallSummary = Array.from(overallMap.values())
    .map((item) => ({
      ...item,
      machineCount: item.machineIds.size,
    }))
    .sort((a, b) => sortBeltNumbers(a.beltNo, b.beltNo))

  // Format tape breakdown (positions 1 to 5)
  const tapeBreakdown = {
    1: Array.from(tapeMap[1].values()).map(i => ({ ...i, machineCount: i.machineIds.size })).sort((a, b) => sortBeltNumbers(a.beltNo, b.beltNo)),
    2: Array.from(tapeMap[2].values()).map(i => ({ ...i, machineCount: i.machineIds.size })).sort((a, b) => sortBeltNumbers(a.beltNo, b.beltNo)),
    3: Array.from(tapeMap[3].values()).map(i => ({ ...i, machineCount: i.machineIds.size })).sort((a, b) => sortBeltNumbers(a.beltNo, b.beltNo)),
    4: Array.from(tapeMap[4].values()).map(i => ({ ...i, machineCount: i.machineIds.size })).sort((a, b) => sortBeltNumbers(a.beltNo, b.beltNo)),
    5: Array.from(tapeMap[5].values()).map(i => ({ ...i, machineCount: i.machineIds.size })).sort((a, b) => sortBeltNumbers(a.beltNo, b.beltNo)),
  }

  // Filter detailed machines table by search & selectedBelt
  const trimmedSearch = String(search || '').trim().toLowerCase()
  const trimmedBelt = String(selectedBelt || '').trim()

  const displayMachines = locationFiltered.filter((m) => {
    const tapes = getMachineTapes(m)

    // Filter by selected belt if active
    if (trimmedBelt) {
      const usesBelt = Object.values(tapes).some((b) => b === trimmedBelt)
      if (!usesBelt) return false
    }

    // Filter by search query
    if (trimmedSearch) {
      const match = [
        m.Mc,
        m.Location,
        m.Type,
        m.Manufacturer,
        m.Model,
        tapes[1],
        tapes[2],
        tapes[3],
        tapes[4],
        tapes[5],
      ].some((val) => String(val || '').toLowerCase().includes(trimmedSearch))
      if (!match) return false
    }

    return true
  })

  return {
    locationOptions,
    overallSummary,
    tapeBreakdown,
    displayMachines,
    stats: {
      totalMachines: locationFiltered.length,
      machinesWithBelts: machinesWithBeltsCount,
      totalBelts: totalBeltsCount,
      uniqueBeltSizes: overallSummary.length,
    },
  }
}
