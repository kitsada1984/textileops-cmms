import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AppSplash } from './AppSplash'

// Characterization: lock the loading splash exactly as AppInner rendered it.
describe('AppSplash characterization', () => {
  it('shows the brand splash while auth resolves', () => {
    render(<AppSplash />)

    expect(screen.getByText('Gemma Knits')).toBeInTheDocument()
    expect(screen.getByText('CMMS Platform')).toBeInTheDocument()
    expect(screen.getByAltText('Gemma Knits')).toBeInTheDocument()
  })
})
