import { describe, it, expect, beforeEach } from 'vitest'
import { loadQRSettings, saveQRSettings, QR_FIELDS, QR_DEFAULTS } from './qrSettings'

beforeEach(() => {
  localStorage.clear()
})

// ─── QR_FIELDS ────────────────────────────────────────────────
describe('QR_FIELDS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(QR_FIELDS)).toBe(true)
    expect(QR_FIELDS.length).toBeGreaterThan(0)
  })

  it('each field has key and label', () => {
    QR_FIELDS.forEach(f => {
      expect(typeof f.key).toBe('string')
      expect(f.key.length).toBeGreaterThan(0)
      expect(typeof f.label).toBe('string')
    })
  })

  it('has unique keys', () => {
    const keys = QR_FIELDS.map(f => f.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

// ─── QR_DEFAULTS ─────────────────────────────────────────────
describe('QR_DEFAULTS', () => {
  it('has displayFields array', () => {
    expect(Array.isArray(QR_DEFAULTS.displayFields)).toBe(true)
    expect(QR_DEFAULTS.displayFields.length).toBeGreaterThan(0)
  })

  it('has qrSize as a positive number', () => {
    expect(typeof QR_DEFAULTS.qrSize).toBe('number')
    expect(QR_DEFAULTS.qrSize).toBeGreaterThan(0)
  })

  it('has useUrl as boolean', () => {
    expect(typeof QR_DEFAULTS.useUrl).toBe('boolean')
  })
})

// ─── loadQRSettings ───────────────────────────────────────────
describe('loadQRSettings', () => {
  it('returns defaults when localStorage is empty', () => {
    const settings = loadQRSettings()
    expect(settings).toEqual(QR_DEFAULTS)
  })

  it('returns a fresh object (not the same reference as QR_DEFAULTS)', () => {
    const settings = loadQRSettings()
    expect(settings).not.toBe(QR_DEFAULTS)
  })

  it('merges saved settings on top of defaults', () => {
    localStorage.setItem('cyl_qr_settings', JSON.stringify({ qrSize: 200 }))
    const settings = loadQRSettings()
    expect(settings.qrSize).toBe(200)
    expect(settings.useUrl).toBe(QR_DEFAULTS.useUrl)
  })

  it('overrides displayFields when saved', () => {
    localStorage.setItem('cyl_qr_settings', JSON.stringify({ displayFields: ['Location'] }))
    const settings = loadQRSettings()
    expect(settings.displayFields).toEqual(['Location'])
  })

  it('falls back to defaults on invalid JSON', () => {
    localStorage.setItem('cyl_qr_settings', 'NOT_VALID_JSON{{{')
    const settings = loadQRSettings()
    expect(settings).toEqual(QR_DEFAULTS)
  })

  it('falls back to defaults on null stored value', () => {
    localStorage.setItem('cyl_qr_settings', 'null')
    const settings = loadQRSettings()
    expect(settings).toEqual(QR_DEFAULTS)
  })
})

// ─── saveQRSettings ───────────────────────────────────────────
describe('saveQRSettings', () => {
  it('saves config to localStorage', () => {
    const cfg = { ...QR_DEFAULTS, qrSize: 999 }
    saveQRSettings(cfg)
    const raw = localStorage.getItem('cyl_qr_settings')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw)
    expect(parsed.qrSize).toBe(999)
  })

  it('round-trip: save then load returns same data', () => {
    const cfg = { ...QR_DEFAULTS, qrSize: 250, useUrl: false }
    saveQRSettings(cfg)
    const loaded = loadQRSettings()
    expect(loaded.qrSize).toBe(250)
    expect(loaded.useUrl).toBe(false)
  })
})
