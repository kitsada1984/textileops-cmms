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
                text: 'TextileOps',
                color: '#60a5fa',
                size: 'xs',
                weight: 'bold',
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
                  { type: 'text', text: '⚠️ อาการเสีย / ปัญหา:', color: '#dc2626', size: 'xs', weight: 'bold' },
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
                  { type: 'text', text: 'ผู้แจ้ง / เวลา:', color: '#64748b', size: 'xs', flex: 3 },
                  { type: 'text', text: `${reporter} · ${timeStr}`, wrap: true, color: '#64748b', size: 'xs', flex: 7 },
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
 * Builds Flex Bubble for Assigned Technician (Step 2)
 */
export function buildTechnicianAssignedFlexMessage(request = {}, appBaseUrl) {
  const serial = request.cylinder_serial || '—'
  const reqNo = request.request_no || (request.id ? `REQ-${String(request.id).slice(0, 8)}` : 'REQ-WORK')
  const machine = request.machine_mc || '—'
  const location = request.cylinder_location || '—'
  const problem = request.problem_description || 'ไม่มีรายละเอียด'
  const tech = request.technician_name || 'ช่างเทคนิค'
  const notes = request.approval_notes || ''

  const actionUrl = buildPWALineUrl(appBaseUrl, `/repair/${encodeURIComponent(serial)}`, {
    req: request.id || request._id || '',
    step: 'complete',
  })
  const dashboardUrl = buildPWALineUrl(appBaseUrl, '/repair-requests')

  return {
    type: 'flex',
    altText: `✅ มอบหมายงานซ่อม: ${machine} (${serial}) ให้ ${tech}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1e293b',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'TextileOps', color: '#38bdf8', size: 'xs', weight: 'bold' },
              { type: 'text', text: '🔵 มอบหมายช่างแล้ว', color: '#60a5fa', size: 'xs', align: 'end', weight: 'bold' },
            ],
          },
          {
            type: 'text',
            text: '👷 ใบสั่งงานซ่อม (ได้รับมอบหมาย)',
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
                  { type: 'text', text: 'ช่างผู้รับผิดชอบ:', color: '#0369a1', size: 'sm', weight: 'bold', flex: 4 },
                  { type: 'text', text: tech, wrap: true, color: '#0284c7', size: 'sm', weight: 'bold', flex: 6 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'เลขที่ใบแจ้ง:', color: '#64748b', size: 'xs', flex: 4 },
                  { type: 'text', text: reqNo, wrap: true, color: '#0f172a', size: 'xs', weight: 'bold', flex: 6 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'เครื่องจักร (M/C):', color: '#64748b', size: 'xs', flex: 4 },
                  { type: 'text', text: machine, wrap: true, color: '#0f172a', size: 'xs', weight: 'bold', flex: 6 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'ซีเรียลกระบอก:', color: '#64748b', size: 'xs', flex: 4 },
                  { type: 'text', text: serial, wrap: true, color: '#2563eb', size: 'xs', weight: 'bold', flex: 6 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'ตำแหน่งติดตั้ง:', color: '#64748b', size: 'xs', flex: 4 },
                  { type: 'text', text: location, wrap: true, color: '#334155', size: 'xs', flex: 6 },
                ],
              },
              // Problem
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                paddingAll: '10px',
                backgroundColor: '#f0f9ff',
                cornerRadius: '8px',
                borderColor: '#e0f2fe',
                borderWidth: '1px',
                contents: [
                  { type: 'text', text: '⚠️ อาการเสีย / ปัญหา:', color: '#0284c7', size: 'xs', weight: 'bold' },
                  { type: 'text', text: problem, color: '#0369a1', size: 'xs', wrap: true, margin: 'xs', weight: 'bold' },
                ],
              },
              // Notes if any
              notes ? {
                type: 'box',
                layout: 'vertical',
                margin: 'sm',
                paddingAll: '8px',
                backgroundColor: '#fefce8',
                cornerRadius: '6px',
                borderColor: '#fef08a',
                borderWidth: '1px',
                contents: [
                  { type: 'text', text: `📝 หมายเหตุจากหัวหน้า: ${notes}`, color: '#854d0e', size: 'xs', wrap: true },
                ],
              } : null,
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
            color: '#0284c7',
            action: {
              type: 'uri',
              label: '🔧 บันทึกผลการซ่อม (PWA App)',
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
 * Builds Flex Bubble for Completed Repair (Step 3)
 */
export function buildRepairCompletedFlexMessage(request = {}, appBaseUrl) {
  const serial = request.cylinder_serial || '—'
  const reqNo = request.request_no || (request.id ? `REQ-${String(request.id).slice(0, 8)}` : 'REQ-DONE')
  const machine = request.machine_mc || '—'
  const details = request.repair_details || 'ดำเนินการซ่อมบำรุงเรียบร้อย'
  const parts = request.parts_used || ''
  const tech = request.completed_by || request.technician_name || 'ช่างเทคนิค'

  let completedTimeStr = '—'
  try {
    completedTimeStr = new Date(request.completed_at || Date.now()).toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    completedTimeStr = String(request.completed_at || '')
  }

  const actionUrl = buildPWALineUrl(appBaseUrl, `/repair/${encodeURIComponent(serial)}`, {
    req: request.id || request._id || '',
  })
  const dashboardUrl = buildPWALineUrl(appBaseUrl, '/repair-requests')

  return {
    type: 'flex',
    altText: `🎉 ซ่อมเสร็จแล้ว: ${machine} (${serial}) โดย ${tech}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#064e3b',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'TextileOps', color: '#6ee7b7', size: 'xs', weight: 'bold' },
              { type: 'text', text: '🟢 ซ่อมเสร็จสมบูรณ์', color: '#34d399', size: 'xs', align: 'end', weight: 'bold' },
            ],
          },
          {
            type: 'text',
            text: '🎉 รายงานปิดงานซ่อมเสร็จสิ้น',
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
                  { type: 'text', text: 'เลขที่ใบแจ้ง:', color: '#64748b', size: 'xs', flex: 4 },
                  { type: 'text', text: reqNo, wrap: true, color: '#0f172a', size: 'xs', weight: 'bold', flex: 6 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'เครื่องจักร (M/C):', color: '#64748b', size: 'xs', flex: 4 },
                  { type: 'text', text: machine, wrap: true, color: '#0f172a', size: 'xs', weight: 'bold', flex: 6 },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'ซีเรียลกระบอก:', color: '#64748b', size: 'xs', flex: 4 },
                  { type: 'text', text: serial, wrap: true, color: '#059669', size: 'xs', weight: 'bold', flex: 6 },
                ],
              },
              // Action / Repair Details box
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                paddingAll: '10px',
                backgroundColor: '#ecfdf5',
                cornerRadius: '8px',
                borderColor: '#d1fae5',
                borderWidth: '1px',
                contents: [
                  { type: 'text', text: '🔧 วิธีแก้ไข / ผลการซ่อม:', color: '#059669', size: 'xs', weight: 'bold' },
                  { type: 'text', text: details, color: '#065f46', size: 'xs', wrap: true, margin: 'xs', weight: 'bold' },
                ],
              },
              // Parts used
              parts ? {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: '🔩 อะไหล่ที่ใช้:', color: '#64748b', size: 'xs', flex: 4 },
                  { type: 'text', text: parts, wrap: true, color: '#334155', size: 'xs', flex: 6 },
                ],
              } : null,
              // Tech & Completed at
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                margin: 'sm',
                contents: [
                  { type: 'text', text: 'ช่างผู้ซ่อม / เวลา:', color: '#64748b', size: 'xs', flex: 4 },
                  { type: 'text', text: `${tech} · ${completedTimeStr}`, wrap: true, color: '#64748b', size: 'xs', flex: 6 },
                ],
              },
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
            action: {
              type: 'uri',
              label: '📋 ดูประวัติงานซ่อม (PWA App)',
              uri: actionUrl,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '📊 ดูรายการแจ้งซ่อมทั้งหมด',
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
