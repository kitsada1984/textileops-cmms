import { useState, useEffect, useMemo } from 'react'
import { Check, Clock, History, Pause, Play, Trash2, Layers, PlusCircle, Sparkles, FilePlus } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { format } from 'date-fns'
import { calculateDuration, calculateInterruptionTotal, formatMinutesToThai, RepairRequestAPI } from '../../api/entities'
import { extractPendingTasks } from './workOrderPendingMachines'
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
  onOpenCreateWorkOrder,
}) {
  const [activeTab, setActiveTab] = useState('presets')
  const [repairRequests, setRepairRequests] = useState([])

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
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-sm">
                      <Pause size={18} className="text-amber-600 animate-bounce" />
                      <span>กำลังทำงานแทรก: &ldquo;{activeInt.task_name}&rdquo;</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                      จับเวลาอยู่
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                    <span>เริ่มตั้งแต่: <b>{format(new Date(activeInt.start_time), 'HH:mm:ss (dd/MM/yyyy)')}</b></span>
                    <span className="font-mono font-extrabold text-base text-amber-700 dark:text-amber-300">
                      {formatMinutesToThai(Math.floor((Date.now() - new Date(activeInt.start_time).getTime()) / 60000))}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStopInterruption(activeInt.id)}
                    className="w-full py-2.5 rounded-xl font-extrabold text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-500/30 flex items-center justify-center gap-2"
                  >
                    <Play size={16} />
                    <span>▶️ จบงานแทรกนี้ / กลับมาทำงานหลักต่อ</span>
                  </button>
                </div>
              ) : (
                /* Mode Options Selection Section */
                <div className="space-y-3">
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
                        onSelectPendingTask={(title) => {
                          setInterruptionTaskName(title)
                          setActiveTab('presets')
                        }}
                        onStartImmediate={(title) => {
                          handleStartInterruption(title)
                        }}
                      />
                    </div>
                  )}

                  {/* Tab 2: Create New Work Order Card */}
                  {activeTab === 'create_new' && (
                    <InterruptionCreateNewCard
                      interruptionJob={interruptionJob}
                      onOpenCreateWorkOrder={onOpenCreateWorkOrder}
                      onStartImmediate={(title) => {
                        handleStartInterruption(title)
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
                              onClick={handleAddManualInterruption}
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
                          onClick={() => handleStartInterruption()}
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
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-52 overflow-y-auto">
                    {interruptions.map((item, idx) => (
                      <div key={item.id || idx} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                            <span>{item.task_name}</span>
                            {item.is_active && !item.end_time && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500 text-white animate-pulse">
                                กำลังทำ
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                            <span>เริ่ม: {item.start_time ? format(new Date(item.start_time), 'HH:mm dd/MM') : '—'}</span>
                            <span>•</span>
                            <span>จบ: {item.end_time ? format(new Date(item.end_time), 'HH:mm dd/MM') : (item.is_active ? 'กำลังจับเวลา' : '—')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900">
                            {formatMinutesToThai(item.duration_minutes || (item.start_time && item.end_time ? Math.floor((new Date(item.end_time) - new Date(item.start_time)) / 60000) : 0))}
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
                    ))}
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
