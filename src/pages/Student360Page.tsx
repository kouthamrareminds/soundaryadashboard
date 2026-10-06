import React, { useState } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  Award,
  Compass,
  FolderArchive,
  Calendar,
  UserCheck,
  ClipboardCheck,
  UploadCloud,
  Send,
  History,
  Mail,
  Phone,
  ExternalLink,
  CheckCircle2,
  Clock,
  Briefcase
} from 'lucide-react';
import { DatabaseState } from '@/data/mockData';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatINR } from '@/utils/formatters';

interface Student360PageProps {
  studentId: string;
  db: DatabaseState;
  onBack: () => void;
  onNavigateModule: (mod: string) => void;
  /** List of all students for quick-switch dropdown */
  allStudents?: any[];
  /** Called when the user selects a different student from the dropdown */
  onStudentChange?: (studentId: string) => void;
}

export const Student360Page: React.FC<Student360PageProps> = ({
  studentId,
  db,
  onBack,
  onNavigateModule,
  allStudents = [],
  onStudentChange,
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Find Student Master Record
  const student = db.students.find(s => s['Student ID'] === studentId) || db.students[0];

  // Correlated records using relational foreign keys
  const attempts = db.assessmentAttempts.filter(a => a['Student ID'] === student['Student ID']);
  const attemptIds = new Set(attempts.map(a => a['Attempt ID']));
  const scores = db.assessmentScores.filter(sc => attemptIds.has(sc['Attempt ID']));
  const careerProfile = db.careerProfiles.find(cp => cp['Student ID'] === student['Student ID']);
  const files = db.studentFiles.filter(f => f['Student ID'] === student['Student ID']);
  const attendance = db.attendance.filter(at => at['Student ID'] === student['Student ID']);
  const submissions = db.studentSubmissions.filter(sub => sub['Student ID'] === student['Student ID']);
  const applications = db.applications.filter(app => app['Student ID'] === student['Student ID']);
  const appIds = new Set(applications.map(a => a['Application ID']));
  const historyEvents = db.applicationHistory.filter(h => appIds.has(h['Application ID']));

  // Calculate Student Attendance %
  const presentCount = attendance.filter(a => a['Attendance Status'] === 'Present').length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 100;

  // Placement Journey Stages
  const hasOffered = applications.some(a => ['Offered', 'Accepted', 'Joined'].includes(a['Current Stage']));
  const hasInterview = applications.some(a => ['Interview', 'Offered', 'Accepted', 'Joined'].includes(a['Current Stage']));
  const hasApplied = applications.length > 0;
  const hasProfile = Boolean(careerProfile);
  const hasAssessed = attempts.length > 0;

  const journeyStages = [
    { title: 'Enrolled', complete: true, date: student['Registration Date'] },
    { title: 'Assessed', complete: hasAssessed, date: attempts[0]?.['Completed Date'] || '12-Aug-2024' },
    { title: 'Career Profile', complete: hasProfile, date: careerProfile?.['Review Date'] || '15-Sep-2024' },
    { title: 'Training & Tasks', complete: attendance.length > 0, date: 'Oct–Dec 2024' },
    { title: 'Applied', complete: hasApplied, date: applications[0]?.['Applied On'] || 'Jan 2025' },
    { title: 'Interview', complete: hasInterview, date: hasInterview ? 'In Progress' : 'Pending' },
    { title: 'Offered', complete: hasOffered, date: hasOffered ? 'Offer Received' : 'Pending' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: GraduationCap },
    { id: 'assessments', label: `Assessments (${attempts.length})`, icon: Award },
    { id: 'career-profile', label: 'Career Profile', icon: Compass },
    { id: 'files', label: `Files (${files.length})`, icon: FolderArchive },
    { id: 'attendance', label: `Attendance (${attendanceRate}%)`, icon: UserCheck },
    { id: 'submissions', label: `Submissions (${submissions.length})`, icon: UploadCloud },
    { id: 'applications', label: `Applications (${applications.length})`, icon: Send },
    { id: 'history', label: `History (${historyEvents.length})`, icon: History },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Navigation: Back + Quick Student Switcher */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students Directory</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Quick Student Switcher */}
          {allStudents.length > 0 && onStudentChange && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium flex-shrink-0">Switch student:</label>
              <select
                value={student['Student ID']}
                onChange={e => onStudentChange(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer max-w-[220px] truncate"
              >
                {allStudents.map(s => (
                  <option key={s['Student ID']} value={s['Student ID']}>
                    {s['Student ID']} — {s['Full Name']}
                  </option>
                ))}
              </select>
            </div>
          )}
          <span className="text-xs font-mono text-slate-400">Master Key: {student['Student ID']}</span>
        </div>
      </div>

      {/* Student 360 Header Profile Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-blue-500/20 flex-shrink-0">
              {student['Full Name']?.charAt(0) || 'S'}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{student['Full Name']}</h1>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                  USN: {student['Student ID']}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {student['Programme']} • Batch {student['Batch']}
                </span>
                <span>Specialisation: <strong className="text-slate-700">{student['Primary Specialisation']}</strong></span>
                <span>Stream: <strong className="text-slate-700">{student['Assigned Training Stream']}</strong></span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {student['Email']}
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {student['Mobile']}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Status Tags */}
          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 flex-shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Internship Status</span>
              <StatusBadge value={student['Internship Status']} />
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Placement Interest</span>
              <StatusBadge value={student['Placement Interest']} />
            </div>
          </div>
        </div>

        {/* Student Placement Journey Progress Line */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            <span>Student Capability & Placement Journey</span>
            <span className="text-blue-600 font-semibold">{hasOffered ? 'Candidate Offered' : 'Active Pipeline'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {journeyStages.map((stg, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border text-center transition-all ${
                  stg.complete
                    ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                    : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  <CheckCircle2
                    className={`w-4 h-4 ${stg.complete ? 'text-blue-600' : 'text-slate-300'}`}
                  />
                </div>
                <div className="text-xs font-bold truncate">{stg.title}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">{stg.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm min-h-[350px]">
        {/* TAB 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Complete Student Master Details (01_Students)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(student).map(([key, val]) => (
                <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">{key}</span>
                  <span className="text-xs font-semibold text-slate-900 mt-0.5 block break-words">
                    {String(val || '—')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Assessments */}
        {activeTab === 'assessments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Diagnostic & Competency Assessment Attempts
              </h3>
              <button
                onClick={() => onNavigateModule('assessment-attempts')}
                className="text-xs text-blue-600 hover:underline"
              >
                View All Attempts →
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {attempts.map(att => (
                <div key={att['Attempt ID']} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {att['Attempt ID']}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{att['Assessment Type']}</span>
                      <span className="text-[10px] text-slate-400">Ver: {att['Assessment Version']}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Completed On: {att['Completed Date']} • Assigned: {att['Assigned Date']}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900 font-mono">
                        {att['Overall Score']} / {att['Maximum Score']}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Overall Score</span>
                    </div>
                    <StatusBadge value={att['Completion Status']} />
                  </div>
                </div>
              ))}
            </div>

            {/* Assessment Scores Breakdown */}
            {scores.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Dimension & Competency Scores
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scores.map(sc => (
                    <div key={sc['Score ID']} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{sc['Dimension/Competency']}</span>
                        <span className="text-[10px] text-slate-400">Stage: {sc['Assessment Stage']} • Evaluator: {sc['Evaluator']}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-bold text-blue-700">{sc['Normalised Score']}%</span>
                        <StatusBadge value={sc['Proficiency Band']} showDot={false} className="block mt-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Career Profile */}
        {activeTab === 'career-profile' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Career Readiness & Profile Review (04_Career_Profiles)
            </h3>

            {careerProfile ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200">
                    <span className="text-xs text-blue-700 font-semibold block">Recommended Role</span>
                    <span className="text-base font-bold text-blue-900 mt-1 block">{careerProfile['Recommended Role']}</span>
                    <span className="text-[10px] text-blue-600 mt-1 block">Preferred: {careerProfile['Preferred Role']}</span>
                  </div>

                  <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <span className="text-xs text-emerald-700 font-semibold block">Readiness Category</span>
                    <div className="mt-1">
                      <StatusBadge value={careerProfile['Readiness Category']} />
                    </div>
                    <span className="text-[10px] text-emerald-600 mt-2 block">Current Profile: {careerProfile['Is Current Profile']}</span>
                  </div>

                  <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200">
                    <span className="text-xs text-purple-700 font-semibold block">Salary Expectation</span>
                    <span className="text-base font-bold text-purple-900 mt-1 block">{careerProfile['Salary Expectation']}</span>
                    <span className="text-[10px] text-purple-600 mt-1 block">Location: {careerProfile['Preferred Location']}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Demonstrated Strengths:</span>
                    <p className="text-xs text-slate-600 mt-0.5">{careerProfile['Demonstrated Strengths']}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Development Needs:</span>
                    <p className="text-xs text-slate-600 mt-0.5">{careerProfile['Development Needs']}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Rationale & Next Action:</span>
                    <p className="text-xs text-slate-600 mt-0.5">{careerProfile['Rationale']}</p>
                    <span className="inline-block mt-1 text-xs font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                      Next Step: {careerProfile['Next Action']}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No Career Profile evaluated yet for this student.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Files */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Student Artifacts & Verified Files (05_Student_Files)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {files.map(f => (
                <div key={f['File ID']} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-700">{f['File ID']}</span>
                      <StatusBadge value={f['Review Status']} />
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-2 truncate">{f['File Name']}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Type: <strong>{f['File Type']}</strong> • Ver: {f['Version']}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Reviewer: {f['Reviewer']}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[10px]">Uploaded: {f['Uploaded On']}</span>
                    <a
                      href={f['File URL']}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                    >
                      <span>View File</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Attendance */}
        {activeTab === 'attendance' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Session Attendance Records (07_Attendance)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Chronological student register and session-wise attendance logs</p>
              </div>
              <div className="flex items-center gap-2">
                {attendanceRate < 75 ? (
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Attendance Alert (&lt;75%)</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <span>✓</span>
                    <span>Regular Standing (≥75%)</span>
                  </span>
                )}
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  Overall: <strong className={attendanceRate >= 75 ? "text-emerald-700 font-extrabold" : "text-rose-700 font-extrabold"}>{attendanceRate}%</strong>
                </span>
              </div>
            </div>

            {/* Attendance Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block">Total Sessions</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">{attendance.length}</span>
              </div>
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <span className="text-[11px] font-semibold text-emerald-700 block">Sessions Present</span>
                <span className="text-xl font-bold text-emerald-800 mt-1 block">{presentCount}</span>
              </div>
              <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200">
                <span className="text-[11px] font-semibold text-rose-700 block">Sessions Absent</span>
                <span className="text-xl font-bold text-rose-800 mt-1 block">{attendance.length - presentCount}</span>
              </div>
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200">
                <span className="text-[11px] font-semibold text-blue-700 block">Attendance Rate</span>
                <span className="text-xl font-bold text-blue-800 mt-1 block">{attendanceRate}%</span>
              </div>
            </div>

            {/* Column-Wise Date Matrix Strip */}
            <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Session-Wise Date Register (Column View)
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                {attendance.map(a => {
                  const isPresent = a['Attendance Status'] === 'Present';
                  return (
                    <div
                      key={a['Attendance ID']}
                      className={`flex flex-col items-center justify-between p-2 rounded-lg border flex-1 min-w-[62px] text-center transition-all hover:scale-[1.02] shadow-2xs ${
                        isPresent
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50/80 border-rose-200 text-rose-800'
                      }`}
                    >
                      <span className="text-[10px] font-mono font-medium text-slate-600 leading-tight">
                        {a['Recorded On']?.split('-')[0] + ' ' + (a['Recorded On']?.split('-')[1] || '')}
                      </span>
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold my-1 shadow-xs ${
                          isPresent ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}
                      >
                        {isPresent ? 'P' : 'A'}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-slate-500 truncate w-full">
                        {a['Session ID']?.replace('SES-', '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column-Wise Detailed Attendance Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Session ID</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Session Topic</th>
                      <th className="py-3 px-4">Delivery Mode</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendance.map(a => {
                      const session = db.sessions.find(s => s['Session ID'] === a['Session ID']);
                      return (
                        <tr key={a['Attendance ID']} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-700">
                            {onNavigateModule ? (
                              <button
                                onClick={() => onNavigateModule('sessions')}
                                className="hover:underline hover:text-blue-900"
                                title="View Session in Sessions Module"
                              >
                                {a['Session ID']}
                              </button>
                            ) : (
                              a['Session ID']
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                            {a['Recorded On'] || session?.['Planned Date']}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-medium max-w-xs truncate" title={session?.['Session Topic']}>
                            {session?.['Session Topic'] || 'Classroom Delivery'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                session?.['Delivery Mode'] === 'Online'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {session?.['Delivery Mode'] || 'Offline'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {a['Minutes Attended'] || 120} mins
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <StatusBadge value={a['Attendance Status']} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Submissions */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Student Project & Task Submissions (09_Student_Submissions)
            </h3>

            <div className="space-y-3">
              {submissions.map(sub => (
                <div key={sub['Submission ID']} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700">{sub['Task ID']}</span>
                    <StatusBadge value={sub['Evaluation Result']} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Submitted On: {sub['Submission Date']}</span>
                    <span className="font-mono font-bold text-slate-900">
                      Score: {sub['Score']} / {sub['Maximum Score']}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                    Feedback: {sub['Feedback']}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: Applications */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Job & Internship Placement Applications (12_Applications)
            </h3>

            <div className="space-y-3">
              {applications.map(app => {
                const opp = db.opportunities.find(o => o['Opportunity ID'] === app['Opportunity ID']);
                const comp = db.companies.find(c => c['Company ID'] === opp?.['Company ID']);

                return (
                  <div key={app['Application ID']} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {app['Application ID']}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{opp?.['Role Title']}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Company: <strong>{comp?.['Company Name']}</strong> • Applied On: {app['Applied On']}
                      </div>
                      {app['Offered CTC'] > 0 && (
                        <div className="text-xs font-bold text-emerald-700">
                          Offered CTC: {formatINR(app['Offered CTC'])}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge value={app['Current Stage']} />
                      {app['Offer Response'] && <StatusBadge value={app['Offer Response']} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 8: History */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Recruitment Event History & Interview Logs (13_Application_History)
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {historyEvents.map(evt => (
                <div key={evt['Event ID']} className="relative space-y-1">
                  <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{evt['Interview Round']}</span>
                    <StatusBadge value={evt['New Stage']} />
                    <span className="text-[10px] text-slate-400 font-mono">{evt['Event Date']}</span>
                  </div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {evt['Feedback']}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
