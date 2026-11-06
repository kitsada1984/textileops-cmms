import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PdfPreviewModal from './PdfPreviewModal'

// Integration smoke: cover + summary + chart render inside the sheet
// without changing default output (all three default to off/empty).
describe('PdfPreviewModal report extras', () => {
  it('renders plainly by default', () => {
    const { container } = render(
      <PdfPreviewModal open onClose={() => {}} title="เอกสารทดสอบ" sections={[]} />
    )

    expect(screen.getAllByText('เอกสารทดสอบ').length).toBeGreaterThan(0)
    expect(container.textContent).not.toContain('หน้า')
  })

  it('renders cover, summary, chart, and footer when provided', () => {
    render(
      <PdfPreviewModal
        open
        onClose={() => {}}
        title="รายงานซ่อม"
        docNo="R-1"
        cover={{ title: 'รายงานซ่อม', docNo: 'R-1' }}
        summary={[{ label: 'ทั้งหมด', value: 8, highlight: true }]}
        chart={{ title: 'ตามประเภท', data: [{ label: 'ซ่อม', value: 4 }] }}
        sections={[]}
      />
    )

    expect(screen.getAllByText('รายงานซ่อม').length).toBeGreaterThan(0)
    expect(screen.getByText('ตามประเภท')).toBeInTheDocument()
    expect(document.body.innerHTML).toContain('counter(pages)')
  })

  it('suggests the spec filename on print', () => {
    vi.useFakeTimers()
    render(<PdfPreviewModal open onClose={() => {}} title="เอกสารทดสอบ" sections={[]} />)
    const prev = document.title
    window.print = vi.fn()

    screen.getByText('พิมพ์เอกสาร / บันทึก PDF (A4)').click()
    expect(document.title).toMatch(/^report_\d{4}-\d{2}-\d{2}\.pdf$/)

    vi.runAllTimers()
    expect(document.title).toBe(prev)
    vi.useRealTimers()
  })
})
