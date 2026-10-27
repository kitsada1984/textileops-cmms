import { describe, it, expect } from 'vitest'
import { getAutoDevice, getEffectiveDevice, BREAKPOINTS } from '../contexts/DeviceViewContext'

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

  it('enforces native mobile view on physical smartphone screens (< 640px) regardless of stale simulatorMode', () => {
    // Even if localStorage previously had 'desktop', smartphone screens must never render desktop micro-tables
    expect(getEffectiveDevice(390, 'desktop')).toBe('mobile')
    expect(getEffectiveDevice(375, 'tablet')).toBe('mobile')
    expect(getEffectiveDevice(414, 'auto')).toBe('mobile')
  })

  it('honors simulator modes on tablet and desktop screens (ADR-0002 Tri-View)', () => {
    // On tablet
    expect(getEffectiveDevice(768, 'auto')).toBe('tablet')
    expect(getEffectiveDevice(768, 'mobile')).toBe('mobile')
    expect(getEffectiveDevice(768, 'desktop')).toBe('desktop')

    // On desktop
    expect(getEffectiveDevice(1280, 'auto')).toBe('desktop')
    expect(getEffectiveDevice(1280, 'mobile')).toBe('mobile')
    expect(getEffectiveDevice(1280, 'tablet')).toBe('tablet')
    expect(getEffectiveDevice(1280, 'desktop')).toBe('desktop')
  })
})
