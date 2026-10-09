import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import SettingsPage from './SettingsPage'
import * as technicianSync from '../utils/technicianSync'
import * as lineUtils from '../utils/line'
import * as telegramUtils from '../utils/telegram'

// Mock dependencies
vi.mock('../contexts/LanguageContext', () => ({
  useT: () => ({ t: (k) => k }),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'admin', role: 'admin' },
    refreshUser: vi.fn(),
  }),
  hashPassword: vi.fn(),
}))

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}))

vi.mock('../api/dbClient', () => ({
  db: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
        then: (resolve) => Promise.resolve({ data: null, count: 0 }).then(resolve),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}))

vi.mock('../utils/line', () => ({
  fetchLineContacts: vi.fn().mockResolvedValue({ ok: true, contacts: [] }),
  loadLineSettings: vi.fn().mockReturnValue({
    provider: 'line_oa',
    channel_access_token: 'test_token',
    supervisors: [],
    needle_keepers: [],
    technicians: [{ name: 'ช่างบอย', user_id: 'U123456789' }],
  }),
  loadLineSettingsDB: vi.fn().mockResolvedValue({
    provider: 'line_oa',
    channel_access_token: 'test_token',
    supervisors: [],
    needle_keepers: [],
    technicians: [{ name: 'ช่างบอย', user_id: 'U123456789' }],
  }),
  saveLineSettingsDB: vi.fn().mockResolvedValue(undefined),
  saveLineSettings: vi.fn(),
  testLineNotification: vi.fn().mockResolvedValue({ ok: true }),
  DEFAULT_LINE_SETTINGS: {
    provider: 'line_oa',
    is_enabled: true,
    channel_access_token: '',
    supervisors: [],
    needle_keepers: [],
    technicians: [{ name: 'ช่างบอย', user_id: 'U123456789' }],
  },
}))

vi.mock('../utils/telegram', () => ({
  fetchTelegramContacts: vi.fn().mockResolvedValue({ ok: true, contacts: [] }),
  loadTelegramSettings: vi.fn().mockReturnValue({
    bot_token: 'test_tg_token',
    supervisors: [],
    needle_keepers: [],
    technicians: [{ name: 'ช่างเก่ง', chat_id: '998877' }],
  }),
  loadTelegramSettingsDB: vi.fn().mockResolvedValue({
    bot_token: 'test_tg_token',
    supervisors: [],
    needle_keepers: [],
    technicians: [{ name: 'ช่างเก่ง', chat_id: '998877' }],
  }),
  saveTelegramSettingsDB: vi.fn().mockResolvedValue(undefined),
  saveTelegramSettings: vi.fn(),
  testTelegram: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('../utils/technicianSync', () => ({
  syncNotificationTechsToRegistry: vi.fn().mockResolvedValue({
    createdCount: 1,
    updatedCount: 0,
    createdNames: ['ช่างบอย'],
    list: [],
  }),
}))

describe('SettingsPage - Technician Sync Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls syncNotificationTechsToRegistry when saving LINE settings', async () => {
    render(<SettingsPage />)

    // Wait for LINE technicians to load into form
    const boyInput = await screen.findByDisplayValue('ช่างบอย')
    expect(boyInput).toBeInTheDocument()

    const lineSaveBtn = screen.getByRole('button', { name: /บันทึกการตั้งค่า LINE/i })
    fireEvent.click(lineSaveBtn)

    await waitFor(() => {
      expect(lineUtils.saveLineSettingsDB).toHaveBeenCalled()
      expect(technicianSync.syncNotificationTechsToRegistry).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'ช่างบอย', user_id: 'U123456789' }),
        ]),
        'LINE'
      )
    })
  })

  it('calls syncNotificationTechsToRegistry when saving Telegram settings', async () => {
    render(<SettingsPage />)

    // Wait for Telegram technicians to load into form
    const kengInput = await screen.findByDisplayValue('ช่างเก่ง')
    expect(kengInput).toBeInTheDocument()

    const tgSaveBtn = screen.getByRole('button', { name: /^บันทึก$/i })
    fireEvent.click(tgSaveBtn)

    await waitFor(() => {
      expect(telegramUtils.saveTelegramSettingsDB).toHaveBeenCalled()
      expect(technicianSync.syncNotificationTechsToRegistry).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'ช่างเก่ง', chat_id: '998877' }),
        ]),
        'TELEGRAM'
      )
    })
  })
})
