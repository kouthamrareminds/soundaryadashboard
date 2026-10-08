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


/**
 * Run this function directly in Apps Script to instantly populate all 35 MCA student files into the "Student Files" tab!
 */
function syncMcaStudentFiles() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Student Files") || ss.insertSheet("Student Files");
  const existingData = sheet.getDataRange().getValues();
  const existingIds = new Set();
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][0]) existingIds.add(String(existingData[i][0]));
  }
  const mcaRows = [
  [
    "FILE-0332",
    "P03KU24S126005",
    "Resume",
    "Resume",
    "",
    "https://drive.google.com/open?id=1ZzvWu4ySaHVzV1a5GMhx2vLtHuxau7mR",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "Verified Resume",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0333",
    "P03KU24S126005",
    "LinkedIn",
    "LinkedIn Profile",
    "",
    "https://www.linkedin.com/in/sevanthi-m-2a1ba7298?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0334",
    "P03KU24S126005",
    "Portfolio",
    "AI powered hotel dining",
    "",
    "https://github.com/SevanthiM/ai-hotal-dining",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0335",
    "P03KU24S126009",
    "Resume",
    "Resume",
    "",
    "https://drive.google.com/open?id=1KgVweok5-aaqoyRlFlhU02kcvgh9Sobr",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "Verified Resume",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0336",
    "P03KU24S126009",
    "LinkedIn",
    "LinkedIn Profile",
    "",
    "https://linkedin.com/in/bhoomika-d-2k319",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0337",
    "P03KU24S126009",
    "Portfolio",
    "StomaScope - Crop disease detection using CNN and grad cam",
    "",
    "https://github.com/BhoomikaBhoomi16/StomaScope-App",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0338",
    "P03KU24S126002",
    "Resume",
    "Resume",
    "",
    "https://drive.google.com/open?id=1lpkJ4hUJMz6KHQrVHk1ux2_2B3q5ja6B",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "Verified Resume",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0339",
    "P03KU24S126002",
    "LinkedIn",
    "LinkedIn Profile",
    "",
    "https://www.linkedin.com/in/lavanya-p-21b2a1363",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0340",
    "P03KU24S126002",
    "Portfolio",
    "Mood based music recommendation system using facial expression",
    "",
    "https://github.com/lavulavanya1413-rgb/Mood-based-music-recommendation-system-using-facial-expression",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0341",
    "P03KU24S126003",
    "Resume",
    "Resume",
    "",
    "https://drive.google.com/open?id=171XO1bzig6MoCn3aPzlgWadTUxUE1fPx",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "Verified Resume",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0342",
    "P03KU24S126003",
    "LinkedIn",
    "LinkedIn Profile",
    "",
    "https://www.linkedin.com/in/lavanya-basavaraju-a55b65342",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0343",
    "P03KU24S126003",
    "Portfolio",
    "E- Commerce website",
    "",
    "https://github.com/lavlavanya6360-lgtm/Ecommerce",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0344",
    "P03KU24S126003",
    "Portfolio",
    "Face Recognition based attendance monitoring system",
    "",
    "https://github.com/lavlavanya6360-lgtm/Face-recognition",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0345",
    "P03KU24S126008",
    "Resume",
    "Resume",
    "",
    "https://drive.google.com/open?id=1-YvSrDgKA72ImaGEnMhwhLkQtMot3ldE",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "Verified Resume",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0346",
    "P03KU24S126008",
    "LinkedIn",
    "LinkedIn Profile",
    "",
    "https://www.linkedin.com/in/pradeep-gowda-a74836342",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0347",
    "P03KU24S126011",
    "Resume",
    "Resume",
    "",
    "https://drive.google.com/open?id=1dFbH0Qx6vuljjQbO_SUzJqMEJ1tUVRd3",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "Verified Resume",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0348",
    "P03KU24S126011",
    "LinkedIn",
    "LinkedIn Profile",
    "",
    "https://www.linkedin.com/in/meghana-m-v-938684302",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0349",
    "P03KU24S126004",
    "Resume",
    "Resume",
    "",
    "https://drive.google.com/open?id=1uHUFY2F252CkpgZ0cvVC57E1c5pHnwhd",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "Verified Resume",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0350",
    "P03KU24S126004",
    "LinkedIn",
    "LinkedIn Profile",
    "",
    "https://www.linkedin.com/in/leo-chetty-483278343/",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0351",
    "P03KU24S126010",
    "Resume",
    "Resume",
    "",
    "https://drive.google.com/open?id=1dB2Byb3rrBg8ctaAd04QmMK1Lu4rOTaF",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "Verified Resume",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0352",
    "P03KU24S126010",
    "LinkedIn",
    "LinkedIn Profile",
    "",
    "https://www.linkedin.com/in/nayana-k-s-b8a979268",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0353",
    "P03KU24S126010",
    "Portfolio",
    "Sign Language Recognition System",
    "",
    "https://github.com/Nayana123-del/college_management_system",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0354",
    "P03KU24S126015",
    "Resume",
    "Resume",
    "",
    "https://drive.google.com/open?id=17fYd717bgbPXxxbJJvVA7jAM0O55v5mj",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "Verified Resume",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0355",
    "P03KU24S126015",
    "LinkedIn",
    "LinkedIn Profile",
    "",
    "https://www.linkedin.com/in/sanchay-k",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0356",
    "P03KU24S126012",
    "Resume",
    "Resume",
    "",
    "https://drive.google.com/open?id=1099e2zK5tHBBZNO22v0RqKm6GDQC2U9K",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "Verified Resume",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0357",
    "P03KU24S126012",
    "LinkedIn",
    "LinkedIn Profile",
    "",
    "https://www.linkedin.com/in/hamsa-keerthi-n-gowda-3701ba241",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0358",
    "P03KU24S126007",
    "Resume",
    "Resume",
    "",
    "https://drive.google.com/open?id=1RBKtf2HgMU893GHR6-h2wbdI3qBBHcnv",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "Verified Resume",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0359",
    "P03KU24S126007",
    "LinkedIn",
    "LinkedIn Profile",
    "",
    "https://www.linkedin.com/in/akhila-t-6a0a27303",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0360",
    "P03KU24S126006",
    "Resume",
    "Resume",
    "",
    "https://drive.google.com/open?id=1FPcWkFFReSzinoPzhRz1zXDOlZDycIyl",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "Verified Resume",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0361",
    "P03KU24S126006",
    "LinkedIn",
    "LinkedIn Profile",
    "",
    "https://www.linkedin.com/in/nalina-nalina-6b2191300?",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0362",
    "P03KU24S126006",
    "Certificate",
    "Cicsco network academy",
    "",
    "Http://Coursera.org/verify/E9ALBONLRHS",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0363",
    "P03KU24S126014",
    "Resume",
    "Resume",
    "",
    "https://drive.google.com/open?id=1BWviTmKvD7Ij89TpEue9kinyiEDkIjie",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "Verified Resume",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0364",
    "P03KU24S126014",
    "LinkedIn",
    "LinkedIn Profile",
    "",
    "https://github.com/Harshil-MCA",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0365",
    "P03KU24S126014",
    "Portfolio",
    "TravelNex – AI-Powered Intelligent Travel Planner",
    "",
    "https://github.com/Harshil-MCA",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ],
  [
    "FILE-0366",
    "P03KU24S126014",
    "Certificate",
    "Scalar",
    "",
    "https://coursera.org/verify/BXUS92YYS719",
    "21-Sep-2026",
    "",
    "Approved",
    "Placement Team",
    "22-Sep-2026",
    "",
    "",
    "22-Sep-2026",
    "Yes"
  ]
];
  const toAppend = mcaRows.filter(r => !existingIds.has(r[0]));
  if (toAppend.length === 0) {
    Logger.log("All MCA student files already exist in Student Files tab.");
    return;
  }
  toAppend.forEach(row => sheet.appendRow(row));
  Logger.log("Successfully appended " + toAppend.length + " MCA student files to Student Files tab.");
}
