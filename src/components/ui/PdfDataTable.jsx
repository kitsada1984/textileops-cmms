// Detail/history tables moved verbatim from PdfPreviewModal (props only).
// The two blocks were identical except data source and gate key.
export function PdfDataTable({ gateKey, table, themeAccent, isExcluded }) {
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
                <tr className="bg-slate-800 text-white text-[10.5px] font-black uppercase">
                  {table.headers.map((h, hIdx) => (
                    <th key={hIdx} className="py-2 px-2.5 border-r border-slate-700 last:border-r-0 tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {table.rows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}>
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
