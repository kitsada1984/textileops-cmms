import { AlertTriangle, CheckCircle2, Eye, Package, ShoppingCart, Sparkles } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import { getDirectImageUrl } from '../../utils/imageUrlUtils'
import { getSparePartImageUrl } from '../../utils/sparePartImage'

// Best-match hero card moved verbatim from VisualSearchResults (props only).
export function VisualHeroCard({ bestMatch, capturedImage, searchResult, activeGeminiModel, heroImgError, setHeroImgError, onViewDetail, onOrderPart, handleSelectCandidate }) {
  return (
    <>
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
                  <div className="relative rounded-xl overflow-hidden aspect-square max-h-44 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    {(() => {
                      const matchedRawUrl = getSparePartImageUrl(bestMatch.part)
                      const matchedDirectUrl = getDirectImageUrl(matchedRawUrl, 'w400')
                      return matchedDirectUrl && !heroImgError ? (
                        <img
                          src={matchedDirectUrl}
                          alt={bestMatch.part?.Part_Code}
                          className="w-full h-full object-cover"
                          onError={() => setHeroImgError(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-slate-100 dark:bg-slate-800 text-slate-400">
                          <Package size={36} className="opacity-40 mb-1.5" />
                          <span className="font-mono font-bold text-xs text-slate-600 dark:text-slate-300">
                            {bestMatch.part?.Part_Code}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            ไม่มีรูปในระบบคลัง
                          </span>
                        </div>
                      )
                    })()}
                    <div className="absolute bottom-1 inset-x-1 text-center pointer-events-none">
                      <span className="text-[10px] font-bold text-white bg-blue-600/80 px-2 py-0.5 rounded-full backdrop-blur-xs shadow-xs">
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
    </>
  )
}
