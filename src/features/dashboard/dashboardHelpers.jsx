import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Cpu,
  Disc,
  ClipboardList,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
  FileSpreadsheet,
  Wrench,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  MachineAPI,
  CylinderAPI,
  WorkOrderAPI,
  PMPlanAPI,
  SparePartAPI,
  PurchaseOrderAPI,
  StockTxnAPI,
  RepairRequestAPI,
  DesignBomAPI,
  NeedleConditionAPI,
  NeedleSetAPI,
  NeedleHistoryAPI,
  isSystemWorkOrder,
} from '../../api/entities'

const ICON_BG = {
  slate:   'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  red:     'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  blue:    'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  amber:   'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  orange:  'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  emerald: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  rose:    'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
  violet:  'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
}

const STATUS_LABELS = {
  BREAKDOWN: 'เครื่องเสีย',
  RUNNING: 'เดินเครื่อง',
  OVERDUE: 'เกินกำหนด',
  CRITICAL: 'วิกฤต',
  HIGH: 'สูง',
  MEDIUM: 'กลาง',
  LOW: 'ต่ำ',
  OPEN: 'เปิด',
  IN_PROGRESS: 'กำลังดำเนินการ',
  COMPLETED: 'เสร็จแล้ว',
}

export const statusLabel = (value) => STATUS_LABELS[value] || value

export const SHEET_APIS = {
  machines: MachineAPI,
  cylinders: CylinderAPI,
  workorders: WorkOrderAPI,
  pmplans: PMPlanAPI,
  designBom: DesignBomAPI,
  repairRequests: RepairRequestAPI,
  spareparts: SparePartAPI,
  purchaseorders: PurchaseOrderAPI,
  stocktransactions: StockTxnAPI,
  needleConditions: NeedleConditionAPI,
  needleSets: NeedleSetAPI,
  needleHistory: NeedleHistoryAPI,
}

export function StatCard({ icon: Icon, label, value, sub, color = 'slate', to, onClick }) {
  const content = (
    <div
      className={`stat-card transition-all duration-200 ${
        to || onClick
          ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.99] border-transparent hover:border-blue-500/40 group'
          : ''
      }`}
    >
      <div
        className="stat-icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
        style={{ background: ICON_BG[color], boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      >
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="stat-val text-xl sm:text-2xl font-black leading-tight truncate flex items-center justify-between"
          style={{ color: 'var(--text-900)' }}
        >
          <span>{value ?? '—'}</span>
          {(to || onClick) && (
            <ArrowUpRight
              size={14}
              className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          )}
        </div>
        <div
          className="stat-label text-xs sm:text-sm font-semibold mt-0.5 truncate group-hover:text-blue-500 transition-colors"
          style={{ color: 'var(--text-600)' }}
          title={label}
        >
          {label}
        </div>
        {sub && (
          <div className="stat-sub text-[10.5px] sm:text-xs mt-0.5 truncate text-slate-500" title={sub}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block no-underline">
        {content}
      </Link>
    )
  }
  if (onClick) {
    return (
      <div onClick={onClick} role="button" tabIndex={0} className="w-full text-left">
        {content}
      </div>
    )
  }
  return content
}

export function RepairStatusBadge({ status }) {
  const cfg = {
    PENDING: { label: 'รอการอนุมัติ', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    IN_PROGRESS: { label: 'กำลังซ่อม', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    WAIT_PARTS: { label: 'รออะไหล่', bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
    COMPLETED: { label: 'ซ่อมเสร็จ', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    REJECTED: { label: 'ไม่อนุมัติ', bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
    APPROVED: { label: 'อนุมัติแล้ว', bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
  }[status] || { label: status || '—', bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${cfg.bg}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{cfg.label}</span>
    </span>
  )
}

export function formatDateTime(val) {
  if (!val) return '—'
  try {
    return format(new Date(val), 'dd/MM/yy HH:mm')
  } catch {
    return String(val)
  }
}

export function isRepairSyncedWorkOrder(wo = {}) {
  if (!wo) return false
  const woId = String(wo.WO_ID || wo.Job_ID || wo['Job ID'] || '').toUpperCase()
  if (woId.startsWith('WO-RR')) return true
  if (wo.JobType === 'REPAIR') return true
  const comment = String(wo.Comment || wo.comment || '')
  if (comment.includes('synced_from_repair') || (comment.includes('"request_no"') && comment.includes('"req_id"'))) return true
  const problem = String(wo.Problem || wo.problem || '')
  if (problem.includes('synced_from_repair')) return true
  return false
}

/**
 * ตรวจสอบว่าใบสั่งงานเป็นงานที่ค้างอยู่หรือไม่ (ไม่เสร็จสิ้น และไม่ถูกยกเลิก)
 */
export function isPendingWorkOrder(wo) {
  if (!wo) return false
  const status = String(wo.Status || wo.status || '').trim().toUpperCase()
  const rawStatus = String(wo.Status || wo.status || '').trim()

  if (status === 'COMPLETED' || rawStatus === 'เสร็จสิ้น') return false
  if (status === 'CANCELLED' || rawStatus === 'ยกเลิก') return false
  return true
}

/**
 * ตรวจสอบว่างานแจ้งซ่อมเป็นงานที่ค้างอยู่หรือไม่ (ไม่เสร็จสิ้น และไม่ถูกยกเลิก/ปฏิเสธ)
 */
export function isPendingRepairRequest(req) {
  if (!req) return false
  const status = String(req.status || req.Status || '').trim().toUpperCase()
  const rawStatus = String(req.status || req.Status || '').trim()

  if (status === 'COMPLETED' || rawStatus === 'เสร็จสิ้น' || rawStatus === 'ซ่อมเสร็จ') return false
  if (status === 'CANCELLED' || status === 'REJECTED' || rawStatus === 'ยกเลิก' || rawStatus === 'ไม่อนุมัติ') return false
  return true
}
