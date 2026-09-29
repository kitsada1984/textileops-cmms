import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GoogleSheetSyncButton from './GoogleSheetSyncButton'

const syncRowsToGoogleSheet = vi.hoisted(() => vi.fn(async () => ({ sheetName: 'กระบอก', rowCount: 1 })))
vi.mock('../../utils/googleSheetsSync', () => ({ syncRowsToGoogleSheet }))

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('./Toast', () => ({ useToast: () => toast }))

const COLUMNS = [{ key: 'Serial_NOW', label: 'ซีเรียล' }]

function setup(props = {}) {
  return render(
    <GoogleSheetSyncButton
      sheetName="กระบอก"
      columns={COLUMNS}
      rows={[{ Serial_NOW: 'A1' }]}
      {...props}
    />
  )
}

describe('GoogleSheetSyncButton', () => {
  beforeEach(() => {
    syncRowsToGoogleSheet.mockClear()
    toast.success.mockClear()
    toast.error.mockClear()
  })

  it('syncs without asking when every row is sent', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    setup({ totalCount: 1 })
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(syncRowsToGoogleSheet).toHaveBeenCalledTimes(1))
    expect(confirm).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('asks before overwriting the sheet with a filtered subset', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    setup({ totalCount: 122 })
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(syncRowsToGoogleSheet).toHaveBeenCalledTimes(1))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(String(confirm.mock.calls[0][0])).toContain('1 จาก 122')
    confirm.mockRestore()
  })

  it('cancels the sync when the filtered warning is declined', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    setup({ totalCount: 122 })
    fireEvent.click(screen.getByRole('button'))
    await new Promise((r) => setTimeout(r, 20))
    expect(syncRowsToGoogleSheet).not.toHaveBeenCalled()
    confirm.mockRestore()
  })
})
