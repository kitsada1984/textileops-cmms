/**
 * TextileOps Google Drive & Sheets Integration Webhook (v2.0)
 * 
 * โครงสร้างโฟลเดอร์บน Google Drive:
 * 📁 TextileOps_System_Data/
 *   ├── 📁 รูปภาพ/
 *   │   ├── 📁 แท็กเครื่องจักร/      (รูปแท็กเครื่องจักร)
 *   │   ├── 📁 รูปกระบอก/           (รูปถ่ายกระบอกเข็ม)
 *   │   ├── 📁 ประวัติเช็คศูนย์/      (รูปประวัติเช็คศูนย์ และ PM)
 *   │   ├── 📁 สภาพเข็ม/            (รูปการตรวจสภาพเข็ม)
 *   │   ├── 📁 รูปอะไหล่/           (รูปภาพอะไหล่)
 *   │   ├── 📁 จัดซื้อ/             (รูปเอกสารใบสั่งซื้อ PO)
 *   │   └── 📁 Design-BOM/         (รูปโครงสร้างลายผ้า)
 *   └── 📁 ฐานข้อมูลสำรอง_GoogleSheets/
 *       └── 📊 TextileOps_Backup_Data (Google Spreadsheet สำหรับซิงค์ข้อมูล)
 */

const DEFAULT_ROOT_FOLDER_NAME = 'TextileOps_System_Data';
const IMAGES_ROOT_FOLDER_NAME = 'รูปภาพ';
const SHEETS_ROOT_FOLDER_NAME = 'ฐานข้อมูลสำรอง_GoogleSheets';

const IMAGE_SUB_FOLDERS = [
  'แท็กเครื่องจักร',
  'รูปกระบอก',
  'ประวัติเช็คศูนย์',
  'สภาพเข็ม',
  'รูปอะไหล่',
  'จัดซื้อ',
  'Design-BOM',
];

/**
 * ── 1. WEBHOOK POST HANDLER (UPLOAD & SYNC) ───────────────────────────────────
 */
function doPost(e) {
  try {
    const body = parseRequestBody(e);
    if (Array.isArray(body.values)) {
      return syncGoogleSheet(body);
    }

    const base64 = String(body.base64 || '');
    if (!base64) {
      return jsonResponse({ ok: false, error: 'base64 is required' });
    }

    const filename = sanitizeFileName(body.filename || `upload_${Date.now()}.bin`);
    const mimeType = body.mimeType || 'application/octet-stream';
    const folderName = sanitizeFolderName(body.folderName || '');

    const targetFolder = resolveUploadFolder(folderName);
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, filename);
    const file = targetFolder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const webViewLink = `https://drive.google.com/file/d/${file.getId()}/view`;
    const webContentLink = `https://drive.google.com/uc?export=download&id=${file.getId()}`;

    return jsonResponse({
      ok: true,
      fileId: file.getId(),
      id: file.getId(),
      folderId: targetFolder.getId(),
      name: file.getName(),
      url: webViewLink,
      webViewLink,
      webContentLink,
      mimeType: file.getMimeType(),
      size: file.getSize(),
    });
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
}

/**
 * ── 2. WEBHOOK GET HANDLER (HEALTH CHECK & INFO) ──────────────────────────────
 */
function doGet(e) {
  const props = PropertiesService.getScriptProperties();
  const action = e?.parameter?.action || '';

  if (action === 'organize') {
    const report = organizeTextileOpsDrive();
    return jsonResponse({ ok: true, action: 'organize', report });
  }

  return jsonResponse({
    ok: true,
    service: 'textileops-google-webhook-v2',
    rootFolderName: props.getProperty('ROOT_FOLDER_NAME') || DEFAULT_ROOT_FOLDER_NAME,
    hasDriveFolderId: Boolean(props.getProperty('DRIVE_FOLDER_ID')),
    hasSheetsSpreadsheetId: Boolean(props.getProperty('SHEETS_SPREADSHEET_ID')),
  });
}

/**
 * ── 3. GOOGLE SHEETS SYNC HANDLER ─────────────────────────────────────────────
 */
function syncGoogleSheet(body) {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = String(props.getProperty('SHEETS_SPREADSHEET_ID') || '').trim();

  let spreadsheet;
  if (spreadsheetId) {
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      console.warn('Cannot open spreadsheet by ID, will find or create in backup folder:', e);
    }
  }

  if (!spreadsheet) {
    const sheetsFolder = resolveSheetsBackupFolder();
    const files = sheetsFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
    if (files.hasNext()) {
      spreadsheet = SpreadsheetApp.open(files.next());
    } else {
      spreadsheet = SpreadsheetApp.create('TextileOps_Backup_Data');
      const file = DriveApp.getFileById(spreadsheet.getId());
      file.moveTo(sheetsFolder);
    }
    props.setProperty('SHEETS_SPREADSHEET_ID', spreadsheet.getId());
  }

  const sheetName = sanitizeSheetName(body.sheetName || 'Data');
  const values = body.values;
  if (!values.length || !Array.isArray(values[0]) || !values[0].length) {
    throw new Error('ไม่มีข้อมูลสำหรับอัปเดต Google Sheet');
  }

  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);

  sheet.clearContents();
  const rowCount = values.length;
  const columnCount = Math.max(...values.map((row) => Array.isArray(row) ? row.length : 0));
  const normalizedValues = values.map((row) => {
    const cells = Array.isArray(row) ? row : [];
    return Array.from({ length: columnCount }, (_, index) => cells[index] === undefined || cells[index] === null ? '' : cells[index]);
  });
  sheet.getRange(1, 1, rowCount, columnCount).setValues(normalizedValues);

  return jsonResponse({
    ok: true,
    provider: 'apps-script',
    spreadsheetId: spreadsheet.getId(),
    sheetName,
    rowCount: Math.max(rowCount - 1, 0),
    columnCount,
    spreadsheetUrl: spreadsheet.getUrl(),
  });
}

/**
 * ── 4. AUTOMATIC FOLDER RESOLUTION ────────────────────────────────────────────
 */
function getRootFolder() {
  const props = PropertiesService.getScriptProperties();
  const parentFolderId = String(props.getProperty('DRIVE_FOLDER_ID') || '').trim();
  if (parentFolderId) {
    try {
      return DriveApp.getFolderById(parentFolderId);
    } catch (e) {
      console.warn('Cannot find parent folder by ID, creating default:', e);
    }
  }
  const root = getOrCreateRootFolder(DEFAULT_ROOT_FOLDER_NAME);
  props.setProperty('DRIVE_FOLDER_ID', root.getId());
  props.setProperty('ROOT_FOLDER_NAME', DEFAULT_ROOT_FOLDER_NAME);
  return root;
}

function getImagesRootFolder() {
  const root = getRootFolder();
  return getOrCreateChildFolder(root, IMAGES_ROOT_FOLDER_NAME);
}

function resolveUploadFolder(childFolderName) {
  const imagesRoot = getImagesRootFolder();
  if (!childFolderName) return imagesRoot;
  return getOrCreateChildFolder(imagesRoot, childFolderName);
}

function resolveSheetsBackupFolder() {
  const root = getRootFolder();
  return getOrCreateChildFolder(root, SHEETS_ROOT_FOLDER_NAME);
}

function getOrCreateRootFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  while (folders.hasNext()) {
    const f = folders.next();
    if (!f.isTrashed()) return f;
  }
  return DriveApp.createFolder(folderName);
}

function getOrCreateChildFolder(parentFolder, folderName) {
  if (!folderName) return parentFolder;
  const folders = parentFolder.getFoldersByName(folderName);
  while (folders.hasNext()) {
    const f = folders.next();
    if (!f.isTrashed()) return f;
  }
  return parentFolder.createFolder(folderName);
}

/**
 * ── 5. ONE-CLICK ORGANIZE & MIGRATION UTILITY ──────────────────────────────────
 */
function organizeTextileOpsDrive() {
  const root = getRootFolder();
  const imagesRoot = getOrCreateChildFolder(root, IMAGES_ROOT_FOLDER_NAME);
  const sheetsFolder = getOrCreateChildFolder(root, SHEETS_ROOT_FOLDER_NAME);

  const subFolderMap = {};
  IMAGE_SUB_FOLDERS.forEach((subName) => {
    subFolderMap[subName] = getOrCreateChildFolder(imagesRoot, subName);
  });

  const logs = [];
  logs.push(`✅ ตรวจสอบโฟลเดอร์หลัก: ${root.getName()} (ID: ${root.getId()})`);
  logs.push(`✅ โฟลเดอร์รูปภาพ: ${imagesRoot.getName()}`);
  logs.push(`✅ โฟลเดอร์สำรอง Google Sheets: ${sheetsFolder.getName()}`);

  const legacyFolders = DriveApp.getFoldersByName('TextileOps Uploads');
  while (legacyFolders.hasNext()) {
    const oldFolder = legacyFolders.next();
    if (oldFolder.getId() !== root.getId() && !oldFolder.isTrashed()) {
      const oldSubFolders = oldFolder.getFolders();
      while (oldSubFolders.hasNext()) {
        const sub = oldSubFolders.next();
        const subName = sub.getName();
        if (subFolderMap[subName]) {
          const files = sub.getFiles();
          let count = 0;
          while (files.hasNext()) {
            const f = files.next();
            f.moveTo(subFolderMap[subName]);
            count++;
          }
          logs.push(`📦 ย้ายไฟล์ ${count} รายการจากโฟลเดอร์ '${subName}' ไปยัง '${IMAGES_ROOT_FOLDER_NAME}/${subName}'`);
        }
      }
      const looseFiles = oldFolder.getFiles();
      let looseCount = 0;
      while (looseFiles.hasNext()) {
        const f = looseFiles.next();
        f.moveTo(imagesRoot);
        looseCount++;
      }
      if (looseCount > 0) {
        logs.push(`📦 ย้ายไฟล์รูปทั่วไป ${looseCount} รายการเข้ามาใน '${IMAGES_ROOT_FOLDER_NAME}'`);
      }
    }
  }

  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty('SHEETS_SPREADSHEET_ID');
  if (sheetId) {
    try {
      const sheetFile = DriveApp.getFileById(sheetId);
      sheetFile.moveTo(sheetsFolder);
      logs.push(`📊 ย้ายไฟล์ Google Spreadsheet (${sheetFile.getName()}) เข้าไปยัง '${SHEETS_ROOT_FOLDER_NAME}' เรียบร้อย`);
    } catch (e) {
      logs.push(`⚠️ ข้ามการย้าย Spreadsheet: ${e.message}`);
    }
  }

  props.setProperty('DRIVE_FOLDER_ID', root.getId());
  props.setProperty('ROOT_FOLDER_NAME', root.getName());

  logs.push('🎉 จัดระเบียบ Google Drive เสร็จสมบูรณ์ (File ID เดิมยังคงทำงานได้ 100%)');
  console.log(logs.join('\n'));
  return logs;
}

/**
 * ── 6. UTILITY FUNCTIONS ──────────────────────────────────────────────────────
 */
function parseRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('No postData');
  }
  return JSON.parse(e.postData.contents || '{}');
}

function sanitizeFolderName(name) {
  return String(name || '')
    .trim()
    .replace(/[\\/:*?"<>|#{}%~&]/g, '-')
    .slice(0, 80);
}

function sanitizeFileName(name) {
  const clean = String(name || '')
    .trim()
    .replace(/[\\/:*?"<>|#{}%~&]/g, '-')
    .slice(0, 160);

  return clean || `upload_${Date.now()}.bin`;
}

function sanitizeSheetName(name) {
  const clean = String(name || 'Data')
    .replace(/[\[\]\*\/\\?:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);

  return clean || 'Data';
}

function jsonResponse(obj) {
  const out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

/**
 * ── 7. ลบโฟลเดอร์เก่าที่ว่างเปล่าลงถังขยะ (SAFE CLEANUP) ──────────────────────
 * ฟังก์ชันตรวจสอบและลบเฉพาะโฟลเดอร์เก่าที่ว่างเปล่าด้านนอก ที่ย้ายไฟล์ออกหมดแล้ว
 */
function deleteEmptyLegacyFolders() {
  const root = getRootFolder();
  const rootId = root.getId();
  const logs = [];

  // 1. ลบโฟลเดอร์ 'TextileOps Uploads' เดิมที่ว่างเปล่า
  const legacyFolders = DriveApp.getFoldersByName('TextileOps Uploads');
  while (legacyFolders.hasNext()) {
    const oldFolder = legacyFolders.next();
    if (oldFolder.getId() !== rootId && !oldFolder.isTrashed()) {
      const subFolders = oldFolder.getFolders();
      while (subFolders.hasNext()) {
        const sub = subFolders.next();
        if (!sub.getFiles().hasNext() && !sub.getFolders().hasNext()) {
          sub.setTrashed(true);
          logs.push(`🗑️ ลบโฟลเดอร์ย่อยเก่าที่ว่างเปล่า: '${sub.getName()}'`);
        }
      }
      if (!oldFolder.getFiles().hasNext() && !oldFolder.getFolders().hasNext()) {
        oldFolder.setTrashed(true);
        logs.push(`🗑️ ลบโฟลเดอร์หลักเดิม: 'TextileOps Uploads' เรียบร้อย`);
      }
    }
  }

  // 2. ลบโฟลเดอร์หมวดหมู่เดิมที่อยู่นอก TextileOps_System_Data ที่ว่างเปล่า
  IMAGE_SUB_FOLDERS.forEach((name) => {
    const outsideFolders = DriveApp.getFoldersByName(name);
    while (outsideFolders.hasNext()) {
      const folder = outsideFolders.next();
      const parents = folder.getParents();
      let isInsideNewRoot = false;
      while (parents.hasNext()) {
        const p = parents.next();
        if (p.getId() === rootId || p.getName() === IMAGES_ROOT_FOLDER_NAME) {
          isInsideNewRoot = true;
          break;
        }
      }
      if (!isInsideNewRoot && !folder.isTrashed()) {
        if (!folder.getFiles().hasNext() && !folder.getFolders().hasNext()) {
          folder.setTrashed(true);
          logs.push(`🗑️ ลบโฟลเดอร์เก่าด้านนอก: '${folder.getName()}'`);
        }
      }
    }
  });

  if (logs.length === 0) {
    logs.push('✨ ไม่พบโฟลเดอร์เก่าที่ค้างอยู่ โฟลเดอร์ทั้งหมดสะอาดเรียบร้อยแล้ว');
  }

  console.log(logs.join('\n'));
  return logs;
}
