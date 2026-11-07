import { normalizeWorkOrderRow, getWorkOrderStatusMeta } from './workOrderNormalize.js'
import { isSystemWorkOrder, calculateSlaPerformance, KpiSettingsAPI } from '../../api/entities'
import { calculateProblemCauseStats } from './WorkOrders.jsx'

// Pure stats computations moved verbatim out of the WorkOrders component
// (memo bodies and their nested helper) to meet the complexity gate.
// Params only, no component state, no side effects.

// Body of the `allJobs` memo.
export function normalizeAllJobs(rawJobs) {
  if (!Array.isArray(rawJobs)) return []
  return rawJobs
    .filter((r) => r && !isSystemWorkOrder(r))
    .map(normalizeWorkOrderRow)
}

// Body of the `typeCounts` memo.
export function computeTypeCounts(allJobs, showDeleted) {
  const counts = { ALL: 0, REPAIR: 0, DESIGN: 0, PM: 0, SETUP: 0 }
  const relevant = allJobs.filter((j) => (showDeleted ? Boolean(j.IsDeleted) : !j.IsDeleted))
  counts.ALL = relevant.length
  relevant.forEach((j) => {
    const t = (j.JobType || 'REPAIR').toUpperCase()
    if (counts[t] !== undefined) counts[t]++
    else counts.REPAIR++
  })
  return counts
}

// Body of the `statusCounts` memo.
export function computeStatusCounts(allJobs, showDeleted) {
  const counts = { ALL: 0, IN_PROGRESS: 0, WAITING_TECH: 0, WAITING_PARTS: 0, WAITING_SUMMARY: 0, WAITING_DYE_TEST: 0, COMPLETED: 0, CANCELLED: 0 }
  const relevant = allJobs.filter((j) => (showDeleted ? Boolean(j.IsDeleted) : !j.IsDeleted))
  counts.ALL = relevant.length
  relevant.forEach((j) => {
    const meta = getWorkOrderStatusMeta(j.Status)
    if (counts[meta.value] !== undefined) counts[meta.value]++
  })
  return counts
}

// Body of the `causeCounts` memo.
export function computeCauseCounts(allJobs, showDeleted) {
  const counts = { ALL: 0, คน: 0, เครื่องจักร: 0, วัตถุดิบ: 0, UNSPECIFIED: 0 }
  const relevant = allJobs.filter((j) => (showDeleted ? Boolean(j.IsDeleted) : !j.IsDeleted))
  counts.ALL = relevant.length
  relevant.forEach((j) => {
    const c = String(j?.ProblemCause || j?.problem_cause || '').trim()
    if (!c) {
      counts.UNSPECIFIED++
    } else if (counts[c] !== undefined) {
      counts[c]++
    } else {
      counts.UNSPECIFIED++
    }
  })
  return counts
}

// Nested `calcJobTypeKpi` from the `kpiStats` memo. Closure inputs
// (`activeNonDeleted`, `kpiTargets`) become explicit params; body verbatim.
export function calcJobTypeKpi(activeNonDeleted, typeKey, kpiTargets) {
  const jobsOfType = activeNonDeleted.filter((j) => (j.JobType || 'REPAIR') === typeKey)
  const targetDays = kpiTargets[typeKey] || 1.0
  const totalCount = jobsOfType.length

  let onTimeCount = 0
  let overdueCount = 0
  let totalHours = 0
  let countWithDuration = 0

  jobsOfType.forEach((j) => {
    const sla = calculateSlaPerformance(j, kpiTargets, 12)
    if (sla.isOnTime) onTimeCount += 1
    else overdueCount += 1

    const durationVal = parseFloat(j.WorkingHoursDecimal || j.Duration || sla.netHoursDecimal) || 0
    if (durationVal > 0) {
      totalHours += durationVal
      countWithDuration += 1
    }
  })

  const rate = totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 0
  const avgHours = countWithDuration > 0 ? (totalHours / countWithDuration).toFixed(1) : '—'
  const avgDurationText = avgHours !== '—' ? `${avgHours} ชม.` : '—'

  return {
    total: totalCount,
    onTime: onTimeCount,
    overdue: overdueCount,
    rate,
    avgDurationText,
    targetDays,
    targetHours: targetDays * 12,
  }
}

// Body of the `kpiStats` memo.
export function computeKpiStats(allJobs, kpiTargets) {
  const activeNonDeleted = allJobs.filter((j) => !j.IsDeleted)
  const total = activeNonDeleted.length
  const completed = activeNonDeleted.filter((j) => getWorkOrderStatusMeta(j.Status).isCompleted).length
  const cancelled = activeNonDeleted.filter((j) => getWorkOrderStatusMeta(j.Status).isCancelled).length
  const active = activeNonDeleted.filter((j) => {
    const m = getWorkOrderStatusMeta(j.Status)
    return !m.isCompleted && !m.isCancelled
  }).length

  const repairKpi = calcJobTypeKpi(activeNonDeleted, 'REPAIR', kpiTargets)
  const designKpi = calcJobTypeKpi(activeNonDeleted, 'DESIGN', kpiTargets)
  const pmKpi     = calcJobTypeKpi(activeNonDeleted, 'PM', kpiTargets)
  const setupKpi  = calcJobTypeKpi(activeNonDeleted, 'SETUP', kpiTargets)

  const totalOnTime = repairKpi.onTime + designKpi.onTime + pmKpi.onTime + setupKpi.onTime
  const overallRate = total > 0 ? Math.round((totalOnTime / total) * 100) : 0

  // Problem cause analytics calculation
  const causeStats = calculateProblemCauseStats(activeNonDeleted, kpiTargets)

  // User metrics
  const userMetricsMap = {}
  activeNonDeleted.forEach((j) => {
    const u = j.CreatedBy || j.CompletedBy || 'ช่างประจำกะ'
    userMetricsMap[u] = (userMetricsMap[u] || 0) + 1
  })

  return {
    total,
    active,
    completed,
    cancelled,
    overallRate,
    repair: repairKpi,
    design: designKpi,
    pm: pmKpi,
    setup: setupKpi,
    causeStats,
    userMetrics: Object.entries(userMetricsMap).map(([name, count]) => ({ name, count })),
    recentJobs: activeNonDeleted.slice(0, 5),
  }
}

// Was `const handleSaveKpiSettings = async () => {...}` in the component.
export async function saveKpiSettings({ draftKpi, setKpiTargets, setKpiModalOpen, toast }) {
  try {
    await Promise.all([
      KpiSettingsAPI.upsertBy('Key', { Key: 'kpi_target_repair', Value: String(draftKpi.REPAIR) }),
      KpiSettingsAPI.upsertBy('Key', { Key: 'kpi_target_design', Value: String(draftKpi.DESIGN) }),
      KpiSettingsAPI.upsertBy('Key', { Key: 'kpi_target_pm',     Value: String(draftKpi.PM) }),
      KpiSettingsAPI.upsertBy('Key', { Key: 'kpi_target_setup',  Value: String(draftKpi.SETUP || 1.0) }),
    ])
    setKpiTargets({ ...draftKpi })
    toast.success('บันทึกเป้าหมาย KPI สำเร็จ', 'อัปเดตระบบคำนวณ SLA เรียบร้อย')
    setKpiModalOpen(false)
  } catch (err) {
    setKpiTargets({ ...draftKpi })
    toast.success('บันทึกเป้าหมาย KPI เรียบร้อย (Local)', 'อัปเดตระบบคำนวณ SLA เรียบร้อย')
    setKpiModalOpen(false)
  }
}
