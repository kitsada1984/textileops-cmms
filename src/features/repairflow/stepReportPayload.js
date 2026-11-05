// Validation + payload shaping moved verbatim from StepReport submit
// (pure logic only — API calls and state setters stay in the component).

export function validateStepReportInput({ problem, reporter, repairType, assignedTech }) {
  if (!problem.trim()) return 'กรุณาระบุรายละเอียดอาการเสียที่พบ'
  if (!reporter.trim()) return 'กรุณาระบุชื่อผู้แจ้งซ่อม'
  if (repairType === 'EASY' && !assignedTech.trim()) {
    return 'กรุณาเลือกหรือระบุชื่อช่างผู้รับผิดชอบสำหรับงานง่าย'
  }
  return null
}

export function buildStepReportPayload({ requestNo, serial, cylinder, design, ki, rollNo, encodedProblem, urgency, reporter, repairType, assignedTech }) {
  const isEasy = repairType === 'EASY'
  return {
    request_no: requestNo,
    cylinder_serial: serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || null,
    cylinder_location: cylinder?.Location || null,
    cylinder_standard: cylinder?.Standard || null,
    machine_mc: cylinder?.NewMC || null,
    Design: design.trim() || null,
    KI: ki.trim() ? Number(ki) : null,
    roll_no: rollNo.trim() ? Number(rollNo) : null,
    problem_description: encodedProblem,
    priority: urgency,
    reported_by: reporter.trim(),
    repair_type: repairType,
    status: isEasy ? 'APPROVED' : 'PENDING',
    technician_name: isEasy ? assignedTech.trim() : null,
    approved_by: isEasy ? 'ผู้แจ้งซ่อม (งานง่าย)' : null,
    approved_at: isEasy ? new Date().toISOString() : null,
    approval_notes: isEasy ? 'งานทั่วไป/งานง่าย (เลือกช่างตรง)' : null,
  }
}
