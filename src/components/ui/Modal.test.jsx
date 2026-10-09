import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Modal, { useModalContext } from './Modal'

describe('Modal Component - React Composition Patterns', () => {
  it('renders correctly with legacy props (title, footer, children)', () => {
    const handleClose = vi.fn()
    render(
      <Modal open={true} onClose={handleClose} title="Legacy Modal Title" footer={<button>Footer Button</button>}>
        <p>Legacy Body Content</p>
      </Modal>
    )

    expect(screen.getByText('Legacy Modal Title')).toBeInTheDocument()
    expect(screen.getByText('Legacy Body Content')).toBeInTheDocument()
    expect(screen.getByText('Footer Button')).toBeInTheDocument()

    // Close button click
    const closeBtn = screen.getByTitle('ปิดหน้าต่าง')
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('renders correctly with compound components pattern', () => {
    const handleClose = vi.fn()
    render(
      <Modal open={true} onClose={handleClose} size="lg">
        <Modal.Header>
          <Modal.Title>Compound Modal Title</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Compound Body Content</p>
        </Modal.Body>
        <Modal.Footer>
          <button type="button">Compound Submit</button>
        </Modal.Footer>
      </Modal>
    )

    expect(screen.getByText('Compound Modal Title')).toBeInTheDocument()
    expect(screen.getByText('Compound Body Content')).toBeInTheDocument()
    expect(screen.getByText('Compound Submit')).toBeInTheDocument()

    // Test default close button inside Modal.Header
    const closeBtn = screen.getByTitle('ปิดหน้าต่าง')
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('allows custom close button using Modal.CloseButton compound component', () => {
    const handleClose = vi.fn()
    render(
      <Modal open={true} onClose={handleClose}>
        <Modal.Header showClose={false}>
          <Modal.Title>Custom Close Test</Modal.Title>
          <Modal.CloseButton>Custom Close</Modal.CloseButton>
        </Modal.Header>
        <Modal.Body>Test</Modal.Body>
      </Modal>
    )

    const customBtn = screen.getByText('Custom Close')
    fireEvent.click(customBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('does not render when open is false', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Closed Modal">
        <p>Should not be in document</p>
      </Modal>
    )

    expect(screen.queryByText('Closed Modal')).not.toBeInTheDocument()
  })

  it('closes on Escape key press and locks/unlocks body scroll', () => {
    const handleClose = vi.fn()
    const { unmount } = render(
      <Modal open={true} onClose={handleClose} title="Escape Test">
        <p>Body</p>
      </Modal>
    )

    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)

    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})
