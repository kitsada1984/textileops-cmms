// functions/api/drive-upload.js
// Cloudflare Pages Function: Google Drive Upload Webhook Proxy

const DEFAULT_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbwRwXwdCgnFZ6CU7L1IxK7aLD7K4VX_L-w4UD1LkyO5bICzhhRAHZpxN7OlJWxdmWdG/exec'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function normalizeUploadResponse(json) {
  const imageUrl = json?.webViewLink || json?.webContentLink || json?.url || ''
  if (!imageUrl) throw new Error('Webhook ไม่ได้ส่งลิงก์ไฟล์กลับมา')
  return {
    ok: true,
    fileId: json?.fileId || json?.id || '',
    folderId: json?.folderId || '',
    name: json?.name || '',
    webViewLink: imageUrl,
    webContentLink: json?.webContentLink || imageUrl,
    mimeType: json?.mimeType || '',
    size: json?.size || '',
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function onRequestGet({ env }) {
  const webhook = (env?.GOOGLE_DRIVE_UPLOAD_WEBHOOK || env?.VITE_DRIVE_UPLOAD_WEBHOOK || DEFAULT_WEBHOOK_URL).trim()
  return new Response(
    JSON.stringify({
      ok: true,
      service: 'drive-upload',
      provider: 'webhook',
      hasWebhook: Boolean(webhook),
      hasFolderId: Boolean(env?.GOOGLE_DRIVE_FOLDER_ID),
    }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  )
}

export async function onRequestPost({ request, env }) {
  const jsonHeaders = { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  const webhook = (env?.GOOGLE_DRIVE_UPLOAD_WEBHOOK || env?.VITE_DRIVE_UPLOAD_WEBHOOK || DEFAULT_WEBHOOK_URL).trim()

  try {
    const body = await request.json().catch(() => ({}))
    const { filename, mimeType, base64, folderName } = body
    if (!base64) {
      return new Response(JSON.stringify({ ok: false, error: 'base64 is required' }), {
        status: 400,
        headers: jsonHeaders,
      })
    }

    const payload = { filename, mimeType, base64, folderName }
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    let json = {}
    try {
      json = text ? JSON.parse(text) : {}
    } catch {}

    if (!response.ok || json?.ok === false) {
      throw new Error(json?.error || text || 'Google Drive webhook upload failed')
    }

    const result = normalizeUploadResponse(json)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: jsonHeaders,
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message || 'Upload failed' }), {
      status: 500,
      headers: jsonHeaders,
    })
  }
}
