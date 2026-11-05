// Section picker moved verbatim from PdfPreviewModal (props only).
export function PdfSectionPicker({ selectableItems, excludedKeys, selectAllSections, toggleSectionKey, isExcluded }) {
  return (
    <>
      {selectableItems.length > 1 && (
        <div className="print:hidden bg-slate-800/90 border-b border-slate-700/80 px-4 py-2 flex flex-wrap items-center gap-1.5">
          <span className="text-slate-300 text-[11px] font-bold mr-1">พิมพ์หัวข้อ:</span>
          <button
            type="button"
            onClick={selectAllSections}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
              excludedKeys === null || excludedKeys.size === 0
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-900 text-slate-300 border-slate-600 hover:border-slate-400'
            }`}
          >
            พิมพ์ทั้งหมด
          </button>
          {selectableItems.map((item) => {
            const active = !isExcluded(item.key)
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleSectionKey(item.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer max-w-[240px] truncate ${
                  active
                    ? 'bg-emerald-600/90 text-white border-emerald-500'
                    : 'bg-slate-900 text-slate-500 border-slate-700 line-through hover:border-slate-500'
                }`}
                title={item.label}
              >
                {active ? '✓ ' : ''}{item.label.length > 34 ? item.label.slice(0, 34) + '…' : item.label}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
