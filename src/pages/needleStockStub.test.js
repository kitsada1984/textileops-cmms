// Verbatim-move guard: pages stub must re-export the features implementation 1:1.
// Fails if someone edits the stub or adds logic to it.
import { describe, it, expect } from 'vitest'
import * as stub from './NeedleStock.jsx'
import * as impl from '../features/needlestock/NeedleStock.jsx'

describe('NeedleStock pages stub (phase 4, no logic)', () => {
  it('re-exports the default component', () => {
    expect(stub.default).toBe(impl.default)
  })

  it('adds no extra named exports beyond the implementation', () => {
    const implKeys = Object.keys(impl).filter((k) => k !== 'default')
    const stubKeys = Object.keys(stub).filter((k) => k !== 'default' && k !== '__esModule')
    for (const k of stubKeys) {
      expect(implKeys, `stub must not add extra export "${k}"`).toContain(k)
    }
  })
})
