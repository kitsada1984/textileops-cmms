import { describe, expect, it } from 'vitest'
import {
  DESIGN_BOM_COVER_FOLDER,
  DESIGN_BOM_APP_FOLDER,
  DESIGN_BOM_MASTER_FOLDER,
  MASTER_NOTE_PREFIX,
  extractCoverImageUrl,
  extractAppImageUrl,
  extractMasterImageUrl,
  stripDesignImagesMeta,
  getDesignCoverImageUrl,
  getDesignAppImageUrl,
  getDesignMasterImageUrl,
  appendDesignImagesMeta,
} from './designBomImage'

describe('designBomImage helpers and folders', () => {
  it('defines the Google Drive folder for the Master image', () => {
    expect(DESIGN_BOM_MASTER_FOLDER).toBe('Master')
    expect(MASTER_NOTE_PREFIX).toBe('MasterImageUrl:')
  })

  it('defines the correct Google Drive folder names for cover and app sheets', () => {
    expect(DESIGN_BOM_COVER_FOLDER).toBe('DesignBOM-ใบปะหน้า')
    expect(DESIGN_BOM_APP_FOLDER).toBe('DesignBOM-ใบApp')
  })

  describe('extractCoverImageUrl', () => {
    it('extracts CoverImageUrl from comment lines', () => {
      const comment = 'เอกสารปะหน้า\nCoverImageUrl: https://drive.google.com/cover.jpg\nAppImageUrl: https://drive.google.com/app.jpg'
      expect(extractCoverImageUrl(comment)).toBe('https://drive.google.com/cover.jpg')
    })

    it('falls back to legacy ImageUrl prefix if CoverImageUrl is not present', () => {
      const legacyComment = 'ข้อมูลแบบเดิม\nImageUrl: https://drive.google.com/legacy.jpg'
      expect(extractCoverImageUrl(legacyComment)).toBe('https://drive.google.com/legacy.jpg')
    })

    it('returns empty string when no image metadata is in comment', () => {
      expect(extractCoverImageUrl('ข้อสังเกตทั่วไป')).toBe('')
      expect(extractCoverImageUrl('')).toBe('')
      expect(extractCoverImageUrl(null)).toBe('')
    })
  })

  describe('extractAppImageUrl', () => {
    it('extracts AppImageUrl from comment lines', () => {
      const comment = 'CoverImageUrl: https://drive.google.com/cover.jpg\nAppImageUrl: https://drive.google.com/app.jpg'
      expect(extractAppImageUrl(comment)).toBe('https://drive.google.com/app.jpg')
    })

    it('returns empty string when AppImageUrl is not present', () => {
      expect(extractAppImageUrl('CoverImageUrl: https://drive.google.com/cover.jpg')).toBe('')
      expect(extractAppImageUrl('หมายเหตุ')).toBe('')
    })
  })

  describe('stripDesignImagesMeta', () => {
    it('strips CoverImageUrl, AppImageUrl, and legacy ImageUrl lines from comments', () => {
      const note = 'บันทึกสำคัญ\nCoverImageUrl: https://cover.jpg\nAppImageUrl: https://app.jpg\nImageUrl: https://legacy.jpg'
      expect(stripDesignImagesMeta(note)).toBe('บันทึกสำคัญ')
    })

    it('handles empty or pure metadata notes', () => {
      expect(stripDesignImagesMeta('CoverImageUrl: https://cover.jpg')).toBe('')
      expect(stripDesignImagesMeta('')).toBe('')
      expect(stripDesignImagesMeta(null)).toBe('')
    })
  })

  describe('getDesignCoverImageUrl', () => {
    it('prioritizes row.CoverImageUrl over legacy row.ImageUrl and comment meta', () => {
      const row = {
        CoverImageUrl: 'https://cover-column.jpg',
        ImageUrl: 'https://legacy-column.jpg',
        Comment: 'CoverImageUrl: https://comment.jpg',
      }
      expect(getDesignCoverImageUrl(row)).toBe('https://cover-column.jpg')
    })

    it('falls back to row.ImageUrl if row.CoverImageUrl is absent', () => {
      const row = {
        ImageUrl: 'https://legacy-column.jpg',
        Comment: 'หมายเหตุ',
      }
      expect(getDesignCoverImageUrl(row)).toBe('https://legacy-column.jpg')
    })

    it('falls back to comment metadata if no direct columns exist', () => {
      const row = {
        Comment: 'หมายเหตุ\nImageUrl: https://legacy-comment.jpg',
      }
      expect(getDesignCoverImageUrl(row)).toBe('https://legacy-comment.jpg')
    })

    it('returns empty string when row is empty', () => {
      expect(getDesignCoverImageUrl({})).toBe('')
    })
  })

  describe('getDesignAppImageUrl', () => {
    it('prioritizes row.AppImageUrl over comment metadata', () => {
      const row = {
        AppImageUrl: 'https://app-column.jpg',
        Comment: 'AppImageUrl: https://comment-app.jpg',
      }
      expect(getDesignAppImageUrl(row)).toBe('https://app-column.jpg')
    })

    it('falls back to comment metadata when row.AppImageUrl is absent', () => {
      const row = {
        Comment: 'AppImageUrl: https://comment-app.jpg',
      }
      expect(getDesignAppImageUrl(row)).toBe('https://comment-app.jpg')
    })

    it('returns empty string when no App image exists', () => {
      expect(getDesignAppImageUrl({})).toBe('')
    })
  })

  describe('appendDesignImagesMeta', () => {
    it('appends both cover and app URLs cleanly without duplicating old meta lines', () => {
      const result = appendDesignImagesMeta(
        'หมายเหตุเดิม\nCoverImageUrl: https://old-cover.jpg',
        'https://new-cover.jpg',
        'https://new-app.jpg',
      )
      expect(result).toBe(
        'หมายเหตุเดิม\nCoverImageUrl: https://new-cover.jpg\nAppImageUrl: https://new-app.jpg',
      )
    })

    it('handles only cover or only app URL', () => {
      expect(appendDesignImagesMeta('หมายเหตุ', 'https://cover.jpg', '')).toBe(
        'หมายเหตุ\nCoverImageUrl: https://cover.jpg',
      )
      expect(appendDesignImagesMeta('หมายเหตุ', '', 'https://app.jpg')).toBe(
        'หมายเหตุ\nAppImageUrl: https://app.jpg',
      )
    })

    it('handles empty comment without leading newlines', () => {
      expect(appendDesignImagesMeta('', 'https://cover.jpg', 'https://app.jpg')).toBe(
        'CoverImageUrl: https://cover.jpg\nAppImageUrl: https://app.jpg',
      )
    })
  })

  describe('master image helpers', () => {
    it('extracts the master image url from the comment meta line', () => {
      const note = 'หมายเหตุ\nMasterImageUrl: https://drive.google.com/master.jpg'
      expect(extractMasterImageUrl(note)).toBe('https://drive.google.com/master.jpg')
      expect(getDesignMasterImageUrl({ Comment: note })).toBe('https://drive.google.com/master.jpg')
    })

    it('prefers the row column over the comment meta and returns empty when missing', () => {
      expect(getDesignMasterImageUrl({ MasterImageUrl: 'https://col.jpg', Comment: 'MasterImageUrl: https://meta.jpg' }))
        .toBe('https://col.jpg')
      expect(getDesignMasterImageUrl({ Comment: 'ไม่มีข้อมูล' })).toBe('')
      expect(getDesignMasterImageUrl({})).toBe('')
    })

    it('strips the master meta line out of the displayed comment', () => {
      const note = 'โน้ต\nCoverImageUrl: c.jpg\nAppImageUrl: a.jpg\nMasterImageUrl: m.jpg'
      expect(stripDesignImagesMeta(note)).toBe('โน้ต')
    })

    it('appends all three image meta lines (master optional)', () => {
      expect(appendDesignImagesMeta('โน้ต', 'c.jpg', 'a.jpg', 'm.jpg')).toBe(
        'โน้ต\nCoverImageUrl: c.jpg\nAppImageUrl: a.jpg\nMasterImageUrl: m.jpg',
      )
      expect(appendDesignImagesMeta('โน้ต', 'c.jpg', 'a.jpg')).toBe(
        'โน้ต\nCoverImageUrl: c.jpg\nAppImageUrl: a.jpg',
      )
      expect(appendDesignImagesMeta('โน้ต', '', '', 'm.jpg')).toBe(
        'โน้ต\nMasterImageUrl: m.jpg',
      )
    })
  })
})
