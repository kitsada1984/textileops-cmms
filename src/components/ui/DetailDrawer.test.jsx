import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DetailDrawer from './DetailDrawer'
import { Cpu, Printer } from 'lucide-react'

describe('DetailDrawer - React Composition Patterns', () => {
  it('renders correctly with legacy props (backward compatibility)', () => {
    const handleClose = vi.fn()
    const handleEdit = vi.fn()
    const handleDelete = vi.fn()
    const handlePdf = vi.fn()

    render(
      <DetailDrawer
        open={true}
        onClose={handleClose}
        title="CYL-001"
        subtitle="ตำแหน่ง: แถว A"
        icon={Cpu}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPdf={handlePdf}
        extraActions={<button type="button">Extra Action</button>}
        groups={[
          {
            label: 'ข้อมูลทั่วไป',
            fields: [
              { label: 'Serial', value: 'SN-12345', mono: true },
              { label: 'สถานะ', value: 'พร้อมใช้งาน' },
            ],
          },
        ]}
      />
    )

    expect(screen.getByText('CYL-001')).toBeInTheDocument()
    expect(screen.getByText('ตำแหน่ง: แถว A')).toBeInTheDocument()
    expect(screen.getByText('ข้อมูลทั่วไป')).toBeInTheDocument()
    expect(screen.getByText('SN-12345')).toBeInTheDocument()
    expect(screen.getByText('พร้อมใช้งาน')).toBeInTheDocument()
    expect(screen.getByText('แก้ไข')).toBeInTheDocument()
    expect(screen.getByText('PDF / พิมพ์')).toBeInTheDocument()
    expect(screen.getByText('Extra Action')).toBeInTheDocument()

    // Test actions
    fireEvent.click(screen.getByText('แก้ไข'))
    expect(handleEdit).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('PDF / พิมพ์'))
    expect(handlePdf).toHaveBeenCalledTimes(1)

    // Close button
    const closeBtn = screen.getByTitle('ปิดหน้าต่าง')
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('renders correctly as compound components', () => {
    const handleClose = vi.fn()

    render(
      <DetailDrawer open={true} onClose={handleClose}>
        <DetailDrawer.Header title="Compound CYL" subtitle="Sub info" icon={Cpu}>
          <DetailDrawer.Actions>
            <button type="button">Custom Compound Button</button>
          </DetailDrawer.Actions>
        </DetailDrawer.Header>
        <DetailDrawer.Body>
          <DetailDrawer.Section label="Section 1">
            <DetailDrawer.Field label="Field A" value="Value A" />
            <DetailDrawer.Field label="Field B">
              <span>Custom React Node</span>
            </DetailDrawer.Field>
          </DetailDrawer.Section>
        </DetailDrawer.Body>
      </DetailDrawer>
    )

    expect(screen.getByText('Compound CYL')).toBeInTheDocument()
    expect(screen.getByText('Sub info')).toBeInTheDocument()
    expect(screen.getByText('Custom Compound Button')).toBeInTheDocument()
    expect(screen.getByText('Section 1')).toBeInTheDocument()
    expect(screen.getByText('Field A')).toBeInTheDocument()
    expect(screen.getByText('Value A')).toBeInTheDocument()
    expect(screen.getByText('Custom React Node')).toBeInTheDocument()
  })

  it('returns null when open is false', () => {
    const { container } = render(
      <DetailDrawer open={false} onClose={() => {}} title="Closed Drawer" />
    )
    expect(screen.queryByText('Closed Drawer')).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })
})
