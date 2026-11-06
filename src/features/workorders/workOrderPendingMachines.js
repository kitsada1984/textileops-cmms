/**
 * workOrderPendingMachines.js
 * Helper utilities for extracting, filtering, and normalizing pending tasks across all types
 * (Work Orders, Repair Requests, PM Plans) to support the Interruption Management workflow.
 */

/**
 * Normalizes and extracts pending tasks from work orders and repair requests.
 * Excludes completed, cancelled, or deleted records, and optionally excludes the current job.
 */
export function extractPendingTasks({
  workOrders = [],
  repairRequests = [],
  excludeJobId = null,
} = {}) {
  const pendingItems = []

  // 1. Process Work Orders
  if (Array.isArray(workOrders)) {
    workOrders.forEach((wo) => {
      if (!wo || wo.IsDeleted) return
      const id = String(wo.Job_ID || wo['Job ID'] || wo.id || '').trim()
      if (excludeJobId && id === String(excludeJobId).trim()) return

      const rawStatus = String(wo.Status || wo.status || '').trim().toUpperCase()
      const thaiStatus = String(wo.Status || wo.status || '').trim()
      if (rawStatus === 'COMPLETED' || thaiStatus === 'เสร็จสิ้น') return
      if (rawStatus === 'CANCELLED' || thaiStatus === 'ยกเลิก') return

      const mc = String(wo.MC || wo.Machine_MC || wo.mc || '').trim()
      if (!mc) return

      pendingItems.push({
        id: `wo-${id || Math.random().toString(36).slice(2)}`,
        refId: id || 'WO',
        source: 'WORK_ORDER',
        sourceLabel: 'ใบสั่งงาน',
        mc,
        ki: wo.KI || wo.ki || '',
        jobType: String(wo.JobType || wo.Job_Type || wo.job_type || 'REPAIR').toUpperCase(),
        status: wo.Status || wo.status || 'IN_PROGRESS',
        details: String(wo.Problem || wo.ProblemCause || wo.Details || wo.Comment || wo.comment || '').trim(),
        technicians: String(wo.Technician || wo.AssignedTech || wo.technician || '').trim(),
        createdAt: wo.created_at || wo.StartDate || wo.DateStart || '',
        priority: wo.Priority || wo.priority || 'NORMAL',
      })
    })
  }

  // 2. Process Repair Requests
  if (Array.isArray(repairRequests)) {
    repairRequests.forEach((req) => {
      if (!req) return
      const id = String(req.request_no || req.id || '').trim()
      const rawStatus = String(req.status || '').trim().toUpperCase()
      const thaiStatus = String(req.status || '').trim()
      if (rawStatus === 'COMPLETED' || thaiStatus === 'เสร็จสิ้น' || thaiStatus === 'ซ่อมเสร็จ') return
      if (rawStatus === 'CANCELLED' || rawStatus === 'REJECTED' || thaiStatus === 'ยกเลิก' || thaiStatus === 'ไม่อนุมัติ') return

      const mc = String(req.machine_mc || req.MC || '').trim()
      if (!mc) return

      pendingItems.push({
        id: `req-${id || Math.random().toString(36).slice(2)}`,
        refId: id || 'REQ',
        source: 'REPAIR_REQUEST',
        sourceLabel: 'ใบแจ้งซ่อม',
        mc,
        ki: req.KI || req.ki || '',
        jobType: 'REPAIR',
        status: req.status || 'PENDING',
        details: String(req.problem_description || req.repair_details || '').trim(),
        technicians: String(req.technician_name || '').trim(),
        createdAt: req.created_at || '',
        priority: req.priority || 'NORMAL',
      })
    })
  }

  // Sort by newest first
  return pendingItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

/**
 * Filters pending tasks by search keyword and category/type filter.
 */
export function filterPendingTasks(tasks = [], search = '', typeFilter = 'ALL') {
  if (!Array.isArray(tasks)) return []
  const q = String(search || '').trim().toLowerCase()
  const tf = String(typeFilter || 'ALL').toUpperCase()

  return tasks.filter((item) => {
    // Type filter
    if (tf !== 'ALL') {
      if (tf === 'REPAIR' && item.jobType !== 'REPAIR') return false
      if (tf === 'PM' && item.jobType !== 'PM') return false
      if (tf === 'DESIGN' && item.jobType !== 'DESIGN') return false
      if (tf === 'SETUP' && item.jobType !== 'SETUP') return false
      if (tf === 'WAIT_PARTS') {
        const s = String(item.status || '').toUpperCase()
        if (!s.includes('PARTS') && !s.includes('อะไหล่')) return false
      }
    }

    // Search query matching machine, refId, details, technician
    if (!q) return true
    return (
      item.mc.toLowerCase().includes(q) ||
      item.refId.toLowerCase().includes(q) ||
      item.details.toLowerCase().includes(q) ||
      item.technicians.toLowerCase().includes(q) ||
      item.sourceLabel.toLowerCase().includes(q)
    )
  })
}

/**
 * Builds a standardized, human-readable interruption task name from a selected pending task.
 */
export function buildInterruptionTaskNameFromPending(task) {
  if (!task) return ''
  const sourceName = task.source === 'REPAIR_REQUEST' ? 'แจ้งซ่อม' : 'ใบงาน'
  const snippet = task.details ? ` (${task.details.slice(0, 30)})` : ''
  return `[งานแทรก] ${task.mc}: ${sourceName} ${task.refId}${snippet}`
}
