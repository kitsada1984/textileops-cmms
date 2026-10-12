import React, { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ErrorBoundary, { getClientErrorLogs, clearClientErrorLogs } from './ErrorBoundary'

function Bomb({ shouldThrow, message = 'Bomb exploded' }) {
  if (shouldThrow) {
    throw new Error(message)
  }
  return <div>Normal Content</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error in tests for intentional errors
  let consoleSpy
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    clearClientErrorLogs()
  })
  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe Content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Safe Content')).toBeInTheDocument()
  })

  it('renders standard error fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} message="Test error message" />
      </ErrorBoundary>
    )
    expect(screen.getByText('เกิดข้อผิดพลาดในการแสดงผล')).toBeInTheDocument()
    expect(screen.getByText(/Test error message/)).toBeInTheDocument()
    expect(screen.getByText('ลองใหม่อีกครั้ง')).toBeInTheDocument()
    expect(screen.getByText('คัดลอกรายละเอียด')).toBeInTheDocument()
  })

  it('saves error report to localStorage on catch and retrieves with getClientErrorLogs', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} message="Saved to localStorage error" />
      </ErrorBoundary>
    )
    const logs = getClientErrorLogs()
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0].message).toBe('Saved to localStorage error')

    clearClientErrorLogs()
    expect(getClientErrorLogs().length).toBe(0)
  })

  it('calls onError callback when error caught', () => {
    const onError = vi.fn()
    render(
      <ErrorBoundary onError={onError}>
        <Bomb shouldThrow={true} message="Custom error" />
      </ErrorBoundary>
    )
    expect(onError).toHaveBeenCalled()
    expect(onError.mock.calls[0][0].message).toBe('Custom error')
  })

  it('resets error state when "ลองใหม่อีกครั้ง" is clicked', () => {
    function TestComponent() {
      const [explode, setExplode] = useState(true)
      return (
        <ErrorBoundary onReset={() => setExplode(false)}>
          <Bomb shouldThrow={explode} />
        </ErrorBoundary>
      )
    }

    render(<TestComponent />)
    expect(screen.getByText('เกิดข้อผิดพลาดในการแสดงผล')).toBeInTheDocument()

    fireEvent.click(screen.getByText('ลองใหม่อีกครั้ง'))
    expect(screen.getByText('Normal Content')).toBeInTheDocument()
  })

  it('auto-resets error state when resetKey changes (Route change pattern)', () => {
    function Parent({ route }) {
      return (
        <ErrorBoundary resetKey={route}>
          <Bomb shouldThrow={route === '/broken'} />
        </ErrorBoundary>
      )
    }

    const { rerender } = render(<Parent route="/broken" />)
    expect(screen.getByText('เกิดข้อผิดพลาดในการแสดงผล')).toBeInTheDocument()

    // Navigate to safe route
    rerender(<Parent route="/safe" />)
    expect(screen.getByText('Normal Content')).toBeInTheDocument()
  })

  it('supports compact mode for granular widget/card error boundary', () => {
    render(
      <ErrorBoundary compact title="การ์ดสถิติขัดข้อง">
        <Bomb shouldThrow={true} message="Data parse fail" />
      </ErrorBoundary>
    )
    expect(screen.getByText('การ์ดสถิติขัดข้อง')).toBeInTheDocument()
    expect(screen.getByText('Data parse fail')).toBeInTheDocument()
    expect(screen.getByText('ลองใหม่อีกครั้ง')).toBeInTheDocument()
  })

  it('supports custom function fallback', () => {
    const customFallback = ({ error, reset }) => (
      <div>
        <span>Custom fallback: {error.message}</span>
        <button onClick={reset}>Retry Custom</button>
      </div>
    )

    render(
      <ErrorBoundary fallback={customFallback}>
        <Bomb shouldThrow={true} message="Custom msg" />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom fallback: Custom msg')).toBeInTheDocument()
  })

  it('copies error info to clipboard when copy button clicked', () => {
    const writeTextMock = vi.fn().mockResolvedValue()
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} message="Clipboard error" />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByText('คัดลอกรายละเอียด'))
    expect(writeTextMock).toHaveBeenCalled()
    expect(writeTextMock.mock.calls[0][0]).toContain('Clipboard error')
    expect(screen.getByText('คัดลอกแล้ว!')).toBeInTheDocument()
  })
})
