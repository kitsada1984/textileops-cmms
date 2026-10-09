import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Card from './Card'
import { Cpu } from 'lucide-react'

describe('Card Component - React Composition Patterns', () => {
  it('renders correctly as compound components', () => {
    render(
      <Card>
        <Card.Header action={<button type="button">Edit</button>}>
          <Card.Title icon={Cpu}>Machine Status Card</Card.Title>
        </Card.Header>
        <Card.Body>
          <p>Machine operational metrics</p>
        </Card.Body>
        <Card.Footer>
          <span>Last updated: just now</span>
        </Card.Footer>
      </Card>
    )

    expect(screen.getByText('Machine Status Card')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Machine operational metrics')).toBeInTheDocument()
    expect(screen.getByText('Last updated: just now')).toBeInTheDocument()
  })

  it('renders simple card with custom children', () => {
    render(
      <Card className="custom-test-card">
        <p>Simple content</p>
      </Card>
    )

    expect(screen.getByText('Simple content')).toBeInTheDocument()
  })
})
