import { Eye, Layers, Package, ArrowRight } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import { getDirectImageUrl } from '../../utils/imageUrlUtils'
import { getSparePartImageUrl } from '../../utils/sparePartImage'

// Alternative candidates moved verbatim from VisualSearchResults (props only).
export function VisualSearchCandidates({ otherCandidates, handleSelectCandidate }) {
  return (
    <>
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
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        {(() => {
                          const candRawUrl = getSparePartImageUrl(candidate.part)
                          const candDirectUrl = getDirectImageUrl(candRawUrl, 'w120')
                          return candDirectUrl ? (
                            <img
                              src={candDirectUrl}
                              alt={candidate.part?.Part_Code}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = 'flex'
                                }
                              }}
                            />
                          ) : null
                        })()}
                        <div
                          style={{ display: getSparePartImageUrl(candidate.part) ? 'none' : 'flex' }}
                          className="w-full h-full flex-col items-center justify-center text-slate-400 p-1"
                        >
                          <Package size={16} className="opacity-40" />
                        </div>
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
    </>
  )
}
