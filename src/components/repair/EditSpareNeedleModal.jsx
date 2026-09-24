import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Edit3,
  Wrench,
  Layers,
  Clock,
  User,
  AlertCircle,
  Plus,
  Minus,
  CheckSquare,
  Square,
  Save,
  Loader,
  Package,
} from 'lucide-react'
import {
  SpareNeedleRequestAPI,
  TechnicianAPI,
  MachineAPI,
  CylinderAPI,
} from '../../api/entities'

const GAUGES = ['16G', '18G', '24G', '28G', '32G', '38G', '44G', '50G']
const PRESET_QTYS = [50, 100, 150, 200, 250, 300]

export default function EditSpareNeedleModal({ isOpen, onClose, onSuccess, req }) {
  const [machines, setMachines] = useState([])
  const [technicians, setTechnicians] = useState([])

  const [machineMc, setMachineMc] = useState('')
  const [gauge, setGauge] = useState('28G')
  const [cylinderSerial, setCylinderSerial] = useState('')
  const [technician, setTechnician] = useState('')
  const [shift, setShift] = useState('กะเช้า')
  const [comment, setComment] = useState('')

  const [issuerName, setIssuerName] = useState('')
  const [issuerComment, setIssuerComment] = useState('')

  const [dialTracks, setDialTracks] = useState({
    t1: { active: false, qty: 0 },
    t2: { active: false, qty: 0 },
  })

  const [cylTracks, setCylTracks] = useState({
    t1: { active: false, qty: 0 },
    t2: { active: false, qty: 0 },
    t3: { active: false, qty: 0 },
    t4: { active: false, qty: 0 },
  })

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!isOpen || !req) return

    setMachineMc(req.machine_mc || '')
    setGauge(req.gauge || '28G')
    setCylinderSerial(req.cylinder_serial || '')
    setTechnician(req.technician_name || '')
    setShift(req.shift || 'กะเช้า')
    setComment(req.request_comment || '')
    setIssuerName(req.issuer_name || '')
    setIssuerComment(req.issuer_comment || '')
    setErrorMsg('')

    const dial = req.tracks_requested?.dial || {}
    const cyl = req.tracks_requested?.cylinder || {}

    setDialTracks({
      t1: { active: (dial.t1 || 0) > 0, qty: dial.t1 || 0 },
      t2: { active: (dial.t2 || 0) > 0, qty: dial.t2 || 0 },
    })

    setCylTracks({
      t1: { active: (cyl.t1 || 0) > 0, qty: cyl.t1 || 0 },
      t2: { active: (cyl.t2 || 0) > 0, qty: cyl.t2 || 0 },
      t3: { active: (cyl.t3 || 0) > 0, qty: cyl.t3 || 0 },
      t4: { active: (cyl.t4 || 0) > 0, qty: cyl.t4 || 0 },
    })

    MachineAPI.list().then((mList) => {
      if (Array.isArray(mList)) setMachines(mList)
    }).catch(() => {})

    TechnicianAPI.list().then((tList) => {
      const active = (tList || []).filter((t) => t.Active !== false && t.Active !== 'false')
      setTechnicians(active)
    }).catch(() => {})
  }, [isOpen, req])

  const isPending = req?.status === 'PENDING'
  const isIssued = req?.status === 'PREPARED' || req?.status === 'COMPLETED' || (req?.issued_items && req?.issued_items.length > 0)

  // Track modifiers
  const toggleDial = (trackKey) => {
    if (!isPending) return
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
    if (!isPending) return
    const parsed = Math.max(0, parseInt(qty, 10) || 0)
    setDialTracks((prev) => ({
      ...prev,
      [trackKey]: { ...prev[trackKey], qty: parsed, active: parsed > 0 ? true : prev[trackKey].active },
    }))
  }

  const toggleCyl = (trackKey) => {
    if (!isPending) return
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
    if (!isPending) return
    const parsed = Math.max(0, parseInt(qty, 10) || 0)
    setCylTracks((prev) => ({
      ...prev,
      [trackKey]: { ...prev[trackKey], qty: parsed, active: parsed > 0 ? true : prev[trackKey].active },
    }))
  }

  const totalNeedles =
    (dialTracks.t1.active ? dialTracks.t1.qty : 0) +
    (dialTracks.t2.active ? dialTracks.t2.qty : 0) +
    (cylTracks.t1.active ? cylTracks.t1.qty : 0) +
    (cylTracks.t2.active ? cylTracks.t2.qty : 0) +
    (cylTracks.t3.active ? cylTracks.t3.qty : 0) +
    (cylTracks.t4.active ? cylTracks.t4.qty : 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!req) return
    setErrorMsg('')

    if (!machineMc.trim()) {
      setErrorMsg('กรุณาระบุหมายเลขเครื่องจักร (Machine MC)')
      return
    }

    if (!technician.trim()) {
      setErrorMsg('กรุณาระบุชื่อช่างผู้ขอเบิก')
      return
    }

    if (isPending && totalNeedles <= 0) {
      setErrorMsg('กรุณาเลือก Track และระบุจำนวนเข็มอย่างน้อย 1 รายการ')
      return
    }

    setSubmitting(true)
    try {
      const updatedFields = {
        machine_mc: machineMc.trim(),
        gauge: gauge.trim(),
        cylinder_serial: cylinderSerial.trim(),
        technician_name: technician.trim(),
        shift,
        request_comment: comment.trim(),
      }

      if (isPending) {
        updatedFields.tracks_requested = {
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
      }

      if (isIssued) {
        if (issuerName.trim()) updatedFields.issuer_name = issuerName.trim()
        if (issuerComment !== undefined) updatedFields.issuer_comment = issuerComment.trim()
      }

      const updated = await SpareNeedleRequestAPI.update(req.id, updatedFields)

      if (onSuccess) onSuccess(updated)
      onClose()
    } catch (err) {
      console.error('Failed to update spare needle request:', err)
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกการแก้ไข: ' + (err.message || err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || !req) return null

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">แก้ไขใบเบิกเข็ม Spare</h2>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  {req.request_no || req.id}
                </span>
              </div>
              <p className="text-xs text-slate-500">ปรับปรุงรายละเอียดของคำขอเบิกเข็ม</p>
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

          {/* Warning banner for issued items */}
          {isIssued && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <Package className="w-4 h-4 text-amber-600 shrink-0" />
                <span>ใบเบิกนี้ได้รับการตัดสต็อกแล้ว ({req.status === 'COMPLETED' ? 'รับเข็มเรียบร้อย' : 'เตรียมแล้ว'})</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                การแก้ไขในหน้านี้จะปรับปรุงเฉพาะข้อมูลเอกสาร (ช่าง, กะ, หมายเหตุ) ข้อมูลการตัดสต็อกจะไม่ได้รับผลกระทบ
                หากต้องการเปลี่ยนแปลงจำนวนเข็มที่ตัดจ่าย แนะนำให้ <strong>กดลบใบเบิก</strong> (ระบบจะคืนสต็อกเข้าคลังให้อัตโนมัติ) แล้วสร้างและจัดเตรียมใหม่
              </p>
            </div>
          )}

          {/* Machine & Cylinder Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-blue-600" />
              <span>ข้อมูลเครื่องจักร</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เครื่องจักร (MC) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="machines-edit-list"
                  value={machineMc}
                  onChange={(e) => setMachineMc(e.target.value)}
                  placeholder="เช่น DG-341M"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  required
                />
                <datalist id="machines-edit-list">
                  {machines.map((m, idx) => {
                    const mcName = m.MC || m.machine_mc || m.id || ''
                    return mcName ? <option key={idx} value={mcName} /> : null
                  })}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gauge</label>
                <select
                  value={gauge}
                  onChange={(e) => setGauge(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  {GAUGES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Serial กระบอก</label>
                <input
                  type="text"
                  value={cylinderSerial}
                  onChange={(e) => setCylinderSerial(e.target.value)}
                  placeholder="เช่น CY-28-004"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Technician & Shift Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>ช่างผู้ขอเบิก <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                list="techs-edit-list"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="ระบุชื่อช่าง"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                required
              />
              <datalist id="techs-edit-list">
                {technicians.map((t, idx) => (
                  <option key={idx} value={t.Name || t.name || ''} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
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
                        ? 'bg-blue-600 text-white shadow-2xs font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tracks Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Track ที่ต้องการเบิก {isIssued && '(บันทึกตามใบเดิม)'}</span>
              </span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                รวมทั้งหมด {totalNeedles} ตัว
              </span>
            </div>

            {/* Dail Tracks */}
            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2.5">
              <div className="text-xs font-bold text-blue-900">🔵 Dail (จานบน)</div>
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
                          disabled={!isPending}
                          onClick={() => toggleDial(key)}
                          className={`flex items-center gap-2 font-bold text-xs text-slate-800 ${isPending ? 'cursor-pointer' : 'cursor-default'}`}
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
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => setDialQty(key, Math.max(0, item.qty - 50))}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            )}
                            <input
                              type="number"
                              min="0"
                              step="10"
                              disabled={!isPending}
                              value={item.qty}
                              onChange={(e) => setDialQty(key, e.target.value)}
                              className="w-14 text-center font-bold text-xs bg-blue-50 border border-blue-300 rounded py-0.5"
                            />
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => setDialQty(key, item.qty + 50)}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {item.active && isPending && (
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
              <div className="text-xs font-bold text-indigo-900">🟣 Cylinder (กระบอกล่าง)</div>
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
                          disabled={!isPending}
                          onClick={() => toggleCyl(key)}
                          className={`flex items-center gap-2 font-bold text-xs text-slate-800 ${isPending ? 'cursor-pointer' : 'cursor-default'}`}
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
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => setCylQty(key, Math.max(0, item.qty - 50))}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            )}
                            <input
                              type="number"
                              min="0"
                              step="10"
                              disabled={!isPending}
                              value={item.qty}
                              onChange={(e) => setCylQty(key, e.target.value)}
                              className="w-14 text-center font-bold text-xs bg-indigo-50 border border-indigo-300 rounded py-0.5"
                            />
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => setCylQty(key, item.qty + 50)}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {item.active && isPending && (
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
              หมายเหตุของช่าง
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="ระบุหมายเหตุเพิ่มเติม"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Issuer details if issued */}
          {isIssued && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-600" />
                <span>ข้อมูลผู้จ่ายเข็ม / สโตร์</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้จ่ายเข็ม</label>
                  <input
                    type="text"
                    value={issuerName}
                    onChange={(e) => setIssuerName(e.target.value)}
                    placeholder="ชื่อผู้จ่ายเข็ม"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุผู้จ่ายเข็ม</label>
                  <input
                    type="text"
                    value={issuerComment}
                    onChange={(e) => setIssuerComment(e.target.value)}
                    placeholder="เช่น ตัดจ่ายเข็ม Groz-Beckert แท้..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
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
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกการแก้ไข</span>
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
