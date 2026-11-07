import { REPAIR_STATUS } from '../../api/entities'

const HIDDEN_SUMMARY_STATUSES = ['COMPLETED']
const SUMMARY_STATUSES = REPAIR_STATUS.filter((s) => !HIDDEN_SUMMARY_STATUSES.includes(s.value))

export function RepairStatusRow({ byStatus, STATUS_CFG }) {
  return (
      <div
        className="flex gap-2.5 overflow-x-auto no-scrollbar scrollbar-none pb-1 flex-nowrap sm:flex-wrap"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {SUMMARY_STATUSES.map(s => {
          const cfg = STATUS_CFG[s.value] || {}
          return (
            <div key={s.value} className="flex-shrink-0" style={{
              padding: '10px 16px', borderRadius: 12,
              background: cfg.bg || 'var(--bg-card)',
              border: `1px solid ${cfg.border || 'var(--border)'}`,
              minWidth: 96, textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, color: cfg.color || 'var(--text-900)' }}>{byStatus[s.value]}</div>
              <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: cfg.color || 'var(--text-400)' }}>
                {s.label}
              </div>
            </div>
          )
        })}
      </div>
  )
}
