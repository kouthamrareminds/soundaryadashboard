/**
 * googleSheetsService.ts
 * Two-way live sync service to read and write directly with Google Sheets.
 * 
 * - Read mode: Google Visualization API (GViz) + Google Apps Script Web App
 * - Write mode: Google Apps Script Web App (pushAll, createRecord, updateRecord, deleteRecord)
 */

import { DatabaseState, initialDatabase } from '@/data/mockData';
import { loadDatabase, saveDatabase } from '@/services/dataService';

export const DEFAULT_SPREADSHEET_ID = '1YvkSqmwgsboaKBmesFWmAArzWdgYgpf04DoyJOyBth8';
export const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit?usp=sharing`;
export const WEBAPP_STORAGE_KEY = 'rareminds_google_webapp_url';
export const DEFAULT_WEBAPP_URL = 'https://script.google.com/a/macros/rareminds.in/s/AKfycbzXQyoMC1eGKNj_31WGVulHBnJM5P5-SdwoB6jNPjZBVXV7EkCE8I6ESLvPRwA28EpI/exec';

export interface SheetMapping {
  sheetName: string;
  dbKey: keyof DatabaseState;
}

export const SHEET_MAPPINGS: SheetMapping[] = [
  { sheetName: 'Students', dbKey: 'students' },
  { sheetName: 'Career Profiles', dbKey: 'careerProfiles' },
  { sheetName: 'Assessment Taken', dbKey: 'assessmentAttempts' },
  { sheetName: 'SIMS Application', dbKey: 'applications' },
  { sheetName: 'Rareminds Opportunity', dbKey: 'opportunities' },
  { sheetName: 'Market Opportunity', dbKey: 'companies' },
  { sheetName: 'Sessions', dbKey: 'sessions' },
  { sheetName: 'Attendance', dbKey: 'attendance' },
  { sheetName: 'Tasks', dbKey: 'sessionTasks' },
  { sheetName: 'Student Files', dbKey: 'studentFiles' },
  { sheetName: 'Assessment Scores', dbKey: 'assessmentScores' },
  { sheetName: 'Commitments', dbKey: 'commitments' },
  { sheetName: 'Finance', dbKey: 'finance' },
];

export function getWebAppUrl(): string {
  try {
    const stored = localStorage.getItem(WEBAPP_STORAGE_KEY);
    if (!stored || stored.includes('AKfycbzMEow') || stored.includes('AKfycbxdJFDx')) {
      localStorage.setItem(WEBAPP_STORAGE_KEY, DEFAULT_WEBAPP_URL);
      return DEFAULT_WEBAPP_URL;
    }
    return stored || DEFAULT_WEBAPP_URL;
  } catch {
    return DEFAULT_WEBAPP_URL;
  }
}

export function setWebAppUrl(url: string): void {
  try {
    if (url.trim()) {
      localStorage.setItem(WEBAPP_STORAGE_KEY, url.trim());
    } else {
      localStorage.removeItem(WEBAPP_STORAGE_KEY);
    }
  } catch {}
}

/**
 * Fetch rows from an individual Google Sheet tab using GViz API
 */
export async function fetchSheetRows(
  sheetName: string,
  spreadsheetId = DEFAULT_SPREADSHEET_ID
): Promise<Record<string, any>[] | null> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const text = await res.text();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return null;

    const json = JSON.parse(text.slice(start, end + 1));
    if (!json.table || !Array.isArray(json.table.rows) || json.table.rows.length === 0) {
      return [];
    }

    const cols = (json.table.cols || []).map((c: any, i: number) => {
      const label = c?.label ? String(c.label).trim() : '';
      return label || c?.id || `Col_${i}`;
    });

    const rows = json.table.rows.map((r: any) => {
      const rowObj: Record<string, any> = {};
      cols.forEach((col: string, idx: number) => {
        const cell = r.c ? r.c[idx] : null;
        let val = null;
        if (cell) {
          if (cell.v !== undefined && cell.v !== null) {
            val = cell.v;
          } else if (cell.f !== undefined && cell.f !== null) {
            val = cell.f;
          }
        }
        if (typeof val === 'string' && val.startsWith('Date(') && cell?.f) {
          val = cell.f;
        }
        rowObj[col] = val;
      });
      return rowObj;
    });

    return rows.filter((row: Record<string, any>) =>
      Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '')
    );
  } catch (err) {
    console.error(`[GoogleSheets] Error parsing sheet "${sheetName}":`, err);
    return null;
  }
}

export interface SyncResult {
  sheetName: string;
  dbKey: string;
  count: number;
  status: 'synced' | 'empty' | 'failed';
}

/**
 * Fetch all available sheets and update local application database
 */
export async function syncAllFromGoogleSheets(
  spreadsheetId = DEFAULT_SPREADSHEET_ID
): Promise<{
  success: boolean;
  totalSyncedRows: number;
  results: SyncResult[];
  updatedDb?: DatabaseState;
  message: string;
}> {
  const webAppUrl = getWebAppUrl();

  // If Web App URL is configured, try reading all sheets via Web App API first
  if (webAppUrl) {
    try {
      const res = await fetch(`${webAppUrl}?action=readAll`);
      if (res.ok) {
        const payload = await res.json();
        if (payload.success && payload.data) {
          const currentDb = loadDatabase();
          const newDb: DatabaseState = { ...currentDb };
          const results: SyncResult[] = [];
          let totalSyncedRows = 0;

          SHEET_MAPPINGS.forEach(({ sheetName, dbKey }) => {
            const rows = payload.data[sheetName];
            if (Array.isArray(rows) && rows.length > 0) {
              if (dbKey === 'studentFiles') {
                const fileMap = new Map<string, any>();
                (initialDatabase.studentFiles || []).forEach((f: any) => {
                  if (f['File ID']) fileMap.set(f['File ID'], f);
                });
                (currentDb.studentFiles || []).forEach((f: any) => {
                  if (f['File ID']) fileMap.set(f['File ID'], f);
                });
                rows.forEach((r: any) => {
                  if (r['File ID']) fileMap.set(r['File ID'], r);
                });
                (newDb as any)[dbKey] = Array.from(fileMap.values());
              } else {
                (newDb as any)[dbKey] = rows;
              }
              totalSyncedRows += rows.length;
              results.push({ sheetName, dbKey: String(dbKey), count: rows.length, status: 'synced' });
            } else {
              results.push({ sheetName, dbKey: String(dbKey), count: 0, status: 'empty' });
            }
          });

          if (totalSyncedRows > 0) {
            saveDatabase(newDb);
            localStorage.setItem('rareminds_last_gsheet_sync', new Date().toISOString());
            return {
              success: true,
              totalSyncedRows,
              results,
              updatedDb: newDb,
              message: `Successfully synced ${totalSyncedRows} records from Google Sheets Web App!`,
            };
          }
        }
      }
    } catch (err) {
      console.warn('[GoogleSheets] Web App readAll failed, falling back to GViz:', err);
    }
  }

  // Fallback to GViz endpoint
  const currentDb = loadDatabase();
  const newDb: DatabaseState = { ...currentDb };
  const results: SyncResult[] = [];
  let totalSyncedRows = 0;
  let anySheetSynced = false;

  for (const { sheetName, dbKey } of SHEET_MAPPINGS) {
    const rows = await fetchSheetRows(sheetName, spreadsheetId);
    if (rows && rows.length > 0) {
      if (dbKey === 'studentFiles') {
        const fileMap = new Map<string, any>();
        (initialDatabase.studentFiles || []).forEach((f: any) => {
          if (f['File ID']) fileMap.set(f['File ID'], f);
        });
        (currentDb.studentFiles || []).forEach((f: any) => {
          if (f['File ID']) fileMap.set(f['File ID'], f);
        });
        rows.forEach((r: any) => {
          if (r['File ID']) fileMap.set(r['File ID'], r);
        });
        (newDb as any)[dbKey] = Array.from(fileMap.values());
      } else {
        (newDb as any)[dbKey] = rows;
      }
      totalSyncedRows += rows.length;
      anySheetSynced = true;
      results.push({ sheetName, dbKey: String(dbKey), count: rows.length, status: 'synced' });
    } else if (rows && rows.length === 0) {
      results.push({ sheetName, dbKey: String(dbKey), count: 0, status: 'empty' });
    } else {
      results.push({ sheetName, dbKey: String(dbKey), count: 0, status: 'failed' });
    }
  }

  if (anySheetSynced) {
    saveDatabase(newDb);
    localStorage.setItem('rareminds_last_gsheet_sync', new Date().toISOString());
    return {
      success: true,
      totalSyncedRows,
      results,
      updatedDb: newDb,
      message: `Successfully synced ${totalSyncedRows} records from Google Sheets!`,
    };
  }

  const allEmpty = results.every(r => r.status === 'empty');
  return {
    success: false,
    totalSyncedRows: 0,
    results,
    message: allEmpty
      ? 'Connected to Google Sheet, but all tabs are empty. Click "Push All Data to Google Sheet" below to populate all tabs.'
      : 'Could not pull data from Google Sheet. Please verify sheet permissions.',
  };
}

// ── Two-Way Write Operations (Portal -> Google Sheet) ─────────────────────────

async function sendPostToWebApp(payload: any): Promise<boolean> {
  const url = getWebAppUrl();
  if (!url) return false;
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (err) {
    console.warn('[GoogleSheets] Write sync error:', err);
    return false;
  }
}

/**
 * Push the entire portal database into the Google Sheet in one shot
 */
export async function pushAllPortalDataToGoogleSheet(): Promise<{ success: boolean; message: string }> {
  const url = getWebAppUrl();
  if (!url) {
    return {
      success: false,
      message: 'Please paste your Google Apps Script Web App URL first to enable two-way push synchronization.',
    };
  }

  const db = loadDatabase();
  const res = await sendPostToWebApp({
    action: 'pushAll',
    data: db,
  });

  return {
    success: res,
    message: res
      ? 'Successfully pushed and populated all 13 modules into your Google Sheet!'
      : 'Failed to push data to Google Sheet. Check the Web App URL permissions.',
  };
}

/**
 * Sync single record creation to Google Sheet
 */
export function syncRecordCreationToGoogleSheet(module: string, record: any): void {
  sendPostToWebApp({ action: 'createRecord', module, record }).catch(() => {});
}

/**
 * Sync single record update to Google Sheet
 */
export function syncRecordUpdateToGoogleSheet(
  module: string,
  primaryId: string,
  primaryValue: string,
  updates: Record<string, any>
): void {
  sendPostToWebApp({ action: 'updateRecord', module, primaryId, primaryValue, updates }).catch(() => {});
}

/**
 * Sync record deletion to Google Sheet
 */
export function syncRecordDeletionToGoogleSheet(
  module: string,
  primaryId: string,
  primaryValue: string
): void {
  sendPostToWebApp({ action: 'deleteRecord', module, primaryId, primaryValue }).catch(() => {});
}

/**
 * Sync bulk import to Google Sheet
 */
export function syncBulkImportToGoogleSheet(module: string, records: any[]): void {
  sendPostToWebApp({ action: 'bulkImport', module, records }).catch(() => {});
}
