import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  UploadCloud,
  FileCheck,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Users,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Layers,
  BarChart3,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { normalizeStreamName } from '@/services/dataService';

interface StudentSubmissionsGroupedViewProps {
  submissions: any[];
  allStudents: any[];
  onStudentClick?: (studentId: string) => void;
  onSubmissionClick?: (subRecord: any) => void;
}

const STREAM_TABS = [
  { id: 'All', label: 'All Streams', programme: 'All' },
  { id: 'HR', label: 'MBA — HR', programme: 'MBA' },
  { id: 'Marketing', label: 'MBA — Marketing', programme: 'MBA' },
  { id: 'Finance', label: 'MBA — Finance', programme: 'MBA' },
  { id: 'Business Analyst', label: 'MBA — Business Analyst', programme: 'MBA' },
  { id: 'MCA', label: 'MCA Stream', programme: 'MCA' },
];

const SUBMISSION_COLUMNS = ['Submission 1', 'Submission 2', 'Submission 3', 'Submission 4'];

export const StudentSubmissionsGroupedView: React.FC<StudentSubmissionsGroupedViewProps> = ({
  submissions,
  allStudents,
  onStudentClick,
  onSubmissionClick,
}) => {
  const [activeStream, setActiveStream] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [layoutMode, setLayoutMode] = useState<'cards' | 'matrix' | 'streams'>('cards');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  // Map submissions by Student ID and sort chronologically
  const studentSubmissionsMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    submissions.forEach(sub => {
      const sId = sub['Student ID'];
      if (!sId) return;
      if (!map[sId]) map[sId] = [];
      map[sId].push(sub);
    });

    // Ensure sequential submission numbering (Submission 1, 2, 3, 4...)
    Object.keys(map).forEach(sId => {
      map[sId].sort((a, b) => {
        const idA = parseInt(String(a['Submission ID'] || '0').replace(/\D/g, ''), 10) || 0;
        const idB = parseInt(String(b['Submission ID'] || '0').replace(/\D/g, ''), 10) || 0;
        return idA - idB;
      });

      map[sId] = map[sId].map((sub, idx) => ({
        ...sub,
        submissionIndex: idx + 1,
        submissionTitle: `Submission ${idx + 1}`,
      }));
    });

    return map;
  }, [submissions]);

  // Enrich students with submissions and metadata
  const enrichedStudents = useMemo(() => {
    return allStudents.map(student => {
      const sId = student['Student ID'];
      const studentSubs = studentSubmissionsMap[sId] || [];
      const stream = normalizeStreamName(
        student['Assigned Training Stream'],
        student.Programme,
        student['Primary Specialisation']
      );

      return {
        ...student,
        stream,
        submissions: studentSubs,
        submissionCount: studentSubs.length,
        hasSubmitted: studentSubs.length > 0,
        isCompleted: studentSubs.length >= 4,
      };
    });
  }, [allStudents, studentSubmissionsMap]);

  // Filter students based on active stream, search query, status filter
  const filteredStudents = useMemo(() => {
    return enrichedStudents.filter(s => {
      // Stream Filter
      if (activeStream !== 'All' && s.stream !== activeStream) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (s['Full Name'] || '').toLowerCase().includes(q) ||
          (s['Student ID'] || '').toLowerCase().includes(q) ||
          (s['College Registration/USN'] || '').toLowerCase().includes(q) ||
          s.submissions.some((sub: any) =>
            (sub['Submission ID'] || '').toLowerCase().includes(q) ||
            (sub['Submission Date'] || '').toLowerCase().includes(q)
          );
        if (!matches) return false;
      }

      // Status Filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'submitted' && s.submissionCount === 0) return false;
        if (statusFilter === 'round2' && s.submissionCount < 4) return false;
        if (statusFilter === 'pending' && s.submissionCount > 0) return false;
      }

      return true;
    });
  }, [enrichedStudents, activeStream, searchQuery, statusFilter]);

  // Cohort KPI Metrics
  const metrics = useMemo(() => {
    const totalStuds = filteredStudents.length;
    const totalSubs = filteredStudents.reduce((acc, s) => acc + s.submissionCount, 0);
    const submittedCount = filteredStudents.filter(s => s.hasSubmitted).length;
    const round2Count = filteredStudents.filter(s => s.submissionCount >= 4).length;
    const pendingCount = filteredStudents.filter(s => !s.hasSubmitted).length;

    return {
      totalStuds,
      totalSubs,
      submittedCount,
      round2Count,
      pendingCount,
      submittedPct: totalStuds > 0 ? Math.round((submittedCount / totalStuds) * 100) : 0,
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

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Student ID',
      'USN',
      'Full Name',
      'Programme',
      'Stream',
      'Total Submissions',
      'Submission 1 (Date)',
      'Submission 2 (Date)',
      'Submission 3 (Date)',
      'Submission 4 (Date)',
    ];

    const rows = filteredStudents.map(s => {
      const subCols = [0, 1, 2, 3].map(idx => {
        const sub = s.submissions[idx];
        return sub ? `${sub['Submission ID']} (${sub['Submission Date'] || ''})` : '—';
      });

      return [
        `"${s['Student ID'] || ''}"`,
        `"${s['College Registration/USN'] || ''}"`,
        `"${s['Full Name'] || ''}"`,
        `"${s.Programme || ''}"`,
        `"${s.stream || ''}"`,
        s.submissionCount,
        ...subCols.map(c => `"${c}"`),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Student_Submissions_Grouped_${activeStream}_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cohort Size</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 font-mono">{metrics.totalStuds}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{metrics.totalSubs} Total Submissions</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Active Submitters</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-700 font-mono">{metrics.submittedCount}</div>
            <div className="text-[11px] text-emerald-600/80 mt-0.5">{metrics.submittedPct}% submission rate</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">4+ Submissions Done</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-purple-700 font-mono">{metrics.round2Count}</div>
            <div className="text-[11px] text-purple-600/80 mt-0.5">4+ Submissions attached</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Average Per Candidate</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <UploadCloud className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-blue-700 font-mono">
              {metrics.totalStuds > 0 ? (metrics.totalSubs / metrics.totalStuds).toFixed(1) : '0'}
            </div>
            <div className="text-[11px] text-blue-600/80 mt-0.5">Tasks completed per head</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Pending / No Submissions</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-700 font-mono">{metrics.pendingCount}</div>
            <div className="text-[11px] text-amber-600/80 mt-0.5">Awaiting assignment turn-in</div>
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
            title="Student × Submission Matrix Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Submissions Matrix</span>
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
              placeholder="Search students by name, USN, student ID, submission date..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400"
            />
          </div>

          {/* Submission Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-medium"
          >
            <option value="All">All Submission Volumes</option>
            <option value="submitted">Submitted (2+ Tasks)</option>
            <option value="round2">4+ Submissions</option>
            <option value="pending">Pending / No Submissions</option>
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

                          {/* Submission Badges */}
                          {student.submissionCount > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{student.submissionCount} Submissions Turned In</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Pending Submissions</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right File Count Pill */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border ${
                          student.submissionCount >= 4
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : student.submissionCount > 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {student.submissionCount} {student.submissionCount === 1 ? 'Task' : 'Tasks'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Nested Submissions */}
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
                          <span>Individual Task Submissions ({student.submissions.length})</span>
                          <button
                            onClick={() => onStudentClick && onStudentClick(student['Student ID'])}
                            className="text-blue-600 hover:text-blue-800 text-xs font-semibold lowercase flex items-center gap-1"
                          >
                            <span>view student 360 profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        {student.submissions.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                            No task submissions on record yet for this candidate.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {student.submissions.map((sub: any) => {
                              const url = sub['Submission URL'];

                              return (
                                <div
                                  key={sub['Submission ID']}
                                  onClick={() => onSubmissionClick && onSubmissionClick(sub)}
                                  className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-blue-300 transition-all space-y-2.5 flex flex-col justify-between cursor-pointer"
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                                        <FileCheck className="w-3 h-3" />
                                        <span>{sub.submissionTitle}</span>
                                      </span>
                                      <span className="font-mono text-[10px] text-slate-400">
                                        {sub['Submission ID']}
                                      </span>
                                    </div>

                                    <div className="text-xs font-bold text-slate-900 mt-2">
                                      {sub.submissionTitle}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                      Status: <span className="font-medium text-emerald-600">{sub['Submission Status'] || 'Submitted'}</span>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                    <span className="flex items-center gap-1 font-mono text-[10px]">
                                      <Calendar className="w-3 h-3" />
                                      {sub['Submission Date'] || 'Sep 2026'}
                                    </span>

                                    {url && (
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        onClick={e => e.stopPropagation()}
                                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors flex items-center gap-0.5 font-semibold text-[10px]"
                                        title="Open Submission URL"
                                      >
                                        <span>Open Drive</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
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

      {/* ── View 2: Submissions Matrix Grid ─────────────────────────────────── */}
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
                  <th className="py-3.5 px-3 text-center min-w-[90px]">Total Done</th>
                  {SUBMISSION_COLUMNS.map(sc => (
                    <th key={sc} className="py-3.5 px-3 text-center min-w-[130px]">
                      {sc}
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-right min-w-[90px]">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4 + SUBMISSION_COLUMNS.length} className="py-12 text-center text-slate-400 text-xs">
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
                        {student.submissionCount}
                      </td>

                      {SUBMISSION_COLUMNS.map((sc, idx) => {
                        const sub = student.submissions[idx];

                        if (!sub) {
                          return (
                            <td key={sc} className="py-3 px-3 text-center text-slate-300 font-mono">
                              —
                            </td>
                          );
                        }

                        const url = sub['Submission URL'];

                        return (
                          <td key={sc} className="py-3 px-3 text-center">
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                title={`${sub['Submission ID']} • ${sub['Submission Date'] || ''}`}
                              >
                                <span>{sub['Submission Date'] || 'Submitted'}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Done</span>
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
            const streamSubsCount = streamStudents.reduce((acc, s) => acc + s.submissionCount, 0);
            const streamDone = streamStudents.filter(s => s.hasSubmitted).length;

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
                      {streamStudents.length} Students • {streamSubsCount} Submissions
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Turned In: </span>
                      <span className="font-mono font-bold text-emerald-700">{streamDone} / {streamStudents.length} Students</span>
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
                        <span className="font-mono text-xs font-bold text-slate-800">{s.submissionCount} Submissions</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 truncate">{s['Full Name']}</div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-mono">
                        <span>{s.hasSubmitted ? 'Active' : 'Pending'}</span>
                        <span className="text-blue-600 font-semibold font-sans">View 360 →</span>
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
