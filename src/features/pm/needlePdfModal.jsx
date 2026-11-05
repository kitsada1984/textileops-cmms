import PdfPreviewModal from '../../components/ui/PdfPreviewModal'
import { generateNeedleConditionPdfProps } from '../../utils/pdfDocGenerators'
import { normalizeSerial, normalizeMachine } from './needleConditionParts.jsx'

export function NeedlePdfModal({ pdfItem, setPdfItem, historyMap, cylinders }) {
  return (
    <>
      {pdfItem && (
        <PdfPreviewModal
          open={!!pdfItem}
          onClose={() => setPdfItem(null)}
          {...generateNeedleConditionPdfProps(
            pdfItem,
            historyMap.get(normalizeSerial(pdfItem.serial) || normalizeMachine(pdfItem.machine_mc) || pdfItem.id) || [],
            { cylinders }
          )}
        />
      )}
    </>
  )
}
