import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet,
  ArrowRight, RotateCcw, AlertCircle, Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MODULES_CONFIG, ModuleConfig } from '@/config/modulesConfig';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultModuleId?: string;
  onImportSuccess?: (moduleId: string, records: any[], imported: number, skipped: number) => void;
}

type UploadStep = 'upload' | 'validating' | 'validation' | 'preview' | 'success';

interface ValidationResult {
  matchedHeaders: string[];
  missingHeaders: string[];
  extraHeaders: string[];
  parsedHeaders: string[];
  totalRows: number;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  defaultModuleId = 'students',
  onImportSuccess,
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState<string>(defaultModuleId);
  const [step, setStep] = useState<UploadStep>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [allParsedRows, setAllParsedRows] = useState<any[]>([]);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentModule: ModuleConfig = MODULES_CONFIG[selectedModuleId] || MODULES_CONFIG['students'];
  const expectedHeaders = currentModule.columns.map(c => c.key);

  // ─── Parse Excel/CSV File ────────────────────────────────────────────────────
  const parseFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');
    setParseError('');
    setStep('validating');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Use first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to array-of-objects using the first row as headers
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        raw: false,
      });

      if (rawRows.length === 0) {
        setParseError('The uploaded file appears to be empty or has no data rows.');
        setStep('upload');
        return;
      }

      const parsedHeaders = Object.keys(rawRows[0]);

      const matchedHeaders = expectedHeaders.filter(h => parsedHeaders.includes(h));
      const missingHeaders = expectedHeaders.filter(h => !parsedHeaders.includes(h));
      const extraHeaders = parsedHeaders.filter(h => !expectedHeaders.includes(h));

      setValidation({
        matchedHeaders,
        missingHeaders,
        extraHeaders,
        parsedHeaders,
        totalRows: rawRows.length,
      });

      // Only keep matched columns in parsed rows (discard extra columns)
      const mappedRows = rawRows.map(row => {
        const mapped: any = {};
        matchedHeaders.forEach(h => { mapped[h] = row[h]; });
        return mapped;
      });

      setAllParsedRows(mappedRows);
      setPreviewRows(mappedRows.slice(0, 5));
      setStep('validation');
    } catch (err: any) {
      setParseError(`Could not parse file: ${err?.message || 'Unknown error'}. Ensure the file is a valid Excel (.xlsx/.xls) or CSV.`);
      setStep('upload');
    }
  }, [expectedHeaders, currentModule]);

  // ─── File Selection ──────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      parseFile(file);
    }
  }, [parseFile]);

  // ─── Reset ───────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setStep('upload');
    setFileName('');
    setFileSize('');
    setValidation(null);
    setPreviewRows([]);
    setAllParsedRows([]);
    setParseError('');
    setImportedCount(0);
    setSkippedCount(0);
  };

  // ─── Confirm Import ──────────────────────────────────────────────────────────
  const handleConfirmImport = () => {
    if (onImportSuccess) {
      // The parent (App.tsx via dataService) handles dedup; pass all parsed rows
      onImportSuccess(selectedModuleId, allParsedRows, allParsedRows.length, 0);
    }
    setImportedCount(allParsedRows.length);
    setSkippedCount(0);
    setStep('success');
  };

  const canProceedFromValidation = validation && validation.matchedHeaders.length > 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
        />

        <div className="min-h-screen px-4 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Excel / CSV Data Import</h3>
                  <p className="text-xs text-slate-500">
                    Target: {currentModule.title}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper */}
            <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-2 text-xs font-semibold overflow-x-auto">
              {(['upload', 'validation', 'preview', 'success'] as const).map((s, idx) => {
                const stepLabels: Record<string, string> = {
                  upload: '1. Select File',
                  validation: '2. Validate Headers',
                  preview: '3. Preview Data',
                  success: '4. Import Done',
                };
                const isActive = step === s || (step === 'validating' && s === 'validation');
                const isDone =
                  (s === 'upload' && ['validation', 'validating', 'preview', 'success'].includes(step)) ||
                  (s === 'validation' && ['preview', 'success'].includes(step)) ||
                  (s === 'preview' && step === 'success');
                return (
                  <React.Fragment key={s}>
                    <span className={isDone ? 'text-emerald-600' : isActive ? 'text-blue-600' : 'text-slate-400'}>
                      {isDone ? '✓ ' : ''}{stepLabels[s]}
                    </span>
                    {idx < 3 && <span className="text-slate-300 flex-shrink-0">→</span>}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Modal Body */}
            <div className="p-6">

              {/* STEP 1: Upload */}
              {(step === 'upload') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Select Target Module
                    </label>
                    <select
                      value={selectedModuleId}
                      onChange={e => { setSelectedModuleId(e.target.value); handleReset(); }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      {Object.values(MODULES_CONFIG).map(m => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Error message */}
                  {parseError && (
                    <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                      <span>{parseError}</span>
                    </div>
                  )}

                  {/* Drag & Drop Upload Area */}
                  <label
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group ${
                      isDragOver
                        ? 'border-blue-500 bg-blue-50/30'
                        : 'border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20'
                    }`}
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <FileSpreadsheet className="w-12 h-12 text-slate-400 group-hover:text-blue-600 transition-colors mb-3" />
                    <span className="text-sm font-semibold text-slate-800">
                      {isDragOver ? 'Drop file here…' : 'Click to choose or drag & drop Excel / CSV'}
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      Accepts .xlsx, .xls, .csv formatted according to Soundarya Master Data Template
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Column headers are strictly validated against the schema for{' '}
                      <strong>{currentModule.sheetName}</strong>. {currentModule.columnCount} columns expected.
                    </span>
                  </div>

                  {/* Expected header list */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-600 mb-2">
                      <Info className="w-3.5 h-3.5" />
                      Expected Columns ({expectedHeaders.length})
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {expectedHeaders.map(h => (
                        <span key={h} className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP: Parsing indicator */}
              {step === 'validating' && (
                <div className="py-10 text-center space-y-4">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">Parsing file: <span className="text-blue-600">{fileName}</span></p>
                  <p className="text-xs text-slate-400">Reading headers and validating schema…</p>
                </div>
              )}

              {/* STEP 2: Validation Results */}
              {step === 'validation' && validation && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{fileName}</span>
                      <span className="text-slate-400 ml-2">({fileSize})</span>
                      <span className="ml-3 text-emerald-700 font-semibold">{validation.totalRows} data rows detected</span>
                    </div>
                    <button
                      onClick={handleReset}
                      className="text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 font-medium"
                    >
                      <RotateCcw className="w-3 h-3" /> Change File
                    </button>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800">
                      <div className="text-xs font-medium">Matched Columns</div>
                      <div className="text-xl font-bold mt-1">
                        {validation.matchedHeaders.length} / {expectedHeaders.length}
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl border ${validation.missingHeaders.length > 0 ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                      <div className="text-xs font-medium">Missing Required</div>
                      <div className="text-xl font-bold mt-1">{validation.missingHeaders.length}</div>
                    </div>
                    <div className={`p-3 rounded-xl border ${validation.extraHeaders.length > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                      <div className="text-xs font-medium">Extra (Ignored)</div>
                      <div className="text-xl font-bold mt-1">{validation.extraHeaders.length}</div>
                    </div>
                  </div>

                  {validation.missingHeaders.length > 0 && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1.5">
                      <strong className="block font-semibold">⚠ Missing Required Columns:</strong>
                      <div className="flex flex-wrap gap-1.5">
                        {validation.missingHeaders.map(m => (
                          <span key={m} className="px-2 py-0.5 bg-white border border-rose-300 rounded font-mono text-[11px]">{m}</span>
                        ))}
                      </div>
                      <p className="text-rose-700 mt-1">Records will be imported with blank values for missing columns. You can still proceed.</p>
                    </div>
                  )}

                  {validation.extraHeaders.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1.5">
                      <strong className="block font-semibold">Additional Columns (will be ignored during import):</strong>
                      <div className="flex flex-wrap gap-1.5">
                        {validation.extraHeaders.map(e => (
                          <span key={e} className="px-2 py-0.5 bg-white border border-amber-300 rounded font-mono text-[11px]">{e}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={handleReset} className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50">
                      Back
                    </button>
                    <button
                      onClick={() => setStep('preview')}
                      disabled={!canProceedFromValidation}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Preview Data ({validation.totalRows} rows)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Data Preview */}
              {step === 'preview' && validation && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Showing first {previewRows.length} of{' '}
                      <strong className="text-slate-900">{validation.totalRows}</strong> rows for{' '}
                      <strong>{currentModule.title}</strong>:
                    </span>
                    <span className="text-emerald-600 font-semibold">
                      {validation.matchedHeaders.length} columns mapped
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-auto max-h-64">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 sticky top-0">
                        <tr>
                          {validation.matchedHeaders.slice(0, 6).map(h => (
                            <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>
                          ))}
                          {validation.matchedHeaders.length > 6 && (
                            <th className="px-3 py-2 whitespace-nowrap text-blue-600">
                              +{validation.matchedHeaders.length - 6} more…
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            {validation.matchedHeaders.slice(0, 6).map(h => (
                              <td key={h} className="px-3 py-2 whitespace-nowrap text-slate-700 max-w-[160px] truncate">
                                {r[h] || '—'}
                              </td>
                            ))}
                            {validation.matchedHeaders.length > 6 && <td className="px-3 py-2 text-slate-400">…</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                    <span>
                      All <strong>{validation.totalRows}</strong> rows will be imported to {currentModule.title}.
                      Records with duplicate primary IDs ({currentModule.primaryId}) will be skipped automatically.
                    </span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setStep('validation')} className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50">
                      Back
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Import {validation.totalRows} Records</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Success */}
              {step === 'success' && (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Import Completed Successfully</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    <strong className="text-emerald-700">{importedCount} records</strong> imported to {currentModule.title}.
                    {skippedCount > 0 && (
                      <> <strong className="text-amber-700">{skippedCount}</strong> duplicate records were skipped.</>
                    )}
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50"
                    >
                      Import Another File
                    </button>
                    <button
                      onClick={onClose}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      Done — View Records
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
