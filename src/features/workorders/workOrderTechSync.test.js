import { describe, it, expect, vi } from 'vitest'

const upsert = vi.fn().mockResolvedValue({})
const maybeSingle = vi.fn().mockResolvedValue({ data: null })

vi.mock('../../api/dbClient', () => ({
  db: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle })),
      })),
      upsert,
    })),
  },
}))

import { syncTechToNotifications } from './workOrderTechSync.js'

// Behavior lock: the moved sync must upsert LINE + Telegram configs
// exactly as the in-component version did.
describe('workOrderTechSync behavior', () => {
  it('upserts both notification configs from the tech list', async () => {
    await syncTechToNotifications([{ Name: 'ช่างA', Line_ID: ' L1 ', Telegram_ID: '' }])

    expect(upsert).toHaveBeenCalledTimes(2)
    const lineCall = upsert.mock.calls[0][0]
    expect(lineCall.key).toBe('line_settings')
    expect(JSON.parse(lineCall.value).technicians).toEqual([{ name: 'ช่างA', user_id: 'L1' }])
    const tgCall = upsert.mock.calls[1][0]
    expect(tgCall.key).toBe('telegram_settings')
    expect(JSON.parse(tgCall.value).technicians).toEqual([{ name: 'ช่างA', chat_id: '' }])
  })

  it('survives db failures without throwing', async () => {
    maybeSingle.mockRejectedValueOnce(new Error('db down'))

    await expect(syncTechToNotifications([])).resolves.toBeUndefined()
  })
})
