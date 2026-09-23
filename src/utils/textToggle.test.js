import { describe, it, expect } from 'vitest'
import { parseCommaList, isItemInText, toggleItemInText } from './textToggle.js'

describe('textToggle utility', () => {
  describe('parseCommaList', () => {
    it('returns empty array for empty or non-string inputs', () => {
      expect(parseCommaList('')).toEqual([])
      expect(parseCommaList(null)).toEqual([])
      expect(parseCommaList(undefined)).toEqual([])
      expect(parseCommaList(123)).toEqual([])
    })

    it('parses comma-separated values correctly and trims whitespace', () => {
      expect(parseCommaList('เข็มหัก, เส้นเข็ม, ผ้าแตก / มีรู')).toEqual([
        'เข็มหัก',
        'เส้นเข็ม',
        'ผ้าแตก / มีรู',
      ])
    })

    it('ignores empty tokens and extra commas', () => {
      expect(parseCommaList('เข็มหัก, , , เส้นเข็ม, ')).toEqual([
        'เข็มหัก',
        'เส้นเข็ม',
      ])
    })
  })

  describe('isItemInText', () => {
    it('detects existing items regardless of surrounding spacing or case', () => {
      const text = 'เข็มหัก, เส้นเข็ม, ผ้าแตก / มีรู'
      expect(isItemInText(text, 'เข็มหัก')).toBe(true)
      expect(isItemInText(text, 'เส้นเข็ม')).toBe(true)
      expect(isItemInText(text, '  เส้นเข็ม  ')).toBe(true)
      expect(isItemInText(text, 'น้ำมันหยด')).toBe(false)
    })

    it('handles falsy or empty inputs safely', () => {
      expect(isItemInText('', 'เข็มหัก')).toBe(false)
      expect(isItemInText(null, 'เข็มหัก')).toBe(false)
      expect(isItemInText('เข็มหัก', '')).toBe(false)
      expect(isItemInText('เข็มหัก', null)).toBe(false)
    })
  })

  describe('toggleItemInText', () => {
    it('adds item when initially empty', () => {
      const result = toggleItemInText('', 'เข็มหัก')
      expect(result).toBe('เข็มหัก')
    })

    it('adds item when not yet in the list', () => {
      const result = toggleItemInText('เข็มหัก', 'เส้นเข็ม')
      expect(result).toBe('เข็มหัก, เส้นเข็ม')
    })

    it('removes item on second click (toggle off)', () => {
      const text = 'เข็มหัก, เส้นเข็ม'
      const result = toggleItemInText(text, 'เข็มหัก')
      expect(result).toBe('เส้นเข็ม')
    })

    it('clears string completely when toggling off the only remaining item', () => {
      const result = toggleItemInText('เข็มหัก', 'เข็มหัก')
      expect(result).toBe('')
    })

    it('preserves other custom text entered by user', () => {
      const text = 'เข็มหัก, มอเตอร์มีเสียงดังมาก, เส้นเข็ม'
      const result = toggleItemInText(text, 'เส้นเข็ม')
      expect(result).toBe('เข็มหัก, มอเตอร์มีเสียงดังมาก')
    })

    it('handles empty or whitespace-only item gracefully', () => {
      expect(toggleItemInText('เข็มหัก', '')).toBe('เข็มหัก')
      expect(toggleItemInText('เข็มหัก', '   ')).toBe('เข็มหัก')
    })
  })
})
