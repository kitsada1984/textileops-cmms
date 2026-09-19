/**
 * src/modules/repair/repairNormalizer.js
 * Domain normalizer and encoder for Repair Request entities.
 * Preserves 100% backward compatibility across column naming conventions and metadata tags.
 */

/**
 * Normalizes repair records to ensure Design, KI, and roll_no
 * are always extracted from any column casing or embedded metadata tags.
 */
export function normalizeRepairRecord(row) {
  if (!row) return row

  let design = row.Design || row.design || ''
  let ki = row.KI !== undefined && row.KI !== null && row.KI !== '' ? row.KI : (row.ki !== undefined && row.ki !== null && row.ki !== '' ? row.ki : '')
  let roll = row.roll_no || row.RollNo || row.roll_number || ''
  let priority = row.priority || row.urgency || 'ปกติ'
  let repair_type = row.repair_type || ''
  let rawProb = String(row.problem_description || '')
  let cleanProb = rawProb

  // 1. Try extracting from JSON metadata comment: <!--PROD:{"Design":"...","KI":"...","roll_no":"...","repair_type":"..."}-->
  const jsonMatch = rawProb.match(/<!--PROD:(\{.*?\})-->/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      if (!design && parsed.Design) design = parsed.Design
      if ((ki === '' || ki === undefined || ki === null) && parsed.KI !== undefined && parsed.KI !== null && parsed.KI !== '') ki = parsed.KI
      if (!roll && (parsed.roll_no || parsed.RollNo || parsed.roll_number)) roll = parsed.roll_no || parsed.RollNo || parsed.roll_number
      if (!row.priority && parsed.priority) priority = parsed.priority
      if (!repair_type && parsed.repair_type) repair_type = parsed.repair_type
    } catch {}
    cleanProb = cleanProb.replace(/<!--PROD:\{.*?\}-->\n?/, '').trim()
  }

  // 2. Try extracting from text banner: [ข้อมูลผลิต | Design: ... | KI: ... | เลขม้วน: ...]
  const textMatch = rawProb.match(/\[ข้อมูลผลิต\s*\|\s*Design:\s*([^|]*?)\s*\|\s*KI:\s*([^|]*?)\s*\|\s*เลขม้วน:\s*([^\]]*?)\]/)
  if (textMatch) {
    if (!design && textMatch[1] && textMatch[1] !== '—') design = textMatch[1].trim()
    if ((ki === '' || ki === undefined || ki === null) && textMatch[2] && textMatch[2] !== '—') ki = textMatch[2].trim()
    if (!roll && textMatch[3] && textMatch[3] !== '—') roll = textMatch[3].trim()
    cleanProb = cleanProb.replace(/\[ข้อมูลผลิต\s*\|\s*Design:[^\]]*?\]\n?/, '').trim()
  }

  return {
    ...row,
    repair_type: repair_type || (row.status === 'APPROVED' && row.technician_name ? 'EASY' : (row.status === 'PENDING' ? 'COMPLEX' : 'EASY')),
    Design: design,
    design: design,
    KI: ki,
    ki: ki,
    roll_no: roll,
    RollNo: roll,
    priority: priority,
    problem_description: cleanProb || rawProb,
    raw_problem_description: rawProb,
  }
}

/**
 * Builds the problem description with embedded metadata so that even if
 * Supabase lacks Design/KI/roll_no columns, the data is permanently preserved.
 */
export function encodeRepairProblemDescription(problemText, { Design, KI, roll_no, priority, repair_type } = {}) {
  const cleanText = String(problemText || '')
    .replace(/<!--PROD:\{.*?\}-->\n?/, '')
    .replace(/\[ข้อมูลผลิต\s*\|\s*Design:[^\]]*?\]\n?/, '')
    .trim()

  const metaObj = {
    Design: Design || '',
    KI: KI !== undefined && KI !== null && KI !== '' ? KI : '',
    roll_no: roll_no || '',
    priority: priority || 'ปกติ',
    repair_type: repair_type || 'EASY',
  }

  const jsonTag = `<!--PROD:${JSON.stringify(metaObj)}-->`
  const textTag = (Design || KI || roll_no)
    ? `[ข้อมูลผลิต | Design: ${Design || '—'} | KI: ${KI ?? '—'} | เลขม้วน: ${roll_no || '—'}]`
    : ''

  return [jsonTag, textTag, cleanText].filter(Boolean).join('\n\n')
}
