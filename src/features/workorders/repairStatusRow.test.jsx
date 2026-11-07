import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RepairStatusRow } from './repairStatusRow.jsx'

describe('RepairStatusRow', () => {
  it('shows active repair statuses and hides completed', () => {
    render(<RepairStatusRow byStatus={{ PENDING: 2, IN_PROGRESS: 1, WAIT_PARTS: 0, COMPLETED: 5 }} STATUS_CFG={{}} />)

    expect(screen.getByText('รอแก้ไข')).toBeInTheDocument()
    expect(screen.getByText('กำลังแก้ไข')).toBeInTheDocument()
    expect(screen.getByText('รออะไหล่')).toBeInTheDocument()
    expect(screen.queryByText('แก้ไขสำเร็จ')).not.toBeInTheDocument()
  })
})
