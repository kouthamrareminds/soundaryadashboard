import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  Award,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  TrendingUp,
  LayoutGrid,
  Layers,
  BarChart3,
  Calendar,
  AlertCircle,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { normalizeStreamName } from '@/services/dataService';

interface AssessmentGroupedViewProps {
  attempts: any[];
  allStudents: any[];
  onStudentClick?: (studentId: string) => void;
  onAttemptClick?: (attempt: any) => void;
}

const STREAM_TABS = [
  { id: 'All', label: 'All Streams', programme: 'All', color: 'blue' },
  { id: 'HR', label: 'MBA — HR', programme: 'MBA', color: 'indigo' },
  { id: 'Marketing', label: 'MBA — Marketing', programme: 'MBA', color: 'rose' },
  { id: 'Finance', label: 'MBA — Finance', programme: 'MBA', color: 'emerald' },
  { id: 'Business Analyst', label: 'MBA — Business Analyst', programme: 'MBA', color: 'blue' },
  { id: 'MCA', label: 'MCA Stream', programme: 'MCA', color: 'purple' },
];

export const AssessmentGroupedView: React.FC<AssessmentGroupedViewProps> = ({
  attempts,
  allStudents,
  onStudentClick,
  onAttemptClick,
}) => {
  const [activeStream, setActiveStream] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [scoreTierFilter, setScoreTierFilter] = useState<'All' | '75plus' | '60to74' | 'below60'>('All');
  const [layoutMode, setLayoutMode] = useState<'cards' | 'matrix' | 'tests' | 'streams'>('cards');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  // Group attempts by student ID
  const studentAttemptsMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    attempts.forEach(att => {
      const sId = att['Student ID'];
      if (!sId) return;
      if (!map[sId]) map[sId] = [];
      map[sId].push(att);
    });
    return map;
  }, [attempts]);

  // Distinct Assessment Types across entire dataset
  const distinctTestTypes = useMemo(() => {
    const set = new Set<string>();
    attempts.forEach(a => {
      if (a['Assessment Type']) set.add(a['Assessment Type']);
    });
    return Array.from(set).sort();
  }, [attempts]);

  // Enrich students with attempts and metrics
  const enrichedStudents = useMemo(() => {
    return allStudents.map(student => {
      const sId = student['Student ID'];
      const rawAttempts = studentAttemptsMap[sId] || [];
      // Sort student's individual attempts highest score first
      const studentAttempts = rawAttempts.slice().sort((a, b) => {
        const sa = Number(a['Overall Score']) || 0;
        const sb = Number(b['Overall Score']) || 0;
        return sb - sa;
      });

      const stream = normalizeStreamName(
        student['Assigned Training Stream'],
        student.Programme,
        student['Primary Specialisation']
      );

      // Score calculation: separate graded evaluations (Aptitude & Domain, max score >= 10)
      // from qualitative/psychometric assessments (Work Values, RIASEC, Big Five, etc.)
      const gradedAttempts = studentAttempts.filter(a => (Number(a['Maximum Score']) || 0) >= 10);
      const totalScore = gradedAttempts.reduce((acc, a) => acc + (Number(a['Overall Score']) || 0), 0);
      const totalMaxScore = gradedAttempts.reduce((acc, a) => acc + (Number(a['Maximum Score']) || 0), 0);
      const avgPct = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
      // Scaled average score out of 50
      const avgScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 50) : 0;
      const completedCount = studentAttempts.filter(a => a['Completion Status'] === 'Completed').length;

      return {
        ...student,
        stream,
        attempts: studentAttempts,
        gradedAttempts,
        totalAttempts: studentAttempts.length,
        completedCount,
        avgScore,
        avgPct,
      };
    });
  }, [allStudents, studentAttemptsMap]);

  // Cohort Score Buckets (≥75%, 60-74%, <60%)
  const scoreBuckets = useMemo(() => {
    const streamCohort = enrichedStudents.filter(s => activeStream === 'All' || s.stream === activeStream);
    const attemptedCohort = streamCohort.filter(s => s.totalAttempts > 0);
    const total = attemptedCohort.length || streamCohort.length;
    const high = attemptedCohort.filter(s => s.avgPct >= 75);
    const mid = attemptedCohort.filter(s => s.avgPct >= 60 && s.avgPct < 75);
    const low = attemptedCohort.filter(s => s.avgPct < 60);

    return {
      total,
      high: { count: high.length, pct: total > 0 ? Math.round((high.length / total) * 100) : 0 },
      mid: { count: mid.length, pct: total > 0 ? Math.round((mid.length / total) * 100) : 0 },
      low: { count: low.length, pct: total > 0 ? Math.round((low.length / total) * 100) : 0 },
    };
  }, [enrichedStudents, activeStream]);

  // Filter students based on stream tab, search, score tier and sort highest score first
  const filteredStudents = useMemo(() => {
    const list = enrichedStudents.filter(s => {
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
          s.attempts.some((a: any) => (a['Assessment Type'] || '').toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Score Tier Buckets (75%+, 60-74%, <60%)
      if (scoreTierFilter === '75plus' && s.avgPct < 75) return false;
      if (scoreTierFilter === '60to74' && (s.avgPct < 60 || s.avgPct >= 75)) return false;
      if (scoreTierFilter === 'below60' && (s.avgPct >= 60 || s.totalAttempts === 0)) return false;

      return true;
    });

    // Sort highest score first, lowest score last
    return [...list].sort((a, b) => {
      if (b.avgScore !== a.avgScore) {
        return b.avgScore - a.avgScore;
      }
      if (b.avgPct !== a.avgPct) {
        return b.avgPct - a.avgPct;
      }
      if (b.completedCount !== a.completedCount) {
        return b.completedCount - a.completedCount;
      }
      return String(a['Student ID'] || '').localeCompare(String(b['Student ID'] || ''));
    });
  }, [enrichedStudents, activeStream, searchQuery, scoreTierFilter]);

  // Subject / Test-wise summaries
  const subjectSummaries = useMemo(() => {
    return distinctTestTypes.map(testType => {
      const matchingAttempts = attempts.filter(a => {
        if (a['Assessment Type'] !== testType) return false;
        if (activeStream !== 'All') {
          const student = allStudents.find(s => s['Student ID'] === a['Student ID']);
          if (!student) return false;
          const stream = normalizeStreamName(
            student['Assigned Training Stream'],
            student.Programme,
            student['Primary Specialisation']
          );
          if (stream !== activeStream) return false;
        }
        return true;
      });

      const totalTakers = matchingAttempts.length;
      const scores = matchingAttempts.map(a => Number(a['Overall Score']) || 0);
      const maxScore = matchingAttempts.length > 0 ? (Number(matchingAttempts[0]['Maximum Score']) || 50) : 50;
      const avgScore = totalTakers > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalTakers) : 0;
      const avgPct = maxScore > 0 ? Math.round((avgScore / maxScore) * 100) : 0;
      const highestScore = totalTakers > 0 ? Math.max(...scores) : 0;

      // Buckets for this test
      const high = matchingAttempts.filter(a => {
        const pct = maxScore > 0 ? Math.round(((Number(a['Overall Score']) || 0) / maxScore) * 100) : 0;
        return pct >= 75;
      }).length;

      const mid = matchingAttempts.filter(a => {
        const pct = maxScore > 0 ? Math.round(((Number(a['Overall Score']) || 0) / maxScore) * 100) : 0;
        return pct >= 60 && pct < 75;
      }).length;

      const low = matchingAttempts.filter(a => {
        const pct = maxScore > 0 ? Math.round(((Number(a['Overall Score']) || 0) / maxScore) * 100) : 0;
        return pct < 60;
      }).length;

      const studentList = matchingAttempts
        .map(att => {
          const student = allStudents.find(s => s['Student ID'] === att['Student ID']);
          const stream = student
            ? normalizeStreamName(student['Assigned Training Stream'], student.Programme, student['Primary Specialisation'])
            : 'General';
          const score = Number(att['Overall Score']) || 0;
          const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
          return {
            attempt: att,
            studentId: att['Student ID'],
            fullName: student ? student['Full Name'] : att['Student ID'],
            usn: student ? student['College Registration/USN'] : '',
            programme: student ? student.Programme : 'MBA',
            stream,
            score,
            maxScore,
            pct,
            status: att['Completion Status'] || 'Completed',
            date: att['Completed Date'] || att['Assigned Date'] || '',
          };
        })
        .filter(s => {
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const matches =
              s.fullName.toLowerCase().includes(q) ||
              s.studentId.toLowerCase().includes(q) ||
              s.usn.toLowerCase().includes(q);
            if (!matches) return false;
          }
          if (scoreTierFilter === '75plus' && s.pct < 75) return false;
          if (scoreTierFilter === '60to74' && (s.pct < 60 || s.pct >= 75)) return false;
          if (scoreTierFilter === 'below60' && s.pct >= 60) return false;
          return true;
        })
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.pct - a.pct;
        });

      return {
        testType,
        totalTakers,
        filteredTakers: studentList.length,
        avgScore,
        maxScore,
        avgPct,
        highestScore,
        high,
        mid,
        low,
        studentList,
      };
    });
  }, [distinctTestTypes, attempts, allStudents, activeStream, searchQuery, scoreTierFilter]);

  // Aggregate Metrics for Active View
  const metrics = useMemo(() => {
    const totalStuds = filteredStudents.length;
    const totalAtts = filteredStudents.reduce((acc, s) => acc + s.totalAttempts, 0);
    const totalCompleted = filteredStudents.reduce((acc, s) => acc + s.completedCount, 0);
    const overallAvgScore =
      totalStuds > 0 ? Math.round(filteredStudents.reduce((acc, s) => acc + s.avgScore, 0) / totalStuds) : 0;

    return {
      totalStuds,
      totalAtts,
      totalCompleted,
      overallAvgScore,
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

  const toggleTest = (testType: string) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      if (next.has(testType)) {
        next.delete(testType);
      } else {
        next.add(testType);
      }
      return next;
    });
  };

  // Export Grouped Summary CSV
  const handleExportCSV = () => {
    const headers = [
      'Student ID',
      'USN',
      'Full Name',
      'Programme',
      'Stream',
      'Total Attempts',
      'Completed Tests',
      'Average Score',
      'Average Percentage',
      'Score Bucket',
      ...distinctTestTypes.map(t => `${t} (Score)`),
    ];

    const rows = filteredStudents.map(s => {
      const testScoreCols = distinctTestTypes.map(t => {
        const att = s.attempts.find((a: any) => a['Assessment Type'] === t);
        return att ? `${att['Overall Score'] || 0}/${att['Maximum Score'] || 50}` : '—';
      });

      const bucketLabel = s.avgPct >= 75 ? '>= 75% High' : s.avgPct >= 60 ? '60-74% Mid' : '< 60% Low';

      return [
        `"${s['Student ID'] || ''}"`,
        `"${s['College Registration/USN'] || ''}"`,
        `"${s['Full Name'] || ''}"`,
        `"${s.Programme || ''}"`,
        `"${s.stream || ''}"`,
        s.totalAttempts,
        s.completedCount,
        s.avgScore,
        `${s.avgPct}%`,
        `"${bucketLabel}"`,
        ...testScoreCols.map(c => `"${c}"`),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Assessment_Scores_Grouped_${activeStream}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Helper for score bucket styling
  const getScoreBucketBadge = (pct: number, totalAttempts: number = 1) => {
    if (totalAttempts === 0) {
      return {
        label: 'Not Attempted',
        bg: 'bg-slate-50 text-slate-400 border-slate-200',
        dot: 'bg-slate-300',
      };
    }
    if (pct >= 75) {
      return {
        label: '≥ 75% High',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    }
    if (pct >= 60) {
      return {
        label: '60–74% Mid',
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
      };
    }
    return {
      label: '< 60% Low',
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    };
  };

  return (
    <div className="space-y-6">
      {/* ── Top Aggregate & Score Range Bucket Cards ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Cohort Overview */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cohort Size</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 font-mono">{metrics.totalStuds}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{metrics.totalAtts} Total Attempts</div>
          </div>
        </div>

        {/* Bucket Card 1: >= 75% High */}
        <div
          onClick={() => setScoreTierFilter(prev => (prev === '75plus' ? 'All' : '75plus'))}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            scoreTierFilter === '75plus'
              ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>≥ 75% Distinction</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800">
              {scoreBuckets.high.pct}%
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-800 font-mono">{scoreBuckets.high.count}</div>
            <div className="text-[11px] text-emerald-700/70 mt-0.5">Top Performers • Click to filter</div>
          </div>
        </div>

        {/* Bucket Card 2: 60% – 74% Mid */}
        <div
          onClick={() => setScoreTierFilter(prev => (prev === '60to74' ? 'All' : '60to74'))}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            scoreTierFilter === '60to74'
              ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span>60%–74% First Class</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-100/80 text-blue-800">
              {scoreBuckets.mid.pct}%
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-blue-800 font-mono">{scoreBuckets.mid.count}</div>
            <div className="text-[11px] text-blue-700/70 mt-0.5">Proficient Range • Click to filter</div>
          </div>
        </div>

        {/* Bucket Card 3: < 60% Low */}
        <div
          onClick={() => setScoreTierFilter(prev => (prev === 'below60' ? 'All' : 'below60'))}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            scoreTierFilter === 'below60'
              ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>&lt; 60% Remediation</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-100/80 text-amber-800">
              {scoreBuckets.low.pct}%
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-800 font-mono">{scoreBuckets.low.count}</div>
            <div className="text-[11px] text-amber-700/70 mt-0.5">Needs Attention • Click to filter</div>
          </div>
        </div>
      </div>

      {/* ── Stream Grouping Pills Bar & View Mode Switcher ─────────────────── */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Stream Pills */}
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

        {/* View Mode Switcher with 4 modes */}
        <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          <button
            onClick={() => setLayoutMode('cards')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              layoutMode === 'cards'
                ? 'bg-white text-blue-700 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Student Master-Detail Cards"
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
            title="Student × Test Type Matrix Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Test Matrix</span>
          </button>

          <button
            onClick={() => setLayoutMode('tests')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              layoutMode === 'tests'
                ? 'bg-white text-blue-700 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Group by Assessment Test / Subject"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Subject-Wise</span>
          </button>

          <button
            onClick={() => setLayoutMode('streams')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              layoutMode === 'streams'
                ? 'bg-white text-blue-700 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Grouped Stream Buckets"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Stream Groups</span>
          </button>
        </div>
      </div>

      {/* ── Search & Filter Action Bar ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search students by name, USN, student ID, test type..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400"
            />
          </div>

          {/* Score Tier Filter Dropdown */}
          <select
            value={scoreTierFilter}
            onChange={e => setScoreTierFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-medium"
          >
            <option value="All">All Score Ranges</option>
            <option value="75plus">High Achievers (≥ 75%)</option>
            <option value="60to74">First Class (60% – 74%)</option>
            <option value="below60">Needs Remediation (&lt; 60%)</option>
          </select>

          {scoreTierFilter !== 'All' && (
            <button
              onClick={() => setScoreTierFilter('All')}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors font-semibold"
            >
              Reset Filter
            </button>
          )}
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

      {/* ── View 1: Student Master-Detail Cards (Accordion) ────────────────── */}
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
              const bucket = getScoreBucketBadge(student.avgPct, student.totalAttempts);

              return (
                <div
                  key={student['Student ID']}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
                >
                  {/* Student Header Bar */}
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
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${bucket.bg}`}>
                            {bucket.label}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500 font-medium">
                            {student.completedCount} of {student.totalAttempts} Tests Attempted
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Summary Score Pill */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-slate-400">Average Performance</div>
                        <div className="text-sm font-bold text-slate-900 font-mono">
                          {student.totalAttempts > 0 && student.avgPct > 0 ? (
                            <>
                              {student.avgScore} pts <span className="text-xs font-normal text-slate-500">({student.avgPct}%)</span>
                            </>
                          ) : (
                            <span className="text-slate-400 font-normal text-xs">Not Attempted</span>
                          )}
                        </div>
                      </div>

                      {/* Mini Score Pill */}
                      <div
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs font-mono border ${bucket.bg}`}
                      >
                        {student.totalAttempts > 0 && student.avgPct > 0 ? `${student.avgScore} / 50` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Nested Attempt Chips */}
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
                          <span>Individual Assessment Attempts ({student.attempts.length})</span>
                          <button
                            onClick={() => onStudentClick && onStudentClick(student['Student ID'])}
                            className="text-blue-600 hover:text-blue-800 text-xs font-semibold lowercase flex items-center gap-1"
                          >
                            <span>view student 360 profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {student.attempts.map((att: any, idx: number) => {
                            const score = Number(att['Overall Score']) || 0;
                            const maxScore = Number(att['Maximum Score']) || 50;
                            const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
                            const attBucket = getScoreBucketBadge(pct);

                            return (
                              <div
                                key={att['Attempt ID'] || idx}
                                onClick={() => onAttemptClick && onAttemptClick(att)}
                                className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-blue-300 transition-all cursor-pointer space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="font-mono text-[10px] text-slate-400 font-semibold block">
                                      {att['Attempt ID']}
                                    </span>
                                    <span className="text-xs font-bold text-slate-900 block mt-0.5">
                                      {att['Assessment Type']}
                                    </span>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${attBucket.bg}`}>
                                    {attBucket.label}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500 font-medium">Score</span>
                                    <span className="font-mono font-bold text-slate-900">
                                      {score} / {maxScore} <span className="text-[10px] text-slate-400">({pct}%)</span>
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        pct >= 75 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {att['Completed Date'] || att['Assigned Date'] || 'Aug 2026'}
                                  </span>
                                  <span className="text-blue-600 font-semibold hover:underline">Details →</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── View 2: Student × Test Type Matrix Grid ────────────────────────── */}
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
                  <th className="py-3.5 px-3 text-center min-w-[90px]">Tests Taken</th>
                  <th className="py-3.5 px-3 text-center min-w-[100px]">Avg Score</th>
                  <th className="py-3.5 px-3 text-center min-w-[120px]">Score Band</th>
                  {distinctTestTypes.map(testType => (
                    <th key={testType} className="py-3.5 px-3 text-center min-w-[130px]">
                      {testType}
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-right min-w-[90px]">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6 + distinctTestTypes.length} className="py-12 text-center text-slate-400 text-xs">
                      No students found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => {
                    const bucket = getScoreBucketBadge(student.avgPct, student.totalAttempts);

                    return (
                      <tr key={student['Student ID']} className="hover:bg-blue-50/30 transition-colors">
                        {/* Student ID & Name */}
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

                        {/* Programme & Stream */}
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeColor(student.stream)}`}>
                            {student.Programme} — {student.stream}
                          </span>
                        </td>

                        {/* Tests Taken */}
                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                          {student.completedCount} / {student.totalAttempts}
                        </td>

                        {/* Average Score */}
                        <td className="py-3 px-3 text-center">
                          {student.totalAttempts > 0 && student.avgPct > 0 ? (
                            <>
                              <span className="font-mono font-bold text-slate-900">{student.avgScore}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">({student.avgPct}%)</span>
                            </>
                          ) : (
                            <span className="text-slate-300 font-mono">—</span>
                          )}
                        </td>

                        {/* Score Band */}
                        <td className="py-3 px-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${bucket.bg}`}>
                            {bucket.label}
                          </span>
                        </td>

                        {/* Individual Test Scores */}
                        {distinctTestTypes.map(testType => {
                          const att = student.attempts.find((a: any) => a['Assessment Type'] === testType);
                          if (!att) {
                            return (
                              <td key={testType} className="py-3 px-3 text-center text-slate-300 font-mono">
                                —
                              </td>
                            );
                          }
                          const score = Number(att['Overall Score']) || 0;
                          const maxScore = Number(att['Maximum Score']) || 50;
                          const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
                          const attBucket = getScoreBucketBadge(pct);

                          return (
                            <td key={testType} className="py-3 px-3 text-center">
                              <button
                                onClick={() => onAttemptClick && onAttemptClick(att)}
                                className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs border transition-all hover:scale-105 ${attBucket.bg}`}
                                title={`${att['Attempt ID']} • ${att['Completion Status']}`}
                              >
                                {score}/{maxScore}
                              </button>
                            </td>
                          );
                        })}

                        {/* Profile Link */}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── View 3: Subject / Test-wise View (Group by Test Type) ────────────── */}
      {layoutMode === 'tests' && (
        <div className="space-y-6">
          {subjectSummaries.map(subject => {
            const isTestExpanded = !expandedTests.has(subject.testType);

            return (
              <div
                key={subject.testType}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
              >
                {/* Subject Header */}
                <div
                  onClick={() => toggleTest(subject.testType)}
                  className="p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{subject.testType}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {subject.filteredTakers} Candidates
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        Subject Assessment Benchmark & Candidate Roster
                      </span>
                    </div>
                  </div>

                  {/* Test Benchmarks */}
                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    <div>
                      <span className="text-slate-400">Class Avg: </span>
                      <span className="font-mono font-bold text-slate-900">
                        {subject.avgScore} / {subject.maxScore} ({subject.avgPct}%)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Top Score: </span>
                      <span className="font-mono font-bold text-emerald-700">
                        {subject.highestScore} / {subject.maxScore}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ≥75%: {subject.high}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        60–74%: {subject.mid}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        &lt;60%: {subject.low}
                      </span>
                    </div>
                    <div className="text-slate-400">
                      {isTestExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Candidate Roster Table for this subject */}
                {isTestExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/60 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                          <th className="py-3 px-4 min-w-[200px]">Student ID & Name</th>
                          <th className="py-3 px-3 min-w-[130px]">Programme & Stream</th>
                          <th className="py-3 px-3 text-center min-w-[110px]">Score / Max</th>
                          <th className="py-3 px-3 text-center min-w-[110px]">Percentage</th>
                          <th className="py-3 px-3 text-center min-w-[120px]">Score Bucket</th>
                          <th className="py-3 px-3 min-w-[100px]">Completion Date</th>
                          <th className="py-3 px-3 text-center min-w-[100px]">Status</th>
                          <th className="py-3 px-4 text-right min-w-[90px]">Profile</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subject.studentList.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                              No students in this test match the current filters.
                            </td>
                          </tr>
                        ) : (
                          subject.studentList.map(st => {
                            const bucket = getScoreBucketBadge(st.pct);

                            return (
                              <tr key={st.attempt['Attempt ID']} className="hover:bg-blue-50/20 transition-colors">
                                <td className="py-2.5 px-4">
                                  <button
                                    onClick={() => onStudentClick && onStudentClick(st.studentId)}
                                    className="font-mono text-xs font-bold text-blue-600 hover:underline block text-left"
                                  >
                                    {st.studentId}
                                  </button>
                                  <span className="font-semibold text-slate-800 block truncate max-w-[180px]">
                                    {st.fullName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">{st.usn}</span>
                                </td>

                                <td className="py-2.5 px-3">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeColor(st.stream)}`}>
                                    {st.programme} — {st.stream}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                                  {st.score} / {st.maxScore}
                                </td>

                                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                                  {st.pct}%
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${bucket.bg}`}>
                                    {bucket.label}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                                  {st.date || '—'}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {st.status}
                                  </span>
                                </td>

                                <td className="py-2.5 px-4 text-right">
                                  <button
                                    onClick={() => onStudentClick && onStudentClick(st.studentId)}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                                  >
                                    <span>360</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── View 4: Grouped Stream Buckets ─────────────────────────────────── */}
      {layoutMode === 'streams' && (
        <div className="space-y-6">
          {STREAM_TABS.filter(t => t.id !== 'All' && (activeStream === 'All' || activeStream === t.id)).map(streamTab => {
            const streamStudents = enrichedStudents.filter(s => s.stream === streamTab.id);
            const streamAttempts = streamStudents.reduce((acc, s) => acc + s.totalAttempts, 0);
            const streamAvg =
              streamStudents.length > 0
                ? Math.round(streamStudents.reduce((acc, s) => acc + s.avgScore, 0) / streamStudents.length)
                : 0;

            const streamHigh = streamStudents.filter(s => s.avgPct >= 75).length;
            const streamMid = streamStudents.filter(s => s.avgPct >= 60 && s.avgPct < 75).length;
            const streamLow = streamStudents.filter(s => s.avgPct < 60).length;

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
                      {streamStudents.length} Students • {streamAttempts} Attempts
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <div>
                      <span className="text-slate-400">Stream Avg Score: </span>
                      <span className="font-mono font-bold text-slate-900">{streamAvg} pts</span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ≥75%: {streamHigh}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        60–74%: {streamMid}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        &lt;60%: {streamLow}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {streamStudents.map(s => {
                    const bucket = getScoreBucketBadge(s.avgPct);

                    return (
                      <div
                        key={s['Student ID']}
                        onClick={() => onStudentClick && onStudentClick(s['Student ID'])}
                        className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/20 transition-all cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-blue-600">{s['Student ID']}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${bucket.bg}`}>
                            {bucket.label}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800 truncate">{s['Full Name']}</div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-mono">
                          <span>Avg: {s.avgScore} pts ({s.avgPct}%)</span>
                          <span className="text-blue-600 font-semibold font-sans">View 360 →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
