import { google } from 'googleapis'

function buildServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('Server ยังไม่ได้ตั้งค่า GOOGLE_SERVICE_ACCOUNT_JSON')
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('ค่า GOOGLE_SERVICE_ACCOUNT_JSON ไม่ใช่ JSON ที่ถูกต้อง')
  }
}

const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwRwXwdCgnFZ6CU7L1IxK7aLD7K4VX_L-w4UD1LkyO5bICzhhRAHZpxN7OlJWxdmWdG/exec'

function getWebhook() {
  return (
    process.env.GOOGLE_SHEETS_SYNC_WEBHOOK ||
    process.env.VITE_SHEETS_SYNC_WEBHOOK ||
    process.env.GOOGLE_DRIVE_UPLOAD_WEBHOOK ||
    process.env.VITE_DRIVE_UPLOAD_WEBHOOK ||
    DEFAULT_WEBHOOK_URL
  ).trim()
}

function getSpreadsheetId() {
  return (process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID || '').trim()
}

function canUseServiceAccount() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && getSpreadsheetId())
}

function getServiceAccountEmail() {
  try {
    return buildServiceAccount().client_email || ''
  } catch {
    return ''
  }
}

function normalizeSheetName(name = '') {
  return String(name || 'Data')
    .replace(/[\[\]\*\/\\?:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90) || 'Data'
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

async function syncViaWebhook(payload) {
  const webhook = getWebhook()
  if (!webhook) throw new Error('ยังไม่ได้ตั้งค่า GOOGLE_SHEETS_SYNC_WEBHOOK')

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  const json = text ? JSON.parse(text) : {}
  if (!response.ok) throw new Error(json?.error || text || 'Google Sheets webhook sync failed')
  return json
}

async function ensureSheet(sheets, spreadsheetId, sheetName) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  })
  const exists = meta.data.sheets?.some((sheet) => sheet.properties?.title === sheetName)
  if (exists) return

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    },
  })
}

async function syncViaServiceAccount(payload) {
  const spreadsheetId = getSpreadsheetId()
  if (!spreadsheetId) throw new Error('Server ยังไม่ได้ตั้งค่า GOOGLE_SHEETS_SPREADSHEET_ID')

  const serviceAccount = buildServiceAccount()
  const auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })
  const { sheetName, values } = normalizePayload(payload)

  await ensureSheet(sheets, spreadsheetId, sheetName)
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetName}'`,
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })

  return {
    ok: true,
    provider: 'service-account',
    spreadsheetId,
    sheetName,
    rowCount: values.length - 1,
    columnCount: values[0]?.length || 0,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'sheets-sync',
      provider: getWebhook() ? 'webhook' : canUseServiceAccount() ? 'service-account' : 'unconfigured',
      configured: Boolean(getWebhook() || canUseServiceAccount()),
      hasWebhook: Boolean(getWebhook()),
      hasServiceAccount: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      serviceAccountEmail: getServiceAccountEmail(),
      hasSpreadsheetId: Boolean(getSpreadsheetId()),
    })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const payload = normalizePayload(req.body || {})
    const result = getWebhook()
      ? await syncViaWebhook({ ...req.body, sheetName: payload.sheetName, values: payload.values })
      : await syncViaServiceAccount(req.body || {})
    return res.status(200).json({ ...payload, ...result, ok: true })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Google Sheets sync failed' })
  }
}
