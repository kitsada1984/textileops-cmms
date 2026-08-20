import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetGoogleDriveUploadCache, uploadImageToGoogleDrive } from './googleDriveUpload'

class MockFileReader {
  readAsDataURL() {
    this.result = 'data:image/png;base64,QUJD'
    this.onload?.()
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.stubGlobal('FileReader', MockFileReader)
  __resetGoogleDriveUploadCache()
})

describe('uploadImageToGoogleDrive', () => {
  it('uploads the file and returns the Google Drive link', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          provider: 'webhook',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          fileId: 'drive-file-1',
          webViewLink: 'https://drive.google.com/file/d/drive-file-1/view',
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['abc'], 'fabric.png', { type: 'image/png' })
    const result = await uploadImageToGoogleDrive(file)

    expect(result).toEqual({
      imageUrl: 'https://drive.google.com/file/d/drive-file-1/view',
      fileId: 'drive-file-1',
      folderId: '',
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/drive-upload')
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/drive-upload')

    const request = fetchMock.mock.calls[1][1]
    expect(request.method).toBe('POST')
    expect(JSON.parse(request.body)).toEqual({
      filename: 'fabric.png',
      mimeType: 'image/png',
      base64: 'QUJD',
    })
  })

  it('sends the target folder name when provided', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          provider: 'webhook',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          fileId: 'drive-file-2',
          folderId: 'folder-1',
          webViewLink: 'https://drive.google.com/file/d/drive-file-2/view',
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['abc'], 'fabric.png', { type: 'image/png' })
    const result = await uploadImageToGoogleDrive(file, { folderName: 'รูปอะไหล่' })

    expect(result).toEqual({
      imageUrl: 'https://drive.google.com/file/d/drive-file-2/view',
      fileId: 'drive-file-2',
      folderId: 'folder-1',
    })

    const request = fetchMock.mock.calls[1][1]
    expect(JSON.parse(request.body)).toEqual({
      filename: 'fabric.png',
      mimeType: 'image/png',
      base64: 'QUJD',
      folderName: 'รูปอะไหล่',
    })
  })

  it('throws when no file is provided', async () => {
    await expect(uploadImageToGoogleDrive()).rejects.toThrow('ไม่พบไฟล์รูป')
  })

  it('passes API errors through', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          provider: 'webhook',
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'quota exceeded' }),
      }))

    const file = new File(['abc'], 'fabric.png', { type: 'image/png' })

    await expect(uploadImageToGoogleDrive(file)).rejects.toThrow('quota exceeded')
  })

  it('throws when the webhook does not return a link', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          provider: 'webhook',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ fileId: 'missing-link' }),
      }))

    const file = new File(['abc'], 'fabric.png', { type: 'image/png' })

    await expect(uploadImageToGoogleDrive(file))
      .rejects
      .toThrow('Webhook ไม่ได้ส่งลิงก์ไฟล์กลับมา')
  })

  it('throws a clear error when the drive upload endpoint is unconfigured', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        service: 'drive-upload',
        provider: 'unconfigured',
        hasWebhook: false,
        hasServiceAccount: false,
        hasFolderId: false,
      }),
    }))

    const file = new File(['abc'], 'fabric.png', { type: 'image/png' })

    await expect(uploadImageToGoogleDrive(file)).rejects.toThrow(
      'Google Drive upload ยังไม่ได้ตั้งค่า'
    )
  })
})
