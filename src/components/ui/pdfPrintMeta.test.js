import { describe, it, expect } from 'vitest'
import { DOC_THEMES, getStatusStyle, buildSelectableItems, resolvePrintHeader } from './pdfPrintMeta'

// Characterization: lock print meta behavior before splitting it out
// of the modal (no logic change).
describe('pdfPrintMeta characterization', () => {
  it('falls back to the general theme for unknown doc types', () => {
    expect(DOC_THEMES.machine.code).toBe('MC-SPEC')
    const h = resolvePrintHeader({ docType: 'nope', docDate: '', docNo: '' })
    expect(h.theme.code).toBe('DOC-SYS')
  })

  it('maps approved and breakdown statuses to badge styles', () => {
    expect(getStatusStyle('COMPLETED').text).toBe('#15803d')
    expect(getStatusStyle('BREAKDOWN').text).toBe('#b91c1c')
    expect(getStatusStyle('รออะไหล่').text).toBe('#7e22ce')
    expect(getStatusStyle('whatever').text).toBe('#b45309')
  })

  it('builds the printable section picker items', () => {
    const items = buildSelectableItems(
      [{ title: 'A' }, {}],
      { title: 'T', rows: [1] },
      null,
      ['img'],
      'note',
      [{ title: 'S' }]
    )
    expect(items.map((i) => i.key)).toEqual(['sec-0', 'table', 'images', 'remarks', 'sign'])
  })

  it('resolves header dates with today fallback', () => {
    const h = resolvePrintHeader({ docType: 'machine', docDate: '2026-05-17', docNo: 'D-1' })
    expect(h.formattedDocDate).toBe('17/05/2026')
    expect(h.qrValue).toContain('?doc=D-1')
  })
})
