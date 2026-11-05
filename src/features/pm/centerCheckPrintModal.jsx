import PdfPreviewModal from '../../components/ui/PdfPreviewModal'
import { generateCenterCheckPdfProps } from '../../utils/pdfDocGenerators'

export function CenterCheckPrintModal({ printRecord, setPrintRecord, getLatestLocation, rawCylinders, rawRecords }) {
  return (
    <>
      {printRecord && (
        <PdfPreviewModal
          open={!!printRecord}
          onClose={() => setPrintRecord(null)}
          {...generateCenterCheckPdfProps(
            {
              ...printRecord,
              location:
                printRecord.location && printRecord.location !== '—'
                  ? printRecord.location
                  : getLatestLocation(printRecord.mc, printRecord.serial, 'โรงทอ'),
            },
            { cylinders: rawCylinders, centerChecks: rawRecords }
          )}
        />
      )}
    </>
  )
}
