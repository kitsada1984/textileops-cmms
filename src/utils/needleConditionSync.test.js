import { describe, expect, it } from 'vitest'
import {
  buildCylinderInspectionSync,
  sortInspectionsNewestFirst,
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

describe('sortInspectionsNewestFirst', () => {
  it('puts the newest inspection of the same day first (save-time tiebreak)', () => {
    const rows = [
      { id: 'a', doc_date: '2026-09-29', created_at: '2026-09-29T14:16:04.414Z', status: 'สึกมาก(ควรเปลี่ยน)' },
      { id: 'b', doc_date: '2026-09-29', created_at: '2026-09-29T14:16:29.445Z', status: 'สึกเล็กน้อย' },
    ]
    expect(sortInspectionsNewestFirst(rows).map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('sorts by inspection date first, then by time', () => {
    const rows = [
      { id: 'old', doc_date: '2026-09-01', created_at: '2026-09-28T10:00:00Z' },
      { id: 'new', doc_date: '2026-09-20', created_at: '2026-09-20T01:00:00Z' },
      { id: 'mid', doc_date: '2026-09-10', created_at: '2026-09-11T10:00:00Z' },
    ]
    expect(sortInspectionsNewestFirst(rows).map((r) => r.id)).toEqual(['new', 'mid', 'old'])
  })

  it('handles missing or invalid dates without throwing', () => {
    const rows = [{ id: 'x' }, { id: 'y', doc_date: 'not-a-date' }, { id: 'z', doc_date: '2026-09-29' }]
    const out = sortInspectionsNewestFirst(rows).map((r) => r.id)
    expect(out[0]).toBe('z')
    expect(out).toHaveLength(3)
    expect(sortInspectionsNewestFirst(undefined)).toEqual([])
  })
})
