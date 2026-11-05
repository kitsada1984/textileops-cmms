import { AlertTriangle, Binary, CheckCircle2, ChevronDown, ChevronUp, Eye, Layers, Package, RotateCcw, ShoppingCart, Sparkles } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import { VisualSearchCandidates } from './VisualSearchCandidates'
import { VisualHeroCard } from './VisualHeroCard'
import { getDirectImageUrl } from '../../utils/imageUrlUtils'
import { getSparePartImageUrl } from '../../utils/sparePartImage'

// Search results moved verbatim from VisualSparePartSearchModal (props only).
export function VisualSearchResults({ capturedImage, isSearching, searchResult, bestMatch, activeGeminiModel, handleRetake, handleSelectCandidate, heroImgError, setHeroImgError, onViewDetail, onOrderPart, showVectorInspector, setShowVectorInspector }) {
  const otherCandidates = searchResult?.candidates?.slice(1) || []
  return (
    <>
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
              <VisualHeroCard bestMatch={bestMatch} capturedImage={capturedImage} searchResult={searchResult} activeGeminiModel={activeGeminiModel} heroImgError={heroImgError} setHeroImgError={setHeroImgError} onViewDetail={onViewDetail} onOrderPart={onOrderPart} handleSelectCandidate={handleSelectCandidate} />
            ) : null}

            {/* ── ALTERNATIVE CANDIDATES (Top 2 to 5) ────────────── */}
            <VisualSearchCandidates otherCandidates={otherCandidates} handleSelectCandidate={handleSelectCandidate} />

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
    </>
  )
}
