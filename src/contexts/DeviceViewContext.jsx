// src/contexts/DeviceViewContext.jsx
// Core Context and Hook for Device-Adaptive Tri-View (Mobile, Tablet, Desktop)
// Follows ADR-0002

import React, { createContext, useContext, useState, useEffect } from 'react'

const DeviceViewContext = createContext(null)

export const BREAKPOINTS = {
  MOBILE_MAX: 639,
  TABLET_MIN: 640,
  TABLET_MAX: 1024,
}

export function getAutoDevice(width) {
  if (width < 640) return 'mobile'
  if (width <= 1024) return 'tablet'
  return 'desktop'
}

export function DeviceViewProvider({ children }) {
  const [windowWidth, setWindowWidth] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : 1280
  )
  const [simulatorMode, setSimulatorMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('app_device_view_mode')
      if (['auto', 'desktop', 'tablet', 'mobile'].includes(stored)) {
        return stored
      }
    }
    return 'auto'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_device_view_mode', simulatorMode)
    }
  }, [simulatorMode])

  const autoDevice = getAutoDevice(windowWidth)
  const effectiveDevice = simulatorMode === 'auto' ? autoDevice : simulatorMode

  const value = {
    windowWidth,
    autoDevice,
    simulatorMode,
    setSimulatorMode,
    device: effectiveDevice,
    isMobile: effectiveDevice === 'mobile',
    isTablet: effectiveDevice === 'tablet',
    isDesktop: effectiveDevice === 'desktop',
  }

  return (
    <DeviceViewContext.Provider value={value}>
      {children}
    </DeviceViewContext.Provider>
  )
}

export function useDeviceView() {
  const ctx = useContext(DeviceViewContext)
  if (!ctx) {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1280
    const auto = getAutoDevice(width)
    return {
      windowWidth: width,
      autoDevice: auto,
      simulatorMode: 'auto',
      setSimulatorMode: () => {},
      device: auto,
      isMobile: auto === 'mobile',
      isTablet: auto === 'tablet',
      isDesktop: auto === 'desktop',
    }
  }
  return ctx
}

export default useDeviceView
