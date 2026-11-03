import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  CheckCircle2, ArrowDownLeft, ArrowUpRight, SlidersHorizontal, Trash2,
  X, ArrowLeftRight, Camera, Upload, Check, Cloud, Image as ImageIcon,
} from 'lucide-react'
import { useToast } from '../../components/ui/Toast'
import { NeedleSetAPI, NeedleHistoryAPI } from '../../api/entities'
import { uploadMedia } from '../../modules/media/mediaUploader'
import { formatNeedleStockFileName } from '../../utils/needleStockUtils'
import { extractImageUrl, getImageFallbackUrls, getDirectImageUrl } from '../../utils/imageUrlUtils'

export const NEEDLE_IMAGE_FOLDER = 'Stock-เข็ม'

/**
 * Resilient image renderer for needle stock cards, tables, logs, and previews.
 * Handles Google Drive hotlink referrer blocking (403), fallback multi-tier URLs, and placeholder.
 */
export function NeedleImage({ src, alt = '', className = '', style, size = 'w600', onClick, title, fallbackSrcs }) {
  const resolvedUrl = extractImageUrl(src)
  // รูปสำรอง: ถ้ารูปแรกโหลดไม่ได้ (ไฟล์ถูกลบ/ยังไม่ถูกแชร์) ให้ลองรูปถัดไปในลิสต์
  const extraSources = useMemo(
    () => (Array.isArray(fallbackSrcs) ? fallbackSrcs.map(extractImageUrl).filter(Boolean) : []),
    [fallbackSrcs]
  )
  const sources = useMemo(() => [resolvedUrl, ...extraSources].filter(Boolean), [resolvedUrl, extraSources])

  const [srcIndex, setSrcIndex] = useState(0)
  const [fallbackIndex, setFallbackIndex] = useState(0)
  const [hasError, setHasError] = useState(false)

  const activeUrl = sources[srcIndex] || ''
  const fallbacks = useMemo(() => getImageFallbackUrls(activeUrl, size), [activeUrl, size])
  const currentSrc = fallbacks[fallbackIndex] || getDirectImageUrl(activeUrl, size)

  useEffect(() => {
    setSrcIndex(0)
    setFallbackIndex(0)
    setHasError(false)
  }, [resolvedUrl, size])

  const handleImageError = () => {
    if (fallbackIndex < fallbacks.length - 1) {
      setFallbackIndex((prev) => prev + 1)
    } else if (srcIndex < sources.length - 1) {
      // ทุกรูปแบบ URL ของรูปนี้ใช้ไม่ได้ → ลองรูปถัดไป
      setSrcIndex((prev) => prev + 1)
      setFallbackIndex(0)
    } else {
      setHasError(true)
    }
  }

  if (hasError || !activeUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`}
        onClick={onClick}
        title={title}
      >
        <ImageIcon className="w-5 h-5 opacity-60" />
      </div>
    )
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      title={title}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={handleImageError}
      className={className}
      style={style}
      onClick={onClick}
      loading="lazy"
    />
  )
}

/* =========================================================================
   SUB-MODALS IMPLEMENTATION
   ========================================================================= */

/**
 * 1. Stock Transaction Modal (IN, OUT, ADJUST, SCRAP)
 */
export function StockTransactionModal({ isOpen, onClose: onCloseProp, currentSet, needleSets, comboboxStore, onLearnValues, onSuccess }) {
  const toast = useToast()
  const [selectedSetId, setSelectedSetId] = useState(currentSet?.setId || needleSets[0]?.setId || '')
  const [movementType, setMovementType] = useState('OUT') // 'IN' | 'OUT' | 'ADJUST' | 'SCRAP'
  const [quantity, setQuantity] = useState('')
  const [isDirectCount, setIsDirectCount] = useState(false)
  const [targetMachine, setTargetMachine] = useState(currentSet?.machineId || '')
  const [shiftPurpose, setShiftPurpose] = useState('กะเช้า (งานประจำ)')
  const [sourceFrom, setSourceFrom] = useState('สั่งซื้อของใหม่ (PO)')
  const [adjustReason, setAdjustReason] = useState('ตรวจนับสต็อกประจำเดือน (ยอดจริงไม่ตรง)')
  const [scrapReason, setScrapReason] = useState('เข็มหัก (ลิ้นเข็ม/ตัวเข็มหัก)')
  const [stockDetail, setStockDetail] = useState('PM')
  const [technician, setTechnician] = useState('tuk')
  const [dateAction, setDateAction] = useState(new Date().toISOString().split('T')[0])
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

  const activeSet = useMemo(() => {
    return needleSets.find(s => s.setId === selectedSetId) || currentSet
  }, [needleSets, selectedSetId, currentSet])

  useEffect(() => {
    if (activeSet) {
      if (!targetMachine) setTargetMachine(activeSet.machineId || '')
    }
  }, [activeSet])

  const currentQty = parseInt(activeSet?.quantity, 10) || 0
  const inputQtyNum = parseInt(quantity, 10)

  // Realtime calculation
  let newBalance = currentQty
  let diffText = ''
  let isError = false

  if (!isNaN(inputQtyNum) && inputQtyNum >= 0) {
    if (movementType === 'IN') {
      newBalance = currentQty + inputQtyNum
      diffText = `+${inputQtyNum.toLocaleString()}`
    } else if (movementType === 'OUT') {
      if (inputQtyNum > currentQty) {
        isError = true
        diffText = `สต็อกไม่พอเบิก (ขาด ${(inputQtyNum - currentQty).toLocaleString()})`
      } else {
        newBalance = currentQty - inputQtyNum
        diffText = `-${inputQtyNum.toLocaleString()}`
      }
    } else if (movementType === 'ADJUST') {
      if (isDirectCount) {
        newBalance = inputQtyNum
        const diff = newBalance - currentQty
        diffText = diff >= 0 ? `ผลต่าง: +${diff.toLocaleString()}` : `ผลต่าง: ${diff.toLocaleString()}`
      } else {
        if (inputQtyNum > currentQty) {
          isError = true
          diffText = 'ยอดตัดเกินสต็อกคงเหลือ'
        } else {
          newBalance = currentQty - inputQtyNum
          diffText = `-${inputQtyNum.toLocaleString()}`
        }
      }
    } else if (movementType === 'SCRAP') {
      if (inputQtyNum > currentQty) {
        isError = true
        diffText = 'ยอดตัดทิ้งเกินสต็อกคงเหลือ'
      } else {
        newBalance = currentQty - inputQtyNum
        diffText = `-${inputQtyNum.toLocaleString()}`
      }
    }
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (e.target) e.target.value = ''
    if (files.length === 0) return

    setUploadingImage(true)
    let successCount = 0
    try {
      for (const file of files) {
        const customFileName = formatNeedleStockFileName(activeSet?.setId, movementType, file.name)
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
        toast.success('อัปโหลดรูปขึ้น Google Drive สำเร็จ', 'อย่าลืมกดปุ่ม "ยืนยันทำรายการ" ด้านล่างเพื่อบันทึกข้อมูลเข้าระบบ')
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
    if (!activeSet) return
    if (isNaN(inputQtyNum) || inputQtyNum < 0) {
      alert('กรุณากรอกจำนวนให้ถูกต้อง')
      return
    }
    if ((movementType === 'OUT' || movementType === 'SCRAP') && inputQtyNum <= 0) {
      alert('จำนวนต้องมากกว่า 0')
      return
    }
    if (isError) {
      alert('ยอดที่ระบุไม่ถูกต้อง ไม่สามารถทำรายการได้')
      return
    }
    if (!technician.trim()) {
      alert('กรุณาระบุชื่อช่างผู้ทำรายการ')
      return
    }

    try {
      setSubmitting(true)
      onLearnValues({ targetMachine, technician, stockDetail })

      let actionLabel = ''
      let qtyChange = 0
      if (movementType === 'IN') {
        actionLabel = 'รับเข้า (Stock In)'
        qtyChange = inputQtyNum
      } else if (movementType === 'OUT') {
        actionLabel = 'เบิกออก (Stock Out)'
        qtyChange = -inputQtyNum
      } else if (movementType === 'ADJUST') {
        actionLabel = 'ตัดยอด (Adjustment)'
        qtyChange = isDirectCount ? (newBalance - currentQty) : -inputQtyNum
      } else if (movementType === 'SCRAP') {
        actionLabel = 'ตัดทิ้ง (Scrap)'
        qtyChange = -inputQtyNum
      }

      // Merge newly uploaded images into activeSet.images so the card and gallery show them immediately!
      const mergedImages = [...(activeSet.images || []), ...uploadedImages]

      const updatedSetData = {
        ...activeSet,
        quantity: Math.max(0, newBalance),
        status: newBalance === 0 ? 'หมดสต็อก' : newBalance <= 100 ? 'สต็อกเหลือน้อย' : 'พร้อมใช้งาน',
        images: mergedImages,
      }

      const newLogData = {
        id: `LOG-${Date.now()}`,
        logId: `LOG-${Date.now()}`,
        setId: activeSet.setId,
        actionType: actionLabel,
        movementType,
        oldGrade: activeSet.grade,
        newGrade: activeSet.grade,
        conditionDetail: activeSet.conditionDetail,
        quantity: Math.max(0, newBalance),
        qtyChange,
        balanceAfter: Math.max(0, newBalance),
        dateAction,
        technician: technician.trim(),
        targetMachine: movementType === 'OUT' ? targetMachine.trim() : '',
        sourceFrom: movementType === 'IN' ? sourceFrom : '',
        scrapReason: movementType === 'SCRAP' ? scrapReason : (movementType === 'ADJUST' ? adjustReason : ''),
        stockDetail: stockDetail.trim(),
        remarks: remarks.trim(),
        images: uploadedImages,
        createdAt: new Date().toISOString(),
      }

      // Persist to API
      await Promise.all([
        NeedleSetAPI.update(activeSet.id || activeSet.setId, updatedSetData),
        NeedleHistoryAPI.create(newLogData),
      ])

      try {
        if (typeof onSuccess === 'function') {
          onSuccess(updatedSetData, newLogData)
        }
      } catch (cbErr) {
        console.warn('onSuccess callback warning:', cbErr)
        onClose()
      }
    } catch (err) {
      console.error('Stock transaction failed:', err)
      alert('บันทึกรายการสต็อกไม่สำเร็จ: ' + err.message)
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
        <div className={`px-5 py-4 text-white flex justify-between items-center transition-colors duration-200 ${
          movementType === 'IN' ? 'bg-emerald-900' :
          movementType === 'OUT' ? 'bg-slate-900' :
          movementType === 'ADJUST' ? 'bg-amber-950' : 'bg-rose-950'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-base font-bold">
                {movementType === 'IN' ? 'รับเข้าสต็อกเข็ม (Stock In)' :
                 movementType === 'OUT' ? 'เบิกออกสต็อกเข็ม (Stock Out)' :
                 movementType === 'ADJUST' ? 'ตัดยอด / ปรับปรุงสต็อก (Adjustment)' : 'ตัดทิ้ง / ปลดระวาง (Scrap)'}
              </h4>
              <p className="text-xs text-slate-300">
                {movementType === 'IN' ? 'บันทึกการรับเข็มใหม่หรือรับคืนจากเครื่องเข้าสู่คลัง' :
                 movementType === 'OUT' ? 'บันทึกการเบิกเข็มไปใช้งานตามเครื่องจักรและกะทำงาน' :
                 movementType === 'ADJUST' ? 'บันทึกผลการตรวจนับจริง หรือปรับปรุงยอดสูญหาย' : 'บันทึกเข็มชำรุด หัก งอ สึกหรอ เพื่อตัดออกจากระบบ'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Set Selector & Stock callout */}
        <div className="px-5 pt-4 pb-2 bg-slate-50/80 border-b border-slate-200 space-y-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">เลือกชุดเข็มที่ต้องการทำรายการ *</label>
            <select
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {needleSets.map(s => (
                <option key={s.setId} value={s.setId}>
                  {s.setId} - {s.machineId || 'ไม่ระบุ MC'} ({s.needleModel}) [คงเหลือ: {s.quantity} เล่ม]
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">ชุดเข็มที่เลือก</span>
              <span className="font-bold text-slate-800 text-xs sm:text-sm font-mono">{activeSet?.setId}</span>
              <span className="text-xs text-slate-500 ml-1.5">{activeSet?.machineId} • {activeSet?.machineType} {activeSet?.gauge} ({activeSet?.grade})</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">ยอดคงเหลือปัจจุบัน</span>
              <span className="text-base sm:text-lg font-black text-sky-700">{currentQty.toLocaleString()}</span>
              <span className="text-xs text-slate-500 ml-0.5">เล่ม</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {/* Segmented Control for Movement Type */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">เลือกประเภทการทำรายการ *</label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMovementType('IN')}
                className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer ${
                  movementType === 'IN' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>รับเข้า</span>
              </button>
              <button
                type="button"
                onClick={() => setMovementType('OUT')}
                className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer ${
                  movementType === 'OUT' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                <span>เบิกออก</span>
              </button>
              <button
                type="button"
                onClick={() => setMovementType('ADJUST')}
                className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer ${
                  movementType === 'ADJUST' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                <span>ตัดยอด</span>
              </button>
              <button
                type="button"
                onClick={() => setMovementType('SCRAP')}
                className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer ${
                  movementType === 'SCRAP' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>ตัดทิ้ง</span>
              </button>
            </div>
          </div>

          {/* Quantity Input & Chips */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700">
                {movementType === 'IN' ? 'จำนวนที่ต้องการรับเข้า (เล่ม) *' :
                 movementType === 'OUT' ? 'จำนวนที่ต้องการเบิก (เล่ม) *' :
                 movementType === 'ADJUST' ? (isDirectCount ? 'ยอดตรวจนับได้จริง (เล่ม) *' : 'จำนวนที่ต้องการปรับลด (เล่ม) *') :
                 'จำนวนที่ต้องการตัดทิ้ง (เล่ม) *'}
              </label>
              <div className="flex items-center space-x-1 text-[11px]">
                <button type="button" onClick={() => setQuantity(50)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium cursor-pointer">50</button>
                <button type="button" onClick={() => setQuantity(100)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium cursor-pointer">100</button>
                <button type="button" onClick={() => setQuantity(500)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium cursor-pointer">500</button>
                <button type="button" onClick={() => setQuantity(currentQty)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium cursor-pointer">ทั้งหมด</button>
              </div>
            </div>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              min="0"
              placeholder="กรอกจำนวน เช่น 100"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
            />
          </div>

          {/* ADJUST Direct Count Toggle */}
          {movementType === 'ADJUST' && (
            <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between">
              <span className="text-xs text-amber-900 font-medium">ต้องการกรอกเป็น "ยอดที่ตรวจนับได้จริง" ใช่หรือไม่?</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDirectCount}
                  onChange={(e) => setIsDirectCount(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          )}

          {/* Realtime Calculation Preview Box */}
          <div className={`p-3 rounded-xl border text-xs transition-all ${
            isError ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-slate-600">
              <span>ยอดเดิม: <strong className="text-slate-800 font-bold">{currentQty.toLocaleString()}</strong></span>
              <span className={`font-bold ${isError ? 'text-rose-600' : 'text-slate-600'}`}>
                {diffText || 'รอระบุจำนวน'}
              </span>
              <span>คงเหลือใหม่: <strong className="text-slate-800 font-bold">{Math.max(0, newBalance).toLocaleString()}</strong> เล่ม</span>
            </div>
          </div>

          {/* Type-Specific Fields */}
          {movementType === 'OUT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">เบิกไปใส่เครื่องจักร (Machine ID) *</label>
                <input
                  type="text"
                  value={targetMachine}
                  onChange={(e) => setTargetMachine(e.target.value)}
                  placeholder="พิมพ์หรือเลือกเบอร์เครื่อง"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">กะ / วัตถุประสงค์การเบิก</label>
                <select
                  value={shiftPurpose}
                  onChange={(e) => setShiftPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="กะเช้า (งานประจำ)">กะเช้า (งานประจำ)</option>
                  <option value="กะดึก (งานประจำ)">กะดึก (งานประจำ)</option>
                  <option value="เปลี่ยนรอบผลิต (Order ใหม่)">เปลี่ยนรอบผลิต (Order ใหม่)</option>
                  <option value="เปลี่ยนแทนเข็มชำรุด">เปลี่ยนแทนเข็มชำรุด</option>
                  <option value="ทดสอบเครื่องจักร">ทดสอบเครื่องจักร</option>
                </select>
              </div>
            </div>
          )}

          {movementType === 'IN' && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">แหล่งที่มาของเข็มที่รับเข้า *</label>
              <select
                value={sourceFrom}
                onChange={(e) => setSourceFrom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="สั่งซื้อของใหม่ (PO)">สั่งซื้อของใหม่ (PO)</option>
                <option value="รับคืนจากเครื่องจักร">รับคืนจากเครื่องจักร (ถอดออก)</option>
                <option value="รับจากการคัดเกรด">รับจากการคัดเกรดเสร็จสิ้น</option>
                <option value="โอนย้ายจากคลังกลาง">โอนย้ายจากคลังกลาง</option>
              </select>
            </div>
          )}

          {movementType === 'ADJUST' && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">สาเหตุการปรับยอด / ตัดยอด *</label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="ตรวจนับสต็อกประจำเดือน (ยอดจริงไม่ตรง)">ตรวจนับสต็อกประจำเดือน (ยอดจริงไม่ตรง)</option>
                <option value="ตัดยอดเข็มสูญหาย">ตัดยอดเข็มสูญหาย</option>
                <option value="ปรับปรุงยอดตามรายการบัญชี">ปรับปรุงยอดตามรายการบัญชี</option>
                <option value="แก้ไขยอดที่บันทึกผิดพลาดก่อนหน้า">แก้ไขยอดที่บันทึกผิดพลาดก่อนหน้า</option>
              </select>
            </div>
          )}

          {movementType === 'SCRAP' && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">สาเหตุการตัดทิ้ง / ปลดระวาง *</label>
              <select
                value={scrapReason}
                onChange={(e) => setScrapReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="เข็มหัก (ลิ้นเข็ม/ตัวเข็มหัก)">เข็มหัก (ลิ้นเข็ม/ตัวเข็มหัก)</option>
                <option value="เข็มงอ/บิดตัวผิดรูป">เข็มงอ/บิดตัวผิดรูป</option>
                <option value="สึกหรอเกินเกณฑ์ใช้งาน">สึกหรอเกินเกณฑ์ใช้งาน</option>
                <option value="สนิมเกาะผิวเข็ม">สนิมเกาะผิวเข็ม</option>
                <option value="ตกร่อง/ลิ้นเข็มไม่ดีดกลับ">ตกร่อง/ลิ้นเข็มไม่ดีดกลับ</option>
                <option value="สปริงหลุด/ชำรุด">สปริงหลุด/ชำรุด</option>
              </select>
            </div>
          )}

          {/* Common Fields: Detail (PM/SPARE) & Technician */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-slate-700">รายละเอียด *</label>
                <div className="flex items-center space-x-1 text-[11px]">
                  <button type="button" onClick={() => setStockDetail('PM')} className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-semibold cursor-pointer border border-indigo-200/60 transition">PM</button>
                  <button type="button" onClick={() => setStockDetail('SPARE')} className="px-2 py-0.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-md font-semibold cursor-pointer border border-cyan-200/60 transition">SPARE</button>
                </div>
              </div>
              <input
                type="text"
                value={stockDetail}
                onChange={(e) => setStockDetail(e.target.value)}
                placeholder="เลือก 'PM', 'SPARE' หรือกรอกเอง"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition font-medium text-slate-800"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Common Fields: Date & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">วันที่ทำรายการ</label>
              <input
                type="date"
                value={dateAction}
                onChange={(e) => setDateAction(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Photos Upload Section */}
          <div className="border border-dashed border-sky-300 rounded-2xl p-3.5 bg-sky-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-sky-600" />
                  <span>แนบรูปถ่ายหลักฐาน (ถ้ามี)</span>
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
                    <span>เลือกรูป</span>
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
                    <span>รูปภาพพร้อมบันทึก ({uploadedImages.length} รูป) — กรุณากดปุ่ม <b>"ยืนยันทำรายการ"</b> ด้านล่างเพื่อบันทึกข้อมูลเข้าระบบ</span>
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

          {/* Footer Submit Buttons */}
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
              disabled={submitting || isError || uploadingImage}
              className={`px-5 py-2 text-white rounded-xl font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 ${
                uploadedImages.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300 ring-offset-1 font-bold'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>ยืนยันทำรายการ</span>
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
