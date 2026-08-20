const DRIVE_UPLOAD_WEBHOOK = import.meta.env.VITE_DRIVE_UPLOAD_WEBHOOK || '/api/drive-upload'
let uploadConfigPromise = null

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const raw = String(reader.result || '')
      const base64 = raw.includes(',') ? raw.split(',')[1] : raw
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'))
    reader.readAsDataURL(file)
  })
}

async function getUploadConfig() {
  if (DRIVE_UPLOAD_WEBHOOK !== '/api/drive-upload') {
    return { ok: true, provider: 'external-webhook' }
  }

  if (!uploadConfigPromise) {
    uploadConfigPromise = fetch('/api/drive-upload', { method: 'GET' })
      .then((res) => res.json().catch(() => ({})))
      .catch(() => ({}))
  }

  return uploadConfigPromise
}

export function __resetGoogleDriveUploadCache() {
  uploadConfigPromise = null
}

export async function uploadImageToGoogleDrive(file, options = {}) {
  if (!file) throw new Error('ไม่พบไฟล์รูป')

  const base64 = await fileToBase64(file)
  const folderName = String(options.folderName || '').trim()

  const config = await getUploadConfig()
  if (config?.ok && config?.provider === 'unconfigured') {
    throw new Error(
      'Google Drive upload ยังไม่ได้ตั้งค่า: กรุณาใส่ GOOGLE_DRIVE_UPLOAD_WEBHOOK ' +
      'หรือ GOOGLE_SERVICE_ACCOUNT_JSON + GOOGLE_DRIVE_FOLDER_ID'
    )
  }

  const res = await fetch(DRIVE_UPLOAD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || 'image/jpeg',
      base64,
      ...(folderName ? { folderName } : {}),
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || 'อัปโหลด Google Drive ไม่สำเร็จ')

  const imageUrl = json?.webViewLink || json?.webContentLink || json?.url || ''
  if (!imageUrl) throw new Error('Webhook ไม่ได้ส่งลิงก์ไฟล์กลับมา')

  return {
    imageUrl,
    fileId: json?.fileId || json?.id || '',
    folderId: json?.folderId || '',
  }
}
