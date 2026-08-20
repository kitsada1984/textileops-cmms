import { describe, expect, it } from 'vitest'
import {
  appendCylinderImageMeta,
  extractCylinderImageUrl,
  getCylinderImageUrl,
  stripCylinderImageMeta,
} from './cylinderImage'

describe('cylinderImage', () => {
  it('extracts image metadata from comments', () => {
    expect(extractCylinderImageUrl('note\nImageUrl: https://example.com/cyl.jpg'))
      .toBe('https://example.com/cyl.jpg')
  })

  it('prefers the real ImageUrl column over comment metadata', () => {
    expect(getCylinderImageUrl({
      ImageUrl: 'https://example.com/real.jpg',
      Comment: 'ImageUrl: https://example.com/fallback.jpg',
    })).toBe('https://example.com/real.jpg')
  })

  it('removes hidden image metadata before showing comments', () => {
    expect(stripCylinderImageMeta('visible note\nImageUrl: https://example.com/cyl.jpg'))
      .toBe('visible note')
  })

  it('removes image metadata even when it is attached to visible notes', () => {
    expect(stripCylinderImageMeta('เปลี่ยนออกจาก Serial:71777(ปรกติImageUrl: https://example.com/old.jpg'))
      .toBe('เปลี่ยนออกจาก Serial:71777(ปรกติ')
  })

  it('extracts the latest image URL when old metadata was duplicated without line breaks', () => {
    expect(extractCylinderImageUrl(
      'noteImageUrl: https://example.com/old.jpgImageUrl: https://example.com/new.jpg',
    )).toBe('https://example.com/new.jpg')
  })

  it('replaces old image metadata when appending a new image URL', () => {
    expect(appendCylinderImageMeta(
      'visible note\nImageUrl: https://example.com/old.jpg',
      'https://example.com/new.jpg',
    )).toBe('visible note\nImageUrl: https://example.com/new.jpg')
  })
})
