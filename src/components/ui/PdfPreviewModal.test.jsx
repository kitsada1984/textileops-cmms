import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PdfPreviewModal from './PdfPreviewModal'

// Characterization: lock the PDF preview shell before splitting blocks out.
describe('PdfPreviewModal characterization', () => {
  const base = {
    open: true,
    onClose: vi.fn(),
    docType: 'machine',
    title: 'ใบรายงานเครื่องจักร',
    docNo: 'DOC-1',
    sections: [{ title: 'ข้อมูลทั่วไป', fields: [{ label: 'MC', value: 'DA-1' }] }],
    signatories: [{ title: 'ผู้จัดทำ', name: 'ช่างA', date: '2026-01-01' }],
  }

  it('renders the top bar with doc identity', () => {
    render(<PdfPreviewModal {...base} />)

    expect(screen.getAllByText('ใบรายงานเครื่องจักร').length).toBeGreaterThan(0)
    expect(screen.getAllByText('DOC-1').length).toBeGreaterThan(0)
  })

  it('toggles a section off through the picker bar', () => {
    render(<PdfPreviewModal {...base} remarks="หมายเหตุทดสอบ" />)

    fireEvent.click(screen.getByText('พิมพ์ทั้งหมด'))
    expect(screen.getByText('พิมพ์ทั้งหมด')).toBeInTheDocument()
  })

  it('renders detail tables with headers and rows', () => {
    render(
      <PdfPreviewModal
        {...base}
        tableData={{ title: 'ตารางทดสอบ', headers: ['H1'], rows: [['C1']] }}
      />
    )

    expect(screen.getByText('ตารางทดสอบ')).toBeInTheDocument()
    expect(screen.getByText('H1')).toBeInTheDocument()
    expect(screen.getByText('C1')).toBeInTheDocument()
  })

  it('renders signatures with fallback dots', () => {
    render(<PdfPreviewModal {...base} />)

    expect(screen.getByText('ช่างA')).toBeInTheDocument()
  })
})
