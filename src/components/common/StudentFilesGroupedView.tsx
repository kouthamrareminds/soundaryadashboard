import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  FolderArchive,
  FileText,
  Globe,
  Briefcase,
  Award,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Users,
  CheckCircle2,
  XCircle,
  Eye,
  LayoutGrid,
  Layers,
  BarChart3,
  Calendar,
  FileCode,
  FileCheck
} from 'lucide-react';
import { normalizeStreamName } from '@/services/dataService';

interface StudentFilesGroupedViewProps {
  files: any[];
  allStudents: any[];
  onStudentClick?: (studentId: string) => void;
  onFilePreview?: (fileRecord: any) => void;
}

const STREAM_TABS = [
  { id: 'All', label: 'All Streams', programme: 'All' },
  { id: 'HR', label: 'MBA — HR', programme: 'MBA' },
  { id: 'Marketing', label: 'MBA — Marketing', programme: 'MBA' },
  { id: 'Finance', label: 'MBA — Finance', programme: 'MBA' },
  { id: 'Business Analyst', label: 'MBA — Business Analyst', programme: 'MBA' },
  { id: 'MCA', label: 'MCA Stream', programme: 'MCA' },
];

const FILE_TYPE_COLUMNS = [
  'Resume',
  'LinkedIn',
  'Portfolio',
  'Certificate',
  'Submission 1',
  'Submission 2',
  'Submission 3',
  'Submission 4',
];

export const StudentFilesGroupedView: React.FC<StudentFilesGroupedViewProps> = ({
  files,
  allStudents,
  onStudentClick,
  onFilePreview,
}) => {
  const [activeStream, setActiveStream] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('All');
  const [layoutMode, setLayoutMode] = useState<'cards' | 'matrix' | 'streams'>('cards');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  // Map files by Student ID and ensure sequential submission numbering
  const studentFilesMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    files.forEach(f => {
      const sId = f['Student ID'];
      if (!sId) return;
      if (!map[sId]) map[sId] = [];
      map[sId].push(f);
    });

    // Ensure distinct submissions per student are sequentially numbered (Submission 1, 2, 3, 4...)
    Object.keys(map).forEach(sId => {
      let subCounter = 0;
      map[sId] = map[sId].map(file => {
        const name = (file['File Name'] || '').trim();
        const type = (file['File Type'] || '').trim();
        if (name.toLowerCase().startsWith('submission') || type.toLowerCase().includes('submission')) {
          subCounter++;
          return {
            ...file,
            'File Name': `Submission ${subCounter}`,
          };
        }
        return file;
      });
    });

    return map;
  }, [files]);

  // Enrich students with files and metadata
  const enrichedStudents = useMemo(() => {
    return allStudents.map(student => {
      const sId = student['Student ID'];
      const studentFiles = studentFilesMap[sId] || [];
      const stream = normalizeStreamName(
        student['Assigned Training Stream'],
        student.Programme,
        student['Primary Specialisation']
      );

      const hasResume = studentFiles.some(f => (f['File Type'] || '').toLowerCase().includes('resume'));
      const hasLinkedIn = studentFiles.some(f => (f['File Type'] || '').toLowerCase().includes('linkedin'));
      const hasPortfolio = studentFiles.some(f => (f['File Type'] || '').toLowerCase().includes('portfolio'));
      const hasCertificate = studentFiles.some(f => (f['File Type'] || '').toLowerCase().includes('cert'));

      return {
        ...student,
        stream,
        files: studentFiles,
        fileCount: studentFiles.length,
        hasResume,
        hasLinkedIn,
        hasPortfolio,
        hasCertificate,
        isProfileComplete: hasResume && hasLinkedIn,
      };
    });
  }, [allStudents, studentFilesMap]);

  // Filter students based on active stream, search query, file filter
  const filteredStudents = useMemo(() => {
    return enrichedStudents.filter(s => {
      // Stream Filter
      if (activeStream !== 'All' && s.stream !== activeStream) {
        return false;
      }

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (s['Full Name'] || '').toLowerCase().includes(q) ||
          (s['Student ID'] || '').toLowerCase().includes(q) ||
          (s['College Registration/USN'] || '').toLowerCase().includes(q) ||
          s.files.some((f: any) =>
            (f['File Name'] || '').toLowerCase().includes(q) ||
            (f['File Type'] || '').toLowerCase().includes(q)
          );
        if (!matches) return false;
      }

      // File Type Filter
      if (fileTypeFilter !== 'All') {
        if (fileTypeFilter === 'hasResume' && !s.hasResume) return false;
        if (fileTypeFilter === 'hasLinkedIn' && !s.hasLinkedIn) return false;
        if (fileTypeFilter === 'hasPortfolio' && !s.hasPortfolio) return false;
        if (fileTypeFilter === 'hasCertificate' && !s.hasCertificate) return false;
        if (fileTypeFilter === 'complete' && !s.isProfileComplete) return false;
        if (fileTypeFilter === 'missingResume' && s.hasResume) return false;
      }

      return true;
    });
  }, [enrichedStudents, activeStream, searchQuery, fileTypeFilter]);

  // Cohort KPI Metrics
  const metrics = useMemo(() => {
    const totalStuds = filteredStudents.length;
    const totalFiles = filteredStudents.reduce((acc, s) => acc + s.fileCount, 0);
    const withResume = filteredStudents.filter(s => s.hasResume).length;
    const withLinkedIn = filteredStudents.filter(s => s.hasLinkedIn).length;
    const withPortfolio = filteredStudents.filter(s => s.hasPortfolio).length;

    return {
      totalStuds,
      totalFiles,
      withResume,
      withLinkedIn,
      withPortfolio,
      resumePct: totalStuds > 0 ? Math.round((withResume / totalStuds) * 100) : 0,
      linkedInPct: totalStuds > 0 ? Math.round((withLinkedIn / totalStuds) * 100) : 0,
    };
  }, [filteredStudents]);

  // Toggle expand all / collapse all
  const toggleExpandAll = () => {
    if (expandedStudents.size === filteredStudents.length) {
      setExpandedStudents(new Set());
    } else {
      setExpandedStudents(new Set(filteredStudents.map(s => s['Student ID'])));
    }
  };

  const toggleStudent = (studentId: string) => {
    setExpandedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Helper badge color
  const getBadgeColor = (streamName: string) => {
    switch (streamName) {
      case 'HR':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Marketing':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Finance':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Business Analyst':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'MCA':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Helper for file type icons and styles
  const getFileTypeBadge = (type: string, name?: string) => {
    const t = (type || '').toLowerCase();
    const n = (name || '').toLowerCase();

    if (n.startsWith('submission') || t.includes('submission')) {
      return {
        icon: FileCheck,
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: name || 'Submission',
      };
    }
    if (t.includes('resume')) {
      return {
        icon: FileText,
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        label: 'Resume',
      };
    }
    if (t.includes('linkedin')) {
      return {
        icon: Globe,
        color: 'bg-sky-50 text-sky-700 border-sky-200',
        label: 'LinkedIn',
      };
    }
    if (t.includes('portfolio')) {
      return {
        icon: Briefcase,
        color: 'bg-violet-50 text-violet-700 border-violet-200',
        label: 'Portfolio',
      };
    }
    if (t.includes('certificate') || t.includes('cert')) {
      return {
        icon: Award,
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Certificate',
      };
    }
    return {
      icon: FileCode,
      color: 'bg-slate-50 text-slate-700 border-slate-200',
      label: type || 'Document',
    };
  };

  // Export CSV of grouped files
  const handleExportCSV = () => {
    const headers = [
      'Student ID',
      'USN',
      'Full Name',
      'Programme',
      'Stream',
      'Total Files',
      'Has Resume',
      'Has LinkedIn',
      'Has Portfolio',
      'Has Certificate',
      'File Names',
    ];

    const rows = filteredStudents.map(s => {
      const fileNames = s.files.map((f: any) => `[${f['File Type']}: ${f['File Name']}]`).join('; ');
      return [
        `"${s['Student ID'] || ''}"`,
        `"${s['College Registration/USN'] || ''}"`,
        `"${s['Full Name'] || ''}"`,
        `"${s.Programme || ''}"`,
        `"${s.stream || ''}"`,
        s.fileCount,
        s.hasResume ? 'Yes' : 'No',
        s.hasLinkedIn ? 'Yes' : 'No',
        s.hasPortfolio ? 'Yes' : 'No',
        s.hasCertificate ? 'Yes' : 'No',
        `"${fileNames.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Student_Files_Grouped_${activeStream}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Aggregate KPI Metrics ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Students Tracked</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 font-mono">{metrics.totalStuds}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{metrics.totalFiles} Total Files Uploaded</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Resumes Attached</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-blue-700 font-mono">{metrics.withResume}</div>
            <div className="text-[11px] text-blue-600/80 mt-0.5">{metrics.resumePct}% of candidates</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider">LinkedIn Profiles</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Globe className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-sky-700 font-mono">{metrics.withLinkedIn}</div>
            <div className="text-[11px] text-sky-600/80 mt-0.5">{metrics.linkedInPct}% verified links</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider">Portfolios & Projects</span>
            <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-violet-700 font-mono">{metrics.withPortfolio}</div>
            <div className="text-[11px] text-violet-600/80 mt-0.5">Project submissions</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Complete Dossier</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-700 font-mono">
              {filteredStudents.filter(s => s.isProfileComplete).length}
            </div>
            <div className="text-[11px] text-emerald-600/80 mt-0.5">Resume + LinkedIn Ready</div>
          </div>
        </div>
      </div>

      {/* ── Stream Grouping Pills Bar & View Mode Switcher ─────────────────── */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Stream Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STREAM_TABS.map(tab => {
            const count =
              tab.id === 'All'
                ? enrichedStudents.length
                : enrichedStudents.filter(s => s.stream === tab.id).length;
            const isSelected = activeStream === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveStream(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          <button
            onClick={() => setLayoutMode('cards')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              layoutMode === 'cards'
                ? 'bg-white text-blue-700 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Student Dossier Cards"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Student Cards</span>
          </button>

          <button
            onClick={() => setLayoutMode('matrix')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              layoutMode === 'matrix'
                ? 'bg-white text-blue-700 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Student × File Type Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Files Matrix</span>
          </button>

          <button
            onClick={() => setLayoutMode('streams')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              layoutMode === 'streams'
                ? 'bg-white text-blue-700 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Grouped by Stream"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Stream Groups</span>
          </button>
        </div>
      </div>

      {/* ── Search & Filter Action Bar ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search students by name, USN, student ID, file name..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400"
            />
          </div>

          {/* Compliance Filter */}
          <select
            value={fileTypeFilter}
            onChange={e => setFileTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-medium"
          >
            <option value="All">All File Statuses</option>
            <option value="hasResume">Has Resume</option>
            <option value="hasLinkedIn">Has LinkedIn</option>
            <option value="hasPortfolio">Has Portfolio</option>
            <option value="complete">Complete (Resume + LinkedIn)</option>
            <option value="missingResume">Missing Resume</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {layoutMode === 'cards' && (
            <button
              onClick={toggleExpandAll}
              className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              {expandedStudents.size === filteredStudents.length ? 'Collapse All' : 'Expand All'}
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Grouped CSV</span>
          </button>
        </div>
      </div>

      {/* ── View 1: Student Dossier Cards (Accordion) ──────────────────────── */}
      {layoutMode === 'cards' && (
        <div className="space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
              No students found matching your criteria.
            </div>
          ) : (
            filteredStudents.map(student => {
              const isExpanded = expandedStudents.has(student['Student ID']);
              const badgeClass = getBadgeColor(student.stream);

              return (
                <div
                  key={student['Student ID']}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
                >
                  {/* Student Header */}
                  <div
                    onClick={() => toggleStudent(student['Student ID'])}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-1.5 text-slate-400 hover:text-slate-600">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (onStudentClick) onStudentClick(student['Student ID']);
                            }}
                            className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                          >
                            <span>{student['Student ID']}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <span className="font-semibold text-sm text-slate-900 truncate">
                            {student['Full Name']}
                          </span>
                          {student['College Registration/USN'] && student['College Registration/USN'] !== student['Student ID'] && (
                            <span className="text-xs text-slate-400 font-mono">
                              ({student['College Registration/USN']})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badgeClass}`}>
                            {student.Programme} — {student.stream}
                          </span>

                          {/* File Type Presence Tags */}
                          {student.hasResume ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Resume
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200">
                              Missing Resume
                            </span>
                          )}

                          {student.hasLinkedIn && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> LinkedIn
                            </span>
                          )}

                          {student.hasPortfolio && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Portfolio
                            </span>
                          )}

                          {student.hasCertificate && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Certificates
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right File Count Pill */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                        {student.fileCount} {student.fileCount === 1 ? 'File' : 'Files'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Nested Files */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5"
                      >
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                          <span>Attached Documents & Profiles ({student.files.length})</span>
                          <button
                            onClick={() => onStudentClick && onStudentClick(student['Student ID'])}
                            className="text-blue-600 hover:text-blue-800 text-xs font-semibold lowercase flex items-center gap-1"
                          >
                            <span>view student 360 profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        {student.files.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                            No files uploaded yet for this student.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {student.files.map((file: any, idx: number) => {
                              const badge = getFileTypeBadge(file['File Type'], file['File Name']);
                              const IconComponent = badge.icon;
                              const url = file['File URL'];

                              return (
                                <div
                                  key={file['File ID'] || idx}
                                  className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-blue-300 transition-all space-y-2.5 flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.color}`}>
                                        <IconComponent className="w-3 h-3" />
                                        <span>{file['File Type'] || 'File'}</span>
                                      </span>
                                      <span className="font-mono text-[10px] text-slate-400">
                                        {file['File ID']}
                                      </span>
                                    </div>

                                    <div className="text-xs font-bold text-slate-900 mt-2 truncate" title={file['File Name']}>
                                      {file['File Name'] || 'Document'}
                                    </div>

                                    {file['Target Role'] && (
                                      <div className="text-[11px] text-slate-500 mt-0.5">
                                        Role: <span className="font-medium text-slate-700">{file['Target Role']}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                    <span className="flex items-center gap-1 font-mono text-[10px]">
                                      <Calendar className="w-3 h-3" />
                                      {file['Uploaded On'] || 'Sep 2026'}
                                    </span>

                                    <div className="flex items-center gap-2">
                                      {onFilePreview && (
                                        <button
                                          onClick={() => onFilePreview(file)}
                                          className="text-slate-600 hover:text-blue-600 p-1 rounded hover:bg-slate-100 transition-colors flex items-center gap-0.5"
                                          title="Quick Preview"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span className="text-[10px] font-semibold">Preview</span>
                                        </button>
                                      )}

                                      {url && (
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer noopener"
                                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors flex items-center gap-0.5 font-semibold text-[10px]"
                                          title="Open External URL"
                                        >
                                          <span>Open</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── View 2: Files Matrix Grid ──────────────────────────────────────── */}
      {layoutMode === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3.5 px-4 sticky left-0 bg-slate-50 z-10 min-w-[200px] shadow-xs">
                    Student ID & Name
                  </th>
                  <th className="py-3.5 px-3 min-w-[130px]">Programme & Stream</th>
                  <th className="py-3.5 px-3 text-center min-w-[90px]">Total Files</th>
                  {FILE_TYPE_COLUMNS.map(ft => (
                    <th key={ft} className="py-3.5 px-3 text-center min-w-[130px]">
                      {ft}
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-right min-w-[90px]">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4 + FILE_TYPE_COLUMNS.length} className="py-12 text-center text-slate-400 text-xs">
                      No students found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => (
                    <tr key={student['Student ID']} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4 sticky left-0 bg-white z-10 shadow-xs">
                        <button
                          onClick={() => onStudentClick && onStudentClick(student['Student ID'])}
                          className="font-mono text-xs font-bold text-blue-600 hover:underline block text-left"
                        >
                          {student['Student ID']}
                        </button>
                        <span className="font-semibold text-slate-900 block truncate max-w-[180px]">
                          {student['Full Name']}
                        </span>
                        {student['College Registration/USN'] && student['College Registration/USN'] !== student['Student ID'] && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {student['College Registration/USN']}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeColor(student.stream)}`}>
                          {student.Programme} — {student.stream}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                        {student.fileCount}
                      </td>

                      {FILE_TYPE_COLUMNS.map(ft => {
                        const matching = student.files.filter((f: any) => {
                          const fType = (f['File Type'] || '').toLowerCase();
                          const fName = (f['File Name'] || '').toLowerCase();
                          const query = ft.toLowerCase();
                          return fType.includes(query) || fName === query;
                        });

                        if (matching.length === 0) {
                          return (
                            <td key={ft} className="py-3 px-3 text-center text-slate-300 font-mono">
                              —
                            </td>
                          );
                        }

                        const first = matching[0];
                        const url = first['File URL'];

                        return (
                          <td key={ft} className="py-3 px-3 text-center">
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                                title={first['File Name']}
                              >
                                <span>{matching.length > 1 ? `${ft} (${matching.length})` : ft}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Uploaded</span>
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onStudentClick && onStudentClick(student['Student ID'])}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                        >
                          <span>360</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── View 3: Grouped Stream Buckets ─────────────────────────────────── */}
      {layoutMode === 'streams' && (
        <div className="space-y-6">
          {STREAM_TABS.filter(t => t.id !== 'All' && (activeStream === 'All' || activeStream === t.id)).map(streamTab => {
            const streamStudents = enrichedStudents.filter(s => s.stream === streamTab.id);
            const streamFilesCount = streamStudents.reduce((acc, s) => acc + s.fileCount, 0);
            const streamResumes = streamStudents.filter(s => s.hasResume).length;

            return (
              <div
                key={streamTab.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${getBadgeColor(streamTab.id)}`}>
                      {streamTab.label}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {streamStudents.length} Students • {streamFilesCount} Files
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Resumes Attached: </span>
                      <span className="font-mono font-bold text-blue-700">{streamResumes} / {streamStudents.length}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {streamStudents.map(s => (
                    <div
                      key={s['Student ID']}
                      onClick={() => onStudentClick && onStudentClick(s['Student ID'])}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/20 transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-600">{s['Student ID']}</span>
                        <span className="font-mono text-xs font-bold text-slate-800">{s.fileCount} Files</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 truncate">{s['Full Name']}</div>
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60">
                        {s.hasResume ? (
                          <span className="text-[10px] font-bold text-emerald-700">Resume ✓</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-600">No Resume</span>
                        )}
                        <span className="text-slate-300">•</span>
                        {s.hasLinkedIn ? (
                          <span className="text-[10px] font-bold text-sky-700">LinkedIn ✓</span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">No LinkedIn</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
