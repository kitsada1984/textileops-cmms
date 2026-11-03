import { RepairStatusBadge, statusLabel, formatDateTime } from './dashboardHelpers.jsx'

export function buildRepairDrawerGroups(selectedRepair) {
  return (
  selectedRepair ? [
    {
      title: 'ข้อมูลการแจ้งซ่อม',
      items: [
        { label: 'เลขที่แจ้งซ่อม', value: selectedRepair.request_no || (selectedRepair.id ? `REQ-${selectedRepair.id.slice(0, 8)}` : '—') },
        { label: 'เครื่องจักร (M/C)', value: selectedRepair.machine_mc || '—' },
        { label: 'ซีเรียลกระบอก', value: selectedRepair.cylinder_serial || '—' },
        { label: 'Design (ลายผ้า)', value: selectedRepair.Design || '—' },
        { label: 'KI', value: selectedRepair.KI !== undefined && selectedRepair.KI !== null ? selectedRepair.KI : '—' },
        { label: 'เลขม้วน', value: selectedRepair.roll_no || selectedRepair.RollNo || selectedRepair.roll_number || '—' },
        { label: 'ตำแหน่งติดตั้ง', value: selectedRepair.cylinder_location || '—' },
        { label: 'สถานะ', value: <RepairStatusBadge status={selectedRepair.status} /> },
      ],
    },
    {
      title: 'รายละเอียดและผู้รับผิดชอบ',
      items: [
        { label: 'อาการเสีย / ปัญหา', value: selectedRepair.problem_description || '—' },
        { label: 'ผู้แจ้งซ่อม', value: selectedRepair.reported_by || '—' },
        { label: 'วันที่แจ้ง', value: formatDateTime(selectedRepair.created_at) },
        { label: 'ช่างผู้รับผิดชอบ', value: selectedRepair.technician_name || 'ยังไม่มอบหมาย' },
        { label: 'รายละเอียดการซ่อม', value: selectedRepair.repair_details || '—' },
        { label: 'อะไหล่ที่ใช้', value: selectedRepair.parts_used || '—' },
      ],
    },
  ] : []
  )
}

export function buildWoDrawerGroups(selectedWO) {
  return (
  // Groups for Work Order Detail Drawer
  selectedWO ? [
    {
      title: 'ข้อมูลใบสั่งงาน',
      items: [
        { label: 'Job ID / WO ID', value: selectedWO.Job_ID || selectedWO['Job ID'] || selectedWO.WO_ID || '—' },
        { label: 'รหัสเครื่อง (M/C)', value: selectedWO.MC || '—' },
        { label: 'รหัสงาน (KI)', value: selectedWO.KI || '—' },
        { label: 'ลายผ้า / Design', value: selectedWO.Design || '—' },
        { label: 'ประเภทงาน', value: selectedWO.JobType || selectedWO.Priority || '—' },
        { label: 'สถานะ', value: statusLabel(selectedWO.Status) || selectedWO.Status },
      ],
    },
    {
      title: 'รายละเอียดและเวลาปฏิบัติงาน',
      items: [
        { label: 'หมายเหตุ / ปัญหา', value: selectedWO.Comment || selectedWO.Problem || selectedWO.Detail || '—' },
        { label: 'ช่างผู้ปฏิบัติงาน', value: selectedWO.Technicians || selectedWO.Tech || '—' },
        { label: 'วันที่เริ่มงาน', value: selectedWO.StartDate || selectedWO.DateStart || '—' },
        { label: 'วันที่เสร็จสิ้น', value: selectedWO.EndDate || selectedWO.DateEnd || '—' },
        { label: 'ผู้เปิดงาน', value: selectedWO.CreatedBy || '—' },
      ],
    },
  ] : []
  )
}
