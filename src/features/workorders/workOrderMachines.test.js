import { describe, it, expect } from 'vitest'
import { matchActiveMachine, matchEditActiveMachine } from './workOrderMachines'

// Characterization: lock the moved machine matchers exactly as the
// WorkOrders memo bodies behaved (moved verbatim, params only).
const machines = [{ code: 'GK1-01', location: 'A' }]

describe('workOrderMachines characterization', () => {
  it('matches case-insensitively', () => {
    expect(matchActiveMachine(machines, 'gk1-01')).toEqual(machines[0])
  })

  it('returns null for blank input or no match', () => {
    expect(matchActiveMachine(machines, '  ')).toBeNull()
    expect(matchActiveMachine(machines, 'GK9-99')).toBeNull()
  })

  it('matches the edit form value defensively', () => {
    expect(matchEditActiveMachine(machines, 'GK1-01')).toEqual(machines[0])
    expect(matchEditActiveMachine(machines, undefined)).toBeNull()
    expect(matchEditActiveMachine(machines, '')).toBeNull()
  })
})
