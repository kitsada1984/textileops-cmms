// Detail/history tables moved verbatim from PdfPreviewModal (props only).
// The two blocks were identical except data source and gate key.
import { REPORT_COLORS, REPORT_TABLE } from './reportTheme'
import { PdfSectionHeading } from './PdfSectionHeading'

function isNumericValue(value) {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value !== 'string') return false
  const cleaned = value
    .replace(/[\s,]/g, '')
    .replace(/%$/, '')
    .replace(/^[+฿$]/, '')
    .replace(/^\((.*)\)$/, '$1')
  if (!cleaned) return false
  return /^-?\d+(\.\d+)?$/.test(cleaned)
}

function resolveNumericColumns(table) {
  const rows = Array.isArray(table?.rows) ? table.rows : []
  const width = Array.isArray(table?.headers) ? table.headers.length : 0
  return Array.from({ length: width }, (_, col) => {
    let nonEmpty = 0
    let numeric = 0
    rows.forEach((row) => {
      const value = row?.[col]
      if (value === null || value === undefined || value === '') return
      nonEmpty += 1
      if (isNumericValue(value)) numeric += 1
    })
    return nonEmpty > 0 && numeric >= Math.ceil(nonEmpty / 2)
  })
}

export function PdfDataTable({ gateKey, table, themeAccent, isExcluded, headerFill = REPORT_TABLE.headerFill, headerText = REPORT_TABLE.headerText }) {
  const numericCols = resolveNumericColumns(table)
  return (
    <>
      {!isExcluded(gateKey) && table && table.rows && table.rows.length > 0 && (
        <div className="space-y-2 mt-4">
          {table.title && (
            <PdfSectionHeading title={table.title} accent={themeAccent} />
          )}

          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${REPORT_COLORS.line}` }}>
            <table className="report-table w-full text-left border-collapse" style={{ fontSize: 11 }}>
              <thead>
                <tr style={{ backgroundColor: headerFill, color: headerText }}>
                  {table.headers.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      scope="col"
                      className="py-2 px-2.5 font-bold tracking-wide"
                      style={{
                        textAlign: numericCols[hIdx] ? 'right' : 'left',
                        borderRight: hIdx === table.headers.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.25)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      backgroundColor: rIdx % 2 === 0 ? REPORT_COLORS.white : REPORT_TABLE.zebraFill,
                      breakInside: 'avoid',
                    }}
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="py-2 px-2.5 font-medium whitespace-normal"
                        style={{
                          color: REPORT_COLORS.ink,
                          textAlign: numericCols[cIdx] ? 'right' : 'left',
                          borderTop: `1px solid ${REPORT_COLORS.line}`,
                          borderRight: cIdx === row.length - 1 ? 'none' : `1px solid ${REPORT_COLORS.line}`,
                          fontVariantNumeric: numericCols[cIdx] ? 'tabular-nums' : undefined,
                        }}
                      >
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
