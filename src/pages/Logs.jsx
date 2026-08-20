import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { AuditLogAPI } from '../api/entities'
import SearchInput from '../components/ui/SearchInput'
import FilterSortPanel, { INIT_FS } from '../components/ui/FilterSortPanel'
import StatusBadge from '../components/ui/StatusBadge'
import { useT } from '../contexts/LanguageContext'
import { applyFilterSort, buildFilterSortColumns } from '../utils/filterSort'

const MODULES      = ['ALL','MACHINE','CYLINDER','PM','WORKORDER','SPARE_PART','SYSTEM','AUTH']
const ACTION_TYPES = ['ALL','CREATE','UPDATE','DELETE','SWAP','APPROVE','CLOSE','LOGIN','LOGOUT']

export default function Logs() {
  const { t } = useT()
  const { data, loading, load } = useEntity(AuditLogAPI)
  const [search,     setSearch]     = useState('')
  const [filterSort, setFilterSort] = useState(INIT_FS)
  const searched = data.filter(l =>
    [l.Module, l.ActionType, l.RecordID, l.User, l.FieldName, l.Comment]
      .some(v => String(v||'').toLowerCase().includes(search.toLowerCase()))
  )
  const LOG_MODULES     = ['MACHINE','CYLINDER','PM','WORKORDER','SPARE_PART','SYSTEM','AUTH']
  const LOG_ACTION_TYPES = ['CREATE','UPDATE','DELETE','SWAP','APPROVE','CLOSE','LOGIN','LOGOUT']
  const cols = useMemo(() => [
    { field: 'created_at', label: t('log_th_time'), type: 'datetime' },
    { field: 'Module', label: 'Module', type: 'select' },
    { field: 'ActionType', label: 'Action', type: 'select' },
    { field: 'RecordID', label: 'Record ID', type: 'text' },
    { field: 'FieldName', label: 'Field', type: 'text' },
    { field: 'OldValue', label: t('log_th_old'), type: 'text' },
    { field: 'NewValue', label: t('log_th_new'), type: 'text' },
    { field: 'User', label: 'User', type: 'text' },
    { field: 'Comment', label: t('log_th_note'), type: 'text' },
  ], [t])
  const FS_COLS = useMemo(() => buildFilterSortColumns(cols, {
    selectOptions: { Module: LOG_MODULES, ActionType: LOG_ACTION_TYPES },
    valueGetters: { created_at: (row) => row.created_date || row.created_at },
  }), [cols])
  const displayRows = useMemo(() => applyFilterSort(searched, FS_COLS, filterSort), [searched, FS_COLS, filterSort])


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder={t('log_search')} />
        <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
        <button className="btn-outline ml-auto" onClick={load}><RefreshCw size={14}/> {t('refresh')}</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('log_th_time')}</th>
              <th>Module</th>
              <th>Action</th>
              <th>Record ID</th>
              <th>Field</th>
              <th>{t('log_th_old')}</th>
              <th>{t('log_th_new')}</th>
              <th>User</th>
              <th>{t('log_th_note')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="text-center py-8" style={{color:'var(--text-400)'}}>{t('loading')}</td></tr>}
            {!loading && displayRows.map((l, i) => (
              <tr key={l._id || l.id || i}>
                <td className="text-xs whitespace-nowrap" style={{color:'var(--text-400)'}}>
                  {(l.created_date || l.created_at) ? format(new Date(l.created_date || l.created_at), 'dd/MM/yy HH:mm') : '—'}
                </td>
                <td><StatusBadge value={l.Module} /></td>
                <td><StatusBadge value={l.ActionType} /></td>
                <td className="font-mono text-xs">{l.RecordID || '—'}</td>
                <td className="text-xs">{l.FieldName || '—'}</td>
                <td className="text-xs text-red-500 max-w-[120px] truncate">{l.OldValue || '—'}</td>
                <td className="text-xs text-emerald-600 max-w-[120px] truncate">{l.NewValue || '—'}</td>
                <td className="text-sm">{l.User || '—'}</td>
                <td className="text-xs max-w-[160px] truncate" style={{color:'var(--text-400)'}}>{l.Comment || '—'}</td>
              </tr>
            ))}
            {!loading && !displayRows.length && <tr><td colSpan={9} className="text-center py-8" style={{color:'var(--text-400)'}}>{t('no_data')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
