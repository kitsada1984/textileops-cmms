import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PdfDataTable } from './PdfDataTable'

const notExcluded = () => false

const table = {
  title: 'รายการอะไหล่',
  headers: ['รายการ', 'จำนวน'],
  rows: [
    ['สายพาน A-42', 2],
    ['ตลับลูกปืน', 10],
  ],
}

// Locks the print-table alignment heuristic used by report PDFs.
describe('PdfDataTable', () => {
  it('right-aligns numeric columns and leaves text columns left', () => {
    const { container } = render(
      <PdfDataTable gateKey="table" table={table} themeAccent="#F2A900" isExcluded={notExcluded} />
    )

    const headers = container.querySelectorAll('thead th')
    const cells = container.querySelectorAll('tbody td')
    expect(headers[0].style.textAlign).toBe('left')
    expect(headers[1].style.textAlign).toBe('right')
    expect(cells[0].style.textAlign).toBe('left')
    expect(cells[1].style.textAlign).toBe('right')
  })

  it('renders nothing when the table is excluded', () => {
    const { container } = render(
      <PdfDataTable gateKey="table" table={table} isExcluded={() => true} />
    )

    expect(container.textContent).toBe('')
  })
})
