import { describe, it, expect } from 'vitest'
import {
  buildSpareNeedlePreparedFlexMessage,
  buildSpareNeedleReceivedFlexMessage,
} from './lineSpareCards'
import { buildSpareNeedleRequestFlexMessage } from './lineFlexBuilder'

const BASE = 'https://cmms.gemmaknits.com'

describe('Spare Needle LINE cards (prepared / received)', () => {
  const snr = {
    id: 'snr-001',
    request_no: 'SNR-260929-1342',
    machine_mc: 'LA341M',
    cylinder_serial: '54123',
    technician_name: 'ช.ต๋อง',
    issuer_name: 'Tuk',
    issuer_comment: 'ตรวจสอบก่อนติดตั้ง',
    status: 'PREPARED',
    issued_items: [
      { needleModel: 'VOTA 90.70', quantity: 10, grade: 'เกรด B' },
      { setId: 'OFF_SYSTEM', quantity: 4, grade: 'เกรด A', isOffSystem: true },
    ],
  }

  it('prepared card is a valid flex bubble with acknowledge button', () => {
    const card = buildSpareNeedlePreparedFlexMessage(snr, null, BASE)
    expect(card.type).toBe('flex')
    expect(card.contents.type).toBe('bubble')
    expect(card.altText).toContain('LA341M')
    expect(card.contents.header).toBeDefined()
    expect(card.contents.body).toBeDefined()
    expect(card.contents.footer).toBeDefined()

    const primary = card.contents.footer.contents[0]
    expect(primary.action.type).toBe('uri')
    expect(primary.action.uri).toContain('step=ack')
    expect(primary.action.uri).toContain('needle_req=snr-001')
    expect(primary.action.uri).toContain('openExternalBrowser=1')

    // issued items rendered in body
    const bodyText = JSON.stringify(card)
    expect(bodyText).toContain('VOTA 90.70')
    expect(bodyText).toContain('เข็มนอกระบบ')
    expect(bodyText).toContain('Tuk')
  })

  it('received card is a valid flex bubble with close-out status', () => {
    const card = buildSpareNeedleReceivedFlexMessage(
      { ...snr, status: 'COMPLETED', acknowledged_at: '2026-09-29T09:00:00.000Z' },
      null,
      BASE
    )
    expect(card.type).toBe('flex')
    expect(card.contents.type).toBe('bubble')
    expect(card.altText).toContain('ปิดงาน')
    expect(JSON.stringify(card)).toContain('ปิดงานเบิกเข็ม Spare สมบูรณ์')

    const primary = card.contents.footer.contents[0]
    expect(primary.action.uri).toContain('step=view')
  })

  it('cards never contain the legacy vercel host', () => {
    const prepared = buildSpareNeedlePreparedFlexMessage(snr, null, 'https://textileops-cmms.vercel.app')
    const received = buildSpareNeedleReceivedFlexMessage(snr, null, 'https://textileops-cmms.vercel.app')
    expect(JSON.stringify(prepared)).not.toContain('vercel.app')
    expect(JSON.stringify(received)).not.toContain('vercel.app')
  })
})
describe('D1 JSON-string fields (regression)', () => {
  it('request card renders track details when tracks_requested arrives as a JSON string', () => {
    // exact shape D1 returns for SNR-260929-5935
    const snrFromD1 = {
      id: 'SNR-260929-5935',
      request_no: 'SNR-260929-5935',
      machine_mc: 'LA341M',
      cylinder_serial: '54123',
      gauge: '28',
      technician_name: 'ช.ต๋อง',
      shift: 'กะเช้า',
      tracks_requested: '{"dial":{"single":50,"t1":100,"t2":0},"cylinder":{"t1":200,"t2":0,"t3":0,"t4":0}}',
      status: 'PENDING',
    }
    const card = buildSpareNeedleRequestFlexMessage(snrFromD1, null, BASE)
    const text = JSON.stringify(card)
    expect(text).toContain('Dial Single: 50')
    expect(text).toContain('Dial Track 1: 100')
    expect(text).toContain('Cylinder Track 1: 200')
    expect(text).not.toContain('ระบุตามหน้างาน')
  })

  it('prepared card renders issued items when issued_items arrives as a JSON string', () => {
    const snrFromD1 = {
      id: 'SNR-260929-1342',
      request_no: 'SNR-260929-1342',
      machine_mc: 'LA341M',
      cylinder_serial: '54123',
      technician_name: 'ช.ต๋อง',
      issuer_name: 'Tuk',
      issued_items: '[{"setId":"NS-0096","needleModel":"WO 121.41 G 0013","gauge":"28G","grade":"เกรด B","quantity":10,"sourceType":"IN_SYSTEM","isOffSystem":false}]',
      status: 'PREPARED',
    }
    const card = buildSpareNeedlePreparedFlexMessage(snrFromD1, null, BASE)
    const text = JSON.stringify(card)
    expect(text).toContain('WO 121.41 G 0013')
    expect(text).toContain('× 10 ตัว')
    expect(text).not.toContain('ตามรายการที่ขอ')
  })
})
