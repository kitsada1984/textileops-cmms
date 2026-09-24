import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  PackagePlus,
  Wrench,
  Layers,
  Clock,
  User,
  AlertCircle,
  Plus,
  Minus,
  CheckSquare,
  Square,
  Send,
  Loader,
} from 'lucide-react'
import {
  SpareNeedleRequestAPI,
  TechnicianAPI,
  MachineAPI,
  CylinderAPI,
} from '../../api/entities'
import { notifySpareNeedleRequested, loadTelegramSettingsDB } from '../../utils/telegram'
import { notifyLineSpareNeedleRequested, loadLineSettingsDB } from '../../utils/line'

const GAUGES = ['16G', '18G', '24G', '28G', '32G', '38G', '44G', '50G']
const PRESET_QTYS = [50, 100, 150, 200, 250, 300]

export default function CreateSpareNeedleModal({ isOpen, onClose, onSuccess, currentUser }) {
  const [machines, setMachines] = useState([])
  const [cylinders, setCylinders] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [keeperSummary, setKeeperSummary] = useState('')

  const [machineMc, setMachineMc] = useState('')
  const [gauge, setGauge] = useState('28G')
  const [cylinderSerial, setCylinderSerial] = useState('')
  const [technician, setTechnician] = useState('')
  const [shift, setShift] = useState('กะเช้า')
  const [comment, setComment] = useState('')

  const [dialTracks, setDialTracks] = useState({
    t1: { active: false, qty: 50 },
    t2: { active: false, qty: 50 },
  })

  const [cylTracks, setCylTracks] = useState({
    t1: { active: false, qty: 50 },
    t2: { active: false, qty: 50 },
    t3: { active: false, qty: 50 },
    t4: { active: false, qty: 50 },
  })

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Load supporting options
  useEffect(() => {
    if (!isOpen) return

    // Reset fields
    setMachineMc('')
    setGauge('28G')
    setCylinderSerial('')
    setComment('')
    setErrorMsg('')
    setDialTracks({
      t1: { active: false, qty: 50 },
      t2: { active: false, qty: 50 },
    })
    setCylTracks({
      t1: { active: false, qty: 50 },
      t2: { active: false, qty: 50 },
      t3: { active: false, qty: 50 },
      t4: { active: false, qty: 50 },
    })

    // Auto set technician
    const defaultTechName = currentUser?.name || currentUser?.username || ''
    setTechnician(defaultTechName)

    // Load data
    MachineAPI.list().then((mList) => {
      if (Array.isArray(mList)) setMachines(mList)
    }).catch(() => {})

    CylinderAPI.list().then((cList) => {
      if (Array.isArray(cList)) setCylinders(cList)
    }).catch(() => {})

    TechnicianAPI.list().then((tList) => {
      const active = (tList || []).filter((t) => t.Active !== false && t.Active !== 'false')
      setTechnicians(active)
      if (!defaultTechName && active.length > 0) {
        setTechnician(active[0].Name || active[0].name || '')
      }
    }).catch(() => {})

    Promise.all([loadTelegramSettingsDB(), loadLineSettingsDB()])
      .then(([tg, line]) => {
        const tgKeepers = (tg?.needle_keepers || []).map((k) => k.name).filter(Boolean)
        const lineKeepers = (line?.needle_keepers || []).map((k) => k.name).filter(Boolean)
        const names = Array.from(new Set([...tgKeepers, ...lineKeepers]))
        if (names.length > 0) {
          setKeeperSummary(names.join(', '))
        }
      })
      .catch(() => {})
  }, [isOpen, currentUser])

  // When machine MC changes, attempt auto-populating gauge & cylinder serial
  const handleSelectMachine = (mc) => {
    setMachineMc(mc)
    if (!mc) return

    // Look for matching cylinder currently installed on this machine
    const matchedCyl = cylinders.find((c) => {
      const cMc = (c.Machine || c.machine_mc || c.mc || '').trim().toLowerCase()
      return cMc === mc.trim().toLowerCase()
    })

    if (matchedCyl) {
      if (matchedCyl.Gauge || matchedCyl.gauge) {
        setGauge(matchedCyl.Gauge || matchedCyl.gauge)
      }
      if (matchedCyl.Serial_NOW || matchedCyl.Serial || matchedCyl.serial) {
        setCylinderSerial(matchedCyl.Serial_NOW || matchedCyl.Serial || matchedCyl.serial)
      }
    }
  }

  // Helper track modifiers
  const toggleDial = (trackKey) => {
    setDialTracks((prev) => ({
      ...prev,
      [trackKey]: {
        ...prev[trackKey],
        active: !prev[trackKey].active,
        qty: !prev[trackKey].active && prev[trackKey].qty === 0 ? 50 : prev[trackKey].qty || 50,
      },
    }))
  }

  const setDialQty = (trackKey, qty) => {
    const parsed = Math.max(0, parseInt(qty, 10) || 0)
    setDialTracks((prev) => ({
      ...prev,
      [trackKey]: { ...prev[trackKey], qty: parsed, active: parsed > 0 ? true : prev[trackKey].active },
    }))
  }

  const toggleCyl = (trackKey) => {
    setCylTracks((prev) => ({
      ...prev,
      [trackKey]: {
        ...prev[trackKey],
        active: !prev[trackKey].active,
        qty: !prev[trackKey].active && prev[trackKey].qty === 0 ? 50 : prev[trackKey].qty || 50,
      },
    }))
  }

  const setCylQty = (trackKey, qty) => {
    const parsed = Math.max(0, parseInt(qty, 10) || 0)
    setCylTracks((prev) => ({
      ...prev,
      [trackKey]: { ...prev[trackKey], qty: parsed, active: parsed > 0 ? true : prev[trackKey].active },
    }))
  }

  // Calculate totals
  const totalNeedles =
    (dialTracks.t1.active ? dialTracks.t1.qty : 0) +
    (dialTracks.t2.active ? dialTracks.t2.qty : 0) +
    (cylTracks.t1.active ? cylTracks.t1.qty : 0) +
    (cylTracks.t2.active ? cylTracks.t2.qty : 0) +
    (cylTracks.t3.active ? cylTracks.t3.qty : 0) +
    (cylTracks.t4.active ? cylTracks.t4.qty : 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    const mc = machineMc.trim()
    if (!mc) {
      setErrorMsg('กรุณาระบุหมายเลขเครื่องจักร (Machine MC)')
      return
    }

    if (!technician.trim()) {
      setErrorMsg('กรุณาระบุชื่อช่างผู้ขอเบิก')
      return
    }

    if (totalNeedles <= 0) {
      setErrorMsg('กรุณาเลือก Track และระบุจำนวนเข็มที่ต้องการเบิกอย่างน้อย 1 รายการ')
      return
    }

    setSubmitting(true)
    try {
      const tracksPayload = {
        dial: {
          t1: dialTracks.t1.active ? dialTracks.t1.qty : 0,
          t2: dialTracks.t2.active ? dialTracks.t2.qty : 0,
        },
        cylinder: {
          t1: cylTracks.t1.active ? cylTracks.t1.qty : 0,
          t2: cylTracks.t2.active ? cylTracks.t2.qty : 0,
          t3: cylTracks.t3.active ? cylTracks.t3.qty : 0,
          t4: cylTracks.t4.active ? cylTracks.t4.qty : 0,
        },
      }

      const reqNo = `SNR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`

      const newRequest = await SpareNeedleRequestAPI.create({
        id: reqNo,
        request_no: reqNo,
        machine_mc: mc,
        cylinder_serial: cylinderSerial.trim(),
        gauge: gauge.trim(),
        technician_name: technician.trim(),
        shift,
        tracks_requested: tracksPayload,
        request_comment: comment.trim(),
        status: 'PENDING',
        created_at: new Date().toISOString(),
      })

      const dummyCyl = {
        Machine: mc,
        Gauge: gauge,
        Serial_NOW: cylinderSerial,
      }

      // Background notifications to needle keepers
      notifySpareNeedleRequested(newRequest, dummyCyl).catch(console.warn)
      notifyLineSpareNeedleRequested(newRequest, dummyCyl).catch(console.warn)

      if (onSuccess) onSuccess(newRequest)
      onClose()
    } catch (err) {
      console.error('Failed to create spare needle request:', err)
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกคำขอ: ' + (err.message || err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">ขอเบิกเข็ม Spare</h2>
              <p className="text-xs text-slate-500">สร้างใบขอเบิกเข็ม Spare ประจำเครื่องและส่งแจ้งเตือนคนคัดเข็ม</p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Machine & Cylinder Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-indigo-600" />
              <span>ข้อมูลเครื่องจักร</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เครื่องจักร (MC) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="machines-list"
                    value={machineMc}
                    onChange={(e) => handleSelectMachine(e.target.value)}
                    placeholder="เช่น DG-341M, S-01"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    required
                  />
                  <datalist id="machines-list">
                    {machines.map((m, idx) => {
                      const mcName = m.MC || m.machine_mc || m.id || ''
                      return mcName ? <option key={idx} value={mcName} /> : null
                    })}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gauge</label>
                <select
                  value={gauge}
                  onChange={(e) => setGauge(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  {GAUGES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Serial กระบอก (ถ้ามี)</label>
                <input
                  type="text"
                  value={cylinderSerial}
                  onChange={(e) => setCylinderSerial(e.target.value)}
                  placeholder="เช่น CY-28-004"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Technician & Shift Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>ช่างผู้ขอเบิก <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                list="techs-list"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="ระบุชื่อช่าง"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                required
              />
              <datalist id="techs-list">
                {technicians.map((t, idx) => (
                  <option key={idx} value={t.Name || t.name || ''} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>กะการทำงาน</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {['กะเช้า', 'กะดึก', 'กะบ่าย'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setShift(s)}
                    className={`py-1.5 text-xs rounded-lg font-semibold transition cursor-pointer text-center ${
                      shift === s
                        ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tracks Selection Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>เลือก Track ที่ต้องการเบิก</span>
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                รวมทั้งหมด {totalNeedles} ตัว
              </span>
            </div>

            {/* Dail Tracks */}
            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2.5">
              <div className="text-xs font-bold text-blue-900 flex items-center gap-1">
                <span>🔵 Dail (จานบน)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: 't1', label: 'Track 1' },
                  { key: 't2', label: 'Track 2' },
                ].map(({ key, label }) => {
                  const item = dialTracks[key]
                  return (
                    <div
                      key={key}
                      className={`p-2.5 rounded-lg border transition ${
                        item.active ? 'bg-white border-blue-400 shadow-2xs' : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => toggleDial(key)}
                          className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800"
                        >
                          {item.active ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                          <span>Dail {label}</span>
                        </button>
                        {item.active && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDialQty(key, Math.max(0, item.qty - 50))}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={item.qty}
                              onChange={(e) => setDialQty(key, e.target.value)}
                              className="w-14 text-center font-bold text-xs bg-blue-50 border border-blue-300 rounded py-0.5"
                            />
                            <button
                              type="button"
                              onClick={() => setDialQty(key, item.qty + 50)}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {item.active && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {PRESET_QTYS.map((qty) => (
                            <button
                              key={qty}
                              type="button"
                              onClick={() => setDialQty(key, qty)}
                              className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition cursor-pointer ${
                                item.qty === qty
                                  ? 'bg-blue-600 text-white font-bold'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {qty}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Cylinder Tracks */}
            <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200/80 space-y-2.5">
              <div className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                <span>🟣 Cylinder (กระบอกล่าง)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: 't1', label: 'Track 1' },
                  { key: 't2', label: 'Track 2' },
                  { key: 't3', label: 'Track 3' },
                  { key: 't4', label: 'Track 4' },
                ].map(({ key, label }) => {
                  const item = cylTracks[key]
                  return (
                    <div
                      key={key}
                      className={`p-2.5 rounded-lg border transition ${
                        item.active ? 'bg-white border-indigo-400 shadow-2xs' : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => toggleCyl(key)}
                          className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800"
                        >
                          {item.active ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                          <span>Cyl {label}</span>
                        </button>
                        {item.active && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setCylQty(key, Math.max(0, item.qty - 50))}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={item.qty}
                              onChange={(e) => setCylQty(key, e.target.value)}
                              className="w-14 text-center font-bold text-xs bg-indigo-50 border border-indigo-300 rounded py-0.5"
                            />
                            <button
                              type="button"
                              onClick={() => setCylQty(key, item.qty + 50)}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {item.active && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {PRESET_QTYS.map((qty) => (
                            <button
                              key={qty}
                              type="button"
                              onClick={() => setCylQty(key, qty)}
                              className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition cursor-pointer ${
                                item.qty === qty
                                  ? 'bg-indigo-600 text-white font-bold'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {qty}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              หมายเหตุเพิ่มเติม (ถ้ามี)
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="เช่น เข็มหักจากลายริ้ว, ร่องกระบอกสึกหรอ, เบิกเปลี่ยนยกชุด..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Notification Info Banner */}
          {keeperSummary && (
            <div className="text-[11px] bg-slate-100 text-slate-600 p-2.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
              <span>🎯 คนคัดเข็มที่จะได้รับแจ้งเตือน:</span>
              <strong className="text-slate-800">{keeperSummary}</strong>
            </div>
          )}

          {/* Modal Footer / Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting || totalNeedles <= 0}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกคำขอ...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>ส่งคำขอเบิกเข็ม ({totalNeedles} ตัว)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
