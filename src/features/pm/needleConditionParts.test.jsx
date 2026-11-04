import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import {
  FormPhotoCard,
  normalizeSerial,
  normalizeMachine,
  NEEDLE_IMAGE_FOLDER,
} from './needleConditionParts.jsx'

// Characterization tests (plan Task 7): lock the extracted parts exactly
// as the in-component versions behaved.

describe('needle condition parts', () => {
  it('keeps the drive folder constant', () => {
    expect(NEEDLE_IMAGE_FOLDER).toBe('สภาพเข็ม')
  })

  it('normalizes serials and machine codes', () => {
    expect(normalizeSerial(' ab 123 ')).toBe('AB123')
    expect(normalizeMachine('da-301m')).toBe('DA301M')
  })

  it('renders the photo with indexed alt text', () => {
    render(
      <FormPhotoCard
        url="https://example.com/needle.jpg"
        onRemove={() => {}}
        onPreview={() => {}}
        index={2}
      />
    )

    expect(screen.getByAltText('Needle condition 2')).toBeInTheDocument()
  })

  it('calls onRemove from the delete button', () => {
    const onRemove = vi.fn()
    render(
      <FormPhotoCard
        url="https://example.com/needle.jpg"
        onRemove={onRemove}
        onPreview={() => {}}
        index={0}
      />
    )

    fireEvent.click(screen.getByTitle('ลบรูปนี้'))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('shows the placeholder when there is no usable url', () => {
    render(
      <FormPhotoCard url="" onRemove={() => {}} onPreview={() => {}} index={0} />
    )

    expect(screen.getByText('คลิกดูรูป')).toBeInTheDocument()
  })
})
