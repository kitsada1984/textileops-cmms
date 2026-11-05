import SearchInput from '../../components/ui/SearchInput'
import { RefreshCw, Zap } from 'lucide-react'
import FilterSortPanel from '../../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../../components/ui/GoogleSheetSyncButton'
import { formatPMCycle, getPMCountdown, getPMImageUrl, stripImageUrlMeta } from './pmHelpers.jsx'

export function PMToolbar({ search, setSearch, openSyncPMModal, syncingPM, canAdd, cylinderPMSource, FS_COLS, filterSort, setFilterSort, cols, displayRows, syncLatestFromCenterCheck, getPMCylinderType }) {
  return (
          <div className="space-y-2">
            {/* Tier 1: Search & Desktop Actions */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="ค้นหา Machine, ช่าง..."
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  className="btn-primary text-xs px-3.5 sm:px-4 py-2 min-h-[44px] hidden sm:flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
                  onClick={openSyncPMModal}
                  disabled={syncingPM || !canAdd || !cylinderPMSource.length}
                >
                  <RefreshCw size={14} className={syncingPM ? 'animate-spin' : ''} />
                  <span>{syncingPM ? 'กำลังอัพเดต...' : 'อัพเดตแผน PM'}</span>
                </button>
              </div>
            </div>

            {/* Tier 2: Horizontal Utility Scroll Strip */}
            <div className="toolbar-scroll-strip text-xs">
              <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
              <GoogleSheetSyncButton
                sheetName="แผน PM"
                columns={cols}
                rows={displayRows}
                valueGetters={{
                  Type: (row) => row.Type || getPMCylinderType(row),
                  PM_Type: formatPMCycle,
                  Countdown_Days: (row) => getPMCountdown(row.Next_PM_Date).label,
                  ImageUrl: getPMImageUrl,
                  ImagePreview: getPMImageUrl,
                  Remark: (row) => stripImageUrlMeta(row.Remark),
                }}
              />
              <button
                type="button"
                className="btn-outline text-xs px-3 sm:px-3.5 py-2 min-h-[44px] flex items-center justify-center gap-1.5 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shadow-sm font-bold flex-shrink-0"
                onClick={syncLatestFromCenterCheck}
                disabled={syncingPM}
                title="ดึงวันที่เช็คศูนย์ล่าสุดของแต่ละเครื่องมาอัปเดตแผน PM อัตโนมัติ"
              >
                <Zap size={14} className={syncingPM ? 'animate-bounce text-amber-500' : 'text-amber-500'} />
                <span>{syncingPM ? 'กำลังซิงค์...' : '⚡ ซิงค์วันที่เช็คศูนย์'}</span>
              </button>
            </div>
          </div>
  )
}
