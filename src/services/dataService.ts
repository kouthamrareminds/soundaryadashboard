/**
 * dataService.ts
 * Abstraction layer for all data operations.
 * Currently: localStorage-backed in-memory store.
 * Future: swap to Supabase by setting VITE_USE_SUPABASE=true
 */

import { DatabaseState, initialDatabase, MODULE_DATA_KEY_MAP } from '@/data/mockData';
import { assertPermission, AuthForbiddenError } from '@/services/authService';
import {
  syncRecordCreationToGoogleSheet,
  syncRecordUpdateToGoogleSheet,
  syncRecordDeletionToGoogleSheet,
  syncBulkImportToGoogleSheet,
} from '@/services/googleSheetsService';

export { AuthForbiddenError };

// ─── Storage Keys & Schema Version ──────────────────────────────────────────

const SCHEMA_VERSION = 'v2026.10.08_rakshitha_purged_v43';
const VERSION_STORAGE_KEY = 'rareminds_portal_schema_version';
const STORAGE_KEY = 'rareminds_portal_real_db_v43';

// ─── Stream Normalizer Helper ───────────────────────────────────────────────
export function normalizeStreamName(stream?: string, programme?: string, spec?: string): string {
  const s = String(stream || '').trim().toUpperCase();
  const sp = String(spec || '').trim().toUpperCase();
  const prog = String(programme || '').trim().toUpperCase();

  if (
    prog === 'MCA' ||
    s.includes('MCA') ||
    s.startsWith('B1') ||
    s.startsWith('B2') ||
    s.startsWith('B3') ||
    sp.includes('MCA') ||
    sp.includes('CLOUD') ||
    sp.includes('STACK') ||
    sp.includes('TECH')
  ) {
    return 'MCA';
  }
  if (
    s === 'HR' ||
    s.includes('HR') ||
    s.includes('HUMAN') ||
    s.startsWith('A3') ||
    sp.includes('HR') ||
    sp.includes('HUMAN')
  ) {
    return 'HR';
  }
  if (
    s === 'BUSINESS ANALYST' ||
    s.includes('ANALYST') ||
    s.includes('ANALYTICS') ||
    s.includes('LOGISTICS') ||
    s.includes('OPS') ||
    s.startsWith('A4') ||
    sp.includes('ANALYST') ||
    sp.includes('ANALYTICS') ||
    sp.includes('OPERATIONS')
  ) {
    return 'Business Analyst';
  }
  if (
    s === 'MARKETING' ||
    s.includes('MARKET') ||
    s.includes('MARTECH') ||
    s.startsWith('A2') ||
    sp.includes('MARKET') ||
    sp.includes('MARTECH')
  ) {
    return 'Marketing';
  }
  if (
    s === 'FINANCE' ||
    s.includes('FIN') ||
    s.includes('BFSI') ||
    s.startsWith('A1') ||
    sp.includes('FIN') ||
    sp.includes('BFSI') ||
    sp.includes('BANKING')
  ) {
    return 'Finance';
  }
  if (prog === 'MBA') {
    return 'Finance';
  }
  return stream || 'MCA';
}

export function sanitizeDatabase(database: DatabaseState): DatabaseState {
  if (Array.isArray(database.students)) {
    database.students = database.students
      .filter(
        s =>
          s['Student ID'] !== 'P03KU24M015012' &&
          s['Full Name'] !== 'Harsha' &&
          s['Student ID'] !== 'P03KU24M015063' &&
          s['Full Name'] !== 'Rakshitha M R'
      )
      .map(s => ({
        ...s,
        'Assigned Training Stream': normalizeStreamName(
          s['Assigned Training Stream'],
          s.Programme,
          s['Primary Specialisation']
        ),
      }));
  }
  if (Array.isArray(database.assessmentAttempts)) {
    database.assessmentAttempts = database.assessmentAttempts.filter(
      a => a['Student ID'] !== 'P03KU24M015012' && a['Student ID'] !== 'P03KU24M015063'
    );
  }
  if (Array.isArray(database.careerProfiles)) {
    database.careerProfiles = database.careerProfiles.filter(
      p => p['Student ID'] !== 'P03KU24M015012' && p['Student ID'] !== 'P03KU24M015063'
    );
  }
  if (Array.isArray(database.studentFiles)) {
    database.studentFiles = database.studentFiles.filter(
      f => f['Student ID'] !== 'P03KU24M015012' && f['Student ID'] !== 'P03KU24M015063'
    );
  }
  if (Array.isArray(database.attendance)) {
    database.attendance = database.attendance.filter(
      a => a['Student ID'] !== 'P03KU24M015012' && a['Student ID'] !== 'P03KU24M015063'
    );
  }
  if (Array.isArray(database.studentSubmissions)) {
    database.studentSubmissions = database.studentSubmissions.filter(
      s => s['Student ID'] !== 'P03KU24M015012' && s['Student ID'] !== 'P03KU24M015063'
    );
  }
  if (Array.isArray(database.companies)) {
    if (database.companies.length > 0 && (!database.companies[0]['Company ID'] || !database.companies[0]['Company Name'])) {
      database.companies = [...initialDatabase.companies];
    }
    database.companies = database.companies.map(c => ({
      ...c,
      Website: null,
      'Company Name': c['Company Name'] === 'Radall' ? 'Radiall' : c['Company Name'],
      'Relationship Owner': 'Rareminds Corporate Relations',
    }));
  }
  if (Array.isArray(database.opportunities)) {
    database.opportunities = database.opportunities.map(o => ({
      ...o,
      'Company Name': o['Company Name'] === 'Radall' ? 'Radiall' : o['Company Name'],
      'Opportunity ID': o['Opportunity ID'] === 'EXP-MBA-RADALL' ? 'EXP-MBA-RADIALL' : o['Opportunity ID'],
      'JD Description': typeof o['JD Description'] === 'string' ? o['JD Description'].replace(/Radall/g, 'Radiall') : o['JD Description'],
    }));
  }
  if (Array.isArray(database.applications)) {
    database.applications = database.applications
      .filter(a => a['Student ID'] !== 'P03KU24M015037' && a['Student ID'] !== 'P03KU24M015012' && a['Application ID'] !== 'APP-0037')
      .map(a => {
      let updated = {
        ...a,
        'Company Name': a['Company Name'] === 'Radall' ? 'Radiall' : a['Company Name'],
        'Opportunity ID': a['Opportunity ID'] === 'EXP-MBA-RADALL' ? 'EXP-MBA-RADIALL' : a['Opportunity ID'],
      };
      if (updated['Student ID'] === 'P03KU24M015027' && updated['Company Name'] === 'Diageo') {
        updated['Opportunity ID'] = 'EXP-HR-RM';
        updated['Company Name'] = 'Rareminds';
        updated['Specialization'] = 'HR';
        updated['Offered CTC'] = 400000;
        updated['Offered Fixed Pay'] = 360000;
        updated['Offered Variable Pay'] = 40000;
      }
      return updated;
    });
  }
  return database;
}

// ─── Load / Save ─────────────────────────────────────────────────────────────

/** Load the persisted database from localStorage, or fall back to real populated master data. */
export function loadDatabase(): DatabaseState {
  try {
    const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
    // If version is outdated or not set, force clean load of real data
    if (storedVersion !== SCHEMA_VERSION) {
      return resetDatabase();
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DatabaseState;
      // If parsed contains old dummy SOU-2026 IDs or less than 80 students, discard and reload real data
      const firstId = parsed.students?.[0]?.['Student ID'] || '';
      if (
        firstId.startsWith('SOU-') ||
        (parsed.students?.length !== initialDatabase.students.length) ||
        (parsed.studentFiles && parsed.studentFiles.length < initialDatabase.studentFiles.length)
      ) {
        return resetDatabase();
      }

      const merged: DatabaseState = { ...initialDatabase };
      (Object.keys(initialDatabase) as Array<keyof DatabaseState>).forEach(key => {
        if (parsed[key] !== undefined) {
          (merged as any)[key] = parsed[key];
        }
      });
      const clean = sanitizeDatabase(merged);
      saveDatabase(clean);
      return clean;
    }
  } catch {
    // corrupted storage — reset
  }
  return resetDatabase();
}

/** Persist the full database snapshot to localStorage. */
export function saveDatabase(db: DatabaseState): void {
  try {
    // Evict any older database version snapshots to stay comfortably below quota
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('rareminds_portal_real_db_') && k !== STORAGE_KEY) {
        localStorage.removeItem(k);
      }
    }
    const sanitized = sanitizeDatabase(db);
    localStorage.setItem(VERSION_STORAGE_KEY, SCHEMA_VERSION);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('[dataService] Could not persist to localStorage — storage may be full.', err);
  }
}

/** Wipe persisted dummy data and restore real populated master database. */
export function resetDatabase(): DatabaseState {
  try {
    // Clear old database keys, PRESERVING active auth session and user credentials
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        k.startsWith('rareminds_') &&
        !k.includes('auth_session') &&
        !k.includes('users_db')
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {}

  const defaults = sanitizeDatabase({ ...initialDatabase });
  saveDatabase(defaults);
  return defaults;
}

// ─── CRUD Helpers ────────────────────────────────────────────────────────────

/** Fetch all records for a given module ID. */
export function fetchRecords(db: DatabaseState, moduleId: string): any[] {
  const key = MODULE_DATA_KEY_MAP[moduleId];
  if (!key || !Array.isArray((db as any)[key])) return [];
  return (db as any)[key];
}

/**
 * Create a new record in the specified module.
 * Returns the updated DatabaseState.
 */
export function createRecord(db: DatabaseState, moduleId: string, record: any): DatabaseState {
  assertPermission('CREATE', `add record to ${moduleId}`);
  const key = MODULE_DATA_KEY_MAP[moduleId];
  if (!key || !Array.isArray((db as any)[key])) return db;
  const updated: DatabaseState = {
    ...db,
    [key]: [record, ...(db as any)[key]],
  };
  saveDatabase(updated);
  syncRecordCreationToGoogleSheet(moduleId, record);
  return updated;
}

/**
 * Update a record identified by primaryId in the specified module.
 * Returns the updated DatabaseState.
 */
export function updateRecord(
  db: DatabaseState,
  moduleId: string,
  primaryId: string,
  primaryValue: string,
  updates: Record<string, any>
): DatabaseState {
  assertPermission('UPDATE', `edit record in ${moduleId}`);
  const key = MODULE_DATA_KEY_MAP[moduleId];
  if (!key || !Array.isArray((db as any)[key])) return db;
  const updated: DatabaseState = {
    ...db,
    [key]: (db as any)[key].map((rec: any) =>
      rec[primaryId] === primaryValue ? { ...rec, ...updates } : rec
    ),
  };
  saveDatabase(updated);
  syncRecordUpdateToGoogleSheet(moduleId, primaryId, primaryValue, updates);
  return updated;
}

/**
 * Delete a record identified by primaryId in the specified module.
 * Returns the updated DatabaseState.
 */
export function deleteRecord(
  db: DatabaseState,
  moduleId: string,
  primaryId: string,
  primaryValue: string
): DatabaseState {
  assertPermission('DELETE', `delete record from ${moduleId}`);
  const key = MODULE_DATA_KEY_MAP[moduleId];
  if (!key || !Array.isArray((db as any)[key])) return db;
  const updated: DatabaseState = {
    ...db,
    [key]: (db as any)[key].filter((rec: any) => rec[primaryId] !== primaryValue),
  };
  saveDatabase(updated);
  syncRecordDeletionToGoogleSheet(moduleId, primaryId, primaryValue);
  return updated;
}

/**
 * Bulk import records (prepend) for a given module.
 * Skips records that have duplicate primary IDs.
 * Returns { updatedDb, imported, skipped }.
 */
export function bulkImport(
  db: DatabaseState,
  moduleId: string,
  primaryId: string,
  newRecords: any[]
): { updatedDb: DatabaseState; imported: number; skipped: number } {
  assertPermission('IMPORT', `bulk import data into ${moduleId}`);
  const key = MODULE_DATA_KEY_MAP[moduleId];
  if (!key || !Array.isArray((db as any)[key])) {
    return { updatedDb: db, imported: 0, skipped: newRecords.length };
  }

  const existing = (db as any)[key] as any[];
  const existingIds = new Set(existing.map((r: any) => r[primaryId]));

  const toImport = newRecords.filter(r => !existingIds.has(r[primaryId]));
  const skipped = newRecords.length - toImport.length;

  const updatedDb: DatabaseState = {
    ...db,
    [key]: [...toImport, ...existing],
  };
  saveDatabase(updatedDb);
  if (toImport.length > 0) {
    syncBulkImportToGoogleSheet(moduleId, toImport);
  }
  return { updatedDb, imported: toImport.length, skipped };
}

/**
 * Upsert a single student attendance status for a session.
 */
export function upsertAttendanceMatrixRecord(
  db: DatabaseState,
  sessionId: string,
  studentId: string,
  newStatus: string
): DatabaseState {
  assertPermission('UPDATE', 'modify student attendance records');
  const existingIdx = db.attendance.findIndex(
    a => a['Session ID'] === sessionId && a['Student ID'] === studentId
  );

  let updatedAttendance: any[];
  if (existingIdx >= 0) {
    updatedAttendance = db.attendance.map((rec, idx) =>
      idx === existingIdx
        ? {
            ...rec,
            'Attendance Status': newStatus,
            'Recorded On': new Date().toISOString().split('T')[0],
          }
        : rec
    );
  } else {
    const nextId = `ATTEND-${String(db.attendance.length + 1).padStart(4, '0')}`;
    const newRecord = {
      'Attendance ID': nextId,
      'Session ID': sessionId,
      'Student ID': studentId,
      'Expected to Attend': 'Yes',
      'Attendance Status': newStatus,
      'Minutes Attended': newStatus === 'Present' ? 60 : newStatus === 'Late' ? 45 : 0,
      'Absence Reason': newStatus === 'Absent' ? 'Unexcused' : null,
      'Recorded By': 'Trainer / Portal',
      'Recorded On': new Date().toISOString().split('T')[0],
      'Follow-up Required': newStatus === 'Absent' ? 'Yes' : 'No',
      'Follow-up Owner': 'Delivery Lead',
      'Follow-up Status': 'Pending',
    };
    updatedAttendance = [newRecord, ...db.attendance];
  }

  const updatedDb: DatabaseState = {
    ...db,
    attendance: updatedAttendance,
  };
  saveDatabase(updatedDb);
  return updatedDb;
}

/**
 * Add a new Date / Session Column and initialize attendance for relevant students.
 */
export function createAttendanceSessionColumn(
  db: DatabaseState,
  sessionData: {
    sessionId: string;
    sessionTopic: string;
    programme: string;
    trainingStream?: string;
    plannedDate: string;
    trainer?: string;
  },
  defaultStatus: string = 'Present'
): DatabaseState {
  assertPermission('CREATE', 'create attendance session column');
  // 1. Check or create Session in db.sessions
  const sessionExists = db.sessions.some(s => s['Session ID'] === sessionData.sessionId);
  let updatedSessions = db.sessions;
  if (!sessionExists) {
    const newSession = {
      'Session ID': sessionData.sessionId,
      'Programme': sessionData.programme,
      'Training Stream/Group': sessionData.trainingStream || 'All',
      'Module': 'Core Capability Training',
      'Session Topic': sessionData.sessionTopic,
      'Target Competency': 'Domain Knowledge & Employability',
      'Delivery Mode': 'In-Person Workshop',
      'Planned Date': sessionData.plannedDate,
      'Planned Start': '09:30',
      'Planned End': '11:30',
      'Planned Learning Hours': 2,
      'Trainer': sessionData.trainer || 'Senior Faculty / Industry Trainer',
      'Actual Date': sessionData.plannedDate,
      'Actual Start': '09:30',
      'Actual End': '11:30',
      'Actual Learning Hours': 2,
      'Session Status': 'Completed',
      'Completion Evidence URL': null,
      'Variance Reason': null,
      'Revised Date': null,
      'Verified By': 'Academic Delivery Manager',
    };
    updatedSessions = [newSession, ...db.sessions];
  }

  // 2. Identify target students
  const targetStudents = db.students.filter(s => {
    if (sessionData.programme !== 'All' && s.Programme !== sessionData.programme) {
      return false;
    }
    if (
      sessionData.trainingStream &&
      sessionData.trainingStream !== 'All' &&
      s['Assigned Training Stream'] !== sessionData.trainingStream
    ) {
      return false;
    }
    return true;
  });

  // 3. Create attendance records for each student
  const existingSet = new Set(
    db.attendance
      .filter(a => a['Session ID'] === sessionData.sessionId)
      .map(a => a['Student ID'])
  );

  const newAttendanceRecords: any[] = [];
  targetStudents.forEach((st, idx) => {
    if (!existingSet.has(st['Student ID'])) {
      const attendId = `ATTEND-${String(db.attendance.length + newAttendanceRecords.length + 1).padStart(4, '0')}`;
      newAttendanceRecords.push({
        'Attendance ID': attendId,
        'Session ID': sessionData.sessionId,
        'Student ID': st['Student ID'],
        'Expected to Attend': 'Yes',
        'Attendance Status': defaultStatus,
        'Minutes Attended': defaultStatus === 'Present' ? 120 : defaultStatus === 'Late' ? 90 : 0,
        'Absence Reason': defaultStatus === 'Absent' ? 'Unexcused' : null,
        'Recorded By': sessionData.trainer || 'Session Faculty',
        'Recorded On': sessionData.plannedDate,
        'Follow-up Required': defaultStatus === 'Absent' ? 'Yes' : 'No',
        'Follow-up Owner': 'Delivery Lead',
        'Follow-up Status': 'Pending',
      });
    }
  });

  const updatedDb: DatabaseState = {
    ...db,
    sessions: updatedSessions,
    attendance: [...newAttendanceRecords, ...db.attendance],
  };
  saveDatabase(updatedDb);
  return updatedDb;
}
