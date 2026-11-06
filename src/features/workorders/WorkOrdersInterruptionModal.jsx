import { useState, useEffect, useMemo } from 'react'
import { Check, Clock, History, Pause, Play, Trash2, Layers, FilePlus, Users, Building2 } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { format } from 'date-fns'
import { calculateDuration, calculateInterruptionTotal, formatMinutesToThai, RepairRequestAPI } from '../../api/entities'
import { extractPendingTasks, parseJobTechnicians, evaluateNoTechRemaining } from './workOrderPendingMachines'
import { InterruptionTechSelector } from './InterruptionTechSelector'
import { InterruptionPendingMachinesList } from './InterruptionPendingMachinesList'
import { InterruptionCreateNewCard } from './InterruptionCreateNewCard'

export function WorkOrdersInterruptionModal({
  interruptionModalOpen,
  interruptionJob,
  setInterruptionModalOpen,
  interruptionTaskName,
  setInterruptionTaskName,
  interruptionManualMins,
  setInterruptionManualMins,
  interruptionManualNotes,
  setInterruptionManualNotes,
  showManualAdd,
  setShowManualAdd,
  handleAddManualInterruption,
  handleDeleteInterruption,
  handleStartInterruption,
  handleStopInterruption,
  getJobInterruptions,
  QUICK_INTERRUPTION_PRESETS = [],
  allJobs = [],
  technicians = [],
  onOpenCreateWorkOrder,
}) {
  const [activeTab, setActiveTab] = useState('presets')
  const [repairRequests, setRepairRequests] = useState([])
  const [selectedTechs, setSelectedTechs] = useState([])

  // Parse assigned technicians of the current machine
  const assignedTechs = useMemo(() => {
    return parseJobTechnicians(interruptionJob)
  }, [interruptionJob])

  // Initialize selectedTechs with all assigned technicians when modal opens
  useEffect(() => {
    if (interruptionModalOpen && interruptionJob) {
      const techs = parseJobTechnicians(interruptionJob)
      setSelectedTechs(techs)
    }
  }, [interruptionModalOpen, interruptionJob])

  // Evaluate whether no technicians remain working at the machine
  const noTechRemaining = useMemo(() => {
    return evaluateNoTechRemaining(interruptionJob, selectedTechs)
  }, [interruptionJob, selectedTechs])

  // Fetch pending repair requests when modal opens to aggregate all backlog across factory
  useEffect(() => {
    if (!interruptionModalOpen) return
    let active = true
    if (RepairRequestAPI && typeof RepairRequestAPI.list === 'function') {
      RepairRequestAPI.list()
        .then((res) => {
          if (active && Array.isArray(res)) {
            setRepairRequests(res)
          }
        })
        .catch(() => {})
    }
    return () => {
      active = false
    }
  }, [interruptionModalOpen])

  // Extract pending tasks across Work Orders and Repair Requests
  const pendingTasks = useMemo(() => {
    return extractPendingTasks({
      workOrders: allJobs,
      repairRequests,
      excludeJobId: interruptionJob?.Job_ID || interruptionJob?.id,
    })
  }, [allJobs, repairRequests, interruptionJob])

  // Auto-select pending tab if there are pending tasks in the factory
  useEffect(() => {
    if (interruptionModalOpen) {
      if (pendingTasks.length > 0) {
        setActiveTab('pending')
      } else {
        setActiveTab('presets')
      }
    }
  }, [interruptionModalOpen, pendingTasks.length])

  return (
    <>
      {interruptionModalOpen && interruptionJob && (() => {
        const interruptions = getJobInterruptions ? getJobInterruptions(interruptionJob) : []
        const activeInt = interruptions.find((i) => i.is_active && !i.end_time)
        const { lostDurationText } = calculateInterruptionTotal(interruptions)
        const start = interruptionJob.StartTimestamp || interruptionJob.DateStart || interruptionJob.created_at
        const now = new Date().toISOString()
        const durationRes = calculateDuration(start, now, interruptions)

        // Calculate live duration for active interruption
        const activeStart = activeInt?.start_time ? new Date(activeInt.start_time) : new Date()
        const activeElapsedMins = Math.max(0, Math.floor((Date.now() - activeStart.getTime()) / 60000))
        const activeTechs = activeInt?.technicians || activeInt?.pulled_techs || []

        const triggerStart = (name, extraOptions = {}) => {
          const title = name || interruptionTaskName
          if (handleStartInterruption) {
            handleStartInterruption(title, { selectedTechs, noTechRemaining, ...extraOptions })
          }
        }

        const triggerManualAdd = () => {
          if (handleAddManualInterruption) {
            handleAddManualInterruption({ selectedTechs, noTechRemaining })
          }
        }

        return (
          <Modal
            open={interruptionModalOpen}
            onClose={() => setInterruptionModalOpen(false)}
            title="⏸️ บันทึกงานแทรก & เวลาที่สูญเสียไป (Interruption Tracking)"
          >
            <div className="space-y-4 text-xs">
              {/* Job Info Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="text-[11px] text-slate-500">ใบสั่งงานหลัก:</span>
                  <div className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                    {interruptionJob.Job_ID || interruptionJob['Job ID'] || interruptionJob.id}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">เครื่องจักร:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {interruptionJob.MC} (KI: {interruptionJob.KI || '-'})
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">ช่างประจำเครื่อง:</span>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    {assignedTechs.length > 0 ? assignedTechs.join(', ') : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">เวลาทำงานจริงสุทธิ:</span>
                  <div className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                    {durationRes.netDurationText}
                  </div>
                </div>
              </div>

              {/* Sunday Deduction Notice */}
              {durationRes.sundayMinutes > 0 && (
                <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span>🏖️ ช่วงเวลานี้ตรงกับวันอาทิตย์ (วันหยุดโรงงาน):</span>
                  </span>
                  <span className="font-mono font-bold">หักออก {durationRes.sundayDurationText} อัตโนมัติ</span>
                </div>
              )}

              {/* Active Running Interruption Banner */}
              {activeInt ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-amber-500/10 border-2 border-amber-500/60 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-sm">
                      <Pause size={18} className="text-amber-600 animate-bounce" />
                      <span>กำลังทำงานแทรก: &ldquo;{activeInt.task_name}&rdquo;</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                      จับเวลาหยุดอยู่
                    </span>
                  </div>

                  {/* Interruption Status Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-white/70 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 block">หยุดแทรกงานอะไร:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {activeInt.task_name}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 block">ช่างที่ถูกดึงตัวไป:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {activeTechs.length > 0 ? activeTechs.join(', ') : 'ไม่ได้ระบุช่างเฉพาะเจาะจง'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 block">เริ่มหยุดเวลา:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {format(activeStart, 'HH:mm:ss น. (dd/MM/yyyy)')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 block">หยุดไปแล้วกี่นาที:</span>
                      <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">
                        {formatMinutesToThai(activeElapsedMins)}
                      </span>
                    </div>

                    <div className="sm:col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">ผลกระทบต่อเวลาทำงาน:</span>
                        {activeInt.no_tech_remaining ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            🛑 ไม่มีช่างอยู่ (หยุดนับเวลาทำงานสุทธิ)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            👥 ยังมีช่างอื่นช่วยงาน
                          </span>
                        )}
                      </div>
                      <span className="text-amber-700 dark:text-amber-300 font-bold text-[11px] animate-pulse">
                        ⏳ สถานะ: ช่างยังไม่กลับมา
                      </span>
                    </div>
                  </div>

                  {/* Return to Work / End Interruption Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleStopInterruption(activeInt.id, { returnTechsToJob: true })}
                      className="flex-1 py-3 px-3 rounded-xl font-extrabold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-500/30 flex items-center justify-center gap-2"
                      title="ช่างทำงานแทรกเสร็จสิ้นและกลับมาประจำเครื่องนี้ (เริ่มนับเวลาต่อ)"
                    >
                      <Play size={16} />
                      <span>▶️ ช่างกลับมาทำงานเดิม (คืนช่างเข้าใบงาน)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStopInterruption(activeInt.id, { returnTechsToJob: false })}
                      className="py-3 px-3.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      title="สิ้นสุดงานแทรก แต่ส่งช่างคืนสู่ส่วนกลาง (ไม่ดึงกลับมาใบงานนี้)"
                    >
                      <Building2 size={14} className="text-slate-500" />
                      <span>🏢 ส่งช่างคืนส่วนกลาง</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode Options Selection Section */
                <div className="space-y-3">
                  {/* Technician Selection Panel (เลือกช่างจากเครื่องที่ถูกแทรก) */}
                  <InterruptionTechSelector
                    assignedTechs={assignedTechs}
                    availableTechs={technicians}
                    selectedTechs={selectedTechs}
                    onChangeSelectedTechs={setSelectedTechs}
                    noTechRemaining={noTechRemaining}
                  />

                  {/* Segmented Control Bar */}
                  <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('pending')}
                      className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'pending'
                          ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Layers size={13} />
                      <span>เครื่องมีงานค้าง</span>
                      {pendingTasks.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-extrabold">
                          {pendingTasks.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('create_new')}
                      className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'create_new'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <FilePlus size={13} />
                      <span>เปิดใบสั่งงานใหม่</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('presets')}
                      className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'presets'
                          ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Clock size={13} />
                      <span>ระบุเอง / ด่วน</span>
                    </button>
                  </div>

                  {/* Tab 1: Pending Backlog Machines */}
                  {activeTab === 'pending' && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-slate-900/60 border border-amber-200/80 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Layers size={14} className="text-amber-500" />
                          <span>เลือกจากเครื่องที่มีงานค้างในระบบทุกประเภท ({pendingTasks.length} รายการ)</span>
                        </label>
                      </div>

                      <InterruptionPendingMachinesList
                        pendingTasks={pendingTasks}
                        selectedTechs={selectedTechs}
                        noTechRemaining={noTechRemaining}
                        onSelectPendingTask={(title) => {
                          setInterruptionTaskName(title)
                          setActiveTab('presets')
                        }}
                        onStartImmediate={(title, extra) => {
                          triggerStart(title, extra)
                        }}
                      />
                    </div>
                  )}

                  {/* Tab 2: Create New Work Order Card */}
                  {activeTab === 'create_new' && (
                    <InterruptionCreateNewCard
                      interruptionJob={interruptionJob}
                      selectedTechs={selectedTechs}
                      noTechRemaining={noTechRemaining}
                      onOpenCreateWorkOrder={onOpenCreateWorkOrder}
                      onStartImmediate={(title) => {
                        triggerStart(title)
                      }}
                    />
                  )}

                  {/* Tab 3: Presets & Custom Input Form */}
                  {activeTab === 'presets' && (
                    <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-slate-900/80 border border-blue-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Clock size={14} className="text-blue-500" />
                          <span>ระบุชื่องานแทรก / ข้อความด่วน (Start Interruption)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowManualAdd(!showManualAdd)}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                        >
                          {showManualAdd ? '⚡ สลับเป็นโหมดกดเริ่มสด' : '+ กรอกเวลาย้อนหลัง'}
                        </button>
                      </div>

                      {/* Preset Quick Buttons */}
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_INTERRUPTION_PRESETS.map((preset, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setInterruptionTaskName(preset.template || preset.value || preset.label)}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-700 dark:text-slate-300 transition-all shadow-xs"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Task Name Input */}
                      <div>
                        <input
                          type="text"
                          placeholder="ระบุชื่องานแทรก เช่น ไปขึ้นด้าย เครื่อง 12334..."
                          value={interruptionTaskName}
                          onChange={(e) => setInterruptionTaskName(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 font-semibold"
                        />
                      </div>

                      {/* Manual Add Inputs */}
                      {showManualAdd ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="label text-[11px]">จำนวนนาทีที่สูญเสียไป *</label>
                            <input
                              type="number"
                              min="1"
                              placeholder="เช่น 30 (นาที)"
                              value={interruptionManualMins}
                              onChange={(e) => setInterruptionManualMins(e.target.value)}
                              className="input font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="label text-[11px]">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                            <input
                              type="text"
                              placeholder="รายละเอียดสั้นๆ..."
                              value={interruptionManualNotes}
                              onChange={(e) => setInterruptionManualNotes(e.target.value)}
                              className="input text-xs"
                            />
                          </div>
                          <div className="sm:col-span-2 pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={triggerManualAdd}
                              className="btn-primary text-xs px-4 py-2"
                            >
                              <Check size={14} />
                              <span>บันทึกงานแทรกย้อนหลัง</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerStart()}
                          disabled={!interruptionTaskName.trim()}
                          className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
                        >
                          <Pause size={14} />
                          <span>⏸️ เริ่มจับเวลางานแทรกทันที (Auto Timestamp)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Recorded Interruptions Table */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <History size={14} className="text-slate-500" />
                    <span>รายการงานแทรกทั้งหมด ({interruptions.length} รายการ)</span>
                  </h4>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    รวมเสียเวลา: {lostDurationText}
                  </span>
                </div>

                {interruptions.length === 0 ? (
                  <div className="text-center py-5 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    ยังไม่มีรายการงานแทรกในใบสั่งงานนี้
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    {interruptions.map((item, idx) => {
                      const itemTechs = item.technicians || item.pulled_techs || []
                      const durationMins = item.duration_minutes || (item.start_time && item.end_time ? Math.floor((new Date(item.end_time) - new Date(item.start_time)) / 60000) : 0)

                      return (
                        <div key={item.id || idx} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5 flex-wrap">
                              <span>{item.task_name}</span>

                              {/* Pulled Technicians Badge */}
                              {itemTechs.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                  <Users size={10} />
                                  <span>{itemTechs.join(', ')}</span>
                                </span>
                              )}

                              {/* No Tech Remaining Impact Badge */}
                              {item.no_tech_remaining && (
                                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                                  🛑 ไม่มีช่างอยู่ (หยุดนับเวลา)
                                </span>
                              )}

                              {item.is_active && !item.end_time && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500 text-white animate-pulse">
                                  กำลังทำ (ยังไม่กลับมา)
                                </span>
                              )}
                            </div>

                            <div className="text-[10.5px] text-slate-500 font-mono flex items-center gap-2 flex-wrap">
                              <span>เริ่มหยุด: {item.start_time ? format(new Date(item.start_time), 'HH:mm น. (dd/MM)') : '—'}</span>
                              <span>•</span>
                              <span>กลับมาทำงาน: {item.end_time ? format(new Date(item.end_time), 'HH:mm น. (dd/MM)') : (item.is_active ? '⏳ ยังไม่กลับมา' : '—')}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900">
                              หยุดไป {formatMinutesToThai(durationMins)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteInterruption(item.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              title="ลบรายการนี้"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInterruptionModalOpen(false)}
                  className="btn-outline px-5"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </Modal>
        )
      })()}
    </>
  )
}
