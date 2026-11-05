import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

// Status gates moved verbatim from StepComplete (returns JSX or null).
export function getStepCompleteGate(request) {
  if (request.status === 'PENDING') {
    return (
      <div style={{ padding: '36px 20px', textAlign: 'center' }}>
        <AlertTriangle size={52} style={{ color: '#f59e0b', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>ไม่สามารถปิดงานได้</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>งานซ่อมนี้ยังไม่ได้รับการอนุมัติจากหัวหน้า กรุณารอการอนุมัติก่อน</div>
      </div>
    )
  }

  if (request.status === 'REJECTED') {
    return (
      <div style={{ padding: '36px 20px', textAlign: 'center' }}>
        <XCircle size={52} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>งานถูกปฏิเสธแล้ว</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>ไม่สามารถบันทึกผลซ่อมสำหรับงานที่ไม่อนุมัติได้</div>
      </div>
    )
  }

  if (request.status === 'COMPLETED') {
    return (
      <div style={{ padding: '36px 20px', textAlign: 'center' }}>
        <CheckCircle size={52} style={{ color: '#10b981', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>ปิดงานซ่อมเสร็จสมบูรณ์</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>บันทึกผลการซ่อมเข้าสู่ระบบเรียบร้อยแล้ว</div>
      </div>
    )
  }
  return null
}
