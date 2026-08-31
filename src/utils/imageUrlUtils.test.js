import { describe, it, expect } from 'vitest'
import {
  getGoogleDriveFileId,
  isGoogleDriveUrl,
  getDirectImageUrl,
  getImageFallbackUrls,
  getFullResolutionImageUrl,
} from './imageUrlUtils'

describe('imageUrlUtils', () => {
  const FILE_ID = '1Zmtl3Rv5ivOGbEidAPRXEtgEW5h48IE3'

  describe('getGoogleDriveFileId', () => {
    it('extracts ID from /file/d/ format', () => {
      const url = `https://drive.google.com/file/d/${FILE_ID}/view?usp=sharing`
      expect(getGoogleDriveFileId(url)).toBe(FILE_ID)
    })

    it('extracts ID from ?id= format', () => {
      const url = `https://drive.google.com/open?id=${FILE_ID}`
      expect(getGoogleDriveFileId(url)).toBe(FILE_ID)
    })

    it('extracts ID from uc?export=view&id= format', () => {
      const url = `https://drive.google.com/uc?export=view&id=${FILE_ID}`
      expect(getGoogleDriveFileId(url)).toBe(FILE_ID)
    })

    it('extracts ID from lh3.googleusercontent.com format', () => {
      const url = `https://lh3.googleusercontent.com/d/${FILE_ID}=s800`
      expect(getGoogleDriveFileId(url)).toBe(FILE_ID)
    })

    it('returns null for non-drive URLs', () => {
      expect(getGoogleDriveFileId('https://example.com/image.png')).toBeNull()
      expect(getGoogleDriveFileId('')).toBeNull()
      expect(getGoogleDriveFileId(null)).toBeNull()
    })
  })

  describe('isGoogleDriveUrl', () => {
    it('detects Google Drive URLs', () => {
      expect(isGoogleDriveUrl(`https://drive.google.com/file/d/${FILE_ID}/view`)).toBe(true)
      expect(isGoogleDriveUrl('https://example.com/pic.jpg')).toBe(false)
    })
  })

  describe('getDirectImageUrl', () => {
    it('converts Google Drive viewer URL to direct thumbnail image URL', () => {
      const driveUrl = `https://drive.google.com/file/d/${FILE_ID}/view`
      const direct = getDirectImageUrl(driveUrl, 'w1000')
      expect(direct).toBe(`https://lh3.googleusercontent.com/d/${FILE_ID}=s1000`)
    })

    it('returns non-Drive URLs as-is', () => {
      const regularUrl = 'https://images.unsplash.com/photo-123.jpg'
      expect(getDirectImageUrl(regularUrl)).toBe(regularUrl)
    })
  })

  describe('getFullResolutionImageUrl', () => {
    it('converts any Google Drive link to clean /view format', () => {
      const thumbUrl = `https://drive.google.com/thumbnail?id=${FILE_ID}&sz=w200`
      expect(getFullResolutionImageUrl(thumbUrl)).toBe(`https://drive.google.com/file/d/${FILE_ID}/view`)
    })
  })

  describe('getImageFallbackUrls', () => {
    it('provides multi-tier fallbacks for Google Drive links', () => {
      const driveUrl = `https://drive.google.com/file/d/${FILE_ID}/view`
      const fallbacks = getImageFallbackUrls(driveUrl)
      expect(fallbacks.length).toBeGreaterThan(1)
      expect(fallbacks[0]).toContain('googleusercontent')
      expect(fallbacks[2]).toContain('thumbnail')
    })
  })
})