import { format } from 'date-fns'

/* ── DOCUMENT THEME CONFIGURATION (moved verbatim from PdfPreviewModal) ── */
export const DOC_THEMES = {
  machine: {
    accent: '#2563eb',
    gradient: 'from-blue-600 to-indigo-700',
    badgeBg: '#dbeafe',
    badgeText: '#1e40af',
    border: '#bfdbfe',
    icon: '🏭',
    code: 'MC-SPEC',
    enType: 'Machine Data Sheet',
  },
  cylinder: {
    accent: '#0284c7',
    gradient: 'from-sky-600 to-blue-700',
    badgeBg: '#e0f2fe',
    badgeText: '#0369a1',
    border: '#bae6fd',
    icon: '⚙️',
    code: 'CYL-SPEC',
    enType: 'Cylinder Data Sheet',
  },
  workorder: {
    accent: '#4f46e5',
    gradient: 'from-indigo-600 to-violet-700',
    badgeBg: '#e0e7ff',
    badgeText: '#3730a3',
    border: '#c7d2fe',
    icon: '📋',
    code: 'WO-JOB',
    enType: 'Work Order Report',
  },
  repair_request: {
    accent: '#e11d48',
    gradient: 'from-rose-600 to-red-700',
    badgeBg: '#ffe4e6',
    badgeText: '#9f1239',
    border: '#fecdd3',
    icon: '⚠️',
    code: 'RR-REP',
    enType: 'Machine Repair Request',
  },
  pmplan: {
    accent: '#7c3aed',
    gradient: 'from-violet-600 to-purple-700',
    badgeBg: '#ede9fe',
    badgeText: '#5b21b6',
    border: '#ddd6fe',
    icon: '📅',
    code: 'PM-PLAN',
    enType: 'Preventive Maintenance Plan',
  },
  centercheck: {
    accent: '#0d9488',
    gradient: 'from-teal-600 to-emerald-700',
    badgeBg: '#ccfbf1',
    badgeText: '#115e59',
    border: '#99f6e4',
    icon: '📐',
    code: 'CC-INSP',
    enType: 'Center Check Report',
  },
  needle: {
    accent: '#059669',
    gradient: 'from-emerald-600 to-teal-700',
    badgeBg: '#d1fae5',
    badgeText: '#065f46',
    border: '#a7f3d0',
    icon: '🪡',
    code: 'NDL-REP',
    enType: 'Needle Inspection Report',
  },
  sparepart: {
    accent: '#d97706',
    gradient: 'from-amber-600 to-orange-700',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    border: '#fde68a',
    icon: '📦',
    code: 'SP-INV',
    enType: 'Spare Part Data Sheet',
  },
  purchasing: {
    accent: '#9333ea',
    gradient: 'from-purple-600 to-indigo-700',
    badgeBg: '#f3e8ff',
    badgeText: '#6b21a8',
    border: '#e9d5ff',
    icon: '🛒',
    code: 'PR-REQ',
    enType: 'Purchase Request',
  },
  general: {
    accent: '#475569',
    gradient: 'from-slate-700 to-slate-900',
    badgeBg: '#f1f5f9',
    badgeText: '#334155',
    border: '#e2e8f0',
    icon: '📄',
    code: 'DOC-SYS',
    enType: 'System Document',
  },
}

/* ── STATUS BADGE HELPER (moved verbatim from PdfPreviewModal) ── */
export function getStatusStyle(status = '') {
  const norm = String(status || '').toUpperCase()
  if (norm.includes('APPROVED') || norm.includes('อนุมัติ') || norm.includes('ซ่อมเสร็จ') || norm.includes('COMPLETED') || norm.includes('ปกติ') || norm.includes('ผ่าน') || norm.includes('RUNNING')) {
    return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' }
  }
  if (norm.includes('REJECTED') || norm.includes('ไม่อนุมัติ') || norm.includes('BREAKDOWN') || norm.includes('ต่ำกว่าเกณฑ์') || norm.includes('ควรเปลี่ยน') || norm.includes('CRITICAL') || norm.includes('ด่วนที่สุด') || norm.includes('มาก')) {
    return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca', dot: '#ef4444' }
  }
  if (norm.includes('WAIT_PARTS') || norm.includes('รออะไหล่')) {
    return { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff', dot: '#a855f7' }
  }
  // Pending / In progress / Default
  return { bg: '#fef3c7', text: '#b45309', border: '#fde68a', dot: '#f59e0b' }
}

export function buildSelectableItems(sections, tableData, historyTable, images, remarks, signatories) {
  const items = []
  sections.forEach((s, i) => {
    if (s?.title) items.push({ key: `sec-${i}`, label: s.title })
  })
  if (tableData?.title && tableData?.rows?.length) items.push({ key: 'table', label: tableData.title })
  if (historyTable?.title && historyTable?.rows?.length) items.push({ key: 'history', label: historyTable.title })
  if (images?.length) items.push({ key: 'images', label: 'รูปถ่ายประกอบ' })
  if (remarks) items.push({ key: 'remarks', label: 'หมายเหตุและบันทึกเพิ่มเติม' })
  if (signatories?.length) items.push({ key: 'sign', label: 'ลายเซ็นผู้เกี่ยวข้อง' })
  return items
}

export function resolvePrintHeader({ docType, docDate, docNo }) {
  const theme = DOC_THEMES[docType] || DOC_THEMES.general
  const currentDateStr = format(new Date(), 'dd/MM/yyyy HH:mm')
  const formattedDocDate = docDate
    ? (String(docDate).includes('/') ? docDate : format(new Date(docDate), 'dd/MM/yyyy'))
    : format(new Date(), 'dd/MM/yyyy')
  const qrValue = typeof window !== 'undefined'
    ? window.location.origin + (docNo ? `?doc=${encodeURIComponent(docNo)}` : '')
    : ''
  return { theme, currentDateStr, formattedDocDate, qrValue }
}
