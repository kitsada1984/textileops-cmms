import { Check, ChevronDown, ChevronUp, ClipboardList, Clock, PieChart, Plus, Printer, RotateCcw, Tag, X } from 'lucide-react'
import SearchInput from '../../components/ui/SearchInput'
import { WORK_ORDER_FILTER_STATUS_OPTIONS, WORK_ORDER_STATUS_OPTIONS, getWorkOrderStatusMeta, getWorkOrderDetails, getJobDailyLogs, getLatestDailyLog } from './workOrderNormalize.js'
import { calculateSlaPerformance } from '../../api/entities'
import { getProblemCauseMeta } from '../../constants/problemCause'
import { WorkOrderCard } from './WorkOrderCard.jsx'
import { WorkOrderJobTypeBadge, WorkOrderProblemCell, WorkOrderDetailsCell, WorkOrderStatusCell, WorkOrderDurationCell, WorkOrderRowActions } from './workOrderRowCells.jsx'

// Records tab content moved verbatim from WorkOrders (props only).
export function WorkOrdersRecords({ filteredJobs, jobsLoading, kpiTargets, typeCounts, statusCounts, causeCounts, WORK_ORDER_TYPE_OPTIONS, search, setSearch, typeFilters, setTypeFilters, statusFilters, setStatusFilters, causeFilter, setCauseFilter, showDeleted, setShowDeleted, isTypeFilterOpen, isStatusFilterOpen, isCauseFilterOpen, toggleTypeFilterOpen, toggleStatusFilterOpen, toggleCauseFilterOpen, toggleTypeFilter, toggleStatusFilter, toggleCauseFilter, canAdd, canEdit, canDelete, isMobile, isTablet, isDesktop, openEditModal, openCompleteModal, openDailyLogModal, openInterruptionModal, openPrintModal, handleDeleteJob, handleQuickStatusChange, setCreateModalOpen, setReportModalOpen }) {
  return (
        <div className="space-y-6">
          {/* Search & Filter Toolbar */}
          <div className="card p-3.5 sm:p-4 space-y-3 text-xs shadow-xs">
            {/* Top Row: Search Input + Actions in Scrollable/Responsive Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex-1 w-full">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="ค้นหา Job ID, M/C, KI, ช่าง, ผู้ทำรายการ..."
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-nowrap w-full sm:w-auto">
                {canAdd && (
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(true)}
                    className="btn-primary text-xs px-3.5 py-2 min-h-[44px] flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer flex-shrink-0"
                    title="เปิดหน้าต่างบันทึกเริ่มงานซ่อม / เปิดใบสั่งงาน"
                  >
                    <Plus size={15} />
                    <span>เปิดใบสั่งงาน</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors font-bold text-xs shadow-2xs flex-shrink-0 cursor-pointer"
                  title="พิมพ์รายงานใบสั่งงานตามเงื่อนไขที่กรองบนหน้าเว็บ"
                >
                  <Printer size={13} />
                  <span>พิมพ์รายงาน</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-200/80 dark:bg-blue-900/70 text-[10px]">
                    {filteredJobs.length}
                  </span>
                </button>

                {(typeFilters.length > 0 || statusFilters.length > 0 || Boolean(causeFilter) || search.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilters([])
                      setStatusFilters([])
                      setCauseFilter('')
                      setSearch('')
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-bold text-xs flex-shrink-0 cursor-pointer"
                    title="ล้างตัวกรองทั้งหมดกลับเป็นค่าเริ่มต้น"
                  >
                    <RotateCcw size={12} />
                    <span>ล้างตัวกรอง</span>
                  </button>
                )}

                <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 cursor-pointer select-none px-2.5 py-1.5 min-h-[44px] rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>รายการที่ลบ</span>
                </label>
              </div>
            </div>

            {/* Filter Cards Section — 3 Independent Collapsible Cards */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              {/* BOX 1: ประเภทงาน (Job Type) */}
              <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/90 dark:border-slate-800/90 shadow-xs overflow-hidden transition-all">
                <div className="flex items-center justify-between px-3.5 py-2">
                  <button
                    type="button"
                    onClick={toggleTypeFilterOpen}
                    className="flex items-center gap-2 text-left cursor-pointer group select-none flex-1"
                    title={isTypeFilterOpen ? 'คลิกเพื่อพับเก็บ' : 'คลิกเพื่อขยายตัวกรองประเภท'}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-200">
                      <Tag size={13} className="text-blue-500" />
                      <span>ประเภทงาน (Job Type)</span>
                    </div>

                    {typeFilters.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 animate-in fade-in">
                        เลือกแล้ว {typeFilters.length} ประเภท
                      </span>
                    )}

                    <div className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ml-1">
                      {isTypeFilterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {typeFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTypeFilters([])}
                      className="text-[11px] font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
                      title="ล้างตัวกรองประเภททั้งหมด"
                    >
                      <X size={11} />
                      <span>ล้าง</span>
                    </button>
                  )}
                </div>

                {isTypeFilterOpen && (
                  <div className="px-3.5 pb-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center gap-1.5 animate-fadeIn">
                    {/* All Types Card */}
                    <button
                      type="button"
                      onClick={() => setTypeFilters([])}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[44px] cursor-pointer active:scale-[0.98] ${
                        typeFilters.length === 0
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <span>ทุกประเภท</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          typeFilters.length === 0
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {typeCounts.ALL}
                      </span>
                    </button>

                    {/* Individual Job Type Cards */}
                    {WORK_ORDER_TYPE_OPTIONS.map((opt) => {
                      const isSelected = typeFilters.includes(opt.value)
                      const count = typeCounts[opt.value] || 0
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleTypeFilter(opt.value)}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[44px] cursor-pointer active:scale-[0.98] ${
                            isSelected
                              ? opt.activeClass
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                          title="คลิกเพื่อเลือกหรือยกเลิก (เลือกได้มากกว่า 1 ประเภท)"
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                              isSelected
                                ? 'bg-white/25 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* BOX 2: สถานะงาน (Job Status) */}
              <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/90 dark:border-slate-800/90 shadow-xs overflow-hidden transition-all">
                <div className="flex items-center justify-between px-3.5 py-2">
                  <button
                    type="button"
                    onClick={toggleStatusFilterOpen}
                    className="flex items-center gap-2 text-left cursor-pointer group select-none flex-1"
                    title={isStatusFilterOpen ? 'คลิกเพื่อพับเก็บ' : 'คลิกเพื่อขยายตัวกรองสถานะ'}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-200">
                      <Clock size={13} className="text-amber-500" />
                      <span>สถานะงาน (Job Status)</span>
                    </div>

                    {statusFilters.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-in fade-in">
                        เลือกแล้ว {statusFilters.length} สถานะ
                      </span>
                    )}

                    <div className="text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors ml-1">
                      {isStatusFilterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {statusFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setStatusFilters([])}
                      className="text-[11px] font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
                      title="ล้างตัวกรองสถานะทั้งหมด"
                    >
                      <X size={11} />
                      <span>ล้าง</span>
                    </button>
                  )}
                </div>

                {isStatusFilterOpen && (
                  <div className="px-3.5 pb-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center gap-1.5 animate-fadeIn">
                    {/* All Statuses Card */}
                    <button
                      type="button"
                      onClick={() => setStatusFilters([])}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[44px] cursor-pointer active:scale-[0.98] ${
                        statusFilters.length === 0
                          ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <span>ทั้งหมด</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          statusFilters.length === 0
                            ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {statusCounts.ALL}
                      </span>
                    </button>

                    {/* Individual Status Cards */}
                    {WORK_ORDER_FILTER_STATUS_OPTIONS.map((opt) => {
                      const isSelected = statusFilters.includes(opt.value)
                      const count = statusCounts[opt.value] || 0
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleStatusFilter(opt.value)}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[44px] cursor-pointer active:scale-[0.98] ${
                            isSelected
                              ? opt.activeClass
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                          title="คลิกเพื่อเลือกหรือยกเลิก (เลือกได้มากกว่า 1 สถานะ)"
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                              isSelected
                                ? 'bg-white/25 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* BOX 3: สาเหตุปัญหา (Problem Cause) */}
              <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/90 dark:border-slate-800/90 shadow-xs overflow-hidden transition-all">
                <div className="flex items-center justify-between px-3.5 py-2">
                  <button
                    type="button"
                    onClick={toggleCauseFilterOpen}
                    className="flex items-center gap-2 text-left cursor-pointer group select-none flex-1"
                    title={isCauseFilterOpen ? 'คลิกเพื่อพับเก็บ' : 'คลิกเพื่อขยายตัวกรองสาเหตุ'}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-200">
                      <PieChart size={13} className="text-indigo-500" />
                      <span>สาเหตุปัญหา (Problem Cause)</span>
                    </div>

                    {Boolean(causeFilter) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 animate-in fade-in">
                        เลือก: {causeFilter === 'UNSPECIFIED' ? 'ยังไม่ระบุ' : causeFilter}
                      </span>
                    )}

                    <div className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ml-1">
                      {isCauseFilterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {Boolean(causeFilter) && (
                    <button
                      type="button"
                      onClick={() => setCauseFilter('')}
                      className="text-[11px] font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
                      title="ล้างตัวกรองสาเหตุทั้งหมด"
                    >
                      <X size={11} />
                      <span>ล้าง</span>
                    </button>
                  )}
                </div>

                {isCauseFilterOpen && (
                  <div className="px-3.5 pb-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center gap-1.5 animate-fadeIn">
                    {/* All Causes Card */}
                    <button
                      type="button"
                      onClick={() => setCauseFilter('')}
                      className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[44px] cursor-pointer active:scale-[0.98] ${
                        !causeFilter
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <span>ทุกสาเหตุ</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          !causeFilter
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {causeCounts.ALL}
                      </span>
                    </button>

                    {/* 1. คน */}
                    <button
                      type="button"
                      onClick={() => toggleCauseFilter('คน')}
                      className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[44px] cursor-pointer active:scale-[0.98] ${
                        causeFilter === 'คน'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {causeFilter === 'คน' && <Check size={12} strokeWidth={3} />}
                      <span>👤</span>
                      <span>คน</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          causeFilter === 'คน'
                            ? 'bg-white/25 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {causeCounts.คน}
                      </span>
                    </button>

                    {/* 2. เครื่องจักร */}
                    <button
                      type="button"
                      onClick={() => toggleCauseFilter('เครื่องจักร')}
                      className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[44px] cursor-pointer active:scale-[0.98] ${
                        causeFilter === 'เครื่องจักร'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {causeFilter === 'เครื่องจักร' && <Check size={12} strokeWidth={3} />}
                      <span>⚙️</span>
                      <span>เครื่องจักร</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          causeFilter === 'เครื่องจักร'
                            ? 'bg-white/25 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {causeCounts.เครื่องจักร}
                      </span>
                    </button>

                    {/* 3. วัตถุดิบ */}
                    <button
                      type="button"
                      onClick={() => toggleCauseFilter('วัตถุดิบ')}
                      className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[44px] cursor-pointer active:scale-[0.98] ${
                        causeFilter === 'วัตถุดิบ'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {causeFilter === 'วัตถุดิบ' && <Check size={12} strokeWidth={3} />}
                      <span>🧵</span>
                      <span>วัตถุดิบ</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          causeFilter === 'วัตถุดิบ'
                            ? 'bg-white/25 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {causeCounts.วัตถุดิบ}
                      </span>
                    </button>

                    {/* 4. ยังไม่ระบุ */}
                    <button
                      type="button"
                      onClick={() => toggleCauseFilter('UNSPECIFIED')}
                      className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[44px] cursor-pointer active:scale-[0.98] ${
                        causeFilter === 'UNSPECIFIED'
                          ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {causeFilter === 'UNSPECIFIED' && <Check size={12} strokeWidth={3} />}
                      <span>❓</span>
                      <span>ยังไม่ระบุ</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          causeFilter === 'UNSPECIFIED'
                            ? 'bg-white/25 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {causeCounts.UNSPECIFIED}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Active Cause Filter Banner */}
            {causeFilter && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-900 dark:text-indigo-200 text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="font-bold">⚡ กำลังกรองตามสาเหตุปัญหา:</span>
                  <span className="px-2 py-0.5 rounded-lg font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-indigo-500/40 shadow-xs">
                    {causeFilter === 'UNSPECIFIED' ? '❓ ยังไม่ระบุ (Pending)' : getProblemCauseMeta(causeFilter)?.fullLabel || causeFilter}
                  </span>
                  <span className="text-[11px] text-indigo-700/80 dark:text-indigo-400">
                    (พบ {filteredJobs.length} รายการ)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCauseFilter('')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-950 dark:text-indigo-100 font-bold text-xs transition-colors cursor-pointer"
                  title="ยกเลิกตัวกรองสาเหตุปัญหา"
                >
                  <X size={13} />
                  <span>ยกเลิกกรองสาเหตุ</span>
                </button>
              </div>
            )}
          </div>

          {/* ── WORK ORDERS PRESENTATION (Tri-View ADR-0002) ─────────── */}
          {/* 1. Mobile View: Single-Column Work Order Cards */}
          {isMobile && (
            <div className="space-y-3 pb-24">
              {filteredJobs.map((job, idx) => (
                <WorkOrderCard
                  key={job.id || idx}
                  job={job}
                  kpiTargets={kpiTargets}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onInterruption={openInterruptionModal}
                  onComplete={openCompleteModal}
                  onPrint={openPrintModal}
                  onEdit={openEditModal}
                  onDelete={handleDeleteJob}
                  onDailyLog={openDailyLogModal}
                />
              ))}

              {filteredJobs.length === 0 && (
                <div className="card p-10 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800">
                  <ClipboardList size={32} className="mx-auto mb-2 opacity-40 text-blue-500" />
                  <p className="font-semibold text-xs text-slate-600 dark:text-slate-400">
                    {jobsLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบรายการใบสั่งงาน'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. Tablet View: 2-Column Responsive Card Grid */}
          {isTablet && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredJobs.map((job, idx) => (
                  <WorkOrderCard
                    key={job.id || idx}
                    job={job}
                    kpiTargets={kpiTargets}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onInterruption={openInterruptionModal}
                    onComplete={openCompleteModal}
                    onPrint={openPrintModal}
                    onEdit={openEditModal}
                    onDelete={handleDeleteJob}
                    onDailyLog={openDailyLogModal}
                  />
                ))}
              </div>

              {filteredJobs.length === 0 && (
                <div className="card p-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800">
                  <ClipboardList size={36} className="mx-auto mb-2 opacity-40 text-blue-500" />
                  <p className="font-semibold text-slate-600 dark:text-slate-400">
                    {jobsLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบรายการใบสั่งงาน'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 3. Desktop View: Full High-Density Data Table */}
          {isDesktop && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Job ID</th>
                    <th>M/C</th>
                    <th>KI</th>
                    <th>Design</th>
                    <th>เลขม้วน</th>
                    <th>ประเภท</th>
                    <th>สาเหตุปัญหา</th>
                    <th>รายละเอียด</th>
                    <th>สถานะ</th>
                    <th>ช่างผู้ปฏิบัติงาน</th>
                    <th>เวลาเริ่ม</th>
                    <th>ระยะเวลา</th>
                    <th>SLA Performance</th>
                    <th>ผู้บันทึก</th>
                    <th className="text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job, idx) => {
                    const statusMeta = getWorkOrderStatusMeta(job.Status)
                    const isCompleted = statusMeta.isCompleted
                    const sla = calculateSlaPerformance(job, kpiTargets)
                    const jobIdDisplay = job.Job_ID || job['Job ID'] || `JOB-${job.id?.slice(0, 8)}`
                    const detailsDisplay = getWorkOrderDetails(job)
                    const dailyLogs = getJobDailyLogs(job)
                    const latestDailyLog = getLatestDailyLog(job)

                    return (
                      <tr key={job.id || idx}>
                        {/* Job ID */}
                        <td className="font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400">
                          {jobIdDisplay}
                        </td>

                        {/* M/C */}
                        <td className="font-bold" style={{ color: 'var(--text-900)' }}>
                          {job.MC || '—'}
                        </td>

                        {/* KI */}
                        <td className="font-mono font-semibold" style={{ color: 'var(--text-700)' }}>
                          {job.KI || '—'}
                        </td>

                        {/* Design */}
                        <td className="max-w-[140px] truncate" style={{ color: 'var(--text-600)' }}>
                          {job.Design || '—'}
                        </td>

                        {/* Roll No */}
                        <td className="font-mono" style={{ color: 'var(--text-700)' }}>
                          {job.RollNo || job.roll_no || '—'}
                        </td>

                      <WorkOrderJobTypeBadge job={job} />

                      <WorkOrderProblemCell job={job} />

                      <WorkOrderDetailsCell job={job} detailsDisplay={detailsDisplay} dailyLogs={dailyLogs} latestDailyLog={latestDailyLog} openDailyLogModal={openDailyLogModal} />

                      <WorkOrderStatusCell job={job} statusMeta={statusMeta} canEdit={canEdit} handleQuickStatusChange={handleQuickStatusChange} />

                        {/* Technicians */}
                        <td className="max-w-[180px] truncate" style={{ color: 'var(--text-700)' }}>
                          {job.Technicians || '—'}
                        </td>

                        {/* Start Time */}
                        <td className="text-xs font-mono" style={{ color: 'var(--text-500)' }}>
                          {job.StartDate ? `${job.StartDate} ${job.StartTime || ''}` : '—'}
                        </td>

                      <WorkOrderDurationCell job={job} sla={sla} isCompleted={isCompleted} />

                        {/* SLA Performance */}
                        <td>
                          <span className={`badge ${sla.badgeClass}`}>
                            {sla.label}
                          </span>
                        </td>

                        {/* Created By */}
                        <td className="text-xs" style={{ color: 'var(--text-500)' }}>
                          {job.CreatedBy || '—'}
                        </td>

                      <WorkOrderRowActions job={job} sla={sla} isCompleted={isCompleted} canEdit={canEdit} canDelete={canDelete} dailyLogs={dailyLogs} openInterruptionModal={openInterruptionModal} openCompleteModal={openCompleteModal} openDailyLogModal={openDailyLogModal} openPrintModal={openPrintModal} openEditModal={openEditModal} handleDeleteJob={handleDeleteJob} />
                      </tr>
                    )
                  })}

                  {filteredJobs.length === 0 && (
                    <tr>
                      <td colSpan={15} className="text-center py-12 text-slate-400">
                        {jobsLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบรายการใบสั่งงาน'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
  )
}
