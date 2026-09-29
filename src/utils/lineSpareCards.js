/**
 * src/utils/lineSpareCards.js
 * LINE Flex Message cards for the Spare Needle flow (prepared / received),
 * matching the visual language of lineFlexBuilder cards.
 */
import { buildPWALineUrl } from './lineFlexBuilder'

/**
 * Card: Spare needle PREPARED (stock keeper finished preparing) — green theme,
 * with a prominent "acknowledge" button for the technician.
 */
export function buildSpareNeedlePreparedFlexMessage(snr = {}, cylinder = {}, appBaseUrl) {
  const serial = snr.cylinder_serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || '—'
  const reqNo = snr.request_no || snr.id || 'SNR-NEW'
  const machine = snr.machine_mc || cylinder?.Machine || '—'
  const tech = snr.technician_name || 'ช่าง'
  const issuer = snr.issuer_name || 'สโตร์เข็ม'
  const comment = snr.issuer_comment || ''

  const issuedItems = Array.isArray(snr.issued_items) ? snr.issued_items : []
  const issuedLines = issuedItems.map((item) => {
    const isOff = item.isOffSystem || item.sourceType === 'OFF_SYSTEM' || item.setId === 'OFF_SYSTEM'
    const offTag = isOff ? ' [เข็มนอกระบบ]' : ''
    return `${item.needleModel || item.setId || 'เข็ม'}${offTag} × ${item.quantity || 0} ตัว (${item.grade || 'เกรด B'})`
  })

  const readyUrl = buildPWALineUrl(appBaseUrl, `/repair/${encodeURIComponent(serial)}`, {
    needle_req: snr.id || '',
    step: 'ack',
  })
  const stockUrl = buildPWALineUrl(appBaseUrl, '/needle-stock')

  return {
    type: 'flex',
    altText: `📦 เข็ม Spare จัดเตรียมแล้ว: เครื่อง ${machine} — กรุณากดรับทราบ`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#065f46',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'TextileOps • สโตร์เข็ม', color: '#a7f3d0', size: 'xs', weight: 'bold' },
              { type: 'text', text: '📦 จัดเตรียมแล้ว', color: '#fbbf24', size: 'xs', align: 'end', weight: 'bold' },
            ],
          },
          { type: 'text', text: '🪡 เข็ม Spare จัดเตรียมเรียบร้อย', weight: 'bold', size: 'md', color: '#ffffff', margin: 'sm' },
          { type: 'text', text: 'กรุณาตรวจสอบรายการและกดรับทราบเพื่อปิดงาน', size: 'xxs', color: '#d1fae5', margin: 'xs', wrap: true },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        backgroundColor: '#ffffff',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'เลขที่ใบเบิก:', color: '#64748b', size: 'xs', flex: 3 },
                  { type: 'text', text: reqNo, wrap: true, color: '#0f172a', size: 'xs', weight: 'bold', flex: 7 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'เครื่องจักร (M/C):', color: '#64748b', size: 'xs', flex: 3 },
                  { type: 'text', text: `${machine} (กระบอก: ${serial})`, wrap: true, color: '#0f172a', size: 'xs', weight: 'bold', flex: 7 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'ผู้ขอเบิก:', color: '#64748b', size: 'xs', flex: 3 },
                  { type: 'text', text: tech, wrap: true, color: '#047857', size: 'xs', weight: 'bold', flex: 7 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'ผู้จ่ายเข็ม:', color: '#64748b', size: 'xs', flex: 3 },
                  { type: 'text', text: issuer, wrap: true, color: '#0f172a', size: 'xs', weight: 'bold', flex: 7 },
                ],
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                paddingAll: '10px',
                backgroundColor: '#ecfdf5',
                cornerRadius: '8px',
                borderColor: '#a7f3d0',
                borderWidth: '1px',
                contents: [
                  { type: 'text', text: '📌 รายการเข็มที่จัดเตรียม:', color: '#047857', size: 'xs', weight: 'bold' },
                  ...(issuedLines.length > 0
                    ? issuedLines.map((line) => ({
                        type: 'text',
                        text: `• ${line}`,
                        color: '#064e3b',
                        size: 'xs',
                        weight: 'bold',
                        margin: 'xs',
                        wrap: true,
                      }))
                    : [{ type: 'text', text: '• ตามรายการที่ขอ', color: '#64748b', size: 'xs', margin: 'xs' }]),
                ],
              },
              comment
                ? {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'xs',
                    paddingAll: '8px',
                    backgroundColor: '#f8fafc',
                    cornerRadius: '6px',
                    contents: [
                      { type: 'text', text: `💬 หมายเหตุ: ${comment}`, color: '#475569', size: 'xs', wrap: true },
                    ],
                  }
                : null,
            ].filter(Boolean),
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        backgroundColor: '#f8fafc',
        paddingAll: '14px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: '#059669',
            action: { type: 'uri', label: '✅ ตรวจสอบและกดรับทราบ (PWA)', uri: readyUrl },
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: { type: 'uri', label: '📊 ดูสต็อกเข็มทั้งหมด', uri: stockUrl },
          },
        ],
      },
    },
  }
}

/**
 * Card: Spare needle RECEIVED (job closed) — slate theme with a success badge.
 */
export function buildSpareNeedleReceivedFlexMessage(snr = {}, cylinder = {}, appBaseUrl) {
  const serial = snr.cylinder_serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || '—'
  const reqNo = snr.request_no || snr.id || 'SNR-NEW'
  const machine = snr.machine_mc || cylinder?.Machine || '—'
  const tech = snr.technician_name || 'ช่าง'

  let timeStr = '—'
  try {
    timeStr = new Date(snr.acknowledged_at || Date.now()).toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    timeStr = String(snr.acknowledged_at || '')
  }

  const detailUrl = buildPWALineUrl(appBaseUrl, `/repair/${encodeURIComponent(serial)}`, {
    needle_req: snr.id || '',
    step: 'view',
  })

  return {
    type: 'flex',
    altText: `🎉 รับเข็ม Spare เรียบร้อย — ปิดงาน ${reqNo} (เครื่อง ${machine})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0f172a',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'TextileOps • สโตร์เข็ม', color: '#94a3b8', size: 'xs', weight: 'bold' },
              { type: 'text', text: '🎉 ปิดงานแล้ว', color: '#4ade80', size: 'xs', align: 'end', weight: 'bold' },
            ],
          },
          { type: 'text', text: '✅ รับเข็ม Spare เรียบร้อย — ปิดงานสมบูรณ์', weight: 'bold', size: 'md', color: '#ffffff', margin: 'sm', wrap: true },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        backgroundColor: '#ffffff',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'เลขที่ใบเบิก:', color: '#64748b', size: 'xs', flex: 3 },
                  { type: 'text', text: reqNo, wrap: true, color: '#0f172a', size: 'xs', weight: 'bold', flex: 7 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'เครื่องจักร (M/C):', color: '#64748b', size: 'xs', flex: 3 },
                  { type: 'text', text: `${machine} (กระบอก: ${serial})`, wrap: true, color: '#0f172a', size: 'xs', weight: 'bold', flex: 7 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'ผู้รับเข็ม:', color: '#64748b', size: 'xs', flex: 3 },
                  { type: 'text', text: tech, wrap: true, color: '#047857', size: 'xs', weight: 'bold', flex: 7 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'เวลารับเข็ม:', color: '#64748b', size: 'xs', flex: 3 },
                  { type: 'text', text: timeStr, wrap: true, color: '#0f172a', size: 'xs', weight: 'bold', flex: 7 },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                paddingAll: '10px',
                backgroundColor: '#f0fdf4',
                cornerRadius: '8px',
                borderColor: '#bbf7d0',
                borderWidth: '1px',
                contents: [
                  { type: 'text', text: '✅ สถานะ: ปิดงานเบิกเข็ม Spare สมบูรณ์', color: '#15803d', size: 'xs', weight: 'bold', wrap: true },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        backgroundColor: '#f8fafc',
        paddingAll: '14px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: '#334155',
            action: { type: 'uri', label: '📋 เปิดดูรายการ (PWA)', uri: detailUrl },
          },
        ],
      },
    },
  }
}
