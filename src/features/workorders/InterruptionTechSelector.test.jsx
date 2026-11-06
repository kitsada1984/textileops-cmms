import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InterruptionTechSelector } from './InterruptionTechSelector'

describe('InterruptionTechSelector', () => {
  it('renders assigned technicians and allows toggling them', () => {
    const onChangeSelectedTechs = vi.fn()
    render(
      <InterruptionTechSelector
        assignedTechs={['ช่างสมชาย', 'ช่างวิชัย']}
        selectedTechs={['ช่างสมชาย']}
        onChangeSelectedTechs={onChangeSelectedTechs}
        noTechRemaining={false}
      />
    )

    expect(screen.getByText('ช่างสมชาย')).toBeInTheDocument()
    expect(screen.getByText('ช่างวิชัย')).toBeInTheDocument()

    // Clicking unselected technician
    fireEvent.click(screen.getByText('ช่างวิชัย'))
    expect(onChangeSelectedTechs).toHaveBeenCalledWith(['ช่างสมชาย', 'ช่างวิชัย'])
  })

  it('shows no-tech-remaining warning when all technicians are pulled', () => {
    render(
      <InterruptionTechSelector
        assignedTechs={['ช่างสมชาย']}
        selectedTechs={['ช่างสมชาย']}
        onChangeSelectedTechs={vi.fn()}
        noTechRemaining={true}
      />
    )

    expect(screen.getByText(/ไม่มีช่างอยู่ประจำเครื่องนี้แล้ว/i)).toBeInTheDocument()
    expect(screen.getByText(/ระบบจะหยุดนับเวลาทำงานชั่วคราว/i)).toBeInTheDocument()
  })

  it('shows remaining technicians when only a subset is pulled', () => {
    render(
      <InterruptionTechSelector
        assignedTechs={['ช่างสมชาย', 'ช่างวิชัย']}
        selectedTechs={['ช่างสมชาย']}
        onChangeSelectedTechs={vi.fn()}
        noTechRemaining={false}
      />
    )

    expect(screen.getByText(/ยังมีช่างประจำเครื่องทำงานอยู่ 1 ท่าน/i)).toBeInTheDocument()
    expect(screen.getByText('(ช่างวิชัย)')).toBeInTheDocument()
  })
})
