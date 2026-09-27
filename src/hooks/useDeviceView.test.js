import { describe, it, expect } from 'vitest'
import { getAutoDevice, BREAKPOINTS } from '../contexts/DeviceViewContext'

describe('DeviceViewContext Breakpoints', () => {
  it('identifies mobile screens (< 640px)', () => {
    expect(getAutoDevice(320)).toBe('mobile')
    expect(getAutoDevice(390)).toBe('mobile')
    expect(getAutoDevice(639)).toBe('mobile')
  })

  it('identifies tablet screens (640px - 1024px)', () => {
    expect(getAutoDevice(640)).toBe('tablet')
    expect(getAutoDevice(768)).toBe('tablet')
    expect(getAutoDevice(820)).toBe('tablet')
    expect(getAutoDevice(1024)).toBe('tablet')
  })

  it('identifies desktop screens (> 1024px)', () => {
    expect(getAutoDevice(1025)).toBe('desktop')
    expect(getAutoDevice(1280)).toBe('desktop')
    expect(getAutoDevice(1920)).toBe('desktop')
  })

  it('verifies breakpoint constants match ADR-0002', () => {
    expect(BREAKPOINTS.MOBILE_MAX).toBe(639)
    expect(BREAKPOINTS.TABLET_MIN).toBe(640)
    expect(BREAKPOINTS.TABLET_MAX).toBe(1024)
  })
})
