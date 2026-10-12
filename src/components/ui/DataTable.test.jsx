import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DataTable } from './DataTable'
import { useDataTable } from '../../hooks/useDataTable'

const sampleColumns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'ชื่อเครื่อง' },
  { accessorKey: 'status', header: 'สถานะ' },
]

const sampleData = [
  { id: '1', name: 'MC-01', status: 'RUNNING' },
  { id: '2', name: 'MC-02', status: 'MAINTENANCE' },
  { id: '3', name: 'MC-03', status: 'STOP' },
]

describe('DataTable UI Component - TanStack Table v8', () => {
  it('renders headers and data rows correctly with direct props', () => {
    render(<DataTable data={sampleData} columns={sampleColumns} />)

    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('ชื่อเครื่อง')).toBeInTheDocument()
    expect(screen.getByText('สถานะ')).toBeInTheDocument()

    expect(screen.getByText('MC-01')).toBeInTheDocument()
    expect(screen.getByText('MC-02')).toBeInTheDocument()
    expect(screen.getByText('MC-03')).toBeInTheDocument()
  })

  it('renders loading state when loading is true', () => {
    render(<DataTable data={sampleData} columns={sampleColumns} loading={true} />)

    expect(screen.getAllByText('กำลังโหลดข้อมูล...').length).toBeGreaterThan(0)
    expect(screen.queryByText('MC-01')).not.toBeInTheDocument()
  })

  it('renders empty message when data is empty', () => {
    render(<DataTable data={[]} columns={sampleColumns} emptyMessage="ไม่มีข้อมูลรายการ" />)

    expect(screen.getByText('ไม่มีข้อมูลรายการ')).toBeInTheDocument()
  })

  it('fires onRowClick callback when a row is clicked', () => {
    const handleRowClick = vi.fn()
    render(<DataTable data={sampleData} columns={sampleColumns} onRowClick={handleRowClick} />)

    fireEvent.click(screen.getByText('MC-02'))
    expect(handleRowClick).toHaveBeenCalledTimes(1)
    expect(handleRowClick).toHaveBeenCalledWith(sampleData[1], 1, expect.any(Object))
  })

  it('renders and operates pagination toolbar correctly', () => {
    // 5 items, page size 2
    const manyItems = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
      { id: '4', name: 'Item 4' },
      { id: '5', name: 'Item 5' },
    ]
    const cols = [{ accessorKey: 'id', header: 'ID' }, { accessorKey: 'name', header: 'Name' }]

    function TestPaginatedTable() {
      const { table } = useDataTable({
        data: manyItems,
        columns: cols,
        initialPageSize: 2,
      })
      return <DataTable table={table} />
    }

    const { container } = render(<TestPaginatedTable />)

    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.queryByText('Item 3')).not.toBeInTheDocument()

    expect(container.textContent).toContain('แสดง 1 - 2 จากทั้งหมด 5 รายการ')

    // Click next page
    const nextBtn = screen.getByTitle('หน้าถัดไป')
    fireEvent.click(nextBtn)

    expect(screen.getByText('Item 3')).toBeInTheDocument()
    expect(screen.getByText('Item 4')).toBeInTheDocument()
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
  })

  it('applies compact density styles when density prop is compact', () => {
    const { container } = render(
      <DataTable data={sampleData} columns={sampleColumns} density="compact" />
    )

    const cell = container.querySelector('td')
    expect(cell?.className).toContain('py-1.5 px-2.5 text-[11px]')
  })

  it('reads density automatically from Zustand useUIStore', async () => {
    const { useUIStore } = await import('../../stores/useUIStore')
    act(() => {
      useUIStore.getState().setTableDensity('compact')
    })

    const { container } = render(<DataTable data={sampleData} columns={sampleColumns} />)
    const cell = container.querySelector('td')
    expect(cell?.className).toContain('py-1.5 px-2.5 text-[11px]')

    // Reset back to comfortable
    act(() => {
      useUIStore.getState().setTableDensity('comfortable')
    })
  })

  it('renders th with scope="col" and keyboard navigable rows', () => {
    const handleRowClick = vi.fn()
    const { container } = render(
      <DataTable data={sampleData} columns={sampleColumns} onRowClick={handleRowClick} />
    )

    const ths = container.querySelectorAll('th')
    expect(ths.length).toBeGreaterThan(0)
    ths.forEach((th) => {
      expect(th.getAttribute('scope')).toBe('col')
    })

    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBe(3)
    expect(rows[0].getAttribute('tabindex')).toBe('0')

    // Press Enter on the first row
    fireEvent.keyDown(rows[0], { key: 'Enter' })
    expect(handleRowClick).toHaveBeenCalledTimes(1)
  })
})
