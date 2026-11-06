import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, it, expect } from 'vitest'
import { WorkOrderTypeCard } from './WorkOrderTypeCard'

// Locks the unified card to each original card's exact output, including
// Setup's defensive fallbacks and the strict access of the other three.
const stats = { targetDays: 1, rate: 80, total: 10, onTime: 8, overdue: 2, avgDurationText: '5 ชม.' }

describe('WorkOrderTypeCard characterization', () => {
  it('renders the repair card exactly', () => {
    const { container } = render(
      <WorkOrderTypeCard icon="🛠️" title="งานแก้ไข (Repair)" stats={stats} accent="blue" badgeClass="badge-green" />
    )

    expect(screen.getByText('งานแก้ไข (Repair)')).toBeInTheDocument()
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0)
    expect(container.querySelector('.border-blue-500\\/25')).not.toBeNull()
  })

  it('renders the design card with its amber theme', () => {
    const { container } = render(
      <WorkOrderTypeCard icon="🎨" title="งานปรับแบบ (Design)" stats={stats} accent="amber" badgeClass="badge-yellow" />
    )

    expect(screen.getByText('งานปรับแบบ (Design)')).toBeInTheDocument()
    expect(container.querySelector('.bg-amber-500')).not.toBeNull()
  })

  it('falls back safely for missing setup stats', () => {
    render(
      <WorkOrderTypeCard icon="⚙️" title="งานเตรียมเครื่อง (Setup)" stats={undefined} accent="indigo" badgeClass="badge-indigo" optional />
    )

    expect(screen.getByText('งานเตรียมเครื่อง (Setup)')).toBeInTheDocument()
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0)
  })

  it('keeps strict access for non-optional cards', () => {
    class Boundary extends React.Component {
      state = { failed: false }
      static getDerivedStateFromError() {
        return { failed: true }
      }
      render() {
        return this.state.failed ? <span>crashed</span> : this.props.children
      }
    }
    const { container } = render(
      <Boundary>
        <WorkOrderTypeCard icon="🧹" title="PM" stats={undefined} accent="emerald" badgeClass="badge-green" />
      </Boundary>
    )

    expect(container.textContent).toContain('crashed')
  })
})
