// src/components/inventory/VisualSparePartSearchModal.jsx
// Visual Product Search / Reverse Image Search Modal powered by Image Embedding & Vector Search
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Camera,
  Upload,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Layers,
  ChevronDown,
  ChevronUp,
  Zap,
  Package,
} from 'lucide-react'
import Modal from '../ui/Modal'
import StatusBadge from '../ui/StatusBadge'
import { getDirectImageUrl } from '../../utils/imageUrlUtils'
import { getSparePartImageUrl } from '../../utils/sparePartImage'
import { VisualSearchResults } from './VisualSearchResults'
import {
  searchSimilarSparePartsByImage,
  getVectorCacheStats,
  prewarmSparePartEmbeddings,
} from '../../utils/imageSearch'
import {
  isGeminiConfigured,
  getGeminiConfig,
  DEFAULT_GEMINI_MODEL,
} from '../../utils/geminiVision'

export default function VisualSparePartSearchModal({
  isOpen,
  onClose,
  spareParts = [],
  onSelectPart,
  onViewDetail,
  onOrderPart,
}) {
  const [mode, setMode] = useState('camera') // 'camera' | 'upload'
  const [capturedImage, setCapturedImage] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraFacing, setCameraFacing] = useState('environment') // 'environment' (back) | 'user' (front)
  const [showVectorInspector, setShowVectorInspector] = useState(false)
  const [cacheStats, setCacheStats] = useState({ cached: 0, total: 0, isReady: false })
  const [geminiReady, setGeminiReady] = useState(() => isGeminiConfigured())
  const [activeGeminiModel, setActiveGeminiModel] = useState(DEFAULT_GEMINI_MODEL)
  const [heroImgError, setHeroImgError] = useState(false)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  // ─── Preload Gemini Configuration from D1 / cache on Modal Open ────
  useEffect(() => {
    if (isOpen) {
      getGeminiConfig()
        .then((cfg) => {
          const ready = Boolean(cfg?.apiKey && cfg?.isEnabled !== false)
          setGeminiReady(ready)
          if (cfg?.model) setActiveGeminiModel(cfg.model)
        })
        .catch(() => {})
    }
  }, [isOpen])

  // ─── Background Pre-Warming on Modal Open ──────────────────
  useEffect(() => {
    if (isOpen && spareParts && spareParts.length > 0) {
      const stats = getVectorCacheStats(spareParts)
      setCacheStats(stats)
      if (!stats.isReady) {
        prewarmSparePartEmbeddings(spareParts, {
          concurrency: 6,
          timeoutMs: 2500,
          onProgress: ({ ready, total }) => {
            setCacheStats({ cached: ready, total, isReady: ready >= total })
          },
        }).then((res) => {
          setCacheStats({ cached: res.readyCount, total: res.total, isReady: true })
        }).catch(() => {})
      }
    }
  }, [isOpen, spareParts])

  // ─── Camera Management ─────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }, [])

  const startCamera = useCallback(async (facing = cameraFacing) => {
    stopCamera()
    setErrorMsg('')
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องโดยตรง กรุณาใช้โหมดเลือกไฟล์ภาพแทน')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCameraActive(true)
    } catch (err) {
      console.warn('Camera access warning:', err)
      setErrorMsg(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'ไม่ได้รับสิทธิ์เข้าถึงกล้อง กรุณากดยอมรับการเปิดกล้อง หรือใช้โหมดอัปโหลดไฟล์ภาพแทน'
          : err.message || 'ไม่สามารถเปิดกล้องได้ กรุณาใช้โหมดอัปโหลดไฟล์ภาพแทน'
      )
      setMode('upload')
    }
  }, [cameraFacing, stopCamera])

  // Manage camera lifecycle when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen && mode === 'camera' && !capturedImage) {
      startCamera(cameraFacing)
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen, mode, capturedImage, cameraFacing, startCamera, stopCamera])

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      stopCamera()
      setCapturedImage(null)
      setSearchResult(null)
      setErrorMsg('')
      setIsSearching(false)
      setShowVectorInspector(false)
      setHeroImgError(false)
    }
  }, [isOpen, stopCamera])

  const switchCameraFacing = () => {
    const next = cameraFacing === 'environment' ? 'user' : 'environment'
    setCameraFacing(next)
    startCamera(next)
  }

  // ─── Capture & Image Search ────────────────────────────────

  const runVectorSearch = async (imageSource) => {
    setIsSearching(true)
    setErrorMsg('')
    setSearchResult(null)
    setHeroImgError(false)
    try {
      const results = await searchSimilarSparePartsByImage(imageSource, spareParts, {
        topK: 5,
        minSimilarity: 0.25,
      })
      setSearchResult(results)
    } catch (err) {
      console.error('Vector search error:', err)
      setErrorMsg(`เกิดข้อผิดพลาดในการประมวลผลเวกเตอร์: ${err.message || 'ไม่สามารถวิเคราะห์ภาพได้'}`)
    } finally {
      setIsSearching(false)
    }
  }

  const handleCapturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)

    stopCamera()
    setCapturedImage(dataUrl)
    runVectorSearch(dataUrl)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result
      if (dataUrl) {
        setCapturedImage(dataUrl)
        runVectorSearch(dataUrl)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setSearchResult(null)
    setErrorMsg('')
    setHeroImgError(false)
    if (mode === 'camera') {
      startCamera(cameraFacing)
    }
  }

  const handleSelectCandidate = (candidate) => {
    if (!candidate?.part) return
    onSelectPart?.(candidate.part)
  }

  const bestMatch = searchResult?.bestMatch
  const otherCandidates = searchResult?.candidates?.slice(1) || []

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Camera size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
              <span>ค้นหาอะไหล่ด้วยภาพ (Visual Reverse Image Search)</span>
              {searchResult?.aiPowered ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-500" />
                  <span>AI Vision ({searchResult.modelUsed || activeGeminiModel})</span>
                </span>
              ) : geminiReady ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                  <Sparkles size={10} className="text-purple-500" />
                  <span>AI Vision พร้อม ({activeGeminiModel})</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                  Vector Search 128-D
                </span>
              )}
              {cacheStats.total > 0 && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                  cacheStats.isReady
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-700 animate-pulse'
                }`}>
                  <Zap size={10} className={cacheStats.isReady ? 'text-emerald-500' : 'text-amber-500'} />
                  {cacheStats.isReady
                    ? `แคชพร้อม (${cacheStats.cached}/${cacheStats.total})`
                    : `เตรียมแคช (${cacheStats.cached}/${cacheStats.total})...`}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ถ่ายรูปหรืออัปโหลดภาพอะไหล่ เพื่อค้นหาเวกเตอร์ที่มีลักษณะใกล้เคียงที่สุดในคลัง
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* ── ERROR MESSAGE BANNER ────────────────────────────── */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── MODE TABS (When not yet captured) ───────────────── */}
        {!capturedImage && (
          <div className="flex items-center justify-center p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => {
                setMode('camera')
                setErrorMsg('')
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mode === 'camera'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Camera size={14} />
              <span>เปิดกล้องถ่ายสด</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('upload')
                stopCamera()
                setErrorMsg('')
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mode === 'upload'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Upload size={14} />
              <span>เลือกไฟล์รูปภาพ</span>
            </button>
          </div>
        )}

        {/* ── STAGE 1: LIVE CAMERA VIEW ───────────────────────── */}
        {!capturedImage && mode === 'camera' && (
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video sm:aspect-[4/3] max-h-[360px] flex items-center justify-center border border-slate-700 shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Target Viewfinder Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-white/60 border-dashed rounded-2xl relative shadow-2xl">
                {/* 4 Corner Brackets */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                <div className="absolute inset-x-0 bottom-2 text-center">
                  <span className="text-[11px] font-medium text-white/90 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                    วางอะไหล่ให้อยู่ในกรอบ
                  </span>
                </div>
              </div>
            </div>

            {/* Camera Floating Controls */}
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={switchCameraFacing}
                className="p-3 rounded-full bg-black/50 text-white hover:bg-black/75 transition-all backdrop-blur-xs border border-white/20 shadow-lg"
                title="สลับกล้องหน้า/หลัง"
                aria-label="สลับกล้องหน้า/หลัง"
              >
                <RotateCcw size={18} />
              </button>

              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={!cameraActive}
                className="w-16 h-16 rounded-full bg-white text-blue-600 hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center border-4 border-blue-500/30 font-bold disabled:opacity-50"
                title="กดถ่ายรูปเพื่อค้นหา"
                aria-label="กดถ่ายรูปเพื่อค้นหา"
              >
                <div className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white">
                  <Camera size={22} />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── STAGE 1: FILE UPLOAD DROPZONE ───────────────────── */}
        {!capturedImage && mode === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 sm:p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-all group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload size={28} />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200 mb-1">
              คลิกเพื่อเลือกไฟล์รูปถ่าย หรือลากรูปมาวางที่นี่
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              รองรับไฟล์รูปภาพ JPG, PNG, WEBP, HEIC จากโทรศัพท์มือถือหรือคอมพิวเตอร์
            </p>
          </div>
        )}

        {/* ── STAGE 2: SEARCHING & SCANNING ANIMATION ─────────── */}
        {capturedImage && isSearching && (
          <div className="py-12 text-center space-y-4">
            <div className="relative w-28 h-28 mx-auto rounded-2xl overflow-hidden shadow-lg border-2 border-blue-500">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover filter brightness-90"
              />
              <div className="absolute inset-0 bg-blue-500/20 animate-pulse flex items-center justify-center">
                <RefreshCw size={28} className="animate-spin text-white drop-shadow-md" />
              </div>
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1.5">
                <Sparkles size={16} className="text-amber-500 animate-spin" />
                <span>
                  {geminiReady
                    ? `กำลังให้ AI Vision (${activeGeminiModel}) วิเคราะห์ประเภทอะไหล่และจับคู่สินค้า...`
                    : 'กำลังวิเคราะห์ลักษณะทางสายตาและค้นหาเวกเตอร์ (Vector Search)...'}
                </span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                สร้าง 128-D Image Embedding และคำนวณ Cosine Similarity เทียบกับอะไหล่ในคลัง
              </p>
            </div>
          </div>
        )}

        {/* ── STAGE 3: RESULTS DISPLAY (Similarity Matching) ──── */}
        <VisualSearchResults capturedImage={capturedImage} isSearching={isSearching} searchResult={searchResult} bestMatch={bestMatch} activeGeminiModel={activeGeminiModel} handleRetake={handleRetake} handleSelectCandidate={handleSelectCandidate} heroImgError={heroImgError} setHeroImgError={setHeroImgError} onViewDetail={onViewDetail} onOrderPart={onOrderPart} showVectorInspector={showVectorInspector} setShowVectorInspector={setShowVectorInspector} />
      </div>
    </Modal>
  )
}
