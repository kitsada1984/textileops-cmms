import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Presentation, { LANDING_SECTIONS } from './Presentation'

const mockedNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  }
})

class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

describe('Presentation Component (Executive Pitch Landing Page)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.IntersectionObserver = MockIntersectionObserver
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('renders all 7 executive landing page sections and Hero KPI metrics', () => {
    const { container } = render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    expect(LANDING_SECTIONS).toHaveLength(7)
    LANDING_SECTIONS.forEach((sec) => {
      expect(container.querySelector(`#${sec.id}`)).not.toBeNull()
    })

    expect(screen.getByText(/GEMMA KNITS · TEXTILEOPS/i)).toBeInTheDocument()
    expect(screen.getByText(/Gemma Knits Operational Excellence/i)).toBeInTheDocument()
    expect(screen.getByText(/-30%/i)).toBeInTheDocument()
    expect(screen.getAllByText(/99\.5%/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/100%/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders all 3 signature innovations including 20x7 cm and A4 Smart Tags', () => {
    render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    expect(screen.getByText(/Match 98\.4%/i)).toBeInTheDocument()
    expect(screen.getByText(/Yarn Feeder Unit/i)).toBeInTheDocument()
    expect(screen.getByText(/LINE Flex Notification/i)).toBeInTheDocument()
    expect(screen.getByText(/20 × 7 cm/i)).toBeInTheDocument()
    expect(screen.getByText(/A4 แนวนอน/i)).toBeInTheDocument()
  })

  it('scrolls smoothly to target section when clicking sticky navbar anchor pills', () => {
    render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    const roiNavButtons = screen.getAllByRole('button', { name: /ผลลัพธ์ ROI/i })
    fireEvent.click(roiNavButtons[0])

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
  })

  it('opens contextual Speaker Notes drawer, syncs with selected section, and closes on Escape', async () => {
    render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    const notesBtn = screen.getByTitle(/เปิด\/ปิดสคริปต์ผู้บรรยาย/i)
    fireEvent.click(notesBtn)

    expect(screen.getByText(/สคริปต์ผู้บรรยาย \(Speaker Notes\)/i)).toBeInTheDocument()
    expect(screen.getByText(/กราบเรียนท่านผู้บริหารทุกท่าน/i)).toBeInTheDocument()

    // Jump to ROI section and verify contextual script updates
    const roiNavButtons = screen.getAllByRole('button', { name: /ผลลัพธ์ ROI/i })
    fireEvent.click(roiNavButtons[0])
    expect(screen.getByText(/หมวดปัจจุบัน: ผลลัพธ์ ROI/i)).toBeInTheDocument()
    expect(screen.getByText(/Unplanned Downtime ลงได้ 25 ถึง 35%/i)).toBeInTheDocument()

    // Close via Escape key (AnimatePresence exit transition completes asynchronously)
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByText(/สคริปต์ผู้บรรยาย \(Speaker Notes\)/i)).not.toBeInTheDocument()
    })
  })

  it('toggles delayed animation mode and supports replay button', () => {
    render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    const motionBtn = screen.getByTitle(/เปิด\/ปิดโหมดอนิเมชั่นหน่วงเวลา/i)
    expect(motionBtn).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/อนิเมชั่น: เปิด/i)).toBeInTheDocument()

    fireEvent.click(motionBtn)
    expect(motionBtn).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText(/อนิเมชั่น: ปิด/i)).toBeInTheDocument()

    const replayBtn = screen.getByTitle(/เล่นอนิเมชั่นเปิดตัวซ้ำ/i)
    fireEvent.click(replayBtn)
    expect(screen.getByText(/GEMMA KNITS · TEXTILEOPS/i)).toBeInTheDocument()
  })

  it('launches Live App in new tab and handles Return button back to /', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    const launchBtn = screen.getByRole('button', {
      name: /เปิดระบบจริงเพื่อสาธิต \(Launch Live App\)/i,
    })
    fireEvent.click(launchBtn)
    expect(openSpy).toHaveBeenCalledWith('/', '_blank')

    const closeBtn = screen.getByTitle(/กลับสู่หน้าหลัก TextileOps/i)
    fireEvent.click(closeBtn)
    expect(mockedNavigate).toHaveBeenCalledWith('/')

    openSpy.mockRestore()
  })

  it('allows interactive step navigation in the QR Scan-to-Repair simulator', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    // Step 1: Scan Tag Viewfinder is active by default
    expect(screen.getByText(/Smart Tag Scanner Active/i)).toBeInTheDocument()
    expect(screen.getByText(/ตรวจพบเครื่องจักร MC-12/i)).toBeInTheDocument()

    // Step 2: Click to select symptom
    const step2Tab = screen.getByRole('button', { name: /2\. อาการ/i })
    fireEvent.click(step2Tab)
    expect(screen.getByText(/เลือกอาการเสียด่วน \(MC-12\):/i)).toBeInTheDocument()

    // Select alternative symptom
    const cylinderSymptom = screen.getByText(/รอบกระบอกสะดุด/i)
    fireEvent.click(cylinderSymptom)

    // Step 4: Jump to LINE alert view
    const step4Tab = screen.getByRole('button', { name: /4\. เตือน LINE/i })
    fireEvent.click(step4Tab)
    expect(screen.getByText(/รอบกระบอกสะดุด/i)).toBeInTheDocument()
    expect(screen.getByText(/⚡ กดรับงานซ่อมนี้ทันที/i)).toBeInTheDocument()

    // Click direct link to /repair/MC-12
    const liveRepairBtn = screen.getByRole('button', {
      name: /เปิดฟอร์มจริง/i,
    })
    fireEvent.click(liveRepairBtn)
    expect(openSpy).toHaveBeenCalledWith('/repair/MC-12', '_blank')

    openSpy.mockRestore()
  })

  it('enforces overflow-x clip on root, header, and all sections and supports tapping the MC-12 QR tag directly', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    const { container } = render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    const rootEl = container.firstElementChild
    const headerEl = container.querySelector('header')
    expect(rootEl.style.overflowX).toBe('clip')
    expect(headerEl.style.overflowX).toBe('clip')

    LANDING_SECTIONS.forEach((sec) => {
      const sectionEl = container.querySelector(`#${sec.id}`)
      expect(sectionEl).not.toBeNull()
      expect(sectionEl.style.overflowX).toBe('clip')
    })

    // Tapping the green 20x7cm MC-12 QR tag inside Step 1 viewfinder advances directly to Step 2
    const qrTagButton = screen.getByTitle(/แตะที่ป้าย QR เครื่อง MC-12 เพื่อจำลองการสแกนทันที/i)
    expect(qrTagButton).toBeInTheDocument()
    fireEvent.click(qrTagButton)
    expect(screen.getByText(/เลือกอาการเสียด่วน \(MC-12\):/i)).toBeInTheDocument()

    // Jump to Step 4 and verify the LINE Flex CTA button also opens /repair/MC-12
    fireEvent.click(screen.getByRole('button', { name: /4\. เตือน LINE/i }))
    const acceptRepairCta = screen.getByRole('button', { name: /⚡ กดรับงานซ่อมนี้ทันที/i })
    fireEvent.click(acceptRepairCta)
    expect(openSpy).toHaveBeenCalledWith('/repair/MC-12', '_blank')

    openSpy.mockRestore()
  })

  it('enforces 10 mobile-first responsive architecture rules (presentation-page, pres-tab-strip, scoped CSS)', () => {
    const { container } = render(
      <MemoryRouter>
        <Presentation />
      </MemoryRouter>
    )

    const rootEl = container.firstElementChild
    expect(rootEl.classList.contains('presentation-page')).toBe(true)

    const tabStrip = container.querySelector('.pres-tab-strip')
    expect(tabStrip).not.toBeNull()

    const styleEl = container.querySelector('style')
    expect(styleEl).not.toBeNull()
    expect(styleEl.textContent).toContain('box-sizing: border-box !important')
    expect(styleEl.textContent).toContain('overflow-x: hidden !important')
    expect(styleEl.textContent).toContain('overflow-wrap: anywhere')
  })
})
