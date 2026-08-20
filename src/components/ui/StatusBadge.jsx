export const OPTION_COLORS = [
  { id: 'gray',   hex: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.35)' },
  { id: 'blue',   hex: '#818cf8', bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.35)'  },
  { id: 'green',  hex: '#34d399', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.35)'  },
  { id: 'yellow', hex: '#fcd34d', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.35)'  },
  { id: 'orange', hex: '#fb923c', bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.35)'  },
  { id: 'red',    hex: '#f87171', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)'   },
  { id: 'purple', hex: '#c084fc', bg: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.35)'  },
  { id: 'indigo', hex: '#6366f1', bg: 'rgba(99,102,241,0.18)',  border: 'rgba(99,102,241,0.45)'  },
  { id: 'pink',   hex: '#f472b6', bg: 'rgba(236,72,153,0.15)',  border: 'rgba(236,72,153,0.35)'  },
  { id: 'cyan',   hex: '#22d3ee', bg: 'rgba(6,182,212,0.15)',   border: 'rgba(6,182,212,0.35)'   },
]

const MAP = {
  RUNNING:          'badge-green',
  BREAKDOWN:        'badge-red',
  MAINTENANCE:      'badge-yellow',
  IDLE:             'badge-gray',
  DECOMMISSIONED:   'badge-gray',
  STANDARD:         'badge-blue',
  SCRAP:            'badge-red',
  REPAIR:           'badge-yellow',
  RESERVE:          'badge-gray',
  OPEN:             'badge-blue',
  PENDING_APPROVAL: 'badge-yellow',
  APPROVED:         'badge-green',
  IN_PROGRESS:      'badge-orange',
  COMPLETED:        'badge-green',
  CLOSED:           'badge-gray',
  CANCELLED:        'badge-gray',
  PENDING:          'badge-yellow',
  REJECTED:         'badge-red',
  SCHEDULED:        'badge-blue',
  OVERDUE:          'badge-red',
  CRITICAL:         'badge-red',
  HIGH:             'badge-orange',
  MEDIUM:           'badge-yellow',
  LOW:              'badge-green',
  IN_STOCK:         'badge-green',
  LOW_STOCK:        'badge-yellow',
  OUT_OF_STOCK:     'badge-red',
  DRAFT:            'badge-gray',
  ORDERED:          'badge-blue',
  PARTIAL_RECEIVED: 'badge-yellow',
  RECEIVED:         'badge-green',
}

const LABELS = {
  RUNNING: 'เดินเครื่อง',
  BREAKDOWN: 'เครื่องเสีย',
  MAINTENANCE: 'ซ่อมบำรุง',
  IDLE: 'ว่าง',
  DECOMMISSIONED: 'เลิกใช้งาน',
  STANDARD: 'มาตรฐาน',
  SWAPPED: 'สลับแล้ว',
  SPARE: 'สำรอง',
  SCRAP: 'ตัดทิ้ง',
  REPAIR: 'ซ่อม',
  RESERVE: 'สำรอง',
  OPEN: 'เปิด',
  PENDING_APPROVAL: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  IN_PROGRESS: 'กำลังดำเนินการ',
  COMPLETED: 'เสร็จแล้ว',
  CLOSED: 'ปิดแล้ว',
  CANCELLED: 'ยกเลิก',
  PENDING: 'รอดำเนินการ',
  REJECTED: 'ไม่อนุมัติ',
  WAIT_PARTS: 'รออะไหล่',
  SCHEDULED: 'ตามแผน',
  OVERDUE: 'เกินกำหนด',
  CRITICAL: 'วิกฤต',
  HIGH: 'สูง',
  MEDIUM: 'กลาง',
  LOW: 'ต่ำ',
  IN_STOCK: 'มีของ',
  LOW_STOCK: 'สต็อกต่ำ',
  OUT_OF_STOCK: 'หมดสต็อก',
  DRAFT: 'ร่าง',
  ORDERED: 'สั่งแล้ว',
  PARTIAL_RECEIVED: 'รับบางส่วน',
  RECEIVED: 'รับแล้ว',
  RECEIVE: 'รับเข้า',
  ISSUE: 'เบิกออก',
  ADJUST: 'ปรับยอด',
  RETURN: 'คืนเข้า',
}

export function getOptionColor(col, value) {
  if (!col?.options?.length) return undefined
  return col.options.find(o => o.value === value || o.label === value)?.color || undefined
}

export default function StatusBadge({ value, label, color }) {
  const display = label || LABELS[value] || value || '—'
  if (color) {
    const c = OPTION_COLORS.find(o => o.id === color)
    if (c) return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '2px 9px', borderRadius: 20,
        background: c.bg, border: `1px solid ${c.border}`,
        color: c.hex, fontSize: 11, fontWeight: 700,
        letterSpacing: '0.03em', whiteSpace: 'nowrap',
      }}>
        {display}
      </span>
    )
  }
  return <span className={`badge ${MAP[value] || 'badge-gray'}`}>{display}</span>
}
