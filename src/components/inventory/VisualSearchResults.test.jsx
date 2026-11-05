import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { VisualSearchResults } from './VisualSearchResults'

// Characterization: lock the results view exactly as the modal rendered it.
const part = { id: 'p1', Part_Code: 'SP-001', Part_Name_EN: 'Needle S-01', Stock_Qty: 10 }
const bestMatch = { part, percent: 92 }
const searchResult = {
  bestMatch,
  aiPowered: false,
  candidates: [
    { part, percent: 92 },
    { part: { ...part, id: 'p2', Part_Code: 'SP-002' }, percent: 61 },
  ],
}

function renderResults(over = {}) {
  const handlers = {
    handleRetake: vi.fn(),
    handleSelectCandidate: vi.fn(),
    setHeroImgError: vi.fn(),
    onViewDetail: vi.fn(),
    onOrderPart: vi.fn(),
    setShowVectorInspector: vi.fn(),
    ...over,
  }
  render(
    <VisualSearchResults
      capturedImage="data:image/jpeg;base64,x"
      isSearching={false}
      searchResult={searchResult}
      bestMatch={bestMatch}
      activeGeminiModel="gemini-x"
      heroImgError={false}
      showVectorInspector={false}
      {...handlers}
    />
  )
  return handlers
}

describe('VisualSearchResults characterization', () => {
  it('shows the match badge, hero card, and candidates', () => {
    renderResults()

    expect(screen.getByText(/เวกเตอร์ตรงกัน/)).toBeInTheDocument()
    expect(screen.getByText('ถ่ายรูปใหม่')).toBeInTheDocument()
    expect(screen.getByText(/ลักษณะใกล้เคียง/)).toBeInTheDocument()
  })

  it('routes retake and candidate selection to handlers', () => {
    const h = renderResults()

    fireEvent.click(screen.getByText('ถ่ายรูปใหม่'))
    expect(h.handleRetake).toHaveBeenCalled()

    fireEvent.click(screen.getByText('กรองแสดงอะไหล่นี้ในตาราง'))
    expect(h.handleSelectCandidate).toHaveBeenCalledWith(bestMatch)
  })
})
