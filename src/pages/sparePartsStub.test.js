// Verbatim-move guard: pages stub must re-export the features implementation 1:1.
// Fails if someone edits the stub or adds logic to it.
import { describe, it, expect } from 'vitest'
import * as stub from './SpareParts.jsx'
import * as impl from '../features/spareparts/SpareParts.jsx'

describe('SpareParts pages stub (phase 8, no logic)', () => {
  it('re-exports the default component', () => {
    expect(stub.default).toBe(impl.default)
  })

  it('re-exports every named export with identical values', () => {
    const keys = Object.keys(impl).filter((k) => k !== 'default')
    expect(keys.length).toBeGreaterThan(0)
    for (const k of keys) {
      expect(stub[k], `stub export "${k}" must match impl`).toBe(impl[k])
    }
    const stubKeys = Object.keys(stub).filter((k) => k !== 'default' && k !== '__esModule')
    for (const k of stubKeys) {
      expect(keys, `stub must not add extra export "${k}"`).toContain(k)
    }
  })
})
