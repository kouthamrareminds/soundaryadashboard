/**
 * FilePreviewModal — Professional file preview overlay for 05_Student_Files module.
 * Shows file metadata, a styled placeholder preview, version history, and download action.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, FileText, Download, ExternalLink, Clock, User, Tag,
  CheckCircle2, AlertTriangle, Info, FileArchive, FileImage, File
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileRecord: any | null;
  onStudentClick?: (studentId: string) => void;
}

function getFileIcon(fileType: string) {
  const t = String(fileType || '').toLowerCase();
  if (['pdf', 'doc', 'docx', 'txt'].some(e => t.includes(e))) return FileText;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg'].some(e => t.includes(e))) return FileImage;
  if (['zip', 'rar', '7z'].some(e => t.includes(e))) return FileArchive;
  return File;
}

function getFileColor(fileType: string) {
  const t = String(fileType || '').toLowerCase();
  if (t.includes('resume') || t.includes('cv')) return 'text-blue-600 bg-blue-50 border-blue-200';
  if (t.includes('offer')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (t.includes('certificate') || t.includes('cert')) return 'text-purple-600 bg-purple-50 border-purple-200';
  if (t.includes('id') || t.includes('aadhar') || t.includes('pan')) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-slate-600 bg-slate-50 border-slate-200';
}

function handleMockDownload(record: any) {
  // Creates a text blob with file metadata as a demonstration download
  const content = [
    `FILE RECORD EXPORT`,
    `==================`,
    `File ID: ${record['File ID'] || '—'}`,
    `Student ID: ${record['Student ID'] || '—'}`,
    `File Type: ${record['File Type'] || '—'}`,
    `File Name: ${record['File Name'] || '—'}`,
    `Version: ${record['Current Version'] || '—'}`,
    `Upload Date: ${record['Upload Date'] || '—'}`,
    `Uploaded By: ${record['Uploaded By'] || '—'}`,
    `Review Status: ${record['Review Status'] || '—'}`,
    `Notes: ${record['Notes'] || '—'}`,
    ``,
    `[This is a placeholder download for the frontend prototype.]`,
    `[Actual file storage integration requires Supabase Storage or equivalent.]`,
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${record['File Name'] || record['File ID'] || 'file_record'}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileRecord,
  onStudentClick,
}) => {
  if (!isOpen || !fileRecord) return null;

  const FileIcon = getFileIcon(fileRecord['File Type'] || '');
  const colorClass = getFileColor(fileRecord['File Type'] || '');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        />

        <div className="min-h-screen px-4 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${colorClass}`}>
                  <FileIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {fileRecord['File Name'] || fileRecord['File ID']}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {fileRecord['File ID']} · {fileRecord['File Type']}
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

            {/* Preview Area */}
            <div className="p-5 space-y-5">
              {/* File Placeholder Preview */}
              <div className={`rounded-2xl border-2 border-dashed ${colorClass} p-8 flex flex-col items-center justify-center text-center space-y-3`}>
                <FileIcon className="w-14 h-14 opacity-40" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {fileRecord['File Name'] || `${fileRecord['File Type']} Document`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    File preview requires backend storage integration (Supabase Storage / S3).
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Version {fileRecord['Current Version'] || '1'} · Uploaded {fileRecord['Upload Date'] || '—'}
                  </p>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'File ID', value: fileRecord['File ID'], icon: Tag },
                  { label: 'File Type', value: fileRecord['File Type'], icon: FileText },
                  { label: 'Current Version', value: fileRecord['Current Version'], icon: Info },
                  { label: 'Review Status', value: fileRecord['Review Status'], isStatus: true, icon: CheckCircle2 },
                  { label: 'Upload Date', value: fileRecord['Upload Date'], icon: Clock },
                  { label: 'Uploaded By', value: fileRecord['Uploaded By'], icon: User },
                ].map(({ label, value, icon: Icon, isStatus }) => (
                  <div key={label} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-slate-500 mb-0.5">{label}</div>
                      {isStatus
                        ? <StatusBadge value={String(value || '—')} />
                        : <div className="font-semibold text-slate-800">{value || '—'}</div>
                      }
                    </div>
                  </div>
                ))}
              </div>

              {/* Student Link */}
              {fileRecord['Student ID'] && onStudentClick && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs">
                  <User className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span className="text-slate-600">Student:</span>
                  <button
                    onClick={() => { onStudentClick(fileRecord['Student ID']); onClose(); }}
                    className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900"
                  >
                    {fileRecord['Student ID']}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <span className="text-slate-500">(Open Student 360)</span>
                </div>
              )}

              {/* Notes / Review Comments */}
              {(fileRecord['Notes'] || fileRecord['Review Comments']) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <div className="font-semibold mb-0.5">Notes / Review Comments</div>
                    <div>{fileRecord['Notes'] || fileRecord['Review Comments']}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMockDownload(fileRecord)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Record
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
