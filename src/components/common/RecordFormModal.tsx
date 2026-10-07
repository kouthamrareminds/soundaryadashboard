/**
 * RecordFormModal — Schema-driven Add / Edit form for any module.
 * Generates form fields dynamically from ModuleConfig.columns.
 * Supports: string, number, currency, date, time, enum, url types.
 * Validates required primary key field before submission.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, PlusCircle, Edit3, AlertCircle } from 'lucide-react';
import { ModuleConfig, ColumnConfig } from '@/config/modulesConfig';

interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleConfig: ModuleConfig;
  /** If provided → Edit mode; otherwise → Create mode */
  existingRecord?: any | null;
  onSave: (record: any) => void;
}

const FIELD_SECTION_SIZE = 10; // show N fields per page to avoid overwhelming forms

function buildEmptyRecord(columns: ColumnConfig[]): Record<string, any> {
  const rec: Record<string, any> = {};
  columns.forEach(col => {
    rec[col.key] = col.type === 'number' || col.type === 'currency' ? '' : '';
  });
  return rec;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toIsoDate(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const match = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === match[2].toLowerCase());
    if (monthIdx >= 0) {
      const month = String(monthIdx + 1).padStart(2, '0');
      const year = match[3];
      return `${year}-${month}-${day}`;
    }
  }
  return '';
}

function fromIsoDate(iso: string): string {
  if (!iso) return '';
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = match[1];
    const monthNum = parseInt(match[2], 10);
    const day = match[3];
    const monthName = MONTH_NAMES[monthNum - 1] || 'Jan';
    return `${day}-${monthName}-${year}`;
  }
  return iso;
}

function renderInput(col: ColumnConfig, value: any, onChange: (val: any) => void) {
  const baseClass =
    'w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';

  if (col.type === 'enum' && col.options && col.options.length > 0) {
    return (
      <select value={value ?? ''} onChange={e => onChange(e.target.value)} className={baseClass}>
        <option value="">— Select {col.label} —</option>
        {col.options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (col.type === 'date') {
    return (
      <input
        type="date"
        value={toIsoDate(value)}
        onChange={e => {
          const iso = e.target.value;
          onChange(iso ? fromIsoDate(iso) : null);
        }}
        className={baseClass}
      />
    );
  }

  if (col.type === 'time') {
    return (
      <input
        type="time"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className={baseClass}
      />
    );
  }

  if (col.type === 'number' || col.type === 'currency') {
    return (
      <input
        type="number"
        step={col.type === 'currency' ? '0.01' : '1'}
        min="0"
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder={col.type === 'currency' ? '0.00' : '0'}
        className={baseClass}
      />
    );
  }

  if (col.type === 'url') {
    return (
      <input
        type="url"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder="https://"
        className={baseClass}
      />
    );
  }

  // Default: text
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={`Enter ${col.label}`}
      className={baseClass}
    />
  );
}

export const RecordFormModal: React.FC<RecordFormModalProps> = ({
  isOpen,
  onClose,
  moduleConfig,
  existingRecord,
  onSave,
}) => {
  const isEditMode = Boolean(existingRecord);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);

  // Initialize form data
  useEffect(() => {
    if (isOpen) {
      setFormData(
        isEditMode && existingRecord
          ? { ...existingRecord }
          : buildEmptyRecord(moduleConfig.columns)
      );
      setErrors({});
      setPage(0);
    }
  }, [isOpen, existingRecord, moduleConfig, isEditMode]);

  if (!isOpen) return null;

  const totalPages = Math.ceil(moduleConfig.columns.length / FIELD_SECTION_SIZE);
  const currentPageCols = moduleConfig.columns.slice(
    page * FIELD_SECTION_SIZE,
    (page + 1) * FIELD_SECTION_SIZE
  );

  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const primaryCol = moduleConfig.columns.find(c => c.isPrimary || c.key === moduleConfig.primaryId);
    if (primaryCol) {
      const val = formData[primaryCol.key];
      if (!val || String(val).trim() === '') {
        newErrors[primaryCol.key] = `${primaryCol.label} is required (Primary ID).`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      // Navigate to page containing error
      const primaryCol = moduleConfig.columns.find(c => c.isPrimary || c.key === moduleConfig.primaryId);
      if (primaryCol) {
        const colIdx = moduleConfig.columns.indexOf(primaryCol);
        setPage(Math.floor(colIdx / FIELD_SECTION_SIZE));
      }
      return;
    }
    onSave({ ...formData });
    onClose();
  };

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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isEditMode ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                  {isEditMode ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isEditMode ? 'Edit Record' : 'Add New Record'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {moduleConfig.title}
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

            {/* Page indicator */}
            {totalPages > 1 && (
              <div className="px-5 py-2 bg-white border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Fields {page * FIELD_SECTION_SIZE + 1}–{Math.min((page + 1) * FIELD_SECTION_SIZE, moduleConfig.columns.length)} of {moduleConfig.columns.length}</span>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-5 h-5 rounded-full text-[10px] font-bold transition-colors ${
                        i === page ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form Body */}
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentPageCols.map(col => {
                  const isPrimary = col.isPrimary || col.key === moduleConfig.primaryId;
                  const hasError = Boolean(errors[col.key]);

                  return (
                    <div key={col.key} className={`space-y-1 ${hasError ? 'col-span-full' : ''}`}>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <span>{col.label}</span>
                        {isPrimary && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded uppercase tracking-wide">
                            Primary ID
                          </span>
                        )}
                        {col.isForeignKey && (
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-bold rounded uppercase tracking-wide">
                            FK
                          </span>
                        )}
                      </label>
                      {renderInput(col, formData[col.key], val => handleFieldChange(col.key, val))}
                      {hasError && (
                        <div className="flex items-center gap-1 text-xs text-rose-600">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <span>{errors[col.key]}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {page > 0 && (
                  <button
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    ← Previous Section
                  </button>
                )}
                {page < totalPages - 1 && (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 bg-slate-200 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Next Section →
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors ${
                    isEditMode
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  {isEditMode ? 'Save Changes' : 'Create Record'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
