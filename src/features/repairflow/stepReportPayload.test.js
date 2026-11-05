import { describe, it, expect } from 'vitest'
import { validateStepReportInput, buildStepReportPayload } from './stepReportPayload'

// Characterization: lock submit validation + payload shaping before
// extracting them out of the submit arrow (no logic change).

describe('stepReportPayload characterization', () => {
  it('requires problem, reporter, and tech for EASY jobs', () => {
    expect(validateStepReportInput({ problem: ' ', reporter: 'a', repairType: 'EASY', assignedTech: 'b' })).toBe(
      'กรุณาระบุรายละเอียดอาการเสียที่พบ'
    )
    expect(validateStepReportInput({ problem: 'x', reporter: ' ', repairType: 'EASY', assignedTech: 'b' })).toBe(
      'กรุณาระบุชื่อผู้แจ้งซ่อม'
    )
    expect(validateStepReportInput({ problem: 'x', reporter: 'a', repairType: 'EASY', assignedTech: ' ' })).toBe(
      'กรุณาเลือกหรือระบุชื่อช่างผู้รับผิดชอบสำหรับงานง่าย'
    )
    expect(validateStepReportInput({ problem: 'x', reporter: 'a', repairType: 'EASY', assignedTech: 'b' })).toBeNull()
    expect(validateStepReportInput({ problem: 'x', reporter: 'a', repairType: 'COMPLEX', assignedTech: '' })).toBeNull()
  })

  it('builds EASY payload as auto-approved with tech', () => {
    const p = buildStepReportPayload({
      requestNo: 'RR-1',
      serial: 'SN-1',
      cylinder: {},
      design: ' d ',
      ki: '12',
      rollNo: '3',
      encodedProblem: 'prob',
      urgency: 'ด่วน',
      reporter: ' r ',
      repairType: 'EASY',
      assignedTech: ' ch ',
    })

    expect(p.status).toBe('APPROVED')
    expect(p.technician_name).toBe('ch')
    expect(p.KI).toBe(12)
    expect(p.roll_no).toBe(3)
    expect(p.Design).toBe('d')
  })

  it('builds COMPLEX payload as pending without tech', () => {
    const p = buildStepReportPayload({
      requestNo: null,
      serial: null,
      cylinder: { Serial_NOW: 'NOW', Location: 'L', Standard: 'S', NewMC: 'MC' },
      design: '',
      ki: '',
      rollNo: '',
      encodedProblem: 'prob',
      urgency: 'ปกติ',
      reporter: 'r',
      repairType: 'COMPLEX',
      assignedTech: '',
    })

    expect(p.status).toBe('PENDING')
    expect(p.technician_name).toBeNull()
    expect(p.cylinder_serial).toBe('NOW')
    expect(p.KI).toBeNull()
  })
})
