import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PdfReportCover } from './PdfReportCover'
import { PdfSummaryCards } from './PdfSummaryCards'
import { PdfReportChart } from './PdfReportChart'

// Locks the report extras: cover page, summary cards, bar chart.
describe('PdfReportCover', () => {
  it('renders nothing without a cover', () => {
    const { container } = render(<PdfReportCover cover={null} currentDateStr="01/01/2026" />)

    expect(container.textContent).toBe('')
  })

  it('shows the title and doc meta', () => {
    render(<PdfReportCover cover={{ title: 'รายงานซ่อม', docNo: 'R-1' }} currentDateStr="06/11/2026" />)

    expect(screen.getByText('รายงานซ่อม')).toBeInTheDocument()
    expect(screen.getByText('R-1')).toBeInTheDocument()
    expect(screen.getByText('06/11/2026')).toBeInTheDocument()
  })
})

describe('PdfSummaryCards', () => {
  it('renders nothing when empty', () => {
    const { container } = render(<PdfSummaryCards items={[]} />)

    expect(container.textContent).toBe('')
  })

  it('highlights key numbers', () => {
    const { container } = render(
      <PdfSummaryCards items={[{ label: 'ทั้งหมด', value: 8 }, { label: 'เกินเป้า', value: 2, highlight: true }]} />
    )

    expect(screen.getByText('8')).toBeInTheDocument()
    const cards = container.querySelectorAll('.grid > div')
    expect(cards[1].getAttribute('style')).toContain('rgb(242, 169, 0)')
  })

  it('renders up/down arrows for signed numbers', () => {
    const { container } = render(
      <PdfSummaryCards items={[{ label: 'เพิ่ม', value: 8, trend: 12 }, { label: 'ลด', value: 2, trend: -3 }]} />
    )

    expect(container.textContent).toContain('▲12%')
    expect(container.textContent).toContain('▼3%')
  })

  it('renders a flat marker for zero and the flat keyword', () => {
    const { container } = render(
      <PdfSummaryCards items={[{ label: 'คงที่', value: 8, trend: 0 }, { label: 'คงที่', value: 2, trend: 'flat' }]} />
    )

    expect(container.textContent).toContain('–0%')
    expect(container.textContent.match(/–/g)).toHaveLength(2)
  })

  it('ignores unparseable trends', () => {
    const { container } = render(
      <PdfSummaryCards items={[{ label: 'ไม่ทราบ', value: 8, trend: 'N/A' }]} />
    )

    expect(container.textContent).not.toContain('▲')
    expect(container.textContent).not.toContain('▼')
  })
})

describe('PdfReportChart', () => {
  it('renders nothing without data', () => {
    const { container } = render(<PdfReportChart chart={null} />)

    expect(container.textContent).toBe('')
  })

  it('draws one bar per row with values', () => {
    const { container } = render(
      <PdfReportChart chart={{ title: 'ตามประเภท', data: [{ label: 'ซ่อม', value: 4 }, { label: 'PM', value: 2 }] }} />
    )

    expect(container.querySelectorAll('rect').length).toBe(2)
    expect(screen.getByText('ตามประเภท')).toBeInTheDocument()
  })
})
