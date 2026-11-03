import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Camera, CheckCircle2, Cloud, Edit3, ExternalLink, History,
  Image as ImageIcon, PlusCircle, RefreshCw, Sparkles, Upload, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import { useToast } from '../../components/ui/Toast'
import { classifyNeedleAction, needleActionLabel } from '../../utils/needleLedger'
import { NeedleSetAPI, NeedleHistoryAPI, normalizeNeedleSet } from '../../api/entities'
import { uploadMedia } from '../../modules/media/mediaUploader'
import { extractImageUrl, isGoogleDriveUrl, getFullResolutionImageUrl } from '../../utils/imageUrlUtils'
import { formatNeedleStockFileName } from '../../utils/needleStockUtils'
import { NEEDLE_IMAGE_FOLDER, NeedleImage } from './StockTransactionModal'

export const MACHINE_TYPES = [
  'Single',
  'Double',
  'Single Jacquard',
  'Double Jacquard',
  'Mecmor Jacquard',
]

export const GAUGES = ['16G', '18G', '24G', '28G', '32G', '38G', '44G', '50G']

export const GRADES = ['เกรด A', 'เกรด B', 'รอคัดแยก', 'ปลดระวาง']

export const LOCATIONS = ['GMK1', 'STORE', 'GMK3']

/**
 * 2. Add New Needle Set Modal
 */
export function AddNewNeedleSetModal({ isOpen, onClose: onCloseProp, needleSets, comboboxStore, onLearnValues, onSuccess }) {
  const toast = useToast()
  const [machineType, setMachineType] = useState('Single')
  const [gauge, setGauge] = useState('28G')
  const [machineId, setMachineId] = useState('')
  const [brand, setBrand] = useState('')
  const [needleModel, setNeedleModel] = useState('')
  const [grade, setGrade] = useState('เกรด B')
  const [conditionDetail, setConditionDetail] = useState('สภาพปานกลาง')
  const [quantity, setQuantity] = useState('')
  const [inspector, setInspector] = useState('tuk')
  const [location, setLocation] = useState('STORE')
  const [remarks, setRemarks] = useState('')
  const [uploadedImages, setUploadedImages] = useState([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)


  // กันปิดหน้าต่างทั้งที่ยังมีรูปอัปโหลดขึ้น Drive แล้วแต่ยังไม่ได้บันทึกเข้าระบบ
  // ใช้ ref เพื่อให้ onClose มี identity เดิมเสมอ — ไม่งั้น useEffect [isOpen, onClose]
  // จะรีเซ็ตรูปที่ staged ไว้ทุก render (ทำให้รูปหายก่อนกดบันทึก และหน้าค้าง)
  const uploadedImagesRef = useRef(uploadedImages)
  uploadedImagesRef.current = uploadedImages
  const submittingRef = useRef(submitting)
  submittingRef.current = submitting
  const onClosePropRef = useRef(onCloseProp)
  onClosePropRef.current = onCloseProp

  const onClose = useCallback(() => {
    if (uploadedImagesRef.current.length > 0 && !submittingRef.current) {
      const ok = window.confirm(
        `มีรูปที่อัปโหลดขึ้น Google Drive แล้ว ${uploadedImagesRef.current.length} รูป แต่ยังไม่ได้บันทึกเข้าระบบ
` +
        'ถ้าปิดตอนนี้ รูปจะไม่ถูกบันทึกเข้าชุดเข็ม — ต้องการปิดโดยไม่บันทึกหรือไม่?'
      )
      if (!ok) return
    }
    onClosePropRef.current()
  }, [])
  useEffect(() => {
    if (!isOpen) return
    setUploadedImages([])
    setUploadingImage(false)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Smart suggestions for needle models based on selected machine type and gauge
  const modelSuggestions = useMemo(() => {
    const list = []
    needleSets.forEach(s => {
      if (s.machineType === machineType && s.gauge === gauge && s.needleModel && !list.includes(s.needleModel)) {
        list.push(s.needleModel)
      }
    })
    return list
  }, [needleSets, machineType, gauge])

  // Smart autofill when choosing machineId
  const handleMachineIdChange = (val) => {
    setMachineId(val)
    const existing = needleSets.find(s => s.machineId && s.machineId.trim().toLowerCase() === val.trim().toLowerCase())
    if (existing) {
      if (existing.machineType) setMachineType(existing.machineType)
      if (existing.gauge) setGauge(existing.gauge)
      if (existing.brand && !brand) setBrand(existing.brand)
      if (existing.needleModel && !needleModel) setNeedleModel(existing.needleModel)
    }
  }

  const nextNum = String(needleSets.length + 1).padStart(4, '0')
  const newSetId = `NS-${nextNum}`

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (e.target) e.target.value = ''
    if (files.length === 0) return

    setUploadingImage(true)
    let successCount = 0
    try {
      for (const file of files) {
        const customFileName = formatNeedleStockFileName(newSetId, 'NEW', file.name)
        try {
          const res = await uploadMedia(file, {
            folderName: NEEDLE_IMAGE_FOLDER,
            fileName: customFileName,
            fallbackToLocal: false,
          })
          const url = res.imageUrl || res.url
          if (!url) throw new Error('ไม่ได้รับ URL ตอบกลับจาก Google Drive')
          setUploadedImages(prev => [...prev, { url, name: customFileName }])
          successCount++
        } catch (uploadErr) {
          console.error('[NeedleStock] Upload failed for:', file.name, uploadErr)
          toast.error('อัปโหลดรูปไม่สำเร็จ', `${file.name}: ${uploadErr.message || 'เชื่อมต่อ Google Drive ขัดข้อง'}`)
        }
      }
      if (successCount > 0) {
        toast.success('อัปโหลดรูปขึ้น Google Drive สำเร็จ', 'อย่าลืมกดปุ่ม "บันทึกชุดเข็มใหม่" ด้านล่างเพื่อบันทึกข้อมูลเข้าระบบ')
      }
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = (idx) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!needleModel.trim()) {
      alert('กรุณาระบุรหัสรุ่นเข็ม')
      return
    }
    const qtyNum = parseInt(quantity, 10)
    if (isNaN(qtyNum) || qtyNum < 0) {
      alert('กรุณาระบุจำนวนเข็มให้ถูกต้อง')
      return
    }

    try {
      setSubmitting(true)
      onLearnValues({ machineId, brand, needleModel, conditionDetail, inspector })

      const newSetRecord = normalizeNeedleSet({
        id: newSetId,
        setId: newSetId,
        machineType,
        gauge,
        machineId: machineId.trim(),
        brand: brand.trim(),
        needleModel: needleModel.trim(),
        grade,
        conditionDetail: conditionDetail.trim(),
        status: qtyNum === 0 ? 'หมดสต็อก' : qtyNum <= 100 ? 'สต็อกเหลือน้อย' : 'พร้อมใช้งาน',
        quantity: qtyNum,
        dateRecorded: new Date().toISOString().split('T')[0],
        inspector: inspector.trim(),
        remarks: remarks.trim(),
        images: uploadedImages,
        location,
      })

      await NeedleSetAPI.create(newSetRecord)
      try {
        if (typeof onSuccess === 'function') {
          onSuccess(newSetRecord)
        }
      } catch (cbErr) {
        console.warn('onSuccess callback warning:', cbErr)
        onClose()
      }
    } catch (err) {
      console.error('Failed to create needle set:', err)
      alert('บันทึกชุดเข็มไม่สำเร็จ: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-sky-700 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <PlusCircle className="w-5 h-5 text-sky-200" />
            <h4 className="text-base font-bold">บันทึกชุดเข็มใหม่เข้าระบบ</h4>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-sky-200 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Machine Type */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">ประเภทเครื่องจักร *</label>
              <select
                value={machineType}
                onChange={(e) => setMachineType(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
              >
                {MACHINE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Gauge */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">เบอร์เกจ (Gauge) *</label>
              <select
                value={gauge}
                onChange={(e) => setGauge(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
              >
                {GAUGES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Machine ID */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">รหัสเครื่องจักร (Machine ID) *</label>
              <input
                type="text"
                value={machineId}
                onChange={(e) => handleMachineIdChange(e.target.value)}
                placeholder="เช่น MC-01, MC-14"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">ยี่ห้อ / ผู้ผลิต</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="เช่น MAYER&CIE, GROZ-BECKERT"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
              />
            </div>

            {/* Needle Model */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-slate-700">รหัสรุ่นเข็ม / ชนิดเข็ม *</label>
                {modelSuggestions.length > 0 && (
                  <span className="text-[11px] text-amber-600 flex items-center">
                    <Sparkles className="w-3 h-3 mr-1" />
                    แนะนำสำหรับ {machineType} {gauge}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={needleModel}
                onChange={(e) => setNeedleModel(e.target.value)}
                placeholder="เช่น WO 146.41 G 01"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition font-medium"
              />
              {modelSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {modelSuggestions.slice(0, 4).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setNeedleModel(m)}
                      className="px-2 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-medium border border-sky-200 transition"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Grade */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">เกรดเข็ม *</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
              >
                {GRADES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Condition Detail */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">ลักษณะสภาพเข็ม</label>
              <input
                type="text"
                value={conditionDetail}
                onChange={(e) => setConditionDetail(e.target.value)}
                placeholder="เช่น สภาพดี, สึกหรอปานกลาง"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">จำนวน (เล่ม) *</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="เช่น 660, 1320"
                required
                min="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Inspector */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">ชื่อช่าง / ผู้บันทึก *</label>
              <input
                type="text"
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                placeholder="เช่น tuk"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">ตำแหน่งจัดเก็บ (Location)</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
              >
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Remarks */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="เช่น เข็มเรียง 1214, งาน Cotton"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Photos Upload Section */}
          <div className="border border-dashed border-sky-300 rounded-2xl p-4 bg-sky-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-sky-600" />
                  <span>รูปภาพประกอบชุดเข็ม (ถ่ายจากกล้อง หรือเลือกไฟล์)</span>
                  <span className="inline-flex items-center space-x-1 text-[11px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-normal">
                    <Cloud className="w-3 h-3" />
                    <span>Google Drive: {NEEDLE_IMAGE_FOLDER}</span>
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">อัปโหลดตรงลง Google Drive ทันทีที่เลือกรูป โฟลเดอร์: {NEEDLE_IMAGE_FOLDER}</p>
              </div>
              <label className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center space-x-1 shadow-xs transition ${
                uploadingImage ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 text-white'
              }`}>
                {uploadingImage ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>กำลังอัปโหลด...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>เลือก/ถ่ายรูป</span>
                    <input type="file" accept="image/*" multiple onChange={handleFileUpload} disabled={uploadingImage} className="hidden" />
                  </>
                )}
              </label>
            </div>

            {/* Uploading indicator or uploaded list */}
            {(uploadedImages.length > 0 || uploadingImage) && (
              <div className="space-y-2 pt-1">
                {uploadedImages.length > 0 && (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>รูปภาพพร้อมบันทึก ({uploadedImages.length} รูป) — กรุณากดปุ่ม <b>"บันทึกชุดเข็มใหม่"</b> ด้านล่างเพื่อบันทึกข้อมูลเข้าระบบ</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 group">
                      <NeedleImage src={img.url} alt={img.name || `photo-${idx}`} size="w240" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                        <span className="text-[9px] text-white text-center truncate">{img.name || 'รูปภาพ'}</span>
                      </div>
                      <span className="absolute bottom-0.5 left-0.5 bg-emerald-600/90 text-white rounded px-1 py-0.2 text-[8px] flex items-center space-x-0.5 shadow-xs font-semibold">
                        <Cloud className="w-2.5 h-2.5" />
                        <span>Drive</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-0.5 right-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow cursor-pointer"
                        title="ลบรูปนี้"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {uploadingImage && (
                    <div className="w-16 h-16 rounded-xl bg-sky-50 border-2 border-dashed border-sky-400 flex flex-col items-center justify-center p-1 text-center animate-pulse">
                      <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mb-1" />
                      <span className="text-[8px] font-bold text-sky-700">ส่งเข้า Drive...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || uploadingImage}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition cursor-pointer disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className={`px-5 py-2 text-white rounded-xl font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 ${
                uploadedImages.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300 ring-offset-1 font-bold'
                  : 'bg-sky-600 hover:bg-sky-700'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <span>บันทึกเข้าระบบ</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

/**
 * 3. Update Grade / Inspect Modal
 */
export function UpdateGradeModal({ isOpen, onClose: onCloseProp, currentSet, comboboxStore, onLearnValues, onSuccess }) {
  const toast = useToast()
  const [actionType, setActionType] = useState('คัดแยก/เปลี่ยนเกรดเข็ม')
  const [grade, setGrade] = useState(currentSet?.grade || 'เกรด B')
  const [conditionDetail, setConditionDetail] = useState(currentSet?.conditionDetail || '')
  const [quantity, setQuantity] = useState(currentSet?.quantity ?? '')
  const [technician, setTechnician] = useState('tuk')
  const [location, setLocation] = useState(currentSet?.location || 'STORE')
  const [remarks, setRemarks] = useState('')
  const [uploadedImages, setUploadedImages] = useState([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)


  // กันปิดหน้าต่างทั้งที่ยังมีรูปอัปโหลดขึ้น Drive แล้วแต่ยังไม่ได้บันทึกเข้าระบบ
  // ใช้ ref เพื่อให้ onClose มี identity เดิมเสมอ — ไม่งั้น useEffect [isOpen, onClose]
  // จะรีเซ็ตรูปที่ staged ไว้ทุก render (ทำให้รูปหายก่อนกดบันทึก และหน้าค้าง)
  const uploadedImagesRef = useRef(uploadedImages)
  uploadedImagesRef.current = uploadedImages
  const submittingRef = useRef(submitting)
  submittingRef.current = submitting
  const onClosePropRef = useRef(onCloseProp)
  onClosePropRef.current = onCloseProp

  const onClose = useCallback(() => {
    if (uploadedImagesRef.current.length > 0 && !submittingRef.current) {
      const ok = window.confirm(
        `มีรูปที่อัปโหลดขึ้น Google Drive แล้ว ${uploadedImagesRef.current.length} รูป แต่ยังไม่ได้บันทึกเข้าระบบ
` +
        'ถ้าปิดตอนนี้ รูปจะไม่ถูกบันทึกเข้าชุดเข็ม — ต้องการปิดโดยไม่บันทึกหรือไม่?'
      )
      if (!ok) return
    }
    onClosePropRef.current()
  }, [])
  useEffect(() => {
    if (!isOpen) return
    setUploadedImages([])
    setUploadingImage(false)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (e.target) e.target.value = ''
    if (files.length === 0) return

    setUploadingImage(true)
    let successCount = 0
    try {
      for (const file of files) {
        const customFileName = formatNeedleStockFileName(currentSet?.setId, 'GRADE', file.name)
        try {
          const res = await uploadMedia(file, {
            folderName: NEEDLE_IMAGE_FOLDER,
            fileName: customFileName,
            fallbackToLocal: false,
          })
          const url = res.imageUrl || res.url
          if (!url) throw new Error('ไม่ได้รับ URL ตอบกลับจาก Google Drive')
          setUploadedImages(prev => [...prev, { url, name: customFileName }])
          successCount++
        } catch (uploadErr) {
          console.error('[NeedleStock] Upload failed for:', file.name, uploadErr)
          toast.error('อัปโหลดรูปไม่สำเร็จ', `${file.name}: ${uploadErr.message || 'เชื่อมต่อ Google Drive ขัดข้อง'}`)
        }
      }
      if (successCount > 0) {
        toast.success('อัปโหลดรูปขึ้น Google Drive สำเร็จ', 'อย่าลืมกดปุ่ม "บันทึกการเปลี่ยนแปลง" ด้านล่างเพื่อบันทึกข้อมูลเข้าระบบ')
      }
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = (idx) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentSet) return
    const qtyNum = parseInt(quantity, 10)
    if (isNaN(qtyNum) || qtyNum < 0) {
      alert('กรุณาระบุจำนวนคงเหลือให้ถูกต้อง')
      return
    }

    try {
      setSubmitting(true)
      onLearnValues({ conditionDetail, technician })

      const mergedImages = [...(currentSet.images || []), ...uploadedImages]

      const updatedSet = {
        ...currentSet,
        grade,
        conditionDetail: conditionDetail.trim(),
        quantity: qtyNum,
        location,
        remarks: remarks.trim() || currentSet.remarks,
        images: mergedImages,
        status: qtyNum === 0 ? 'หมดสต็อก' : qtyNum <= 100 ? 'สต็อกเหลือน้อย' : 'พร้อมใช้งาน',
      }

      const newLog = {
        id: `LOG-${Date.now()}`,
        logId: `LOG-${Date.now()}`,
        setId: currentSet.setId,
        actionType,
        oldGrade: currentSet.grade,
        newGrade: grade,
        conditionDetail: conditionDetail.trim(),
        quantity: qtyNum,
        qtyChange: qtyNum - (parseInt(currentSet.quantity, 10) || 0),
        balanceAfter: qtyNum,
        dateAction: new Date().toISOString().split('T')[0],
        technician: technician.trim(),
        remarks: remarks.trim(),
        images: uploadedImages,
        createdAt: new Date().toISOString(),
      }

      await Promise.all([
        NeedleSetAPI.update(currentSet.id || currentSet.setId, updatedSet),
        NeedleHistoryAPI.create(newLog),
      ])

      try {
        if (typeof onSuccess === 'function') {
          onSuccess(updatedSet, newLog)
        }
      } catch (cbErr) {
        console.warn('onSuccess callback warning:', cbErr)
        onClose()
      }
    } catch (err) {
      console.error('Update grade failed:', err)
      alert('อัปเดตเกรดไม่สำเร็จ: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-800 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <Edit3 className="w-5 h-5 text-sky-400" />
            <div>
              <h4 className="text-base font-bold">อัปเดตเกรด / บันทึกการตรวจสภาพ</h4>
              <p className="text-xs text-slate-400">{currentSet?.setId} ({currentSet?.machineId}) • {currentSet?.needleModel}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">ประเภทการทำรายการ *</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
              >
                <option value="คัดแยก/เปลี่ยนเกรดเข็ม">คัดแยก / เปลี่ยนเกรดเข็ม</option>
                <option value="ตรวจสภาพตามรอบ">ตรวจสภาพตามรอบ</option>
                <option value="เบิกเข็มไปใช้งาน">เบิกเข็มไปใช้งาน</option>
                <option value="ปลดระวาง/คัดทิ้ง">ปลดระวาง / คัดทิ้ง</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">เกรดเข็มใหม่ *</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium"
              >
                {GRADES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">ลักษณะสภาพเข็ม *</label>
              <input
                type="text"
                value={conditionDetail}
                onChange={(e) => setConditionDetail(e.target.value)}
                placeholder="เลือกหรือพิมพ์สภาพเข็ม"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">จำนวนคงเหลือ (เล่ม)</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 font-bold"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">ชื่อช่าง / ผู้ทำรายการ *</label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="ระบุชื่อช่าง"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">ตำแหน่งจัดเก็บ (Location)</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
              >
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">บันทึกผลการตรวจสอบ / หมายเหตุ</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows="2"
              placeholder="ระบุผลตรวจสภาพ เช่น ตะขอเข็มงอ 5 เล่ม, ผ่านการคัดแล้วพร้อมขึ้นเครื่อง"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500"
            ></textarea>
          </div>

          {/* Photo attachment */}
          <div className="border border-dashed border-sky-300 rounded-2xl p-4 bg-sky-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-sky-600" />
                  <span>ถ่ายรูป/แนบรูปภาพสภาพเข็มในรอบนี้</span>
                  <span className="inline-flex items-center space-x-1 text-[11px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-normal">
                    <Cloud className="w-3 h-3" />
                    <span>Google Drive: {NEEDLE_IMAGE_FOLDER}</span>
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">อัปโหลดตรงลง Google Drive ทันทีที่เลือกรูป โฟลเดอร์: {NEEDLE_IMAGE_FOLDER} และบันทึกลงใน Timeline</p>
              </div>
              <label className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center space-x-1 shadow-xs transition ${
                uploadingImage ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 text-white'
              }`}>
                {uploadingImage ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>กำลังอัปโหลด...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>เลือก/ถ่ายรูป</span>
                    <input type="file" accept="image/*" multiple onChange={handleFileUpload} disabled={uploadingImage} className="hidden" />
                  </>
                )}
              </label>
            </div>

            {/* Uploading indicator or uploaded list */}
            {(uploadedImages.length > 0 || uploadingImage) && (
              <div className="space-y-2 pt-1">
                {uploadedImages.length > 0 && (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>รูปภาพพร้อมบันทึก ({uploadedImages.length} รูป) — กรุณากดปุ่ม <b>"บันทึกการเปลี่ยนแปลง"</b> ด้านล่างเพื่อบันทึกข้อมูลเข้าระบบ</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 group">
                      <NeedleImage src={img.url} alt={img.name || `photo-${idx}`} size="w240" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                        <span className="text-[9px] text-white text-center truncate">{img.name || 'รูปภาพ'}</span>
                      </div>
                      <span className="absolute bottom-0.5 left-0.5 bg-emerald-600/90 text-white rounded px-1 py-0.2 text-[8px] flex items-center space-x-0.5 shadow-xs font-semibold">
                        <Cloud className="w-2.5 h-2.5" />
                        <span>Drive</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-0.5 right-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow cursor-pointer"
                        title="ลบรูปนี้"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {uploadingImage && (
                    <div className="w-16 h-16 rounded-xl bg-sky-50 border-2 border-dashed border-sky-400 flex flex-col items-center justify-center p-1 text-center animate-pulse">
                      <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mb-1" />
                      <span className="text-[8px] font-bold text-sky-700">ส่งเข้า Drive...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || uploadingImage}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition cursor-pointer disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className={`px-5 py-2 text-white rounded-xl font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 ${
                uploadedImages.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300 ring-offset-1 font-bold'
                  : 'bg-sky-600 hover:bg-sky-700'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <span>บันทึกการเปลี่ยนแปลง</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

/**
 * 4. Timeline History Modal
 */
export function TimelineHistoryModal({ isOpen, onClose, currentSet, historyLogs, onViewImage }) {
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">ประวัติ Timeline ชุดเข็ม {currentSet?.setId}</h4>
              <p className="text-xs text-slate-500">{currentSet?.machineId} • {currentSet?.needleModel} ({currentSet?.grade})</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {historyLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-slate-600">ยังไม่มีประวัติการทำรายการเพิ่มเติมสำหรับชุดนี้</p>
              <p className="text-xs text-slate-400 mt-1">ข้อมูลตั้งต้นนำเข้าจากสต็อกระบบเดิม</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-sky-100 ml-3.5 space-y-6">
              {historyLogs.map((log, idx) => {
                const act = log.actionType || ''
                const change = parseInt(log.qtyChange, 10) || 0
                const hasImgs = log.images && log.images.length > 0

                const dotClasses = {
                  in: 'bg-emerald-500 ring-emerald-100',
                  out: 'bg-blue-500 ring-blue-100',
                  adjust: 'bg-amber-500 ring-amber-100',
                  scrap: 'bg-rose-500 ring-rose-100',
                }
                const dotColor = dotClasses[classifyNeedleAction(act)] || 'bg-sky-500 ring-sky-100'

                return (
                  <div key={log.id || log.logId || idx} className="relative pl-6">
                    {/* Timeline dot */}
                    <div className={`absolute -left-2 top-1 w-4 h-4 rounded-full border-2 border-white ring-4 ${dotColor}`}></div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
                      <div className="flex flex-wrap justify-between items-start gap-1">
                        <div>
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">{needleActionLabel(act)}</span>
                          <span className="text-[11px] text-slate-400 ml-2">{log.dateAction || log.createdAt?.split('T')[0]}</span>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                          คงเหลือ: {log.balanceAfter?.toLocaleString() ?? log.quantity} เล่ม
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        {change !== 0 && (
                          <div>
                            <span className="text-slate-400 text-[10px] block">จำนวนที่เปลี่ยน</span>
                            <span className={`font-bold ${change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {change > 0 ? `+${change.toLocaleString()}` : change.toLocaleString()} เล่ม
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-400 text-[10px] block">ผู้ทำรายการ</span>
                          <span className="font-medium text-slate-800">{log.technician || '-'}</span>
                        </div>
                        {log.targetMachine && (
                          <div>
                            <span className="text-slate-400 text-[10px] block">เบิกไปเครื่องจักร</span>
                            <span className="font-semibold text-slate-800">{log.targetMachine}</span>
                          </div>
                        )}
                        {log.scrapReason && (
                          <div className="col-span-2">
                            <span className="text-slate-400 text-[10px] block">สาเหตุตัดทิ้ง</span>
                            <span className="font-medium text-rose-600">{log.scrapReason}</span>
                          </div>
                        )}
                      </div>

                      {log.remarks && (
                        <p className="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                          {log.remarks}
                        </p>
                      )}

                      {hasImgs && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {log.images.map((img, imgIdx) => {
                            const url = extractImageUrl(img)
                            return (
                              <button
                                key={imgIdx}
                                type="button"
                                onClick={() => onViewImage(log.images, `หลักฐาน ${act}`, `${log.dateAction} โดย ${log.technician}`)}
                                className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition cursor-pointer relative"
                              >
                                <NeedleImage src={url} alt="" size="w240" className="w-full h-full object-cover" />
                                {isGoogleDriveUrl(url) && (
                                  <span className="absolute bottom-0.5 right-0.5 bg-blue-600/80 text-white rounded p-0.5" title="Google Drive">
                                    <Cloud className="w-2.5 h-2.5" />
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/**
 * 5. Image Gallery & Pan / Zoom Modal
 */
export function ImageGalleryModal({ isOpen, onClose, images, title, subtitle, activeIndex, setActiveIndex, zoom, setZoom, onOpenUpdate }) {
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const currentImg = images && images.length > 0 ? extractImageUrl(images[activeIndex]) : ''
  const hasPhotos = Boolean(currentImg)

  const handleZoom = (delta) => {
    setZoom(prev => Math.min(3, Math.max(0.5, prev + delta)))
  }

  const resetZoom = () => {
    setZoom(1)
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center text-white">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-sky-400" />
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-semibold">{title}</h4>
                {hasPhotos && isGoogleDriveUrl(currentImg) && (
                  <span className="inline-flex items-center space-x-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                    <Cloud className="w-3 h-3 text-emerald-400" />
                    <span>Google Drive</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>
          {/* Controls */}
          <div className="flex items-center space-x-2">
            {hasPhotos && isGoogleDriveUrl(currentImg) && (
              <a
                href={getFullResolutionImageUrl(currentImg)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition"
                title="เปิดดูไฟล์ต้นฉบับบน Google Drive"
              >
                <Cloud className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">เปิดบน Google Drive</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            )}
            {hasPhotos && (
              <>
                <button
                  type="button"
                  onClick={() => handleZoom(0.25)}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 transition"
                  title="ซูมเข้า"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleZoom(-0.25)}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 transition"
                  title="ซูมออก"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 transition"
                  title="รีเซ็ตขนาด"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-rose-600/80 hover:bg-rose-600 rounded-lg text-white ml-2 transition cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-6 min-h-[380px] bg-slate-950 select-none">
          {hasPhotos ? (
            <NeedleImage
              src={currentImg}
              alt=""
              size="w1600"
              style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease-out' }}
              className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg cursor-grab active:cursor-grabbing"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center max-w-md">
              <div className="w-20 h-20 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center mb-4 text-slate-400 shadow-inner">
                <ImageIcon className="w-10 h-10 text-slate-400" />
              </div>
              <h5 className="text-base font-bold text-slate-100 mb-1.5">ยังไม่มีรูปภาพสำหรับชุดเข็มนี้</h5>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                ชุดเข็มนี้ยังไม่มีรูปถ่ายแนบไว้ในระบบ สามารถถ่ายรูปภาพสภาพเข็มหรือหลักฐานได้ที่เมนู <b>"อัปเดตเกรด/ตรวจสภาพ"</b> หรือเมื่อ <b>"ทำรายการสต็อก"</b>
              </p>
              {onOpenUpdate && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenUpdate()
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-sky-600/25 transition cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>ถ่ายภาพ / เพิ่มรูปผ่านการตรวจสภาพ</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Thumbnail Carousel */}
        {images.length > 1 && (
          <div className="p-3 bg-slate-800 border-t border-slate-700 flex items-center space-x-2 overflow-x-auto">
            {images.map((img, idx) => {
              const url = extractImageUrl(img)
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { setActiveIndex(idx); resetZoom() }}
                  className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition cursor-pointer relative ${
                    activeIndex === idx ? 'border-sky-500 scale-105' : 'border-slate-600 opacity-60 hover:opacity-100'
                  }`}
                >
                  <NeedleImage src={url} alt="" size="w160" className="w-full h-full object-cover" />
                  {isGoogleDriveUrl(url) && (
                    <span className="absolute bottom-0.5 right-0.5 bg-blue-600/80 text-white rounded p-0.5" title="Google Drive">
                      <Cloud className="w-2 h-2" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
