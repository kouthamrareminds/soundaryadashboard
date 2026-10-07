import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Database,
  ArrowRight,
  Sparkles,
  UploadCloud,
  DownloadCloud,
  Copy,
  Check,
  Link2,
} from 'lucide-react';
import {
  DEFAULT_SPREADSHEET_ID,
  SPREADSHEET_URL,
  SHEET_MAPPINGS,
  getWebAppUrl,
  setWebAppUrl,
  syncAllFromGoogleSheets,
  pushAllPortalDataToGoogleSheet,
  SyncResult,
} from '@/services/googleSheetsService';
import { DatabaseState } from '@/data/mockData';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess?: (newDb: DatabaseState) => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess,
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [webAppUrlInput, setWebAppUrlInput] = useState('');
  const [hasCopiedScript, setHasCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'setup'>('sync');
  const [syncStatus, setSyncStatus] = useState<{
    success: boolean;
    message: string;
    results?: SyncResult[];
    totalRows?: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setWebAppUrlInput(getWebAppUrl());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveWebAppUrl = () => {
    setWebAppUrl(webAppUrlInput);
    setSyncStatus({
      success: true,
      message: webAppUrlInput.trim()
        ? 'Web App URL saved! Two-way push and pull are now enabled.'
        : 'Web App URL cleared. Read-only sync active.',
    });
  };

  const handlePullFromSheet = async () => {
    setIsPulling(true);
    setSyncStatus(null);
    try {
      const res = await syncAllFromGoogleSheets();
      if (res.success && res.updatedDb) {
        setSyncStatus({
          success: true,
          message: res.message,
          results: res.results,
          totalRows: res.totalSyncedRows,
        });
        if (onSyncSuccess) {
          onSyncSuccess(res.updatedDb);
        }
      } else {
        setSyncStatus({
          success: false,
          message: res.message,
          results: res.results,
          totalRows: 0,
        });
      }
    } catch (err: any) {
      setSyncStatus({
        success: false,
        message: err?.message || 'Failed to pull from Google Sheets.',
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handlePushToSheet = async () => {
    setIsPushing(true);
    setSyncStatus(null);
    try {
      const res = await pushAllPortalDataToGoogleSheet();
      setSyncStatus({
        success: res.success,
        message: res.message,
      });
    } catch (err: any) {
      setSyncStatus({
        success: false,
        message: err?.message || 'Failed to push data to Google Sheets.',
      });
    } finally {
      setIsPushing(false);
    }
  };

  const appsScriptCode = `const MODULE_SHEET_MAP = {
  'students': 'Students',
  'careerProfiles': 'Career Profiles',
  'assessmentAttempts': 'Assessment Taken',
  'applications': 'SIMS Application',
  'opportunities': 'Rareminds Opportunity',
  'companies': 'Market Opportunity',
  'sessions': 'Sessions',
  'attendance': 'Attendance',
  'sessionTasks': 'Tasks',
  'studentFiles': 'Student Files',
  'assessmentScores': 'Assessment Scores',
  'commitments': 'Commitments',
  'finance': 'Finance'
};

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = {};
    ss.getSheets().forEach(s => { result[s.getName()] = readSheet(s); });
    return jsonResponse({ success: true, data: result });
  } catch(err) { return jsonResponse({ success: false, error: err.toString() }); }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const payload = JSON.parse(e.postData.contents);
    if (payload.action === 'pushAll') {
      const db = payload.data || {};
      Object.keys(db).forEach(k => {
        const name = MODULE_SHEET_MAP[k] || k;
        if (Array.isArray(db[k]) && db[k].length > 0) writeSheet(ss, name, db[k]);
      });
      return jsonResponse({ success: true, message: 'All sheets populated' });
    }
    if (payload.action === 'createRecord') {
      const name = MODULE_SHEET_MAP[payload.module] || payload.module;
      appendRow(ss, name, payload.record);
      return jsonResponse({ success: true });
    }
    if (payload.action === 'updateRecord') {
      const name = MODULE_SHEET_MAP[payload.module] || payload.module;
      updateRow(ss, name, payload.primaryId, payload.primaryValue, payload.updates);
      return jsonResponse({ success: true });
    }
    if (payload.action === 'deleteRecord') {
      const name = MODULE_SHEET_MAP[payload.module] || payload.module;
      deleteRow(ss, name, payload.primaryId, payload.primaryValue);
      return jsonResponse({ success: true });
    }
    return jsonResponse({ success: false, error: 'Unknown action' });
  } catch(err) { return jsonResponse({ success: false, error: err.toString() }); }
}

function readSheet(s) {
  const vals = s.getDataRange().getValues();
  if (vals.length < 2) return [];
  const headers = vals[0].map(h => String(h).trim());
  return vals.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = row[idx] === '' ? null : row[idx]; });
    return obj;
  });
}

function writeSheet(ss, name, records) {
  let s = ss.getSheetByName(name);
  if (s) { s.clear(); } else { s = ss.insertSheet(name); }
  const headers = Object.keys(records[0]);
  const rows = [headers, ...records.map(r => headers.map(h => r[h] ?? ''))];
  s.getRange(1, 1, rows.length, headers.length).setValues(rows);
  s.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f5f9');
}

function appendRow(ss, name, rec) {
  let s = ss.getSheetByName(name) || ss.insertSheet(name);
  const last = s.getLastRow();
  if (last === 0) {
    s.appendRow(Object.keys(rec));
    s.appendRow(Object.values(rec));
  } else {
    const headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
    s.appendRow(headers.map(h => rec[h] ?? ''));
  }
}

function updateRow(ss, name, idCol, idVal, updates) {
  const s = ss.getSheetByName(name);
  if (!s) return;
  const vals = s.getDataRange().getValues();
  const headers = vals[0].map(h => String(h).trim());
  const idIdx = headers.indexOf(idCol);
  if (idIdx === -1) return;
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][idIdx]) === String(idVal)) {
      Object.keys(updates).forEach(k => {
        const col = headers.indexOf(k);
        if (col !== -1) s.getRange(i + 1, col + 1).setValue(updates[k]);
      });
      break;
    }
  }
}

function deleteRow(ss, name, idCol, idVal) {
  const s = ss.getSheetByName(name);
  if (!s) return;
  const vals = s.getDataRange().getValues();
  const headers = vals[0].map(h => String(h).trim());
  const idIdx = headers.indexOf(idCol);
  if (idIdx === -1) return;
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][idIdx]) === String(idVal)) {
      s.deleteRow(i + 1);
      break;
    }
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setHasCopiedScript(true);
    setTimeout(() => setHasCopiedScript(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Google Sheets Two-Way Live Sync
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  2-Way Active
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Portal ⇄ Google Sheets bidirectional synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'sync'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sync Dashboard
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'setup'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Two-Way Web App Setup
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {activeTab === 'sync' ? (
            <>
              {/* Spreadsheet Target */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Target Spreadsheet
                  </span>
                  <a
                    href={SPREADSHEET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    Open Google Sheet
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                  <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate flex-1">{DEFAULT_SPREADSHEET_ID}</span>
                </div>
              </div>

              {/* Action Buttons for Two-Way Sync */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handlePushToSheet}
                  disabled={isPushing || isPulling}
                  className="p-4 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/90 rounded-xl text-left transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <UploadCloud className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-200/60 px-2 py-0.5 rounded-full">
                      Portal → Sheet
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                    Push All Data to Google Sheet
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Uploads all 13 modules to create tabs and fill rows in Google Sheet
                  </div>
                </button>

                <button
                  onClick={handlePullFromSheet}
                  disabled={isPushing || isPulling}
                  className="p-4 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/90 rounded-xl text-left transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                      <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-200/60 px-2 py-0.5 rounded-full">
                      Sheet → Portal
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-900">
                    Pull Latest from Google Sheet
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Fetches real-time edits made by anyone in the Google Sheet
                  </div>
                </button>
              </div>

              {/* Status Banner */}
              {syncStatus && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    syncStatus.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  {syncStatus.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-1">
                    <p className="font-semibold">{syncStatus.message}</p>
                    {syncStatus.results && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-slate-200/50">
                        {syncStatus.results.map(r => (
                          <div
                            key={r.sheetName}
                            className="text-[11px] bg-white/70 px-2 py-1 rounded flex items-center justify-between"
                          >
                            <span className="font-medium truncate mr-1">{r.sheetName}</span>
                            <span
                              className={`font-mono text-[10px] px-1 rounded ${
                                r.status === 'synced'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {r.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 13 Mapped Modules */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Synchronized Modules ({SHEET_MAPPINGS.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {SHEET_MAPPINGS.map(m => (
                    <div
                      key={m.sheetName}
                      className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-700">{m.sheetName}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {m.dbKey}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Setup Tab */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  How to Enable 2-Way Push & Pull
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Google Sheets requires a simple Web App script to allow the dashboard to write new records and edits back into your spreadsheet.
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                      1
                    </span>
                    Open Apps Script in Google Sheets
                  </div>
                  <p className="text-slate-600 pl-7">
                    Open your Google Sheet, then click{' '}
                    <strong className="text-slate-800">Extensions &gt; Apps Script</strong>.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                        2
                      </span>
                      Paste this Script into Code.gs
                    </div>
                    <button
                      onClick={copyScriptToClipboard}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {hasCopiedScript ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          Copy Script
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] max-h-32 overflow-y-auto">
                    <code>{appsScriptCode.slice(0, 300)}...</code>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                      3
                    </span>
                    Deploy as Web App
                  </div>
                  <p className="text-slate-600 pl-7 leading-relaxed">
                    Click <strong className="text-slate-800">Deploy &gt; New deployment</strong> &gt; Select{' '}
                    <strong className="text-slate-800">Web app</strong> &gt; Set "Execute as":{' '}
                    <strong className="text-slate-800">Me</strong> &gt; Set "Who has access":{' '}
                    <strong className="text-slate-800">Anyone</strong> &gt; Click Deploy &amp; copy the URL.
                  </p>
                </div>

                {/* Web App URL Input */}
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2">
                  <label className="font-bold text-blue-900 block">
                    Paste your Deployed Web App URL here:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={webAppUrlInput}
                      onChange={e => setWebAppUrlInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={handleSaveWebAppUrl}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Save URL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <a
            href="/Soundarya_Portal_Master_Data.xlsx"
            download="Soundarya_Portal_Master_Data.xlsx"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 px-3.5 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Download Master .xlsx
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePullFromSheet}
              disabled={isPulling || isPushing}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
              {isPulling ? 'Syncing...' : 'Sync from Google Sheet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
