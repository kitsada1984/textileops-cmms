import { describe, it, expect } from 'vitest'
import {
  stripSparePartImageMeta,
  appendSparePartImageMeta,
  getSparePartImageUrl,
  buildSparePartImagePayload,
} from './sparePartImage'

// Locks the form contract: hidden ImageUrl:/fingerprint/embedding lines
// never show in the notes input, and stripping them on load loses nothing
// because save re-appends storage meta from the ImageUrl field.
describe('sparePartImage form contract', () => {
  const storedRemark = 'ของแท้ เบิกศูนย์\nImageUrl: https://drive.google.com/file/d/abc'

  it('strips hidden meta lines from the remark shown in the form', () => {
    expect(stripSparePartImageMeta(storedRemark)).toBe('ของแท้ เบิกศูนย์')
    expect(stripSparePartImageMeta(storedRemark)).not.toContain('ImageUrl:')
  })

  it('recovers the image URL from the stripped remark or the ImageUrl field', () => {
    expect(getSparePartImageUrl({ Remark: storedRemark })).toBe('https://drive.google.com/file/d/abc')
    expect(getSparePartImageUrl({ ImageUrl: 'https://x/img.jpg', Remark: 'clean' })).toBe('https://x/img.jpg')
  })

  it('re-appends storage meta on save after a clean edit', () => {
    const payload = buildSparePartImagePayload({
      Part_Code: 'SP-001',
      ImageUrl: 'https://drive.google.com/file/d/abc',
      Remark: 'ของแท้ เบิกศูนย์',
    })

    expect(payload.Remark).toContain('ของแท้ เบิกศูนย์')
    expect(payload.Remark).toContain('ImageUrl: https://drive.google.com/file/d/abc')
  })

  it('never duplicates the meta line when the remark already has it', () => {
    const payload = buildSparePartImagePayload({
      Part_Code: 'SP-001',
      ImageUrl: 'https://drive.google.com/file/d/abc',
      Remark: storedRemark,
    })
    const hits = payload.Remark.split('\n').filter((l) => l.trim().startsWith('ImageUrl:'))

    expect(hits).toHaveLength(1)
  })
})
