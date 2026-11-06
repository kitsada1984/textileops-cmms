import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { WorkOrdersMachineDatalist } from './WorkOrdersMachineDatalist'

// Characterization: lock the shared machines datalist exactly as WorkOrders rendered it.
describe('WorkOrdersMachineDatalist characterization', () => {
  it('renders an option per machine', () => {
    const { container } = render(<WorkOrdersMachineDatalist inUseMachines={[{ code: 'GK1-01', location: 'A' }]} />)

    expect(container.querySelector('option[value="GK1-01"]')).not.toBeNull()
  })

  it('renders nothing extra when empty', () => {
    const { container } = render(<WorkOrdersMachineDatalist inUseMachines={[]} />)

    expect(container.querySelectorAll('option').length).toBe(0)
  })
})
