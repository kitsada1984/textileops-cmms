import { describe, expect, it } from 'vitest'
import {
  buildCylinderInspectionSync,
  CYLINDER_NEEDS_SERVICE,
  CYLINDER_STANDARD,
  WORN_NEEDLE_STATUSES,
} from './needleConditionSync'

describe('buildCylinderInspectionSync', () => {
  it('always writes the inspection date', () => {
    expect(buildCylinderInspectionSync({ docDate: '2026-09-29', inspectionStatus: 'สึกเล็กน้อย' }))
      .toEqual({ Last_Check_Date: '2026-09-29' })
  })

  it('flags the cylinder when the needle is worn', () => {
    for (const status of WORN_NEEDLE_STATUSES) {
      expect(buildCylinderInspectionSync({ docDate: '2026-09-29', inspectionStatus: status }))
        .toEqual({ Last_Check_Date: '2026-09-29', Status_Now: CYLINDER_NEEDS_SERVICE })
    }
  })

  it('honours an explicit worn decision (checklist FAILED)', () => {
    expect(buildCylinderInspectionSync({
      docDate: '2026-09-29',
      inspectionStatus: 'สึกเล็กน้อย',
      forceWorn: true,
    })).toEqual({ Last_Check_Date: '2026-09-29', Status_Now: CYLINDER_NEEDS_SERVICE })
  })

  it('releases the cylinder once a healthy inspection follows a worn one', () => {
    expect(buildCylinderInspectionSync({
      docDate: '2026-10-01',
      inspectionStatus: 'สึกเล็กน้อย',
      currentStatus: CYLINDER_NEEDS_SERVICE,
    })).toEqual({ Last_Check_Date: '2026-10-01', Status_Now: CYLINDER_STANDARD })
  })

  it('does not touch other cylinder statuses (spare / scrap / repair)', () => {
    for (const current of ['SPARE', 'SCRAP', 'REPAIR', 'SWAPPED', 'STANDARD', '']) {
      const fields = buildCylinderInspectionSync({
        docDate: '2026-10-01',
        inspectionStatus: 'สึกปานกลาง',
        currentStatus: current,
      })
      expect(fields).toEqual({ Last_Check_Date: '2026-10-01' })
    }
  })

  it('ignores a missing date but still applies the status rule', () => {
    expect(buildCylinderInspectionSync({ inspectionStatus: 'สึกมาก(ควรเปลี่ยน)' }))
      .toEqual({ Status_Now: CYLINDER_NEEDS_SERVICE })
  })
})
