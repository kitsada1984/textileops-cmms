/**
 * src/utils/needleConditionSync.js
 * Decides what an inspection (needle condition / center check) writes back on
 * the matching cylinder. Kept in one place so both inspection screens agree on
 * the status values the cylinder module actually knows about.
 */

/** Needle conditions that mean "should be replaced" → cylinder needs service. */
export const WORN_NEEDLE_STATUSES = ['สึกมาก', 'สึกมาก(ควรเปลี่ยน)', 'BROKEN']

/** Cylinder status used while waiting for a needle/service job (see CYL_STATUS). */
export const CYLINDER_NEEDS_SERVICE = 'WAIT_SERVICE'

/** Cylinder status when everything is normal again. */
export const CYLINDER_STANDARD = 'STANDARD'

/**
 * @param {object} args
 * @param {string} [args.docDate]          Inspection date (yyyy-MM-dd)
 * @param {string} [args.inspectionStatus] Needle condition / inspection result
 * @param {boolean} [args.forceWorn]       Caller already decided it is worn (e.g. checklist FAILED)
 * @param {string} [args.currentStatus]    The cylinder's Status_Now before this write
 * @returns {object} fields to merge into the cylinder record
 */
export function buildCylinderInspectionSync({
  docDate,
  inspectionStatus,
  forceWorn = false,
  currentStatus,
} = {}) {
  const fields = {}
  if (docDate) fields.Last_Check_Date = docDate

  const status = String(inspectionStatus || '').trim()
  const isWorn = forceWorn || WORN_NEEDLE_STATUSES.includes(status)

  if (isWorn) {
    fields.Status_Now = CYLINDER_NEEDS_SERVICE
  } else if (String(currentStatus || '').trim() === CYLINDER_NEEDS_SERVICE) {
    // Needle replaced and the new inspection is healthy — release the cylinder.
    fields.Status_Now = CYLINDER_STANDARD
  }

  return fields
}

const toTime = (value) => {
  const t = new Date(value || 0).getTime()
  return Number.isFinite(t) ? t : 0
}

/**
 * Newest inspection first: by inspection date, then by save time. Without the
 * save-time tiebreak two inspections on the same day kept their insertion
 * order, so the older (worse) result stayed on screen as "the latest".
 */
export function sortInspectionsNewestFirst(records = []) {
  return [...(Array.isArray(records) ? records : [])].sort((a, b) => {
    const dateDiff = toTime(b?.doc_date) - toTime(a?.doc_date)
    if (dateDiff !== 0) return dateDiff
    return toTime(b?.created_at || b?.updated_at) - toTime(a?.created_at || a?.updated_at)
  })
}
