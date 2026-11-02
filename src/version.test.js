import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  APP_VERSION,
  APP_BUILD_DATE,
  COMPANY_NAME_TH,
  COMPANY_NAME_EN,
  COMPANY_NAME_FULL,
} from './version'

describe('Release Protocol & Version Synchronization Guard', () => {
  it('APP_VERSION in src/version.js follows semantic versioning (vX.Y.Z)', () => {
    expect(APP_VERSION).toMatch(/^v\d+\.\d+\.\d+$/)
    expect(APP_BUILD_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('standard company names are properly defined', () => {
    expect(COMPANY_NAME_TH).toBe('บริษัท เจมม่า นิตติ้ง จำกัด')
    expect(COMPANY_NAME_EN).toBe('Gemma Knits (Thailand)Co., Ltd.')
    expect(COMPANY_NAME_FULL).toBe('บริษัท เจมม่า นิตติ้ง จำกัด (Gemma Knits (Thailand)Co., Ltd.)')
  })

  it('package.json version matches APP_VERSION (without "v" prefix)', () => {
    const pkgPath = path.resolve(__dirname, '../package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    expect('v' + pkg.version).toBe(APP_VERSION)
  })

  it('public/sw.js CACHE_NAME matches textileops-${APP_VERSION}', () => {
    const swPath = path.resolve(__dirname, '../public/sw.js')
    const swContent = fs.readFileSync(swPath, 'utf-8')
    const cacheMatch = swContent.match(/const\s+CACHE_NAME\s*=\s*['"]([^'"]+)['"]/)
    expect(cacheMatch).not.toBeNull()
    expect(cacheMatch[1]).toBe(`textileops-${APP_VERSION}`)
  })
})
