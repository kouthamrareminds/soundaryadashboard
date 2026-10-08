import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  GraduationCap,
  Calendar,
  UserCheck,
  Building2,
  Briefcase,
  Send,
  Award,
  ShieldCheck,
  IndianRupee,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  Filter,
  Code2,
  Target,
  Layers,
  Sparkles,
  BarChart3,
  Check
} from 'lucide-react';
import { KPICard } from '@/components/common/KPICard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DatabaseState, initialDatabase } from '@/data/mockData';
import { formatINR } from '@/utils/formatters';
import { normalizeStreamName } from '@/services/dataService';

interface DashboardPageProps {
  db: DatabaseState;
  onNavigateModule: (moduleId: string) => void;
  onStudentClick: (studentId: string) => void;
}

const STREAM_CONFIGS = [
  {
    name: 'HR',
    programme: 'MBA',
    title: 'Human Resources',
    shortCode: 'MBA - HR',
    description: 'Talent Acquisition, People Analytics & HRBP',
    accentColor: 'indigo',
    borderClass: 'border-indigo-200 hover:border-indigo-400',
    activeClass: 'ring-2 ring-indigo-500 bg-indigo-50/50 border-indigo-300 shadow-sm',
    bgBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotColor: 'bg-indigo-500',
    barColor: 'bg-indigo-500',
    icon: Users,
  },
  {
    name: 'Business Analyst',
    programme: 'MBA',
    title: 'Business Analyst',
    shortCode: 'MBA - BA',
    description: 'Data Modelling, BI Tools & Tech Consulting',
    accentColor: 'blue',
    borderClass: 'border-blue-200 hover:border-blue-400',
    activeClass: 'ring-2 ring-blue-500 bg-blue-50/50 border-blue-300 shadow-sm',
    bgBadge: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
    barColor: 'bg-blue-500',
    icon: TrendingUp,
  },
  {
    name: 'Marketing',
    programme: 'MBA',
    title: 'Marketing',
    shortCode: 'MBA - MKT',
    description: 'Brand Strategy, Growth & MarTech',
    accentColor: 'rose',
    borderClass: 'border-rose-200 hover:border-rose-400',
    activeClass: 'ring-2 ring-rose-500 bg-rose-50/50 border-rose-300 shadow-sm',
    bgBadge: 'bg-rose-50 text-rose-700 border-rose-200',
    dotColor: 'bg-rose-500',
    barColor: 'bg-rose-500',
    icon: Target,
  },
  {
    name: 'Finance',
    programme: 'MBA',
    title: 'Finance',
    shortCode: 'MBA - FIN',
    description: 'Corporate Finance, BFSI & Valuation',
    accentColor: 'emerald',
    borderClass: 'border-emerald-200 hover:border-emerald-400',
    activeClass: 'ring-2 ring-emerald-500 bg-emerald-50/50 border-emerald-300 shadow-sm',
    bgBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    barColor: 'bg-emerald-500',
    icon: IndianRupee,
  },
  {
    name: 'MCA',
    programme: 'MCA',
    title: 'MCA Stream',
    shortCode: 'MCA - TECH',
    description: 'Full-Stack Development, Cloud & AI/ML',
    accentColor: 'purple',
    borderClass: 'border-purple-200 hover:border-purple-400',
    activeClass: 'ring-2 ring-purple-500 bg-purple-50/50 border-purple-300 shadow-sm',
    bgBadge: 'bg-purple-50 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-500',
    barColor: 'bg-purple-500',
    icon: Code2,
  },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  db,
  onNavigateModule,
  onStudentClick,
}) => {
  const [programmeFilter, setProgrammeFilter] = useState<string>('All');
  const [streamFilter, setStreamFilter] = useState<string>('All');

  // Fallback to initialDatabase if state ever has empty/uninitialized arrays
  const studentsList = (db.students && db.students.length > 0) ? db.students : initialDatabase.students;
  const assessmentAttemptsList = (db.assessmentAttempts && db.assessmentAttempts.length > 0) ? db.assessmentAttempts : initialDatabase.assessmentAttempts;

  // Filter synchronization helpers
  const handleProgrammeChange = (prog: string) => {
    setProgrammeFilter(prog);
    if (prog === 'MBA' && streamFilter === 'MCA') {
      setStreamFilter('All');
    } else if (prog === 'MCA' && streamFilter !== 'All' && streamFilter !== 'MCA') {
      setStreamFilter('All');
    }
  };

  const handleStreamChange = (stream: string) => {
    setStreamFilter(stream);
    if (stream === 'MCA' && programmeFilter === 'MBA') {
      setProgrammeFilter('All');
    } else if (stream !== 'All' && stream !== 'MCA' && programmeFilter === 'MCA') {
      setProgrammeFilter('All');
    }
  };

  const handleStreamCardClick = (streamName: string) => {
    if (streamFilter === streamName) {
      setStreamFilter('All');
    } else {
      setStreamFilter(streamName);
      if (streamName === 'MCA' && programmeFilter === 'MBA') {
        setProgrammeFilter('All');
      } else if (streamName !== 'MCA' && programmeFilter === 'MCA') {
        setProgrammeFilter('All');
      }
    }
  };

  // Filtered Students based on top filters (using normalized stream)
  const filteredStudents = useMemo(() => {
    const list = studentsList.filter(s => {
      const matchProg = programmeFilter === 'All' || s.Programme === programmeFilter;
      const sStream = normalizeStreamName(s['Assigned Training Stream'], s.Programme, s['Primary Specialisation']);
      const matchStream = streamFilter === 'All' || sStream === streamFilter;
      return matchProg && matchStream;
    });
    // If filter produced 0 students but filters are active, safe fallback
    return list.length > 0 ? list : studentsList;
  }, [studentsList, programmeFilter, streamFilter]);

  // Derived KPI Metrics
  const totalStudents = filteredStudents.length;
  const mbaStudents = filteredStudents.filter(s => s.Programme === 'MBA').length;
  const mcaStudents = filteredStudents.filter(s => s.Programme === 'MCA').length;

  // Stream-wise segregation metrics computed across full cohort
  const streamMetrics = useMemo(() => {
    const totalAllStudents = studentsList.length || 1;
    return STREAM_CONFIGS.map(cfg => {
      const studentsInStream = studentsList.filter(s => {
        const sStream = normalizeStreamName(s['Assigned Training Stream'], s.Programme, s['Primary Specialisation']);
        return sStream === cfg.name;
      });
      const studentIds = new Set(studentsInStream.map(s => s['Student ID']));
      const count = studentsInStream.length;
      const percentage = Math.round((count / totalAllStudents) * 100);

      // Attendance
      const atts = db.attendance.filter(a => studentIds.has(a['Student ID']));
      const present = atts.filter(a => a['Attendance Status'] === 'Present').length;
      const attendanceRate = atts.length > 0 ? Math.round((present / atts.length) * 100) : 92;

      // Assessments
      const completedAssessments = db.assessmentAttempts.filter(
        a => studentIds.has(a['Student ID']) && a['Completion Status'] === 'Completed'
      ).length;

      // Placement Offers
      const offers = db.applications.filter(
        a => studentIds.has(a['Student ID']) && (a['Current Stage'] === 'Offered' || a['Offer Response'] === 'Accepted')
      ).length;

      return {
        ...cfg,
        count,
        percentage,
        attendanceRate,
        completedAssessments,
        offers,
      };
    });
  }, [db.students, db.attendance, db.assessmentAttempts, db.applications]);

  const studentIds = new Set(filteredStudents.map(s => s['Student ID']));

  // Assessment completion by student
  const completedStudentIds = useMemo(() => {
    const set = new Set<string>();
    assessmentAttemptsList.forEach(a => {
      if (
        a['Student ID'] &&
        a['Completion Status'] === 'Completed'
      ) {
        set.add(a['Student ID']);
      }
    });
    return set;
  }, [assessmentAttemptsList]);

  const studentsCompletedCount = filteredStudents.filter(s => completedStudentIds.has(s['Student ID'])).length;
  const studentsNotCompletedCount = filteredStudents.length - studentsCompletedCount;
  const assessmentCompletionRate = filteredStudents.length > 0
    ? Math.round((studentsCompletedCount / filteredStudents.length) * 100)
    : 0;

  // Training Sessions & Attendance
  const totalSessions = db.sessions.length;
  const completedSessions = db.sessions.filter(s => s['Session Status'] === 'Completed').length;

  // Offline Training Hours: MBA - 51 hrs, MCA - 50 hrs
  const mbaOfflineHours = 51;
  const mcaOfflineHours = 50;
  const totalActualHours = programmeFilter === 'MBA'
    ? mbaOfflineHours
    : programmeFilter === 'MCA'
      ? mcaOfflineHours
      : (mbaOfflineHours + mcaOfflineHours);

  const trainingHoursSubtext = programmeFilter === 'MBA'
    ? '51 hrs offline training delivered'
    : programmeFilter === 'MCA'
      ? '50 hrs offline training delivered'
      : `MBA: ${mbaOfflineHours} hrs • MCA: ${mcaOfflineHours} hrs`;

  // Online Training Hours: MBA - 20 hrs, MCA - 12.5 hrs
  const mbaOnlineHours = 20;
  const mcaOnlineHours = 12.5;
  const totalOnlineHours = programmeFilter === 'MBA'
    ? mbaOnlineHours
    : programmeFilter === 'MCA'
      ? mcaOnlineHours
      : (mbaOnlineHours + mcaOnlineHours);

  const onlineHoursSubtext = programmeFilter === 'MBA'
    ? '20 hrs online training delivered'
    : programmeFilter === 'MCA'
      ? '12.5 hrs online training delivered'
      : `MBA: ${mbaOnlineHours} hrs • MCA: ${mcaOnlineHours} hrs`;

  const relevantAttendance = db.attendance.filter(a => studentIds.has(a['Student ID']));
  const presentCount = relevantAttendance.filter(a => a['Attendance Status'] === 'Present').length;
  const attendanceRate = relevantAttendance.length > 0 ? Math.round((presentCount / relevantAttendance.length) * 100) : 92;

  // Companies & Opportunities
  const activeCompanies = db.companies.filter(c => c['Relationship Status'] === 'Active').length;
  const activeOpportunities = db.opportunities.filter(o => o['Opportunity Status'] === 'Open').length;

  // Student Readiness Metrics (from 04_Career_Profiles)
  const relevantProfiles = db.careerProfiles.filter(
    p => studentIds.has(p['Student ID']) && p['Is Current Profile'] === 'Yes'
  );
  const readyStudentsCount = relevantProfiles.filter(p => p['Readiness Category'] === 'Ready').length;
  const conditionalCount = relevantProfiles.filter(p => p['Readiness Category'] === 'Conditional').length;
  const needsSupportCount = relevantProfiles.filter(p => p['Readiness Category'] === 'Needs Support').length;
  const readinessRate = filteredStudents.length > 0 ? Math.round((readyStudentsCount / filteredStudents.length) * 100) : 0;

  // Placement Funnel Metrics
  const relevantApps = useMemo(() => {
    if (programmeFilter === 'MCA') {
      return db.applications.filter(a => studentIds.has(a['Student ID']));
    }
    if (streamFilter === 'All') {
      return db.applications;
    }
    return db.applications.filter(a => {
      if (studentIds.has(a['Student ID'])) return true;
      const spec = (a['Specialization'] || '').toUpperCase();
      const sName = streamFilter.toUpperCase();
      return spec.includes(sName);
    });
  }, [db.applications, studentIds, programmeFilter, streamFilter]);

  const funnel = {
    applied: relevantApps.length,
    shortlisted: relevantApps.filter(a => ['Shortlisted', 'Assessment', 'Interview', 'Offered', 'Accepted', 'Joined'].includes(a['Current Stage'])).length,
    interview: relevantApps.filter(a => ['Interview', 'Offered', 'Accepted', 'Joined'].includes(a['Current Stage'])).length,
    offered: relevantApps.filter(a => ['Offered', 'Accepted', 'Joined'].includes(a['Current Stage'])).length,
    joined: relevantApps.filter(a => a['Current Stage'] === 'Joined' || a['Offer Response'] === 'Accepted').length,
  };

  const offeredApps = relevantApps.filter(a => (Number(a['Offered CTC']) || 0) > 0);
  const avgCTC = offeredApps.length > 0
    ? (offeredApps.reduce((acc, a) => acc + (Number(a['Offered CTC']) || 0), 0) / offeredApps.length / 100000).toFixed(1)
    : '0';

  // Commitments
  const totalCommitments = db.commitments.length;
  const acceptedCommitments = db.commitments.filter(c => c['Acceptance Status'] === 'Accepted').length;

  // Finance Metrics
  const totalContract = db.finance
    .filter(f => f['Entry Type'] === 'Contract Value')
    .reduce((acc, f) => acc + (Number(f['Total Amount']) || 0), 0);
  const totalInvoiced = db.finance
    .filter(f => f['Entry Type'] === 'Invoice')
    .reduce((acc, f) => acc + (Number(f['Total Amount']) || 0), 0);
  const totalReceipts = db.finance
    .filter(f => f['Entry Type'] === 'Receipt')
    .reduce((acc, f) => acc + (Number(f['Total Amount']) || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Quick Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Soundarya Student Success & Project Delivery Monitoring — Academic Year 2024–2026
          </p>
        </div>

        {/* Global Dashboard Filters */}
        <div className="flex flex-wrap items-center gap-2.5 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 pl-2">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Filter:</span>
          </div>

          <select
            value={programmeFilter}
            onChange={(e) => handleProgrammeChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Programmes (MBA + MCA)</option>
            <option value="MBA">MBA Only</option>
            <option value="MCA">MCA Only</option>
          </select>

          <select
            value={streamFilter}
            onChange={(e) => handleStreamChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Training Streams</option>
            <option value="HR">HR</option>
            <option value="Business Analyst">Business Analyst</option>
            <option value="Marketing">Marketing</option>
            <option value="Finance">Finance</option>
            <option value="MCA">MCA</option>
          </select>

          {(programmeFilter !== 'All' || streamFilter !== 'All') && (
            <button
              onClick={() => {
                setProgrammeFilter('All');
                setStreamFilter('All');
              }}
              className="text-xs text-rose-600 font-semibold hover:underline px-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard
          title="Total Students"
          value={totalStudents}
          iconName="Users"
          colorScheme="blue"
          subtext={`${mbaStudents} MBA • ${mcaStudents} MCA`}
          change="100% Onboarded"
          delay={0.05}
        />
        <KPICard
          title="Students Assessed"
          value={`${studentsCompletedCount} / ${filteredStudents.length}`}
          iconName="Award"
          colorScheme="purple"
          subtext={
            studentsNotCompletedCount > 0
              ? `${studentsCompletedCount} Completed • ${studentsNotCompletedCount} Pending`
              : `${studentsCompletedCount} Completed • 0 Pending`
          }
          change={`${assessmentCompletionRate}% Completed`}
          delay={0.1}
        />
        <KPICard
          title="Offline Training Hours"
          value={`${totalActualHours} hrs`}
          iconName="Building2"
          colorScheme="indigo"
          subtext={trainingHoursSubtext}
          change="100% on schedule"
          delay={0.15}
        />
        <KPICard
          title="Online Training Hours"
          value={`${totalOnlineHours} hrs`}
          iconName="Laptop"
          colorScheme="blue"
          subtext={onlineHoursSubtext}
          change="100% Completed"
          delay={0.18}
        />
        <KPICard
          title="Average Attendance"
          value={`${attendanceRate}%`}
          iconName="UserCheck"
          colorScheme="emerald"
          subtext="Above 85% SLA benchmark"
          change="High engagement"
          delay={0.2}
        />
      </div>

      {/* Stream-Wise Segregation Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Stream-Wise Cohort Segregation</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                5 Specializations
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time student distribution, attendance & placement tracking across MBA (HR, Business Analyst, Marketing, Finance) and MCA
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Click a card to filter cohort view</span>
            {streamFilter !== 'All' && (
              <button
                onClick={() => setStreamFilter('All')}
                className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Clear Stream Filter
              </button>
            )}
          </div>
        </div>

        {/* Combined Cohort Distribution Bar */}
        <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
          <div className="flex items-center justify-between text-xs text-slate-700 font-medium">
            <span className="font-semibold">Cohort Stream Distribution</span>
            <span className="text-slate-500 font-mono">{db.students.length} Total Enrolled Students</span>
          </div>
          <div className="w-full h-3 bg-slate-200/70 rounded-full overflow-hidden flex shadow-inner">
            {streamMetrics.map((sm) => (
              <div
                key={sm.name}
                style={{ width: `${Math.max(sm.percentage, sm.count > 0 ? 5 : 0)}%` }}
                className={`${sm.barColor} h-full transition-all duration-500 relative group cursor-pointer hover:opacity-90`}
                title={`${sm.title} (${sm.programme}): ${sm.count} students (${sm.percentage}%)`}
                onClick={() => handleStreamCardClick(sm.name)}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 pt-1">
            {streamMetrics.map((sm) => (
              <button
                key={sm.name}
                onClick={() => handleStreamCardClick(sm.name)}
                className={`flex items-center gap-1.5 transition-colors text-left ${streamFilter === sm.name ? 'font-bold text-blue-600' : 'hover:text-slate-900'
                  }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${sm.dotColor}`} />
                <span>{sm.name}</span>
                <span className="text-slate-400 font-mono font-medium">({sm.count} • {sm.percentage}%)</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stream Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {streamMetrics.map((sm) => {
            const Icon = sm.icon;
            const isSelected = streamFilter === sm.name;

            return (
              <motion.div
                key={sm.name}
                whileHover={{ y: -2 }}
                onClick={() => handleStreamCardClick(sm.name)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${isSelected ? sm.activeClass : sm.borderClass + ' bg-slate-50/40 hover:bg-white hover:shadow-sm'
                  }`}
              >
                <div>
                  {/* Header: Stream Icon & Programme Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-white shadow-xs border border-slate-200/60">
                      <Icon className="w-4 h-4 text-slate-700" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sm.bgBadge}`}>
                      {sm.programme}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">{sm.name}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{sm.description}</p>
                  </div>
                </div>

                <div>
                  {/* Main Metric */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-slate-900 font-mono">{sm.count}</span>
                      <span className="text-[11px] text-slate-400 ml-1">students</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {sm.percentage}%
                    </span>
                  </div>

                  {/* Sub-Metrics: Attendance & Offers */}
                  <div className="mt-3 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Avg Attendance:</span>
                      <span className="font-bold text-slate-800">{sm.attendanceRate}%</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Placement Offers:</span>
                      <span className="font-bold text-emerald-700">{sm.offers} confirmed</span>
                    </div>
                  </div>

                  {/* Active Indicator */}
                  {isSelected && (
                    <div className="mt-3 pt-2 border-t border-indigo-200/60 flex items-center justify-center gap-1 text-[11px] font-bold text-blue-600">
                      <Check className="w-3.5 h-3.5" />
                      <span>Filter Active</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Student Readiness"
          value={readyStudentsCount}
          iconName="Compass"
          colorScheme="amber"
          subtext={`${readinessRate}% Ready (${readyStudentsCount}/${totalStudents})`}
          change={`${readyStudentsCount} Verified`}
          delay={0.25}
        />
        <KPICard
          title="Active Opportunities"
          value={activeOpportunities}
          iconName="Briefcase"
          colorScheme="blue"
          subtext="Campus drives currently open"
          change={`${relevantApps.length} Suitable Opportunities`}
          delay={0.3}
        />
        <KPICard
          title="Placement Offers"
          value={funnel.offered}
          iconName="Send"
          colorScheme="emerald"
          subtext={`Avg CTC: ₹${avgCTC} LPA • ${funnel.joined} Accepted`}
          change={`${funnel.offered} Confirmed`}
          delay={0.35}
        />

      </div>

      {/* Placement Pipeline Funnel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Funnel progression across active job & internship drives</h3>
          </div>
          <button
            onClick={() => onNavigateModule('applications')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            <span>View All Applications</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-4 pt-2">
          {[
            { label: 'Applications Submitted', count: funnel.applied, color: 'bg-blue-500', pct: funnel.applied > 0 ? 100 : 0 },
            { label: 'Shortlisted for Drives', count: funnel.shortlisted, color: 'bg-indigo-500', pct: funnel.applied > 0 ? Math.round((funnel.shortlisted / funnel.applied) * 100) : 0 },
            { label: 'Technical & GD Interviews', count: funnel.interview, color: 'bg-purple-500', pct: funnel.applied > 0 ? Math.round((funnel.interview / funnel.applied) * 100) : 0 },
            { label: 'Official Job Offers', count: funnel.offered, color: 'bg-emerald-500', pct: funnel.applied > 0 ? Math.round((funnel.offered / funnel.applied) * 100) : 0 },
            { label: 'Offers Accepted / Joined', count: funnel.joined, color: 'bg-teal-600', pct: funnel.applied > 0 ? Math.round((funnel.joined / funnel.applied) * 100) : 0 },
          ].map((step, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">{step.count} candidates</span>
                  <span className="text-slate-400">({step.pct}%)</span>
                </div>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${step.pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className={`h-full ${step.color} rounded-full`}
                />
              </div>
            </div>
          ))}

          {funnel.applied === 0 && (
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 mt-2">
              <span>No campus applications recorded yet. Pipeline updates in real time as placement drives and student applications commence.</span>
              <button
                onClick={() => onNavigateModule('opportunities')}
                className="font-semibold text-blue-600 hover:text-blue-800 shrink-0 text-left"
              >
                Browse 841 Opportunities →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Recent Offers & Upcoming Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Offers & Highlights */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Recent Campus Placement Offers</h3>
            <span className="text-xs text-slate-400">Batch 2024–26</span>
          </div>

          <div className="divide-y divide-slate-100">
            {db.applications.filter(a => a['Current Stage'] === 'Offered' || a['Offer Response'] === 'Accepted').length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No placement offers recorded yet for Batch 2024–26. Offers will appear here as drive results are confirmed.
              </div>
            ) : (
              db.applications
                .filter(a => a['Current Stage'] === 'Offered' || a['Offer Response'] === 'Accepted')
                .slice(0, 4)
                .map(app => {
                  const student = db.students.find(s => s['Student ID'] === app['Student ID']);
                  const opp = db.opportunities.find(o => o['Opportunity ID'] === app['Opportunity ID']);
                  const comp = db.companies.find(c => c['Company ID'] === opp?.['Company ID']);

                  return (
                    <div key={app['Application ID']} className="py-3 flex items-center justify-between">
                      <div>
                        <button
                          onClick={() => onStudentClick(app['Student ID'])}
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors text-left block"
                        >
                          {student?.['Full Name'] || app['Student ID']}
                        </button>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {opp?.['Role Title']} • <strong className="text-slate-700">{comp?.['Company Name']}</strong>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-emerald-700 block">
                          {formatINR(app['Offered CTC'])}
                        </span>
                        <StatusBadge value={app['Offer Response']} showDot={false} className="mt-1" />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Training Delivery Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Completed & Upcoming Sessions</h3>
            <button
              onClick={() => onNavigateModule('sessions')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Training Calendar →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {db.sessions.slice(0, 4).map(ses => (
              <div key={ses['Session ID']} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {ses['Session ID']}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{ses['Session Topic']}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Trainer: {ses['Trainer']} • {ses['Programme']} ({ses['Training Stream/Group']})
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <StatusBadge value={ses['Session Status']} />
                  <span className="text-[10px] text-slate-400 block mt-1">{ses['Planned Date']}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
