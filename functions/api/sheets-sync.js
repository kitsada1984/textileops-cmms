// functions/api/sheets-sync.js
// Cloudflare Pages Function: Google Sheets Webhook Proxy

const DEFAULT_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbwRwXwdCgnFZ6CU7L1IxK7aLD7K4VX_L-w4UD1LkyO5bICzhhRAHZpxN7OlJWxdmWdG/exec'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function normalizeSheetName(name = '') {
  return (
    String(name || 'Data')
      .replace(/[\[\]\*\/\\?:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 90) || 'Data'
  )
}

function normalizeCell(value) {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.join(', ')
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

function normalizePayload(body = {}) {
  const sheetName = normalizeSheetName(body.sheetName)
  const columns = Array.isArray(body.columns) ? body.columns : []
  const rows = Array.isArray(body.rows) ? body.rows : []

  if (!columns.length) throw new Error('ไม่มีคอลัมน์สำหรับอัปเดต Google Sheet')

  const normalizedColumns = columns
    .map((col) => ({
      key: String(col?.key || col?.field || '').trim(),
      label: String(col?.label || col?.key || col?.field || '').trim(),
    }))
    .filter((col) => col.key)

  if (!normalizedColumns.length) throw new Error('คอลัมน์ Google Sheet ไม่ถูกต้อง')

  const values = [
    normalizedColumns.map((col) => col.label || col.key),
    ...rows.map((row) => normalizedColumns.map((col) => normalizeCell(row?.[col.key]))),
  ]

  return { sheetName, values, rowCount: rows.length, columnCount: normalizedColumns.length }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function onRequestGet({ env }) {
  const webhook = (env?.GOOGLE_SHEETS_SYNC_WEBHOOK || env?.VITE_SHEETS_SYNC_WEBHOOK || DEFAULT_WEBHOOK_URL).trim()
  return new Response(
    JSON.stringify({
      ok: true,
      service: 'sheets-sync',
      provider: 'webhook',
      configured: Boolean(webhook),
      hasWebhook: Boolean(webhook),
    }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  )
}

export async function onRequestPost({ request, env }) {
  const jsonHeaders = { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  const webhook = (env?.GOOGLE_SHEETS_SYNC_WEBHOOK || env?.VITE_SHEETS_SYNC_WEBHOOK || DEFAULT_WEBHOOK_URL).trim()

  try {
    const body = await request.json().catch(() => ({}))
    const payload = normalizePayload(body)

    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, sheetName: payload.sheetName, values: payload.values }),
    })
    const text = await response.text()
    let json = {}
    try {
      json = text ? JSON.parse(text) : {}
    } catch {}

    if (!response.ok) throw new Error(json?.error || text || 'Google Sheets webhook sync failed')

    return new Response(JSON.stringify({ ...payload, ...json, ok: true }), {
      status: 200,
      headers: jsonHeaders,
    })
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message || 'Google Sheets sync failed' }), {
      status: 500,
      headers: jsonHeaders,
    })
  }
}
