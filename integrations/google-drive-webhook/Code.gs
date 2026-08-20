/**
 * TextileOps Google Drive upload and Google Sheets sync webhook.
 *
 * Flow:
 * Drive flow:
 * 1. TextileOps sends { filename, mimeType, base64, folderName } to this Web App.
 * 2. Apps Script creates the image file in Google Drive and returns the link.
 *
 * Sheets flow:
 * 1. TextileOps sends { sheetName, values } to this Web App.
 * 2. Apps Script replaces the matching sheet's contents with the received rows.
 *
 * Deploy:
 * - Execute as: Me
 * - Who has access: Anyone
 *
 * Optional Script Properties:
 * - DRIVE_FOLDER_ID: parent Drive folder id for uploads.
 * - DEFAULT_FOLDER_NAME: parent folder name when DRIVE_FOLDER_ID is empty.
 * - SHEETS_SPREADSHEET_ID: target Google Spreadsheet id for Sheet All sync.
 */
const DEFAULT_UPLOAD_FOLDER_NAME = 'TextileOps Uploads';

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

    const uploadFolder = resolveUploadFolder(folderName);
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, filename);
    const file = uploadFolder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const webViewLink = `https://drive.google.com/file/d/${file.getId()}/view`;
    const webContentLink = `https://drive.google.com/uc?export=download&id=${file.getId()}`;

    return jsonResponse({
      ok: true,
      fileId: file.getId(),
      id: file.getId(),
      folderId: uploadFolder.getId(),
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

function doGet() {
  const props = PropertiesService.getScriptProperties();
  return jsonResponse({
    ok: true,
    service: 'textileops-google-webhook',
    hasDriveFolderId: Boolean(props.getProperty('DRIVE_FOLDER_ID')),
    hasSheetsSpreadsheetId: Boolean(props.getProperty('SHEETS_SPREADSHEET_ID')),
    defaultFolderName: props.getProperty('DEFAULT_FOLDER_NAME') || DEFAULT_UPLOAD_FOLDER_NAME,
  });
}

function syncGoogleSheet(body) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = String(props.getProperty('SHEETS_SPREADSHEET_ID') || '').trim();
  if (!spreadsheetId) {
    throw new Error('ยังไม่ได้ตั้งค่า SHEETS_SPREADSHEET_ID ใน Script properties');
  }

  const sheetName = sanitizeSheetName(body.sheetName || 'Data');
  const values = body.values;
  if (!values.length || !Array.isArray(values[0]) || !values[0].length) {
    throw new Error('ไม่มีข้อมูลสำหรับอัปเดต Google Sheet');
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
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
    spreadsheetId,
    sheetName,
    rowCount: Math.max(rowCount - 1, 0),
    columnCount,
    spreadsheetUrl: spreadsheet.getUrl(),
  });
}

function parseRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('No postData');
  }
  return JSON.parse(e.postData.contents || '{}');
}

function resolveUploadFolder(childFolderName) {
  const props = PropertiesService.getScriptProperties();
  const parentFolderId = String(props.getProperty('DRIVE_FOLDER_ID') || '').trim();
  const defaultFolderName = sanitizeFolderName(
    props.getProperty('DEFAULT_FOLDER_NAME') || DEFAULT_UPLOAD_FOLDER_NAME
  );

  const parentFolder = parentFolderId
    ? DriveApp.getFolderById(parentFolderId)
    : getOrCreateRootFolder(defaultFolderName);

  return getOrCreateChildFolder(parentFolder, childFolderName);
}

function getOrCreateRootFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function getOrCreateChildFolder(parentFolder, folderName) {
  if (!folderName) return parentFolder;

  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
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
