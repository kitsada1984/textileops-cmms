/**
 * src/utils/lineFlexBuilder.js
 * Builds LINE Flex Message JSON payloads with PWA Deep Linking (?openExternalBrowser=1)
 */

export function buildPWALineUrl(baseUrl, path, queryParams = {}) {
  const cleanBase = (baseUrl || 'https://textileops-cmms.vercel.app').replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const params = new URLSearchParams(queryParams)
  // Force external browser intent so Android / iOS launches standalone PWA directly
  params.set('openExternalBrowser', '1')
  return `${cleanBase}${cleanPath}?${params.toString()}`
}

/**
 * Builds Flex Bubble for New Repair Request
 */
export function buildRepairRequestFlexMessage(request = {}, cylinder = {}, appBaseUrl) {
  const serial = request.cylinder_serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || '—'
  const reqNo = request.request_no || (request.id ? `REQ-${String(request.id).slice(0, 8)}` : 'REQ-NEW')
  const machine = request.machine_mc || cylinder?.NewMC || '—'
  const location = request.cylinder_location || cylinder?.Location || '—'
  const problem = request.problem_description || 'ไม่มีรายละเอียดอาการเสีย'
  const reporter = request.reported_by || 'เจ้าหน้าที่'
  
  let timeStr = '—'
  try {
    timeStr = new Date(request.created_at || Date.now()).toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    timeStr = String(request.created_at || '')
  }

  // Deep Links with ?openExternalBrowser=1
  const actionUrl = buildPWALineUrl(appBaseUrl, `/repair/${encodeURIComponent(serial)}`, {
    req: request.id || request._id || '',
    step: 'approve',
  })
  const dashboardUrl = buildPWALineUrl(appBaseUrl, '/repair-requests')

  return {
    type: 'flex',
    altText: `🚨 แจ้งซ่อมใหม่: ${machine} (${serial}) - ${problem}`,
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
              {
                type: 'text',
                text: 'TEXTILEOPS CMMS',
                color: '#60a5fa',
                size: 'xs',
                weight: 'bold',
                letterSpacing: '1px',
              },
              {
                type: 'text',
                text: '🔴 รอรับงานซ่อม',
                color: '#fbbf24',
                size: 'xs',
                align: 'end',
                weight: 'bold',
              },
            ],
          },
          {
            type: 'text',
            text: '🔧 ใบแจ้งซ่อมเครื่องจักร/กระบอก',
            weight: 'bold',
            size: 'lg',
            color: '#ffffff',
            margin: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
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
                  { type: 'text', text: 'เลขที่แจ้ง:', color: '#64748b', size: 'xs', flex: 3 },
                  { type: 'text', text: reqNo, wrap: true, color: '#0f172a', size: 'xs', weight: 'bold', flex: 7 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'เครื่องจักร (M/C):', color: '#64748b', size: 'xs', flex: 3 },
                  { type: 'text', text: machine, wrap: true, color: '#0f172a', size: 'xs', weight: 'bold', flex: 7 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'ซีเรียลกระบอก:', color: '#64748b', size: 'xs', flex: 3 },
                  { type: 'text', text: serial, wrap: true, color: '#2563eb', size: 'xs', weight: 'bold', flex: 7 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'ตำแหน่งติดตั้ง:', color: '#64748b', size: 'xs', flex: 3 },
                  { type: 'text', text: location, wrap: true, color: '#334155', size: 'xs', flex: 7 },
                ],
              },
              // Problem highlight box
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                paddingAll: '10px',
                backgroundColor: '#fef2f2',
                cornerRadius: '8px',
                borderColor: '#fee2e2',
                borderWidth: '1px',
                contents: [
                  { type: 'text', text: '⚠️ อาการเสีย / ปัญหา:', color: '#dc2626', size: 'xxs', weight: 'bold' },
                  { type: 'text', text: problem, color: '#991b1b', size: 'xs', wrap: true, margin: 'xs', weight: 'bold' },
                ],
              },
              // Reporter & Timestamp
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                margin: 'sm',
                contents: [
                  { type: 'text', text: 'ผู้แจ้ง / เวลา:', color: '#64748b', size: 'xxs', flex: 3 },
                  { type: 'text', text: `${reporter} · ${timeStr}`, wrap: true, color: '#64748b', size: 'xxs', flex: 7 },
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
            color: '#2563eb',
            action: {
              type: 'uri',
              label: '🚀 เปิดรับงานซ่อม (PWA App)',
              uri: actionUrl,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '📋 ดูรายการแจ้งซ่อมทั้งหมด',
              uri: dashboardUrl,
            },
          },
        ],
      },
    },
  }
}

/**
 * Builds Test Flex Message for Settings Page verification
 */
export function buildTestFlexMessage(appBaseUrl) {
  const sampleRequest = {
    id: 'test-demo-pwa',
    request_no: 'REQ-TEST-8888',
    cylinder_serial: 'TEST-CYL-99',
    machine_mc: 'MC-TEST-01',
    cylinder_location: 'โรงทอ 1 (Zone A)',
    problem_description: 'ทดสอบการเชื่อมต่อระบบแจ้งเตือน LINE และ PWA Deep Link สำเร็จเรียบร้อย!',
    reported_by: 'ผู้ดูแลระบบ (Admin)',
    created_at: new Date().toISOString(),
  }

  return buildRepairRequestFlexMessage(sampleRequest, null, appBaseUrl)
}
