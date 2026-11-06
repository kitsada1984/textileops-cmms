import PdfPreviewModal from '../../components/ui/PdfPreviewModal'
import { generateWorkOrderPdfProps } from '../../utils/pdfDocGenerators'

// Print A4 modal moved verbatim from WorkOrders (props only).
export function WorkOrdersPrintModal({ printModalOpen, printJob, setPrintModalOpen }) {
  return (
    <>
      {printModalOpen && printJob && (
        <PdfPreviewModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          {...generateWorkOrderPdfProps({
            ...printJob,
            WONumber: printJob.Job_ID || printJob['Job ID'],
            OrderDate: printJob.StartDate,
            WOType: printJob.JobType === 'DESIGN' ? 'ปรับแบบ (Design)' : printJob.JobType === 'PM' ? 'บำรุงรักษา (PM)' : printJob.JobType === 'SETUP' ? 'เตรียมเครื่อง (Setup)' : 'แก้ไขเครื่อง (Repair)',
            MachineID: printJob.MC,
            KI: printJob.KI,
            Design: printJob.Design,
            RollNo: printJob.RollNo || printJob.roll_no || '',
            AssignedTo: printJob.Technicians,
            Title: printJob.Design ? `งานปรับแบบ: ${printJob.Design}` : `งานซ่อมบำรุง: ${printJob.MC}`,
            Description: printJob.Comment,
            Duration: printJob.WorkingDurationText || printJob.WorkingHoursDecimal,
            StartTime: `${printJob.StartDate || ''} ${printJob.StartTime || ''}`.trim(),
            EndTime: printJob.EndDate ? `${printJob.EndDate} ${printJob.EndTime || ''}`.trim() : 'ยังไม่เสร็จสิ้น',
          })}
        />
      )}
    </>
  )
}
