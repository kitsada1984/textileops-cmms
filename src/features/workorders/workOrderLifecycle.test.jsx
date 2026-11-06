import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const subscribe = vi.fn(() => ({ unsubscribe }))
const unsubscribe = vi.fn()
let changeHandler = null
const on = vi.fn((...args) => {
  changeHandler = args[args.length - 1]
  return { subscribe }
})

vi.mock('../../api/dbClient', () => ({
  db: {
    channel: vi.fn(() => ({ on, subscribe, unsubscribe })),
  },
}))

import {
  useDefaultTabSync,
  useDeepLinkSearch,
  useTechLoader,
  useTechRealtimeSync,
} from './workOrderLifecycle'
import { db } from '../../api/dbClient'

// Behavior locks: the moved effects must run exactly as the in-component
// versions did — same timing, same guards, same cleanup.
function probe(hook, ...args) {
  function Probe() {
    hook(...args)
    return null
  }
  return render(<Probe />)
}

describe('workOrderLifecycle behavior', () => {
  it('syncs an explicit default tab', () => {
    const setCurrentTab = vi.fn()
    probe(useDefaultTabSync, 'dashboard', setCurrentTab)

    expect(setCurrentTab).toHaveBeenCalledWith('dashboard')
  })

  it('reads the deep-link job param', () => {
    const setSearch = vi.fn()
    window.history.replaceState({}, '', '?job=JOB-9')
    probe(useDeepLinkSearch, setSearch)
    expect(setSearch).toHaveBeenCalledWith('JOB-9')

    window.history.replaceState({}, '', '/')
    const setSearch2 = vi.fn()
    probe(useDeepLinkSearch, setSearch2)
    expect(setSearch2).not.toHaveBeenCalled()
  })

  it('loads tech data on mount', () => {
    const load = vi.fn()
    probe(useTechLoader, 'records', load)

    expect(load).toHaveBeenCalledTimes(1)
  })

  it('subscribes to realtime and reloads on db changes', () => {
    const load = vi.fn()
    probe(useTechRealtimeSync, load)

    expect(db.channel).toHaveBeenCalledWith('workorders_tech_realtime')
    expect(subscribe).toHaveBeenCalled()
    changeHandler()
    expect(load).toHaveBeenCalled()
  })

  it('unsubscribes and removes listeners on unmount', () => {
    const load = vi.fn()
    const view = probe(useTechRealtimeSync, load)
    view.unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })
})
