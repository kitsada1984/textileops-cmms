import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadMedia, uploadMediaBatch } from './mediaUploader'
import * as driveUploadUtils from '../../utils/googleDriveUpload'
import * as imageProcessorUtils from '../../utils/imageFileProcessor'

vi.mock('../../utils/googleDriveUpload', () => ({
  uploadImageToGoogleDrive: vi.fn(),
}))

vi.mock('../../utils/imageFileProcessor', () => ({
  normalizeImageFile: vi.fn(),
}))

describe('Media Ingestion Deep Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when no file is passed', async () => {
    await expect(uploadMedia(null)).rejects.toThrow('ไม่พบไฟล์รูป')
  })

  it('normalizes file and uploads to Google Drive with default options', async () => {
    const rawFile = new File(['test'], 'photo.png', { type: 'image/png' })
    const normalizedFile = new File(['compressed'], 'photo.jpg', { type: 'image/jpeg' })

    imageProcessorUtils.normalizeImageFile.mockResolvedValueOnce({
      file: normalizedFile,
      dataUrl: 'data:image/jpeg;base64,QUJD',
    })

    driveUploadUtils.uploadImageToGoogleDrive.mockResolvedValueOnce({
      imageUrl: 'https://drive.google.com/file/d/test-123/view',
      fileId: 'test-123',
      folderId: 'folder-abc',
    })

    const result = await uploadMedia(rawFile, { folderName: 'รูปกระบอก' })

    expect(imageProcessorUtils.normalizeImageFile).toHaveBeenCalledWith(rawFile, 1920, 0.85)
    expect(driveUploadUtils.uploadImageToGoogleDrive).toHaveBeenCalledWith(normalizedFile, {
      folderName: 'รูปกระบอก',
      maxDimension: 1920,
      quality: 0.85,
    })
    expect(result).toEqual({
      imageUrl: 'https://drive.google.com/file/d/test-123/view',
      url: 'https://drive.google.com/file/d/test-123/view',
      fileId: 'test-123',
      folderId: 'folder-abc',
      dataUrl: 'data:image/jpeg;base64,QUJD',
      source: 'drive',
    })
  })

  it('falls back to local dataUrl when upload fails and fallbackToLocal is true', async () => {
    const rawFile = new File(['test'], 'needle.png', { type: 'image/png' })
    imageProcessorUtils.normalizeImageFile.mockResolvedValueOnce({
      file: rawFile,
      dataUrl: 'data:image/jpeg;base64,LOCALDATA',
    })

    driveUploadUtils.uploadImageToGoogleDrive.mockRejectedValueOnce(new Error('Network offline'))

    const result = await uploadMedia(rawFile, {
      folderName: 'สภาพเข็ม',
      fallbackToLocal: true,
    })

    expect(result.source).toBe('local')
    expect(result.imageUrl).toBe('data:image/jpeg;base64,LOCALDATA')
    expect(result.isLocalFallback).toBe(true)
  })

  it('throws when upload fails and fallbackToLocal is false', async () => {
    const rawFile = new File(['test'], 'part.png', { type: 'image/png' })
    imageProcessorUtils.normalizeImageFile.mockResolvedValueOnce({
      file: rawFile,
      dataUrl: 'data:image/jpeg;base64,DATA',
    })

    driveUploadUtils.uploadImageToGoogleDrive.mockRejectedValueOnce(new Error('Drive error'))

    await expect(uploadMedia(rawFile, { fallbackToLocal: false })).rejects.toThrow('Drive error')
  })

  it('uploadMediaBatch processes an array of files', async () => {
    const f1 = new File(['1'], 'p1.jpg', { type: 'image/jpeg' })
    const f2 = new File(['2'], 'p2.jpg', { type: 'image/jpeg' })

    imageProcessorUtils.normalizeImageFile.mockResolvedValue({
      file: f1,
      dataUrl: 'data:url',
    })

    driveUploadUtils.uploadImageToGoogleDrive
      .mockResolvedValueOnce({ imageUrl: 'https://drive/1' })
      .mockResolvedValueOnce({ imageUrl: 'https://drive/2' })

    const batch = await uploadMediaBatch([f1, f2], { folderName: 'batch' })
    expect(batch).toHaveLength(2)
    expect(batch[0].imageUrl).toBe('https://drive/1')
    expect(batch[1].imageUrl).toBe('https://drive/2')
  })
})
