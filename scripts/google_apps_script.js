/**
 * Google Apps Script for Two-Way Synchronization with Soundarya Dashboard
 * 
 * Instructions:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1YvkSqmwgsboaKBmesFWmAArzWdgYgpf04DoyJOyBth8/edit
 * 2. Click "Extensions" > "Apps Script"
 * 3. Replace any code in Code.gs with this entire file.
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set "Execute as": "Me"
 * 7. Set "Who has access": "Anyone"
 * 8. Click "Deploy", authorize permissions, and copy the Web App URL.
 * 9. Paste the Web App URL into the Soundarya Dashboard Google Sheets sync modal!
 */

const MODULE_SHEET_MAP = {
  'students': 'Students',
  'careerProfiles': 'Career Profiles',
  'career-profiles': 'Career Profiles',
  'assessmentAttempts': 'Assessment Taken',
  'assessment-attempts': 'Assessment Taken',
  'applications': 'SIMS Application',
  'opportunities': 'Rareminds Opportunity',
  'companies': 'Market Opportunity',
  'sessions': 'Sessions',
  'attendance': 'Attendance',
  'sessionTasks': 'Tasks',
  'session-tasks': 'Tasks',
  'studentFiles': 'Student Files',
  'student-files': 'Student Files',
  'assessmentScores': 'Assessment Scores',
  'assessment-scores': 'Assessment Scores',
  'commitments': 'Commitments',
  'finance': 'Finance'
};

function getOrCreateSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

// ── GET: Read data from Google Sheet ──────────────────────────────────────────
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = e && e.parameter ? e.parameter.action : 'readAll';
    const sheetName = e && e.parameter ? e.parameter.sheet : null;

    if (action === 'readSheet' && sheetName) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return jsonResponse({ success: false, error: 'Sheet not found', data: [] });
      const rows = readSheetObjects(sheet);
      return jsonResponse({ success: true, sheet: sheetName, data: rows });
    }

    // Default: read all mapped sheets
    const result = {};
    const sheets = ss.getSheets();
    sheets.forEach(sheet => {
      const name = sheet.getName();
      result[name] = readSheetObjects(sheet);
    });

    return jsonResponse({ success: true, data: result });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ── POST: Write, update, or sync data to Google Sheet ─────────────────────────
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === 'pushAll') {
      // Replaces or populates all sheets with the full portal database
      const db = payload.data || {};
      Object.keys(db).forEach(key => {
        const sheetName = MODULE_SHEET_MAP[key] || key;
        const records = db[key];
        if (Array.isArray(records) && records.length > 0) {
          writeRecordsToSheet(ss, sheetName, records);
        }
      });
      return jsonResponse({ success: true, message: 'All sheets populated successfully' });
    }

    if (action === 'createRecord') {
      const sheetName = MODULE_SHEET_MAP[payload.module] || payload.module;
      const record = payload.record;
      const sheet = getOrCreateSheet(ss, sheetName);
      appendSingleRecord(sheet, record);
      return jsonResponse({ success: true, message: 'Record created' });
    }

    if (action === 'updateRecord') {
      const sheetName = MODULE_SHEET_MAP[payload.module] || payload.module;
      const { primaryId, primaryValue, updates } = payload;
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return jsonResponse({ success: false, error: 'Sheet not found' });
      updateSingleRecord(sheet, primaryId, primaryValue, updates);
      return jsonResponse({ success: true, message: 'Record updated' });
    }

    if (action === 'deleteRecord') {
      const sheetName = MODULE_SHEET_MAP[payload.module] || payload.module;
      const { primaryId, primaryValue } = payload;
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return jsonResponse({ success: false, error: 'Sheet not found' });
      deleteSingleRecord(sheet, primaryId, primaryValue);
      return jsonResponse({ success: true, message: 'Record deleted' });
    }

    if (action === 'bulkImport') {
      const sheetName = MODULE_SHEET_MAP[payload.module] || payload.module;
      const records = payload.records || [];
      const sheet = getOrCreateSheet(ss, sheetName);
      records.forEach(r => appendSingleRecord(sheet, r));
      return jsonResponse({ success: true, message: `Imported ${records.length} records` });
    }

    return jsonResponse({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function readSheetObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(h => String(h).trim());
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    let hasVal = false;
    headers.forEach((h, idx) => {
      let v = row[idx];
      if (v instanceof Date) {
        v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      obj[h] = (v === '' ? null : v);
      if (v !== '' && v !== null && v !== undefined) hasVal = true;
    });
    if (hasVal) rows.push(obj);
  }
  return rows;
}

function writeRecordsToSheet(ss, sheetName, records) {
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(sheetName);
  }
  if (!records || records.length === 0) return;
  const headers = Object.keys(records[0]);
  const data = [headers];
  records.forEach(r => {
    const row = headers.map(h => (r[h] !== undefined && r[h] !== null ? r[h] : ''));
    data.push(row);
  });
  sheet.getRange(1, 1, data.length, headers.length).setValues(data);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f5f9');
}

function appendSingleRecord(sheet, record) {
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    const headers = Object.keys(record);
    sheet.appendRow(headers);
    sheet.appendRow(headers.map(h => record[h] !== undefined ? record[h] : ''));
    return;
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const row = headers.map(h => (record[h] !== undefined && record[h] !== null ? record[h] : ''));
  sheet.appendRow(row);
}

function updateSingleRecord(sheet, primaryId, primaryValue, updates) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  const headers = data[0].map(h => String(h).trim());
  const idColIdx = headers.indexOf(primaryId);
  if (idColIdx === -1) return;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(primaryValue)) {
      Object.keys(updates).forEach(key => {
        const colIdx = headers.indexOf(key);
        if (colIdx !== -1) {
          sheet.getRange(i + 1, colIdx + 1).setValue(updates[key]);
        }
      });
      break;
    }
  }
}

function deleteSingleRecord(sheet, primaryId, primaryValue) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  const headers = data[0].map(h => String(h).trim());
  const idColIdx = headers.indexOf(primaryId);
  if (idColIdx === -1) return;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(primaryValue)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
