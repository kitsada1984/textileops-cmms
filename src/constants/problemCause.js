/**
 * src/constants/problemCause.js
 * Standard options, labels, icons, and badge stylings for Problem Cause (สาเหตุปัญหา)
 * Used across Work Orders, Repair Requests, Reports, and PDF generation.
 */

export const PROBLEM_CAUSE_OPTIONS = [
  {
    value: 'คน',
    label: 'คน',
    fullLabel: '👤 คน (Man / Personnel)',
    icon: '👤',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
    printClass: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  {
    value: 'เครื่องจักร',
    label: 'เครื่องจักร',
    fullLabel: '⚙️ เครื่องจักร (Machine)',
    icon: '⚙️',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30',
    printClass: 'bg-blue-50 text-blue-800 border-blue-300',
  },
  {
    value: 'วัตถุดิบ',
    label: 'วัตถุดิบ',
    fullLabel: '🧵 วัตถุดิบ (Material)',
    icon: '🧵',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
    printClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  },
]

export const PROBLEM_CAUSE_MAP = Object.fromEntries(
  PROBLEM_CAUSE_OPTIONS.map((item) => [item.value, item])
)

/**
 * Returns metadata object for a given problem cause value
 * @param {string|null|undefined} value
 */
export function getProblemCauseMeta(value) {
  if (!value) return null
  const trimmed = String(value).trim()
  return PROBLEM_CAUSE_MAP[trimmed] || {
    value: trimmed,
    label: trimmed,
    fullLabel: trimmed,
    icon: '🔍',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30',
    printClass: 'bg-slate-100 text-slate-800 border-slate-300',
  }
}
