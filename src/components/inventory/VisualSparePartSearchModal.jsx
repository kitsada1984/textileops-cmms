// src/components/inventory/VisualSparePartSearchModal.jsx
// Visual Product Search / Reverse Image Search Modal powered by Image Embedding & Vector Search
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Camera,
  Upload,
  RefreshCw,
  X,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShoppingCart,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Binary,
  Layers,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react'
import Modal from '../ui/Modal'
import StatusBadge from '../ui/StatusBadge'
import { getDirectImageUrl } from '../../utils/imageUrlUtils'
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
        {capturedImage && !isSearching && searchResult && (
          <div className="space-y-4">
            {/* Top Toolbar: Retake button & Status badge */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {searchResult?.aiPowered ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    <Sparkles size={13} className="text-purple-500" />
                    <span>AI Vision วิเคราะห์ตรงกัน ({bestMatch?.percent || 0}%)</span>
                  </span>
                ) : bestMatch && bestMatch.percent >= 60 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={13} />
                    <span>พบอะไหล่ที่เวกเตอร์ตรงกัน ({bestMatch.percent}%)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle size={13} />
                    <span>ความคล้ายคลึงค่อนข้างต่ำ ({bestMatch?.percent || 0}%)</span>
                  </span>
                )}
                {searchResult.qrCode && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 border border-blue-200">
                    QR: {searchResult.qrCode}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleRetake}
                className="btn-outline py-1 px-2.5 text-xs flex items-center gap-1 rounded-lg text-slate-600 dark:text-slate-300"
              >
                <RotateCcw size={13} />
                <span>ถ่ายรูปใหม่</span>
              </button>
            </div>

            {/* ── BEST MATCH HERO CARD ──────────────────────────── */}
            {bestMatch ? (
              <div className="card p-4 rounded-2xl border-2 border-blue-500/40 dark:border-blue-500/30 bg-gradient-to-br from-blue-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Sparkles size={14} />
                    <span>
                      {searchResult?.aiPowered
                        ? `ผลลัพธ์ที่ AI วิเคราะห์ตรงกันมากที่สุด (${searchResult.modelUsed || activeGeminiModel})`
                        : 'ผลลัพธ์ที่เวกเตอร์ใกล้เคียงที่สุด (Nearest Neighbor)'}
                    </span>
                  </span>
                  <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-blue-500 text-white shadow-xs">
                    ความคล้าย {bestMatch.percent}%
                  </span>
                </div>

                {/* Side-by-Side Dual Image Comparison */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Left: Query Image */}
                  <div className="relative rounded-xl overflow-hidden aspect-square max-h-44 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <img
                      src={capturedImage}
                      alt="Your capture"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 inset-x-1 text-center">
                      <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                        รูปถ่ายของคุณ
                      </span>
                    </div>
                  </div>

                  {/* Right: Matched Catalogue Image */}
                  <div className="relative rounded-xl overflow-hidden aspect-square max-h-44 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <img
                      src={getDirectImageUrl(bestMatch.part?.ImageUrl || '', 'w300')}
                      alt={bestMatch.part?.Part_Code}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 inset-x-1 text-center">
                      <span className="text-[10px] font-bold text-white bg-blue-600/80 px-2 py-0.5 rounded-full backdrop-blur-xs">
                        รูปในระบบคลัง
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Vision Insights (When Gemini Active) */}
                {searchResult.aiPowered && (
                  <div className="mb-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                      <Sparkles size={14} className="text-purple-500" />
                      <span>AI วิเคราะห์พบ: {searchResult.identifiedObject}</span>
                    </div>
                    {searchResult.identifiedFeatures && (
                      <div className="text-[11.5px] text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">ลักษณะเด่น: </span>
                        {searchResult.identifiedFeatures}
                      </div>
                    )}
                    {bestMatch.aiReason && (
                      <div className="text-[11.5px] text-purple-900 dark:text-purple-200 bg-white/70 dark:bg-slate-900/60 p-2 rounded-lg border border-purple-200/50 dark:border-purple-800/40">
                        <span className="font-bold text-purple-700 dark:text-purple-300">เหตุผลที่ตรงกัน: </span>
                        {bestMatch.aiReason}
                      </div>
                    )}
                  </div>
                )}

                {/* Spare Part Information Details */}
                <div className="bg-white/80 dark:bg-slate-850/80 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 mb-4 backdrop-blur-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md">
                        {bestMatch.part?.Part_Code}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {bestMatch.part?.Part_Name_EN || bestMatch.part?.Part_Name_TH || '—'}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                      {bestMatch.part?.Category || 'อะไหล่'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">คงเหลือ</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {Number(bestMatch.part?.Stock_Qty || 0).toLocaleString()} {bestMatch.part?.Unit || 'ชิ้น'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">สถานะสต๊อก</span>
                      <StatusBadge value={bestMatch.part?.Status || 'IN_STOCK'} />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">คลัง/ที่เก็บ</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {bestMatch.part?.Location_Store || 'Store'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">ราคาต่อหน่วย</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ฿{Number(bestMatch.part?.Unit_Price || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectCandidate(bestMatch)}
                    className="btn-primary flex-1 py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl shadow-xs"
                  >
                    <CheckCircle2 size={14} />
                    <span>กรองแสดงอะไหล่นี้ในตาราง</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onViewDetail?.(bestMatch.part)}
                    className="btn-outline py-2 px-3 text-xs font-semibold flex items-center gap-1 rounded-xl text-slate-700 dark:text-slate-300 hover:text-blue-600"
                    title="ดูสเปกและรายละเอียดทั้งหมด"
                  >
                    <Eye size={14} />
                    <span>ดูรายละเอียด</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOrderPart?.(bestMatch.part)}
                    className="btn-outline py-2 px-3 text-xs font-semibold flex items-center gap-1 rounded-xl text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50"
                    title="เปิดใบขอซื้ออะไหล่นี้ทันที"
                  >
                    <ShoppingCart size={14} />
                    <span>ขอซื้อ (PR)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800">
                <AlertTriangle size={32} className="mx-auto text-amber-500 mb-2 opacity-80" />
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">
                  ไม่พบอะไหล่ที่มีความคล้ายคลึงเกินเกณฑ์
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  รูปภาพที่ถ่ายอาจมีแสงสะท้อนหรือมุมเอียงเกินไป แนะนำให้วางอะไหล่บนพื้นเรียบ ปรับแสงสว่าง แล้วกดถ่ายใหม่อีกครั้ง
                </p>
              </div>
            )}

            {/* ── ALTERNATIVE CANDIDATES (Top 2 to 5) ────────────── */}
            {otherCandidates.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Layers size={13} />
                  <span>รายการอื่นที่ลักษณะใกล้เคียง (Alternative Candidates)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {otherCandidates.map((candidate, idx) => (
                    <div
                      key={candidate.id || idx}
                      onClick={() => handleSelectCandidate(candidate)}
                      className="card p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/20 cursor-pointer transition-all flex items-center gap-3 group"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                        <img
                          src={getDirectImageUrl(candidate.part?.ImageUrl || '', 'w100')}
                          alt={candidate.part?.Part_Code}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                            {candidate.part?.Part_Code}
                          </span>
                          <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {candidate.percent}%
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {candidate.part?.Part_Name_EN || candidate.part?.Part_Name_TH}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          สต๊อก: {Number(candidate.part?.Stock_Qty || 0).toLocaleString()} | {candidate.part?.Location_Store || 'Store'}
                        </p>
                        {candidate.aiReason && (
                          <p className="text-[10px] text-purple-600 dark:text-purple-400 truncate">
                            {candidate.aiReason}
                          </p>
                        )}
                      </div>
                      <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TECHNICAL VECTOR INSPECTOR (Collapsible) ────────── */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowVectorInspector((prev) => !prev)}
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Binary size={14} className="text-blue-500" />
                  <span>ข้อมูลทางเทคนิคของเวกเตอร์ (Vector Inspector & Latency)</span>
                </span>
                {showVectorInspector ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showVectorInspector && (
                <div className="p-3 bg-slate-900 text-slate-300 font-mono text-[11px] space-y-2 border-t border-slate-800">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-slate-500 block">Vector Dimensions:</span>
                      <span className="text-emerald-400 font-bold">128-D (L2 Unit Norm)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Search Algorithm:</span>
                      <span className="text-blue-400 font-bold">Cosine Dot Product</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Search Latency:</span>
                      <span className="text-amber-400 font-bold">{searchResult.latencyMs} ms</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Cache Status:</span>
                      <span className="text-purple-400 font-bold">
                        {searchResult.fromCacheCount ?? searchResult.totalScanned} / {searchResult.totalScanned} Cached
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1">
                      Query Vector Preview (First 8 of 128 components):
                    </span>
                    <div className="p-2 rounded bg-black/40 text-slate-400 overflow-x-auto">
                      [{searchResult.queryVector?.slice(0, 8).map((v) => Number(v).toFixed(4)).join(', ')}, ...]
                    </div>
                  </div>

                  {bestMatch && (
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                      <span>Nearest Neighbor: {bestMatch.part?.Part_Code}</span>
                      <span>Raw Cosine Similarity: {Number(bestMatch.similarity).toFixed(6)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
