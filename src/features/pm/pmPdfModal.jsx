import PdfPreviewModal from '../../components/ui/PdfPreviewModal'
import { generatePMPlanPdfProps } from '../../utils/pdfDocGenerators'

export function PMPdfModal({ pdfItem, setPdfItem }) {
  return (
    <>
      {pdfItem && (
        <PdfPreviewModal
          open={!!pdfItem}
          onClose={() => setPdfItem(null)}
          {...generatePMPlanPdfProps(pdfItem)}
        />
      )}
    </>
  )
}
