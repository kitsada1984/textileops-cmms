import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { getTechSkillInfo, TechSkillBar } from './WorkOrderTechSkillBar'

// Characterization: lock the moved skill helpers exactly as WorkOrders had them.
describe('WorkOrderTechSkillBar characterization', () => {
  it('maps skill levels to labels', () => {
    expect(getTechSkillInfo('Master').label).toBe('Master')
    expect(getTechSkillInfo('Senior').label).toBe('Senior')
    expect(getTechSkillInfo('unknown-newbie').label).toBe('Junior')
  })

  it('renders the senior bar by default', () => {
    const { container } = render(<TechSkillBar />)

    expect(screen.getByText('Senior')).toBeInTheDocument()
    expect(container.querySelectorAll('.flex-1').length).toBe(4)
  })

  it('renders the master bar', () => {
    render(<TechSkillBar skillLevel="Master" />)

    expect(screen.getByText('Master')).toBeInTheDocument()
  })
})
