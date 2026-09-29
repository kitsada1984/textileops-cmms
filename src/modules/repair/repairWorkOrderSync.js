/**
 * src/modules/repair/repairWorkOrderSync.js
 * Builds the work-order row that is auto-created when a repair request is
 * completed. Only real `workorders` columns may be used: unknown column names
 * are silently stripped by the schema-retry loop, which previously left the
 * synced work orders without WO_ID / technician / dates.
 */

/** Column names that really exist in the workorders table (D1 + Supabase). */
export const WORKORDER_COLUMNS = new Set([
  'id', 'WO_ID', 'MC', 'KI', 'Problem', 'Priority', 'Status', 'Tech', 'Requester',
  'ApprovedBy', 'StartTime', 'EndTime', 'Duration', 'Comment', 'Images', 'Design',
  'BOM', 'DateStart', 'DateEnd', 'Detail', 'JobType', 'Result_Raw', 'Result_Set',
  'Result_Dye', 'Result_Fix', 'LastUpdated', 'created_at', 'updated_at',
])

const priorityMap = { 'ด่วนที่สุด': 'HIGH', 'ด่วน': 'MEDIUM' }

/**
 * @param {object} args
 * @param {string} args.woId            Work-order number (e.g. WO-RR202609-0057)
 * @param {object} args.record          Repair request (normalized)
 * @param {string} args.techName        Technician / completed_by
 * @param {string} args.startIso        ISO start (approved_at or created_at)
 * @param {string} args.endIso          ISO end (completed_at)
 * @param {number} args.durationHours   Net working hours
 * @param {string} [args.detail]        Repair solution text
 * @param {object} [args.extraComment]  Extra JSON stored in Comment (durations, parts…)
 */
export function buildRepairWorkOrderPayload({
  woId,
  record = {},
  techName = '',
  startIso,
  endIso,
  durationHours,
  detail = '',
  extraComment = {},
}) {
  const priority = record.priority || 'ปกติ'
  const design = record.Design || record.design || ''
  const machine = record.machine_mc || ''
  const reqNo = record.request_no || ''

  const payload = {
    WO_ID: woId,
    MC: machine,
    KI: record.KI !== undefined && record.KI !== null ? String(record.KI) : '',
    Design: design,
    Problem: record.problem_description || '',
    Detail: detail || 'ซ่อมแซมและแก้ไขตามมาตรฐาน',
    Priority: priorityMap[priority] || 'LOW',
    JobType: 'REPAIR',
    Tech: techName,
    Requester: record.reported_by || '',
    ApprovedBy: record.approved_by || '',
    DateStart: startIso,
    DateEnd: endIso,
    StartTime: startIso,
    EndTime: endIso,
    Duration: durationHours,
    Status: 'COMPLETED',
    LastUpdated: new Date().toISOString(),
    Comment: JSON.stringify({
      synced_from_repair: true,
      request_no: reqNo,
      req_id: record.id,
      roll_no: record.roll_no || record.RollNo || '',
      title: design ? `ซ่อมเครื่อง ${machine} (ลาย ${design})` : `งานแจ้งซ่อม ${reqNo} (เครื่อง ${machine})`,
      parts_used: record.parts_used || '',
      working_duration_hours: durationHours,
      ...extraComment,
    }),
  }

  const unknown = Object.keys(payload).filter((k) => !WORKORDER_COLUMNS.has(k))
  if (unknown.length > 0) {
    throw new Error(`Repair→WO sync payload has unknown column(s): ${unknown.join(', ')}`)
  }
  return payload
}

/** Hours between two ISO timestamps, rounded to 2 decimals (min 0.25). */
export function durationHoursBetween(startIso, endIso) {
  const diffMs = Math.max(0, new Date(endIso) - new Date(startIso))
  return Math.max(0.25, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100)
}
