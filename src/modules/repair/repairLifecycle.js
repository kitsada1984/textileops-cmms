/**
 * src/modules/repair/repairLifecycle.js
 * Deep module encapsulating Repair Request lifecycle operations:
 * - Schema-resilient Supabase mutations (automatic retry when DB schema lacks columns)
 * - Transparent entity normalization
 * - Decoupled multi-channel notification dispatching
 */

import { supabase } from '../../supabase'
import { normalizeRepairRecord } from './repairNormalizer'
import {
  dispatchNewRepairNotification,
  dispatchTechnicianAssignedNotification,
  dispatchRepairCompletedNotification,
} from './repairDispatcher'

const MISSING_COLUMN_RE = /Could not find the '([^']+)' column of 'repair_requests'/i

/**
 * Executes a Supabase query with automated missing-column retry loop.
 * If Supabase schema has not migrated certain columns, removes the offending
 * column from payload and retries seamlessly up to 10 times.
 * @param {object} payload Mutation payload
 * @param {Function} executeQuery Function that executes the Supabase request
 */
async function runWithSchemaRetry(payload, executeQuery) {
  const currentPayload = { ...payload }
  let lastResult = await executeQuery(currentPayload)
  let retryCount = 0

  while (lastResult.error && retryCount < 10) {
    retryCount++
    const errMsg = String(lastResult.error.message || '')
    const missingCol = errMsg.match(MISSING_COLUMN_RE)?.[1]
    if (missingCol && missingCol in currentPayload) {
      console.warn(`[RepairLifecycle] Column '${missingCol}' not found in DB schema — removing and retrying (attempt ${retryCount})`)
      delete currentPayload[missingCol]
      lastResult = await executeQuery(currentPayload)
    } else {
      break
    }
  }

  if (lastResult.error) {
    throw lastResult.error
  }

  return { data: lastResult.data, effectivePayload: currentPayload }
}

/**
 * Step 1: Create a new Repair Request.
 * @param {object} rawPayload Payload containing machine, cylinder, problem, priority, etc.
 * @param {object} options Optional parameters: { cylinder, skipNotification }
 * @returns {Promise<{ ok: boolean, data: object }>}
 */
export async function createRepairRequest(rawPayload, options = {}) {
  const { cylinder = null, skipNotification = false } = options
  const isEasy = rawPayload.repair_type === 'EASY' || rawPayload.status === 'APPROVED'

  const { data: insertedData, effectivePayload } = await runWithSchemaRetry(rawPayload, (payload) =>
    supabase.from('repair_requests').insert(payload).select().single()
  )

  const normalized = normalizeRepairRecord({
    ...(insertedData || {}),
    repair_type: rawPayload.repair_type || (isEasy ? 'EASY' : 'COMPLEX'),
    Design: rawPayload.Design || insertedData?.Design,
    KI: rawPayload.KI || insertedData?.KI,
    roll_no: rawPayload.roll_no || insertedData?.roll_no,
    machine_mc: cylinder?.NewMC || rawPayload.machine_mc || insertedData?.machine_mc,
    cylinder_serial: rawPayload.cylinder_serial || cylinder?.Serial_NOW || insertedData?.cylinder_serial,
    technician_name: isEasy ? (rawPayload.technician_name || insertedData?.technician_name) : insertedData?.technician_name,
    status: isEasy ? 'APPROVED' : (insertedData?.status || 'PENDING'),
    approved_by: isEasy ? (rawPayload.approved_by || 'ผู้แจ้งซ่อม (งานง่าย)') : insertedData?.approved_by,
  })

  if (!skipNotification) {
    // Non-blocking notification dispatch
    dispatchNewRepairNotification(normalized, cylinder, isEasy).catch((err) => {
      console.warn('[RepairLifecycle] Notification dispatch warning:', err)
    })
  }

  return { ok: true, data: normalized, effectivePayload }
}

/**
 * Step 2: Approve or Reject a Repair Request.
 * @param {string|number} id Repair request ID
 * @param {object} approvalPayload { status, technician_name, approval_notes, approved_by, approved_at }
 * @param {object} options Optional parameters: { skipNotification }
 * @returns {Promise<{ ok: boolean, data: object }>}
 */
export async function approveRepairRequest(id, approvalPayload, options = {}) {
  const { skipNotification = false } = options
  const status = approvalPayload.status || 'APPROVED'

  const payload = {
    status,
    technician_name: String(approvalPayload.technician_name || '').trim(),
    approval_notes: String(approvalPayload.approval_notes || '').trim(),
    approved_at: approvalPayload.approved_at || new Date().toISOString(),
    approved_by: String(approvalPayload.approved_by || 'Supervisor').trim(),
  }

  const { data: updatedData } = await runWithSchemaRetry(payload, (p) =>
    supabase.from('repair_requests').update(p).eq('id', id).select().single()
  )

  const normalized = normalizeRepairRecord({
    ...(updatedData || {}),
    ...payload,
  })

  if (!skipNotification && status === 'APPROVED') {
    dispatchTechnicianAssignedNotification(normalized).catch((err) => {
      console.warn('[RepairLifecycle] Technician notify warning:', err)
    })
  }

  return { ok: true, data: normalized }
}

/**
 * Step 3: Complete a Repair Request.
 * @param {string|number} id Repair request ID
 * @param {object} completionPayload Complete form data including duration, parts used, repair details
 * @param {object} options Optional parameters: { skipNotification }
 * @returns {Promise<{ ok: boolean, data: object }>}
 */
export async function completeRepairRequest(id, completionPayload, options = {}) {
  const { skipNotification = false } = options
  const nowIso = completionPayload.completed_at || new Date().toISOString()

  const payload = {
    status: 'COMPLETED',
    repair_details: String(completionPayload.repair_details || '').trim(),
    parts_used: completionPayload.parts_used || '',
    completed_at: nowIso,
    completed_by: String(completionPayload.completed_by || '').trim(),
    interruption_logs: completionPayload.interruption_logs || [],
    gross_duration_hours: completionPayload.gross_duration_hours ?? null,
    sunday_duration_hours: completionPayload.sunday_duration_hours ?? null,
    lost_duration_hours: completionPayload.lost_duration_hours ?? null,
    net_working_hours: completionPayload.net_working_hours ?? null,
    ...(completionPayload.machine_mc ? { machine_mc: completionPayload.machine_mc } : {}),
    ...(completionPayload.cylinder_serial ? { cylinder_serial: completionPayload.cylinder_serial } : {}),
  }

  const { data: updatedData } = await runWithSchemaRetry(payload, (p) =>
    supabase.from('repair_requests').update(p).eq('id', id).select().single()
  )

  const normalized = normalizeRepairRecord({
    ...(updatedData || {}),
    ...payload,
  })

  if (!skipNotification) {
    dispatchRepairCompletedNotification(normalized).catch((err) => {
      console.warn('[RepairLifecycle] Completion notify warning:', err)
    })
  }

  return { ok: true, data: normalized }
}

/**
 * General update for admin / table view (RepairRequests page).
 * @param {string|number} id Repair request ID
 * @param {object} updatePayload Update fields
 * @returns {Promise<{ ok: boolean, data: object }>}
 */
export async function updateRepairRequest(id, updatePayload) {
  const { data: updatedData } = await runWithSchemaRetry(updatePayload, (p) =>
    supabase.from('repair_requests').update(p).eq('id', id).select().single()
  )

  const normalized = normalizeRepairRecord({
    ...(updatedData || {}),
    ...updatePayload,
  })

  return { ok: true, data: normalized }
}
