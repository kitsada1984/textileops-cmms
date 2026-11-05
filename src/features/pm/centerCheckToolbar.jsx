import SearchInput from '../../components/ui/SearchInput'
import GoogleSheetSyncButton from '../../components/ui/GoogleSheetSyncButton'

export function CenterCheckToolbar({ search, setSearch, typeFilter, setTypeFilter, statusFilter, setStatusFilter, sheetColumns, filteredRecords }) {
  return (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="ค้นหาเลขที่เอกสาร, เครื่อง M/C, ช่าง หรือ Serial..."
                className="max-w-md"
              />

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="select text-xs font-semibold py-2 px-3 min-w-[130px]"
              >
                <option value="ALL">ทุกประเภทเครื่อง</option>
                <option value="Single">🔵 Single Jersey</option>
                <option value="Double">🟢 Double Jersey</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select text-xs font-semibold py-2 px-3 min-w-[130px]"
              >
                <option value="ALL">ทุกผลการตรวจ</option>
                <option value="ผ่าน">✅ ผ่านมาตรฐาน</option>
                <option value="ไม่ผ่าน">❌ ไม่ผ่านมาตรฐาน</option>
              </select>
            </div>

            <GoogleSheetSyncButton
              sheetName="ประวัติการเช็คศูนย์"
              columns={sheetColumns}
              rows={filteredRecords}
            />
          </div>
  )
}
