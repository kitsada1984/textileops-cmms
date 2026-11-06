// Detail/history tables moved verbatim from PdfPreviewModal (props only).
// The two blocks were identical except data source and gate key.
import { REPORT_TABLE } from './reportTheme'

export function PdfDataTable({ gateKey, table, themeAccent, isExcluded, headerFill = REPORT_TABLE.headerFill, headerText = REPORT_TABLE.headerText }) {
  return (
    <>
      {!isExcluded(gateKey) && table && table.rows && table.rows.length > 0 && (
        <div className="space-y-1.5 mt-4">
          {table.title && (
            <div className="text-[11px] font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1">
              <span className="w-2 h-3.5 rounded-xs" style={{ backgroundColor: themeAccent }} />
              <span>{table.title}</span>
            </div>
          )}

          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[10.5px] font-black uppercase" style={{ backgroundColor: headerFill, color: headerText }}>
                  {table.headers.map((h, hIdx) => (
                    <th key={hIdx} className="py-2 px-2.5 border-r last:border-r-0 tracking-wide" style={{ borderColor: 'rgba(255,255,255,0.25)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {table.rows.map((row, rIdx) => (
                  <tr key={rIdx} style={rIdx % 2 === 0 ? undefined : { backgroundColor: REPORT_TABLE.zebraFill }} className={rIdx % 2 === 0 ? 'bg-white' : ''}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-2.5 border-r border-slate-200 last:border-r-0 font-medium text-slate-800">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
