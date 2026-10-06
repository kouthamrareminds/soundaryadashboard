import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ExternalLink, Copy, Check, FileText, Building2, Briefcase, 
  MapPin, IndianRupee, Calendar, Clock, Award, CheckCircle2, 
  Sparkles, BookOpen, GraduationCap 
} from 'lucide-react';
import { ModuleConfig } from '@/config/modulesConfig';
import { StatusBadge } from './StatusBadge';
import { formatINR } from '@/utils/formatters';

interface RecordDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  record: any | null;
  moduleConfig: ModuleConfig;
  onStudentClick?: (studentId: string) => void;
  onRelatedClick?: (targetModule: string, id: string) => void;
}

export const RecordDrawer: React.FC<RecordDrawerProps> = ({
  isOpen,
  onClose,
  record,
  moduleConfig,
  onStudentClick,
  onRelatedClick,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!isOpen || !record) return null;

  const primaryValue = record[moduleConfig.primaryId];

  const handleCopy = (key: string, val: any) => {
    navigator.clipboard.writeText(String(val));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Group columns into 3 logical sections:
  // 1. Primary & Relational Identifiers
  // 2. Core Operational Details
  // 3. Status, Dates & Audit
  const identifierCols = moduleConfig.columns.filter(c => c.isPrimary || c.isForeignKey || c.key.includes('ID'));
  const statusAndDateCols = moduleConfig.columns.filter(c => 
    !identifierCols.includes(c) && (c.type === 'date' || c.type === 'time' || c.type === 'enum' || c.key.includes('Status') || c.key.includes('Date') || c.key.includes('By'))
  );
  const coreCols = moduleConfig.columns.filter(c => !identifierCols.includes(c) && !statusAndDateCols.includes(c));

  const renderFieldValue = (col: any, val: any) => {
    if (val === undefined || val === null || val === '') {
      return <span className="text-slate-400 font-mono text-xs italic">Not Provided</span>;
    }

    if (col.key === 'Student ID' && onStudentClick) {
      return (
        <button
          onClick={() => onStudentClick(val)}
          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md transition-colors"
        >
          <span>{val}</span>
          <ExternalLink className="w-3 h-3" />
          <span className="text-[10px] font-normal text-blue-500">(Open 360)</span>
        </button>
      );
    }

    if (col.isForeignKey && col.targetModule && onRelatedClick) {
      return (
        <button
          onClick={() => onRelatedClick(col.targetModule, val)}
          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-md transition-colors"
        >
          <span>{val}</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      );
    }

    if (col.type === 'enum' || col.options) {
      return <StatusBadge value={String(val)} />;
    }

    if (col.type === 'currency') {
      return <span className="font-mono text-sm font-bold text-slate-900">{formatINR(val)}</span>;
    }

    if (col.type === 'url') {
      return (
        <a
          href={String(val)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline break-all"
        >
          <span>{val}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      );
    }

    return <span className="text-xs text-slate-800 break-words">{String(val)}</span>;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200"
          >
            {/* Drawer Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500">{moduleConfig.primaryId}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
                  {primaryValue || 'Record Details'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{moduleConfig.title} Master Record</p>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            {moduleConfig.id === 'opportunities' ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Job Title & Company Banner */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-5 text-white space-y-3 shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-white/10 text-blue-200 text-xs font-mono font-bold px-2 py-0.5 rounded border border-white/10">
                        {record['Opportunity ID']}
                      </span>
                      <StatusBadge value={record['Opportunity Status']} />
                    </div>
                    {record['Opportunity Type'] && (
                      <span className="text-[11px] font-semibold bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/20">
                        {record['Opportunity Type']}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight leading-snug">
                      {record['Role Title']}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-blue-200">
                      <Building2 className="w-3.5 h-3.5 opacity-80" />
                      {onRelatedClick ? (
                        <button
                          onClick={() => onRelatedClick('companies', record['Company ID'])}
                          className="font-bold underline hover:text-white transition-colors"
                        >
                          {record['Company ID']}
                        </button>
                      ) : (
                        <span className="font-bold">{record['Company ID']}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4 Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Compensation</span>
                    </div>
                    <div className="text-base font-black text-slate-900 font-mono mt-1">
                      {record['Total CTC'] > 0 ? formatINR(record['Total CTC']) : 'Not Disclosed'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {record['Salary Period/Currency'] || 'Annual Package'}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>Work Setup</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {record['Work Mode'] || 'Onsite'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {record['Location'] || 'Pan India'}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Target Programme</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {record['Eligible Programme'] || 'MBA and MCA'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {record['Eligible Streams'] || 'All Specializations'}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span>Deadline</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {record['Deadline'] || 'Open Drive'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      Open: {record['Open Date'] || 'Recent'}
                    </div>
                  </div>
                </div>

                {/* Skills Section */}
                {record['Required Skills'] && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Required Skills</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {String(record['Required Skills']).split(/[,;•|]/).filter(s => s.trim().length > 0).map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200/60"
                        >
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Eligibility & Requirements */}
                {record['Eligibility Criteria'] && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Requirements & Eligibility</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">
                      {record['Eligibility Criteria']}
                    </p>
                  </div>
                )}

                {/* Job Description Summary */}
                {record['JD Description'] && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Job Description & Responsibilities</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line pt-1">
                      {record['JD Description']}
                    </p>
                  </div>
                )}

                {/* Placement Operations Metadata */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 text-xs text-slate-600 space-y-2">
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
                    <span className="font-medium text-slate-500">Placement Owner:</span>
                    <span className="font-semibold text-slate-800">{record['Placement Owner'] || 'Rareminds Placement Team'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
                    <span className="font-medium text-slate-500">Last Verified On:</span>
                    <span className="font-mono text-slate-700">{record['Last Verified On'] || '15-Jan-2025'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-500">Estimated Openings:</span>
                    <span className="font-bold text-slate-900">{record['Openings Count'] || 1} candidates</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Section 1: Identifiers & Relationships */}
                {identifierCols.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span>Identifiers & Relationships ({identifierCols.length})</span>
                    </h3>
                    <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/70 space-y-3">
                      {identifierCols.map(col => (
                        <div key={col.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                          <span className="text-xs font-medium text-slate-600">{col.label}</span>
                          <div className="flex items-center gap-2">
                            {renderFieldValue(col, record[col.key])}
                            <button
                              onClick={() => handleCopy(col.key, record[col.key])}
                              title="Copy value"
                              className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            >
                              {copiedKey === col.key ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: Core Details */}
                {coreCols.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Core Attributes & Metrics ({coreCols.length})
                    </h3>
                    <div className="space-y-3 bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                      {coreCols.map(col => (
                        <div key={col.key} className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 pb-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                          <span className="text-xs font-medium text-slate-600 min-w-[140px]">{col.label}</span>
                          <div className="text-right sm:max-w-[65%]">
                            {renderFieldValue(col, record[col.key])}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 3: Status, Dates & Verification */}
                {statusAndDateCols.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Status, Dates & Audit ({statusAndDateCols.length})
                    </h3>
                    <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/70 space-y-3">
                      {statusAndDateCols.map(col => (
                        <div key={col.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                          <span className="text-xs font-medium text-slate-600">{col.label}</span>
                          <div>{renderFieldValue(col, record[col.key])}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>{moduleConfig.columns.length} Total Excel Fields Represented</span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg shadow-xs transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
