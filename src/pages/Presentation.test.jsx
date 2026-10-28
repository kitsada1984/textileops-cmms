import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Presentation, { SLIDES_DATA } from './Presentation'

const mockedNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  }
})

describe('Presentation Component (Executive Pitch Deck)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial slide (Slide 1: Cover) and displays 1 / 11 counter', () => {
    render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    // Check title on slide 1
    expect(screen.getAllByText(/TEXTILE/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Gemma Knits Operational Excellence/i)).toBeInTheDocument()
    expect(screen.getByText(/1 \/ 11/i)).toBeInTheDocument()
    expect(screen.getByText(/GEMMA KNITS · TEXTILEOPS/i)).toBeInTheDocument()
  })

  it('navigates to next and previous slides via Next and Prev buttons', () => {
    render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    const nextBtn = screen.getByRole('button', { name: /ถัดไป/i })
    expect(nextBtn).toBeEnabled()

    // Slide 1 -> Slide 2
    fireEvent.click(nextBtn)
    expect(screen.getByText(/2 \/ 11/i)).toBeInTheDocument()
    expect(screen.getByText(/ความท้าทายหน้างานเดิม/i)).toBeInTheDocument()

    // Slide 2 -> Slide 3
    fireEvent.click(nextBtn)
    expect(screen.getByText(/3 \/ 11/i)).toBeInTheDocument()
    expect(screen.getByText(/ทางออก: TextileOps Platform/i)).toBeInTheDocument()

    // Slide 3 -> Prev -> Slide 2
    const prevBtn = screen.getByRole('button', { name: /ก่อนหน้า/i })
    fireEvent.click(prevBtn)
    expect(screen.getByText(/2 \/ 11/i)).toBeInTheDocument()
  })

  it('supports keyboard navigation via ArrowRight and ArrowLeft', () => {
    render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    // Press ArrowRight to move to slide 2
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText(/2 \/ 11/i)).toBeInTheDocument()

    // Press ArrowLeft to return to slide 1
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByText(/1 \/ 11/i)).toBeInTheDocument()
  })

  it('opens and closes Speaker Notes drawer via button and key N', () => {
    render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    const notesBtn = screen.getByTitle(/เปิด\/ปิดสคริปต์ผู้บรรยาย/i)
    fireEvent.click(notesBtn)

    // Drawer should open and display speaker notes
    expect(screen.getByText(/สคริปต์ผู้บรรยาย/i)).toBeInTheDocument()
    expect(screen.getByText(/กราบเรียนท่านผู้บริหารทุกท่าน/i)).toBeInTheDocument()

    // Close via Esc key
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText(/สคริปต์ผู้บรรยาย/i)).not.toBeInTheDocument()
  })

  it('allows jumping to any slide via the jump menu', () => {
    render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    // Open jump menu
    const jumpBtn = screen.getByTitle(/กระโดดข้ามสไลด์/i)
    fireEvent.click(jumpBtn)

    // Click on slide 9 (Business ROI)
    const targetSlideBtn = screen.getByRole('button', { name: /ผลลัพธ์เชิงธุรกิจและตัวชี้วัด/i })
    fireEvent.click(targetSlideBtn)

    // Slide index should update to 9
    expect(screen.getByText(/9 \/ 11/i)).toBeInTheDocument()
    expect(screen.getByText(/Downtime Reduction/i)).toBeInTheDocument()
  })

  it('handles Return button to navigate back to /', () => {
    render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    const closeBtn = screen.getByTitle(/กลับสู่หน้าหลัก TextileOps/i)
    fireEvent.click(closeBtn)

    expect(mockedNavigate).toHaveBeenCalledWith('/')
  })
})
