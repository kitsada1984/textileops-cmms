import { useMemo, useState } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { AuditLogAPI } from '../api/entities'
import SearchInput from '../components/ui/SearchInput'
import FilterSortPanel, { INIT_FS } from '../components/ui/FilterSortPanel'
import StatusBadge from '../components/ui/StatusBadge'
import { useT } from '../contexts/LanguageContext'
import { useToast } from '../components/ui/Toast'
import { applyFilterSort, buildFilterSortColumns } from '../utils/filterSort'

function parseSnapshot(value) {
  if (!value) return {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function getLogTime(row) {
  return row.created_date || row.created_at || ''
}

const ACTIONS = ['CREATE_PLAN', 'UPDATE_PLAN', 'CHECK_PLAN', 'EDIT_PLAN', 'MERGE_DUPLICATE', 'BACKFILL_PM_LAST_DATE']

export default function PMLog() {
  const { t } = useT()
  const toast = useToast()
  const { data, loading, load, remove } = useEntity(AuditLogAPI)
  const [search, setSearch] = useState('')
  const [filterSort, setFilterSort] = useState(INIT_FS)

  const rows = useMemo(() => {
    const serialCounts = new Map()
    return data
      .filter(row => row.Module === 'PM')
      .sort((a, b) => new Date(getLogTime(a)) - new Date(getLogTime(b)))
      .map(row => {
        const oldSnapshot = parseSnapshot(row.OldValue)
        const newSnapshot = parseSnapshot(row.NewValue)
        const serial = row.RecordID || newSnapshot.Machine_KI || oldSnapshot.Machine_KI || ''
        const count = (serialCounts.get(serial) || 0) + 1
        serialCounts.set(serial, count)
        return {
          ...row,
          PMAction: row.FieldName || row.ActionType,
          RunNo: count,
          Machine_KI: serial,
          Machine_MC: newSnapshot.Machine_MC || oldSnapshot.Machine_MC || '',
          Location: newSnapshot.Location || oldSnapshot.Location || '',
          Last_PM_Date: newSnapshot.Last_PM_Date || oldSnapshot.Last_PM_Date || '',
          Next_PM_Date: newSnapshot.Next_PM_Date || oldSnapshot.Next_PM_Date || '',
        }
      })
      .sort((a, b) => new Date(getLogTime(b)) - new Date(getLogTime(a)))
  }, [data])

  const searched = rows.filter(row =>
    [row.Machine_KI, row.Machine_MC, row.Location, row.PMAction, row.ActionType, row.User, row.Comment]
      .some(value => String(value || '').toLowerCase().includes(search.toLowerCase()))
  )

  const cols = useMemo(() => [
    { field: 'created_at', label: t('log_th_time'), type: 'datetime' },
    { field: 'RunNo', label: 'ครั้งที่', type: 'number' },
    { field: 'Machine_KI', label: 'ซีเรียลเดิม', type: 'text' },
    { field: 'Machine_MC', label: 'เครื่องปัจจุบัน', type: 'text' },
    { field: 'Location', label: 'ตำแหน่ง', type: 'text' },
    { field: 'PMAction', label: 'Action', type: 'select' },
    { field: 'Last_PM_Date', label: 'PM ล่าสุด', type: 'date' },
    { field: 'Next_PM_Date', label: 'PM ครั้งถัดไป', type: 'date' },
    { field: 'User', label: 'User', type: 'text' },
    { field: 'Comment', label: t('log_th_note'), type: 'text' },
  ], [t])

  const FS_COLS = useMemo(() => buildFilterSortColumns(cols, {
    selectOptions: { PMAction: ACTIONS },
    valueGetters: { created_at: getLogTime },
    include: ['Machine_MC', 'PMAction'],
  }), [cols])

  const displayRows = useMemo(
    () => applyFilterSort(searched, FS_COLS, filterSort),
    [searched, FS_COLS, filterSort]
  )

  const formatDate = (value) => {
    if (!value) return '—'
    try { return format(new Date(value), 'dd/MM/yyyy') } catch { return value }
  }

  const deleteLog = async (row) => {
    const id = row.id || row._id
    if (!id) return toast.error('ลบ Log PM ไม่สำเร็จ', 'ไม่พบ ID ของรายการ')
    if (!confirm(`ลบ Log PM ของ ${row.Machine_KI || row.RecordID || 'รายการนี้'}?`)) return
    try {
      await remove(id)
      toast.success('ลบ Log PM สำเร็จ')
    } catch (error) {
      toast.error('ลบ Log PM ไม่สำเร็จ', error.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหา Serial, Machine, ตำแหน่ง..." />
        <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
        <button className="btn-outline ml-auto" onClick={load}><RefreshCw size={14}/> {t('refresh')}</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('log_th_time')}</th>
              <th>ครั้งที่</th>
              <th>ซีเรียลเดิม</th>
              <th>เครื่องปัจจุบัน</th>
              <th>ตำแหน่ง</th>
              <th>Action</th>
              <th>PM ล่าสุด</th>
              <th>PM ครั้งถัดไป</th>
              <th>User</th>
              <th>{t('log_th_note')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={11} className="text-center py-8" style={{color:'var(--text-400)'}}>{t('loading')}</td></tr>}
            {!loading && displayRows.map((row, i) => (
              <tr key={row._id || row.id || i}>
                <td className="text-xs whitespace-nowrap" style={{color:'var(--text-400)'}}>
                  {getLogTime(row) ? format(new Date(getLogTime(row)), 'dd/MM/yy HH:mm') : '—'}
                </td>
                <td className="font-semibold">{row.RunNo}</td>
                <td className="font-mono text-xs">{row.Machine_KI || '—'}</td>
                <td>{row.Machine_MC || '—'}</td>
                <td>{row.Location || '—'}</td>
                <td><StatusBadge value={row.PMAction} /></td>
                <td>{formatDate(row.Last_PM_Date)}</td>
                <td>{formatDate(row.Next_PM_Date)}</td>
                <td>{row.User || '—'}</td>
                <td className="text-xs max-w-[220px] truncate" style={{color:'var(--text-400)'}}>{row.Comment || '—'}</td>
                <td>
                  <button className="btn-danger py-1 px-2 text-xs" onClick={() => deleteLog(row)} title="ลบ Log PM">
                    <Trash2 size={12}/>
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !displayRows.length && <tr><td colSpan={11} className="text-center py-8" style={{color:'var(--text-400)'}}>{t('no_data')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
