import { Readable } from 'stream'
import { google } from 'googleapis'

const SERVICE_ACCOUNT_QUOTA_RE = /Service Accounts do not have storage quota/i
const DRIVE_TARGET_NOT_FOUND_RE = /(File not found|file you have requested does not exist|Page Not Found|notFound|404)/i

function buildServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('Server ยังไม่ได้ตั้งค่า GOOGLE_SERVICE_ACCOUNT_JSON')
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('ค่า GOOGLE_SERVICE_ACCOUNT_JSON ไม่ใช่ JSON ที่ถูกต้อง')
  }
}

function getUploadWebhook() {
  return (process.env.GOOGLE_DRIVE_UPLOAD_WEBHOOK || process.env.VITE_DRIVE_UPLOAD_WEBHOOK || '').trim()
}

function getUploadConfigStatus() {
  const hasWebhook = Boolean(getUploadWebhook())
  const hasServiceAccount = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  const hasFolderId = Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID)

  return {
    provider: hasWebhook && hasServiceAccount && hasFolderId
      ? 'webhook-with-service-account-fallback'
      : hasWebhook ? 'webhook' : hasServiceAccount ? 'service-account' : 'unconfigured',
    hasWebhook,
    hasServiceAccount,
    hasFolderId,
  }
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

function normalizeDriveError(error) {
  const message = String(error?.message || '')
  if (isDriveTargetNotFound(error)) {
    return 'โฟลเดอร์หรือไฟล์ Google Drive ที่ตั้งค่าไว้หาย หรือบัญชีที่ใช้อัปโหลดไม่มีสิทธิ์เข้าถึง กรุณาตั้งค่า GOOGLE_DRIVE_UPLOAD_WEBHOOK หรือ GOOGLE_DRIVE_FOLDER_ID ใหม่'
  }
  if (SERVICE_ACCOUNT_QUOTA_RE.test(message)) {
    return 'Service account ไม่มีพื้นที่ Google Drive สำหรับอัปโหลดไฟล์ ให้ตั้งค่า GOOGLE_DRIVE_UPLOAD_WEBHOOK เป็น Google Apps Script Web App ที่รันด้วย Gmail เจ้าของ Drive หรือใช้โฟลเดอร์ใน Shared Drive ผ่าน GOOGLE_DRIVE_FOLDER_ID'
  }
  return message || 'Upload failed'
}

function isDriveTargetNotFound(error) {
  return DRIVE_TARGET_NOT_FOUND_RE.test(String(error?.message || ''))
}

function canUseServiceAccountFallback() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_DRIVE_FOLDER_ID)
}

function sanitizeFolderName(name = '') {
  return String(name || '')
    .trim()
    .replace(/[\\/:*?"<>|#{}%~&]/g, '-')
    .slice(0, 80)
}

function escapeDriveQueryValue(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

async function getOrCreateChildFolder(drive, parentId, folderName) {
  const cleanName = sanitizeFolderName(folderName)
  if (!cleanName) return parentId

  const escapedParent = escapeDriveQueryValue(parentId)
  const escapedName = escapeDriveQueryValue(cleanName)
  const { data } = await drive.files.list({
    q: `'${escapedParent}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${escapedName}' and trashed = false`,
    fields: 'files(id,name)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  const existing = data.files?.[0]
  if (existing?.id) return existing.id

  const createResp = await drive.files.create({
    requestBody: {
      name: cleanName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id,name',
    supportsAllDrives: true,
  })

  if (!createResp.data.id) throw new Error('Drive did not return folder id')
  return createResp.data.id
}

async function uploadViaWebhook(payload) {
  const webhook = getUploadWebhook()
  if (!webhook) return null

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  let json = {}
  try { json = text ? JSON.parse(text) : {} } catch {}

  if (!response.ok || json?.ok === false) {
    throw new Error(json?.error || text || 'Google Drive webhook upload failed')
  }
  return normalizeUploadResponse(json)
}

async function uploadViaServiceAccount(payload) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || ''
  if (!folderId) {
    throw new Error('การอัปโหลดด้วย service account ต้องตั้งค่า GOOGLE_DRIVE_FOLDER_ID เป็นโฟลเดอร์ใน Shared Drive หรือเปลี่ยนไปใช้ GOOGLE_DRIVE_UPLOAD_WEBHOOK')
  }

  const sa = buildServiceAccount()
  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  const drive = google.drive({ version: 'v3', auth })
  const imagesFolderId = await getOrCreateChildFolder(drive, folderId, 'รูปภาพ')
  const uploadFolderId = await getOrCreateChildFolder(drive, imagesFolderId, payload.folderName)

  const fileName = payload.filename || `upload_${Date.now()}.bin`
  const mt = payload.mimeType || 'application/octet-stream'
  const buffer = Buffer.from(payload.base64, 'base64')

  const createResp = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: mt,
      parents: [uploadFolderId],
    },
    media: {
      mimeType: mt,
      body: Readable.from(buffer),
    },
    fields: 'id,name,mimeType,size,webViewLink,webContentLink',
    supportsAllDrives: true,
  })

  const fileId = createResp.data.id
  if (!fileId) throw new Error('Drive did not return file id')

  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
    supportsAllDrives: true,
  })

  return {
    ok: true,
    fileId,
    folderId: uploadFolderId,
    name: createResp.data.name,
    webViewLink: createResp.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    webContentLink: createResp.data.webContentLink || `https://drive.google.com/uc?export=download&id=${fileId}`,
    mimeType: createResp.data.mimeType,
    size: createResp.data.size,
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'drive-upload',
      ...getUploadConfigStatus(),
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    let body = req.body || {}
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body || '{}')
      } catch {
        return res.status(400).json({ ok: false, error: 'JSON ไม่ถูกต้อง' })
      }
    }
    const { filename, mimeType, base64, folderName } = body
    if (!base64) return res.status(400).json({ ok: false, error: 'base64 is required' })

    const payload = { filename, mimeType, base64, folderName }
    let result = null
    try {
      result = await uploadViaWebhook(payload)
    } catch (webhookError) {
      if (!isDriveTargetNotFound(webhookError) || !canUseServiceAccountFallback()) {
        throw webhookError
      }
    }
    result = result || await uploadViaServiceAccount(payload)

    return res.status(200).json(result)
  } catch (e) {
    return res.status(500).json({ ok: false, error: normalizeDriveError(e) })
  }
}
