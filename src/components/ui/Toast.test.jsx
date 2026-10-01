import { describe, it, expect } from 'vitest'
import { renderHook, render, screen } from '@testing-library/react'
import { ToastProvider, useToast } from './Toast'

describe('Toast System', () => {
  it('returns fallback object with success/error/warning/info when used outside ToastProvider', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current).toBeDefined()
    expect(typeof result.current.success).toBe('function')
    expect(typeof result.current.error).toBe('function')
    expect(typeof result.current.warning).toBe('function')
    expect(typeof result.current.info).toBe('function')
    expect(result.current.toast).toBeDefined()
    expect(typeof result.current.toast.success).toBe('function')

    // Calling them should not throw
    expect(() => result.current.success('Test')).not.toThrow()
    expect(() => result.current.error('Test')).not.toThrow()
  })

  it('renders ToastProvider and provides working toast functions to children', () => {
    function TestConsumer() {
      const toast = useToast()
      return (
        <div>
          <button onClick={() => toast.success('Title', 'Message')}>Trigger Toast</button>
        </div>
      )
    }

    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    expect(screen.getByText('Trigger Toast')).toBeDefined()
  })
})
