/**
 * src/utils/counterDiff.js
 * Shared "counter" (machine revolution meter) helpers for inspection records.
 *
 * Both inspection screens store the counter read at each visit; the previous
 * reading is looked up again so the difference (ผลต่างรอบ) since the last visit
 * can be shown. Kept in one place so สภาพเข็ม and เช็คศูนย์ agree.
 */

/** Positive finite number, otherwise 0. */
export function normalizeCounter(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Difference between two counter readings.
 * 0 when either reading is missing; never negative (a meter reset must not
 * produce a decrease in the report).
 */
export function computeCounterDiff(latest, prev) {
  const a = normalizeCounter(latest)
  const b = normalizeCounter(prev)
  if (a <= 0 || b <= 0) return 0
  return Math.max(0, a - b)
}

const toTime = (value) => {
  const t = new Date(value || 0).getTime()
  return Number.isFinite(t) ? t : 0
}

/** Newest first by inspection date, then by save time. */
function newestFirst(a, b) {
  const dateDiff = toTime(b?.doc_date) - toTime(a?.doc_date)
  if (dateDiff !== 0) return dateDiff
  return toTime(b?.created_at || b?.updated_at) - toTime(a?.created_at || a?.updated_at)
}

/**
 * The most recent earlier record for the same machine/serial that actually
 * carries a counter reading. Records without a counter (0/empty) are skipped so
 * one incomplete visit cannot zero out the comparison.
 *
 * @param {Array} rows All inspection records
 * @param {object} args
 * @param {(row:object)=>boolean} args.matches   Same machine/serial predicate
 * @param {string} [args.excludeId]              Record being edited (ignored)
 * @param {(row:object)=>any} [args.getCounter]  Counter field accessor
 */
export function pickPreviousWithCounter(rows, { matches, excludeId, getCounter = (r) => r.counter } = {}) {
  if (!Array.isArray(rows)) return null
  const candidates = rows
    .filter((r) => r && (excludeId ? r.id !== excludeId : true))
    .filter((r) => (typeof matches === 'function' ? matches(r) : false))
    .filter((r) => normalizeCounter(getCounter(r)) > 0)
    .sort(newestFirst)
  return candidates[0] || null
}

/**
 * Builds the counter fields saved with a record.
 * @returns {{ counter_prev: number, counter_total: number, prevRecord: object|null }}
 */
export function buildCounterFields(rows, { matches, excludeId, latest, getCounter, prevRecord } = {}) {
  const prev = prevRecord !== undefined
    ? prevRecord
    : pickPreviousWithCounter(rows, { matches, excludeId, getCounter })
  const counterPrev = prev ? normalizeCounter(getCounter ? getCounter(prev) : prev.counter) : 0
  const counterLatest = normalizeCounter(latest)
  return {
    counter_prev: counterPrev,
    counter_total: computeCounterDiff(counterLatest, counterPrev),
    prevRecord: prev || null,
  }
}
