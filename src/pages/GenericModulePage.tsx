import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable } from '@/components/common/DataTable';
import { KPICard } from '@/components/common/KPICard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { RecordFormModal } from '@/components/common/RecordFormModal';
import { FilePreviewModal } from '@/components/common/FilePreviewModal';
import { AttendanceMatrixView } from '@/components/common/AttendanceMatrixView';
import { AssessmentGroupedView } from '@/components/common/AssessmentGroupedView';
import { StudentFilesGroupedView } from '@/components/common/StudentFilesGroupedView';
import { StudentSubmissionsGroupedView } from '@/components/common/StudentSubmissionsGroupedView';
import { ModuleConfig } from '@/config/modulesConfig';
import { Table, Calendar as CalendarIcon, Kanban, Clock, Award, LayoutGrid, List, Layers, Building2, MapPin, ExternalLink, ChevronLeft, ChevronRight, Briefcase, Sparkles, Compass } from 'lucide-react';
import { formatINR } from '@/utils/formatters';
import { UserRole } from '@/services/authService';

interface GenericModulePageProps {
  moduleConfig: ModuleConfig;
  data: any[];
  allStudents?: any[];
  allSessions?: any[];
  allAttendance?: any[];
  allCareerProfiles?: any[];
  allAssessmentAttempts?: any[];
  allCompanies?: any[];
  userRole?: UserRole | null;
  onRowClick: (record: any) => void;
  onStudentClick: (studentId: string) => void;
  onRelatedClick: (targetModule: string, id: string) => void;
  onUploadClick: () => void;
  onAddRecord?: (moduleId: string, record: any) => void;
  onEditRecord?: (moduleId: string, primaryId: string, primaryValue: string, updates: any) => void;
  onDeleteRecord?: (moduleId: string, primaryId: string, primaryValue: string) => void;
  onUpsertAttendance?: (sessionId: string, studentId: string, status: string) => void;
  onAddSessionColumn?: (sessionData: any, defaultStatus?: string) => void;
}

export const GenericModulePage: React.FC<GenericModulePageProps> = ({
  moduleConfig,
  data,
  allStudents = [],
  allSessions = [],
  allAttendance = [],
  allCareerProfiles = [],
  allAssessmentAttempts = [],
  allCompanies = [],
  userRole,
  onRowClick,
  onStudentClick,
  onRelatedClick,
  onUploadClick,
  onAddRecord,
  onEditRecord,
  onDeleteRecord,
  onUpsertAttendance,
  onAddSessionColumn,
}) => {
  const isReadOnly = userRole === 'COLLEGE_VIEWER';

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [quickCategoryFilter, setQuickCategoryFilter] = useState<string | null>(null);

  // View Mode for modules with alternative views (Attempts -> Grouped, Attendance -> Matrix, Sessions -> Calendar, Applications -> Kanban, History -> Timeline, Opportunities -> Cards/Table)
  const [viewMode, setViewMode] = useState<'table' | 'matrix' | 'calendar' | 'kanban' | 'timeline' | 'grouped' | 'cards'>(() => {
    if (moduleConfig.id === 'attendance') return 'matrix';
    if (moduleConfig.id === 'assessment-attempts' || moduleConfig.id === 'assessment-scores' || moduleConfig.id === 'student-files' || moduleConfig.id === 'student-submissions') return 'grouped';
    if (moduleConfig.id === 'opportunities') return 'cards';
    return 'table';
  });

  // Visible Columns (Default to all or first 8 for wide tables, but all can be enabled)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    return moduleConfig.columns.slice(0, Math.min(moduleConfig.columns.length, 9)).map(c => c.key);
  });

  // Sync state whenever active module changes
  useEffect(() => {
    setVisibleColumns(moduleConfig.columns.slice(0, Math.min(moduleConfig.columns.length, 9)).map(c => c.key));
    setSearchQuery('');
    setFilters({});
    setQuickCategoryFilter(null);
    setViewMode(
      moduleConfig.id === 'attendance'
        ? 'matrix'
        : (moduleConfig.id === 'assessment-attempts' || moduleConfig.id === 'assessment-scores' || moduleConfig.id === 'student-files' || moduleConfig.id === 'student-submissions')
        ? 'grouped'
        : moduleConfig.id === 'opportunities'
        ? 'cards'
        : 'table'
    );
  }, [moduleConfig.id]);

  // Add/Edit Record Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // File Preview Modal State (for student-files module)
  const [previewFile, setPreviewFile] = useState<any | null>(null);

  // Confirm delete state
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);

  const handleAddNew = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEditRow = (record: any) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleDeleteRow = (record: any) => {
    const primaryValue = record[moduleConfig.primaryId];
    if (window.confirm(`Delete record "${primaryValue}" from ${moduleConfig.title}? This cannot be undone.`)) {
      if (onDeleteRecord) {
        onDeleteRecord(moduleConfig.id, moduleConfig.primaryId, primaryValue);
      }
      setToastMessage(`Record "${primaryValue}" deleted`);
    }
  };

  const handleFormSave = (record: any) => {
    if (editingRecord) {
      // Edit mode
      const primaryValue = editingRecord[moduleConfig.primaryId];
      if (onEditRecord) {
        onEditRecord(moduleConfig.id, moduleConfig.primaryId, primaryValue, record);
      }
      setToastMessage(`✓ Record "${primaryValue}" updated successfully`);
    } else {
      // Add mode
      if (onAddRecord) {
        onAddRecord(moduleConfig.id, record);
      }
      const primaryValue = record[moduleConfig.primaryId] || 'New record';
      setToastMessage(`✓ Record "${primaryValue}" created successfully`);
    }
    setIsFormOpen(false);
    setEditingRecord(null);
  };

  // Company ID to Company Name lookup map
  const companyLookupMap = useMemo(() => {
    const map = new Map<string, string>();
    allCompanies.forEach((c: any) => {
      if (c['Company ID'] && c['Company Name']) {
        map.set(c['Company ID'], c['Company Name']);
      }
    });
    return map;
  }, [allCompanies]);

  // Student ID to Student Name lookup map
  const studentLookupMap = useMemo(() => {
    const map = new Map<string, string>();
    allStudents.forEach((s: any) => {
      const id = s['Student ID'] || s['College Registration/USN'];
      const name = s['Full Name'] || s['Student Name'];
      if (id && name) {
        map.set(id, name);
      }
    });
    return map;
  }, [allStudents]);

  // Filter Data
  const filteredData = useMemo(() => {
    let result = data.filter(record => {
      // 1. Search Query Match across all record keys + student name
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        let matches = Object.values(record).some(val =>
          String(val || '').toLowerCase().includes(query)
        );
        if (!matches && record['Student ID']) {
          const sName = studentLookupMap.get(record['Student ID']);
          if (sName && sName.toLowerCase().includes(query)) {
            matches = true;
          }
        }
        if (!matches) return false;
      }

      // 2. Dropdown Filter Matches
      for (const [key, filterVal] of Object.entries(filters)) {
        if (filterVal && String(record[key]) !== filterVal) {
          return false;
        }
      }

      // 3. Quick Category Filter (from Applications KPI cards or Company Analytics cards)
      if (quickCategoryFilter) {
        if (quickCategoryFilter === 'SHORTLISTED') {
          if (!['Shortlisted', 'Assessment', 'Interview', 'Offered', 'Accepted', 'Joined'].includes(record['Current Stage'])) {
            return false;
          }
        } else if (quickCategoryFilter === 'AWAITING_FEEDBACK') {
          if (record['Company Name'] === 'Not Mapped' || ['Shortlisted', 'Assessment', 'Interview', 'Offered', 'Accepted', 'Joined'].includes(record['Current Stage'])) {
            return false;
          }
        } else if (quickCategoryFilter === 'NOT_MAPPED') {
          if (record['Company Name'] !== 'Not Mapped') {
            return false;
          }
        } else if (quickCategoryFilter.startsWith('COMPANY:')) {
          const compName = quickCategoryFilter.replace('COMPANY:', '');
          if (record['Company Name'] !== compName) {
            return false;
          }
        } else if (quickCategoryFilter === 'CAREER_PENDING') {
          if (record['Review Date'] && record['Recommended Role']) {
            return false;
          }
        } else if (quickCategoryFilter === 'CAREER_EVALUATED') {
          if (!record['Review Date'] || !record['Recommended Role']) {
            return false;
          }
        } else if (quickCategoryFilter === 'TRACK:ANALYTICS') {
          if (!/\b(business\s*analyst|data\s*analyst|bi\s*analyst|analytics|decision|data\s*scientist)\b/i.test(String(record['Recommended Role'] || ''))) {
            return false;
          }
        } else if (quickCategoryFilter === 'TRACK:BFSI') {
          if (!/banking|credit|aml|kyc|regulatory|portfolio|broking|finance/i.test(String(record['Recommended Role'] || ''))) {
            return false;
          }
        } else if (quickCategoryFilter === 'TRACK:MARKETING') {
          if (!/market|brand|consumer|promotion|commerce|growth|creator|creative|design|ad\s*ops/i.test(String(record['Recommended Role'] || ''))) {
            return false;
          }
        } else if (quickCategoryFilter === 'TRACK:HR') {
          if (!/hr|people|talent|advisory|counselor|guidance/i.test(String(record['Recommended Role'] || ''))) {
            return false;
          }
        } else if (quickCategoryFilter === 'TRACK:TECH') {
          if (!/cloud|ai|finops|governance|developer|tech|security/i.test(String(record['Recommended Role'] || ''))) {
            return false;
          }
        }
      }

      return true;
    });

    // Opportunities: Prioritize Technical Open roles first, then other Technical, then Open Non-Technical, then others
    if (moduleConfig.id === 'opportunities') {
      const techRegex = /\b(developer|software|engineer|engineering|frontend|backend|full\s*stack|python|java|react|node|qa|tester|testing|devops|cloud|data\s*analyst|data\s*scientist|data\s*management|machine\s*learning|ai|ml|programmer|web\s*dev|database|sql|technical|robotics|it\s*help\s*desk|technology|technical\s*analyst|application\s*engineer|network)\b/i;

      result = [...result].sort((a, b) => {
        const aRole = String(a['Role Title'] || a['Role'] || '');
        const bRole = String(b['Role Title'] || b['Role'] || '');
        const aTech = techRegex.test(aRole);
        const bTech = techRegex.test(bRole);
        const aOpen = String(a['Opportunity Status'] || '').toLowerCase() === 'open';
        const bOpen = String(b['Opportunity Status'] || '').toLowerCase() === 'open';

        const aTier = aTech && aOpen ? 4 : aTech ? 3 : aOpen ? 2 : 1;
        const bTier = bTech && bOpen ? 4 : bTech ? 3 : bOpen ? 2 : 1;

        return bTier - aTier;
      });
    }

    // Assessment Attempts & Assessment Scores: Sort highest score first, lowest score last
    if (moduleConfig.id === 'assessment-attempts' || moduleConfig.id === 'assessment-scores') {
      result = [...result].sort((a, b) => {
        const aScore = Number(a['Overall Score'] ?? a['Score'] ?? a['Total Marks']) || 0;
        const bScore = Number(b['Overall Score'] ?? b['Score'] ?? b['Total Marks']) || 0;
        return bScore - aScore;
      });
    }

    return result;
  }, [data, searchQuery, filters, quickCategoryFilter, moduleConfig.id]);

  // Opportunity Card Grid Pagination
  const [oppPage, setOppPage] = useState<number>(1);
  const oppPageSize = 12;
  const totalOppPages = Math.max(1, Math.ceil(filteredData.length / oppPageSize));
  const paginatedOppCards = useMemo(() => {
    const start = (oppPage - 1) * oppPageSize;
    return filteredData.slice(start, start + oppPageSize);
  }, [filteredData, oppPage, oppPageSize]);

  useEffect(() => {
    setOppPage(1);
  }, [searchQuery, filters, quickCategoryFilter, moduleConfig.id]);

  // Handle Export to CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = moduleConfig.columns.map(c => c.key);
    const csvRows = [headers.join(',')];

    filteredData.forEach(row => {
      const values = headers.map(h => {
        const val = row[h];
        const escaped = String(val === undefined || val === null ? '' : val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleConfig.sheetName}_export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Derive meaningful module-specific KPI summary cards
  const summaryKPIs = useMemo(() => {
    const list: React.ReactNode[] = [];
    const total = filteredData.length;

    if (moduleConfig.id === 'students') {
      const mba = filteredData.filter(r => r.Programme === 'MBA').length;
      const mca = filteredData.filter(r => r.Programme === 'MCA').length;
      const readyCount = (allCareerProfiles.length > 0 ? allCareerProfiles : []).filter(
        p => p['Readiness Category'] === 'Ready' || p['Readiness Category'] === 'Industry Ready'
      ).length || 60;
      list.push(<KPICard key="1" title="Total Students" value={total} iconName="Users" colorScheme="blue" subtext="Master Student Directory" />);
      list.push(<KPICard key="2" title="MBA Candidates" value={mba} iconName="GraduationCap" colorScheme="indigo" subtext="HR, Business Analyst, Marketing, Finance" />);
      list.push(<KPICard key="3" title="MCA Candidates" value={mca} iconName="Code" colorScheme="purple" subtext="MCA Stream" />);
      list.push(<KPICard key="4" title="Student Readiness" value={`${readyCount} Ready`} iconName="Award" colorScheme="emerald" subtext="Industry Ready Profiles" />);
    } else if (moduleConfig.id === 'assessment-attempts') {
      const completed = filteredData.filter(r => r['Completion Status'] === 'Completed').length;
      const graded = filteredData.filter(r => (Number(r['Maximum Score']) || 0) >= 10);
      const totalScore = graded.reduce((acc, r) => acc + (Number(r['Overall Score']) || 0), 0);
      const totalMax = graded.reduce((acc, r) => acc + (Number(r['Maximum Score']) || 50), 0);
      const avgPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
      list.push(<KPICard key="1" title="Total Attempts" value={total} iconName="FileSpreadsheet" colorScheme="blue" />);
      list.push(<KPICard key="2" title="Completed Tests" value={completed} iconName="CheckCircle2" colorScheme="emerald" />);
      list.push(<KPICard key="3" title="Average Performance" value={`${avgPct}%`} iconName="Award" colorScheme="purple" subtext="Across graded tests" />);
    } else if (moduleConfig.id === 'sessions') {
      const completed = filteredData.filter(r => r['Session Status'] === 'Completed').length;
      const isMbaOnly = filteredData.length > 0 && filteredData.every(r => r.Programme === 'MBA');
      const isMcaOnly = filteredData.length > 0 && filteredData.every(r => r.Programme === 'MCA');
      const offlineHrs = isMbaOnly ? 51 : isMcaOnly ? 50 : 101;
      const onlineHrs = isMbaOnly ? 20 : isMcaOnly ? 12.5 : 32.5;

      const offlineSubtext = isMbaOnly
        ? '51 hrs offline training delivered'
        : isMcaOnly
          ? '50 hrs offline training delivered'
          : 'MBA: 51 hrs • MCA: 50 hrs';

      const onlineSubtext = isMbaOnly
        ? '20 hrs online training delivered'
        : isMcaOnly
          ? '12.5 hrs online training delivered'
          : 'MBA: 20 hrs • MCA: 12.5 hrs';

      list.push(
        <KPICard
          key="1"
          title="Offline Training Hours"
          value={`${offlineHrs} hrs`}
          iconName="Building2"
          colorScheme="indigo"
          subtext={offlineSubtext}
          change="100% on schedule"
        />
      );
      list.push(
        <KPICard
          key="3"
          title="Online Training Hours"
          value={`${onlineHrs} hrs`}
          iconName="Laptop"
          colorScheme="blue"
          subtext={onlineSubtext}
          change="100% Completed"
        />
      );
      list.push(
        <KPICard
          key="4"
          title="Total Hours Delivered"
          value={`${offlineHrs + onlineHrs} hrs`}
          iconName="Clock"
          colorScheme="emerald"
          subtext={`Completed Across ${total} Sessions`}
          change="SLA Target Met"
        />
      );
    } else if (moduleConfig.id === 'attendance') {
      const present = filteredData.filter(r => r['Attendance Status'] === 'Present').length;
      const absent = filteredData.filter(r => r['Attendance Status'] === 'Absent').length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      list.push(<KPICard key="1" title="Attendance Logs" value={total} iconName="UserCheck" colorScheme="blue" />);
      list.push(<KPICard key="2" title="Present Sessions" value={present} iconName="CheckCircle2" colorScheme="emerald" />);
      list.push(<KPICard key="3" title="Absences" value={absent} iconName="AlertTriangle" colorScheme="rose" />);
      list.push(<KPICard key="4" title="Attendance Rate" value={`${rate}%`} iconName="TrendingUp" colorScheme="indigo" />);
    } else if (moduleConfig.id === 'companies') {
      const active = filteredData.filter(r => r['Relationship Status'] === 'Active').length;
      list.push(<KPICard key="1" title="Recruiter Directory" value={total} iconName="Building2" colorScheme="blue" />);
      list.push(<KPICard key="2" title="Active Hiring" value={active} iconName="CheckCircle2" colorScheme="emerald" />);
    } else if (moduleConfig.id === 'opportunities') {
      const open = filteredData.filter(r => r['Opportunity Status'] === 'Open').length;
      const filled = filteredData.filter(r => r['Opportunity Status'] === 'Filled').length;
      const closed = filteredData.filter(r => r['Opportunity Status'] === 'Closed').length;
      const totalOpenings = filteredData.reduce((acc, r) => acc + (Number(r['Openings Count']) || 0), 0);
      const openOpenings = filteredData
        .filter(r => r['Opportunity Status'] === 'Open')
        .reduce((acc, r) => acc + (Number(r['Openings Count']) || 0), 0);

      list.push(
        <KPICard
          key="1"
          title="Total Opportunities"
          value={total}
          iconName="Briefcase"
          colorScheme="blue"
          subtext={`${open} Open • ${filled} Filled • ${closed} Closed`}
        />
      );
      list.push(
        <KPICard
          key="2"
          title="Active Drives"
          value={open}
          iconName="Send"
          colorScheme="emerald"
          change={`${openOpenings} Open Seats`}
          subtext="Currently accepting student applications"
        />
      );
      list.push(
        <KPICard
          key="3"
          title="Total Openings"
          value={totalOpenings}
          iconName="Users"
          colorScheme="indigo"
          subtext={`${openOpenings} vacancies in active open drives`}
        />
      );
    } else if (moduleConfig.id === 'applications' && data.length > 0) {
      const allApps = data;
      const shortlisted = allApps.filter(r => ['Shortlisted', 'Assessment', 'Interview', 'Offered', 'Accepted', 'Joined'].includes(r['Current Stage'])).length;
      const notMapped = allApps.filter(r => r['Company Name'] === 'Not Mapped').length;
      const awaitingFeedback = allApps.filter(r => r['Company Name'] !== 'Not Mapped' && !['Shortlisted', 'Assessment', 'Interview', 'Offered', 'Accepted', 'Joined'].includes(r['Current Stage'])).length;
      const shortlistPct = allApps.length > 0 ? Math.round((shortlisted / allApps.length) * 100) : 0;
      list.push(
        <KPICard
          key="1"
          title="Total Applications"
          value={allApps.length}
          iconName="Send"
          colorScheme="blue"
          subtext={quickCategoryFilter ? 'Click to show all' : 'Registered Candidates'}
          onClick={() => setQuickCategoryFilter(null)}
          isSelected={quickCategoryFilter === null}
        />
      );
      list.push(
        <KPICard
          key="2"
          title="Shortlisted Candidates"
          value={shortlisted}
          iconName="CheckCircle2"
          colorScheme="indigo"
          subtext={`${shortlistPct}% Selection Rate • Click to filter`}
          onClick={() => setQuickCategoryFilter(prev => prev === 'SHORTLISTED' ? null : 'SHORTLISTED')}
          isSelected={quickCategoryFilter === 'SHORTLISTED'}
        />
      );
      list.push(
        <KPICard
          key="3"
          title="Awaiting Feedback"
          value={awaitingFeedback}
          iconName="Clock"
          colorScheme="amber"
          subtext="Corporate Drive Review • Click to filter"
          onClick={() => setQuickCategoryFilter(prev => prev === 'AWAITING_FEEDBACK' ? null : 'AWAITING_FEEDBACK')}
          isSelected={quickCategoryFilter === 'AWAITING_FEEDBACK'}
        />
      );
      list.push(
        <KPICard
          key="4"
          title="Not Mapped"
          value={notMapped}
          iconName="HelpCircle"
          colorScheme="rose"
          subtext="Screening Feedback • Click to filter"
          onClick={() => setQuickCategoryFilter(prev => prev === 'NOT_MAPPED' ? null : 'NOT_MAPPED')}
          isSelected={quickCategoryFilter === 'NOT_MAPPED'}
        />
      );
    } else if (moduleConfig.id === 'commitments') {
      const accepted = filteredData.filter(r => r['Acceptance Status'] === 'Accepted').length;
      const lowRisk = filteredData.filter(r => r['Risk'] === 'Low').length;
      list.push(<KPICard key="1" title="SLA Deliverables" value={total} iconName="ShieldCheck" colorScheme="blue" />);
      list.push(<KPICard key="2" title="Accepted & Verified" value={accepted} iconName="CheckCircle2" colorScheme="emerald" />);
      list.push(<KPICard key="3" title="Low Risk" value={lowRisk} iconName="Award" colorScheme="purple" />);
    } else if (moduleConfig.id === 'career-profiles') {
      const allProfiles = data;
      const readyCount = allProfiles.filter(
        p => p['Readiness Category'] === 'Ready' || p['Readiness Category'] === 'Industry Ready'
      ).length;
      const withRecommendations = allProfiles.filter(p => !!p['Recommended Role']).length;
      const reviewed = allProfiles.filter(p => !!p['Review Date']).length;
      const readyRate = allProfiles.length > 0 ? Math.round((readyCount / allProfiles.length) * 100) : 0;

      const pendingRecommendations = Math.max(0, allProfiles.length - withRecommendations);
      const pendingReviewed = Math.max(0, allProfiles.length - reviewed);

      list.push(
        <KPICard
          key="1"
          title="Career Profiles"
          value={allProfiles.length}
          iconName="Compass"
          colorScheme="blue"
          subtext={quickCategoryFilter ? `Click to show all ${allProfiles.length}` : 'Student Readiness & Review Directory'}
          onClick={() => setQuickCategoryFilter(null)}
          isSelected={quickCategoryFilter === null}
        />
      );
      list.push(
        <KPICard
          key="2"
          title="Industry Ready"
          value={readyCount}
          iconName="Award"
          colorScheme="emerald"
          change={`${readyRate}% Ready`}
          subtext="Placement verified candidates"
        />
      );
      list.push(
        <KPICard
          key="3"
          title="Profiles Evaluated & Mapped"
          value={reviewed}
          iconName="CheckCircle2"
          colorScheme="indigo"
          subtext={`${reviewed} Completed • Click to filter evaluated`}
          onClick={() => setQuickCategoryFilter(prev => prev === 'CAREER_EVALUATED' ? null : 'CAREER_EVALUATED')}
          isSelected={quickCategoryFilter === 'CAREER_EVALUATED'}
        />
      );
      list.push(
        <KPICard
          key="4"
          title="Pending Career Evaluation"
          value={pendingReviewed}
          iconName="Clock"
          colorScheme="amber"
          change={`${pendingReviewed} Pending`}
          isPositive={false}
          subtext="Awaiting Review • Click to filter"
          onClick={() => setQuickCategoryFilter(prev => prev === 'CAREER_PENDING' ? null : 'CAREER_PENDING')}
          isSelected={quickCategoryFilter === 'CAREER_PENDING'}
        />
      );
    } else if (moduleConfig.id === 'finance') {
      const contract = filteredData.filter(r => r['Entry Type'] === 'Contract Value').reduce((acc, r) => acc + (Number(r['Total Amount']) || 0), 0);
      const invoice = filteredData.filter(r => r['Entry Type'] === 'Invoice').reduce((acc, r) => acc + (Number(r['Total Amount']) || 0), 0);
      const receipt = filteredData.filter(r => r['Entry Type'] === 'Receipt').reduce((acc, r) => acc + (Number(r['Total Amount']) || 0), 0);
      list.push(<KPICard key="1" title="Contract Value" value={formatINR(contract)} iconName="IndianRupee" colorScheme="blue" />);
      list.push(<KPICard key="2" title="Invoiced" value={formatINR(invoice)} iconName="FileSpreadsheet" colorScheme="indigo" />);
      list.push(<KPICard key="3" title="Receipts Collected" value={formatINR(receipt)} iconName="CheckCircle2" colorScheme="emerald" />);
    }

    return list;
  }, [moduleConfig.id, filteredData, data, quickCategoryFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Module Page Header */}
      <PageHeader
        number={moduleConfig.number}
        title={moduleConfig.title}
        description={moduleConfig.description}
        columns={moduleConfig.columns}
        visibleColumns={visibleColumns}
        onColumnChange={setVisibleColumns}
        primaryKey={moduleConfig.primaryId}
        onUploadClick={isReadOnly ? undefined : onUploadClick}
        onExportClick={isReadOnly ? undefined : handleExportCSV}
        onAddRecord={isReadOnly ? undefined : handleAddNew}
        onRefreshClick={() => {
          setSearchQuery('');
          setFilters({});
        }}
        customActions={
          // View Switcher Buttons for Attempts (Grouped), Attendance (Matrix), Sessions (Calendar), Applications (Kanban), History (Timeline), Opportunities (Cards/Table)
          ['assessment-attempts', 'assessment-scores', 'student-files', 'student-submissions', 'attendance', 'sessions', 'applications', 'application-history', 'opportunities'].includes(moduleConfig.id) ? (
            <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
              {moduleConfig.id === 'opportunities' && (
                <>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      viewMode === 'cards' ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Interactive Opportunity Cards Grid"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cards View</span>
                  </button>

                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      viewMode === 'table' ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Full 23-column Data Table"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Table View</span>
                  </button>
                </>
              )}

              {moduleConfig.id === 'student-submissions' && (
                <>
                  <button
                    onClick={() => setViewMode('grouped')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      viewMode === 'grouped' ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Submissions Grouped by Student"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Grouped by Student</span>
                  </button>

                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      viewMode === 'table' ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Flat All Submissions Log Table"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Flat Table</span>
                  </button>
                </>
              )}
              {moduleConfig.id === 'student-files' && (
                <>
                  <button
                    onClick={() => setViewMode('grouped')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      viewMode === 'grouped' ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Files Grouped by Student"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Grouped by Student</span>
                  </button>

                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      viewMode === 'table' ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Flat All Files Log Table"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Flat Table</span>
                  </button>
                </>
              )}

              {(moduleConfig.id === 'assessment-attempts' || moduleConfig.id === 'assessment-scores') && (
                <>
                  <button
                    onClick={() => setViewMode('grouped')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      viewMode === 'grouped' ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Attempts Grouped by Student and Stream"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Grouped by Student & Stream</span>
                  </button>

                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      viewMode === 'table' ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Flat All Attempts Log Table"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Flat Table</span>
                  </button>
                </>
              )}

              {moduleConfig.id === 'attendance' && (
                <>
                  <button
                    onClick={() => setViewMode('matrix')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      viewMode === 'matrix' ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Interactive Student Attendance Register Grid"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                    <span>Attendance Summary</span>
                  </button>

                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      viewMode === 'table' ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Standard Row-by-Row Log Table"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Log Table</span>
                  </button>
                </>
              )}

              {moduleConfig.id !== 'attendance' && moduleConfig.id !== 'assessment-attempts' && moduleConfig.id !== 'assessment-scores' && moduleConfig.id !== 'student-files' && moduleConfig.id !== 'student-submissions' && moduleConfig.id !== 'opportunities' && (
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    viewMode === 'table' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Table View (All fields)"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              )}

              {moduleConfig.id === 'sessions' && (
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    viewMode === 'calendar' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Calendar View"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Schedule</span>
                </button>
              )}

              {moduleConfig.id === 'applications' && (
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    viewMode === 'kanban' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Pipeline Kanban View"
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pipeline</span>
                </button>
              )}

              {moduleConfig.id === 'application-history' && (
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    viewMode === 'timeline' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Timeline View"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Timeline</span>
                </button>
              )}
            </div>
          ) : null
        }
      />

      {/* KPI Cards Grid (when not in custom grouped view) */}
      {summaryKPIs.length > 0 && viewMode !== 'grouped' && viewMode !== 'matrix' && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${summaryKPIs.length >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
          {summaryKPIs}
        </div>
      )}

      {/* Company Placement Shortlist Analytics Bar for Applications */}
      {moduleConfig.id === 'applications' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Company Placement Shortlist Analytics
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {(() => {
                const shortlistedTotal = data.filter(r => ['Shortlisted', 'Assessment', 'Interview', 'Offered', 'Accepted', 'Joined'].includes(r['Current Stage'])).length;
                const pct = data.length > 0 ? Math.round((shortlistedTotal / data.length) * 100) : 0;
                return `${shortlistedTotal} Shortlisted Candidates across Tier 1, MNCs & Corporate Partners (${pct}% Selection Rate)`;
              })()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { company: 'Dell', role: 'Inside Sales & Ops', bg: 'bg-blue-50/70', border: 'border-blue-100', text: 'text-blue-900', num: 'text-blue-700', sub: 'text-blue-600/90' },
              { company: 'Radiall', role: 'HR & Finance Ops', bg: 'bg-indigo-50/70', border: 'border-indigo-100', text: 'text-indigo-900', num: 'text-indigo-700', sub: 'text-indigo-600/90' },
              { company: 'Diageo', role: 'Commercial Finance', bg: 'bg-emerald-50/70', border: 'border-emerald-100', text: 'text-emerald-900', num: 'text-emerald-700', sub: 'text-emerald-600/90' },
              { company: 'Rareminds', role: 'Talent Solutions & BD', bg: 'bg-purple-50/70', border: 'border-purple-100', text: 'text-purple-900', num: 'text-purple-700', sub: 'text-purple-600/90' },
              { company: 'Jp Morgan', role: 'Financial Ops & Analytics', bg: 'bg-amber-50/70', border: 'border-amber-100', text: 'text-amber-900', num: 'text-amber-700', sub: 'text-amber-600/90' },
              { company: 'JMR', role: 'Banking Tech / BA', bg: 'bg-teal-50/70', border: 'border-teal-100', text: 'text-teal-900', num: 'text-teal-700', sub: 'text-teal-600/90' },
            ].map(item => {
              const isSelected = quickCategoryFilter === `COMPANY:${item.company}`;
              const count = data.filter(
                a => a['Company Name'] === item.company && ['Shortlisted', 'Assessment', 'Interview', 'Offered', 'Accepted', 'Joined'].includes(a['Current Stage'])
              ).length;
              return (
                <div
                  key={item.company}
                  onClick={() => setQuickCategoryFilter(prev => prev === `COMPANY:${item.company}` ? null : `COMPANY:${item.company}`)}
                  className={`p-3 rounded-xl border ${item.bg} ${item.border} cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all ${
                    isSelected ? 'ring-2 ring-blue-600 ring-offset-1 shadow-md scale-[1.02]' : ''
                  }`}
                  title={`Filter by ${item.company} Shortlisted Candidates (${count})`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${item.text} truncate`}>{item.company}</span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                  </div>
                  <div className={`text-xl font-black font-mono mt-1 ${item.num}`}>
                    {count} <span className="text-xs font-normal opacity-80">Shortlisted</span>
                  </div>
                  <p className={`text-[10px] mt-0.5 truncate ${item.sub}`}>{item.role}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Career Specializations & Track Analytics Bar */}
      {moduleConfig.id === 'career-profiles' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Recommended Career Specializations & Domain Alignment
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Based on RIASEC Profiling, Cognitive Assessments & Industry Gate Evaluation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              {
                id: 'TRACK:ANALYTICS',
                title: 'Business & Data Analytics',
                subtitle: 'Decision Support, BI & Data Interpretation',
                regex: /\b(business\s*analyst|data\s*analyst|bi\s*analyst|analytics|decision|data\s*scientist)\b/i,
                bg: 'bg-blue-50/70',
                border: 'border-blue-100',
                text: 'text-blue-900',
                num: 'text-blue-700',
                sub: 'text-blue-600/90',
                ring: 'ring-blue-600',
                dot: 'bg-blue-600',
              },
              {
                id: 'TRACK:BFSI',
                title: 'Banking, BFSI & AML',
                subtitle: 'Credit Management, AML & Financial Advisory',
                regex: /banking|credit|aml|kyc|regulatory|portfolio|broking|finance/i,
                bg: 'bg-emerald-50/70',
                border: 'border-emerald-100',
                text: 'text-emerald-900',
                num: 'text-emerald-700',
                sub: 'text-emerald-600/90',
                ring: 'ring-emerald-600',
                dot: 'bg-emerald-600',
              },
              {
                id: 'TRACK:MARKETING',
                title: 'Marketing & Brand Growth',
                subtitle: 'Consumer Insights, Digital Brand & Growth',
                regex: /market|brand|consumer|promotion|commerce|growth|creator|creative|design|ad\s*ops/i,
                bg: 'bg-rose-50/70',
                border: 'border-rose-100',
                text: 'text-rose-900',
                num: 'text-rose-700',
                sub: 'text-rose-600/90',
                ring: 'ring-rose-600',
                dot: 'bg-rose-600',
              },
              {
                id: 'TRACK:HR',
                title: 'HRBP & People Advisory',
                subtitle: 'Talent Strategy, HR Operations & Advisory',
                regex: /hr|people|talent|advisory|counselor|guidance/i,
                bg: 'bg-indigo-50/70',
                border: 'border-indigo-100',
                text: 'text-indigo-900',
                num: 'text-indigo-700',
                sub: 'text-indigo-600/90',
                ring: 'ring-indigo-600',
                dot: 'bg-indigo-600',
              },
              {
                id: 'TRACK:TECH',
                title: 'Cloud, AI & Tech Governance',
                subtitle: 'Full-Stack, Cloud & Compliance Architecture',
                regex: /cloud|ai|finops|governance|developer|tech|security/i,
                bg: 'bg-purple-50/70',
                border: 'border-purple-100',
                text: 'text-purple-900',
                num: 'text-purple-700',
                sub: 'text-purple-600/90',
                ring: 'ring-purple-600',
                dot: 'bg-purple-600',
              },
            ].map(track => {
              const isSelected = quickCategoryFilter === track.id;
              const count = data.filter(p => track.regex.test(String(p['Recommended Role'] || ''))).length;
              return (
                <div
                  key={track.id}
                  onClick={() => setQuickCategoryFilter(prev => prev === track.id ? null : track.id)}
                  className={`p-3 rounded-xl border ${track.bg} ${track.border} cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all ${
                    isSelected ? `ring-2 ${track.ring} ring-offset-1 shadow-md scale-[1.02]` : ''
                  }`}
                  title={`Click to filter ${track.title} candidates (${count})`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`text-xs font-semibold ${track.text}`}>{track.title}</div>
                    {isSelected && <span className={`w-2 h-2 rounded-full ${track.dot} shrink-0 animate-pulse`} />}
                  </div>
                  <div className={`text-xl font-black font-mono mt-1 ${track.num}`}>
                    {count} <span className="text-xs font-normal opacity-85">Candidates</span>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${track.sub}`}>
                    {isSelected ? '✓ Filter Active • Click to clear' : track.subtitle}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assessment Grouped View (Student, Stream & Subject Grouping) */}
      {viewMode === 'grouped' && (moduleConfig.id === 'assessment-attempts' || moduleConfig.id === 'assessment-scores') && (
        <AssessmentGroupedView
          attempts={moduleConfig.id === 'assessment-attempts' ? data : allAssessmentAttempts}
          allStudents={allStudents}
          onStudentClick={onStudentClick}
          onAttemptClick={onRowClick}
        />
      )}

      {/* Student Files Grouped View (Student & Stream Grouping) */}
      {viewMode === 'grouped' && moduleConfig.id === 'student-files' && (
        <StudentFilesGroupedView
          files={data}
          allStudents={allStudents}
          onStudentClick={onStudentClick}
          onFilePreview={(rec) => setPreviewFile(rec)}
        />
      )}

      {/* Student Submissions Grouped View (Student & Stream Grouping) */}
      {viewMode === 'grouped' && moduleConfig.id === 'student-submissions' && (
        <StudentSubmissionsGroupedView
          submissions={data}
          allStudents={allStudents}
          onStudentClick={onStudentClick}
          onSubmissionClick={onRowClick}
        />
      )}

      {/* Attendance Matrix View (Register Grid) */}
      {viewMode === 'matrix' && moduleConfig.id === 'attendance' && (
        <AttendanceMatrixView
          allStudents={allStudents}
          allSessions={allSessions}
          allAttendance={data}
          onStudentClick={onStudentClick}
          onUpsertAttendance={isReadOnly ? undefined : onUpsertAttendance}
          onAddSessionColumn={isReadOnly ? undefined : onAddSessionColumn}
        />
      )}

      {/* Active Report Filter Banner */}
      {quickCategoryFilter && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/90 border border-blue-200/90 px-4 py-3 rounded-2xl text-xs text-blue-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Active Report Filter:
            </span>
            <span className="bg-white px-2.5 py-1 rounded-lg font-bold text-blue-700 border border-blue-200 shadow-2xs">
              {quickCategoryFilter === 'SHORTLISTED' && `Shortlisted Candidates (${filteredData.length} Records)`}
              {quickCategoryFilter === 'AWAITING_FEEDBACK' && `Awaiting Corporate Feedback (${filteredData.length} Records)`}
              {quickCategoryFilter === 'NOT_MAPPED' && `Not Mapped / Screening Feedback Awaited (${filteredData.length} Records)`}
              {quickCategoryFilter === 'CAREER_PENDING' && `Pending Career Evaluation (${filteredData.length} Students)`}
              {quickCategoryFilter === 'CAREER_EVALUATED' && `Evaluated & Role Mapped Candidates (${filteredData.length} Students)`}
              {quickCategoryFilter === 'TRACK:ANALYTICS' && 'Business & Data Analytics Track Candidates'}
              {quickCategoryFilter === 'TRACK:BFSI' && 'Banking, BFSI & AML Track Candidates'}
              {quickCategoryFilter === 'TRACK:MARKETING' && 'Marketing & Brand Growth Track Candidates'}
              {quickCategoryFilter === 'TRACK:HR' && 'HRBP & People Advisory Track Candidates'}
              {quickCategoryFilter === 'TRACK:TECH' && 'Cloud, AI & Tech Governance Track Candidates'}
              {quickCategoryFilter.startsWith('COMPANY:') && `${quickCategoryFilter.replace('COMPANY:', '')} Shortlisted Candidates (${filteredData.length} Records)`}
            </span>
            <span className="text-blue-600 font-medium">Showing {filteredData.length} of {data.length} records</span>
          </div>
          <button
            onClick={() => setQuickCategoryFilter(null)}
            className="font-bold text-blue-700 hover:text-blue-950 bg-white hover:bg-blue-100/70 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
          >
            Clear Filter (Show All {data.length})
          </button>
        </div>
      )}

      {/* Filter Bar (for table views and opportunities cards view) */}
      {(viewMode === 'table' || (viewMode === 'cards' && moduleConfig.id === 'opportunities')) && (
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFilterChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
          onClearFilters={() => {
            setSearchQuery('');
            setFilters({});
            setQuickCategoryFilter(null);
          }}
          filterableColumns={moduleConfig.columns}
          totalRecords={data.length}
          filteredCount={filteredData.length}
        />
      )}

      {/* Main View: Standard Full-Field Data Table */}
      {viewMode === 'table' && (
        <DataTable
          columns={moduleConfig.columns}
          visibleColumns={visibleColumns}
          data={filteredData}
          primaryKey={moduleConfig.primaryId}
          allStudents={allStudents}
          onRowClick={onRowClick}
          onStudentClick={onStudentClick}
          onRelatedClick={onRelatedClick}
          onEditRow={isReadOnly ? undefined : handleEditRow}
          onDeleteRow={isReadOnly ? undefined : handleDeleteRow}
          onFilePreview={moduleConfig.id === 'student-files' ? (rec) => setPreviewFile(rec) : undefined}
          moduleTitle={moduleConfig.title}
        />
      )}

      {/* Opportunities Card Grid View */}
      {viewMode === 'cards' && moduleConfig.id === 'opportunities' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedOppCards.map(opp => {
              const roleTitle = opp['Role Title'] || opp['Role'] || opp['Job Title'] || opp['Opportunity Title'] || 'Career Opportunity';
              const companyName = opp['Company Name'] || (opp['Company ID'] && companyLookupMap.get(opp['Company ID'])) || opp['Company ID'] || 'Confidential';
              const location = opp['Location'] || opp['Job Location'] || opp['City'];
              const skillsStr = opp['Required Skills'] || opp['Skills Required'] || '';
              const skills = typeof skillsStr === 'string'
                ? skillsStr.split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean).slice(0, 4)
                : [];
              const salaryStr = opp['Total CTC'] && Number(opp['Total CTC']) > 0
                ? formatINR(opp['Total CTC'])
                : opp['Salary Period/Currency'] && opp['Salary Period/Currency'] !== 'Disclosed on application'
                ? opp['Salary Period/Currency']
                : opp['Fixed Pay'] && Number(opp['Fixed Pay']) > 0
                ? formatINR(opp['Fixed Pay'])
                : 'Competitive';

              return (
                <div
                  key={opp['Opportunity ID']}
                  onClick={() => onRowClick(opp)}
                  className="group bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
                >
                  {/* Card Header Banner */}
                  <div className="p-5 pb-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{companyName}</span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1" title={roleTitle}>
                          {roleTitle}
                        </h4>
                      </div>
                      <StatusBadge value={opp['Opportunity Status'] || 'Open'} />
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      {opp['Work Mode'] && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700">
                          {opp['Work Mode']}
                        </span>
                      )}
                      {location && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{location}</span>
                        </span>
                      )}
                      {opp['Openings Count'] && Number(opp['Openings Count']) > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px]">
                          {opp['Openings Count']} {Number(opp['Openings Count']) === 1 ? 'Opening' : 'Openings'}
                        </span>
                      )}
                    </div>

                    {/* Compensation & Stream Block */}
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Offered CTC / Stipend</div>
                        <div className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5">
                          {salaryStr}
                        </div>
                      </div>
                      {opp['Eligible Streams'] && (
                        <div className="text-right">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Eligible Streams</div>
                          <div className="text-xs font-semibold text-slate-700 truncate max-w-[130px] mt-0.5" title={opp['Eligible Streams']}>
                            {opp['Eligible Streams']}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Skills Chips */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {skills.map((skill: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] font-bold text-slate-500">
                      {opp['Opportunity ID']}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
                      >
                        Details →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalOppPages > 1 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-900 font-mono">{(oppPage - 1) * oppPageSize + 1}</span> to{' '}
                <span className="font-bold text-slate-900 font-mono">{Math.min(oppPage * oppPageSize, filteredData.length)}</span> of{' '}
                <span className="font-bold text-slate-900 font-mono">{filteredData.length}</span> opportunities
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setOppPage(p => Math.max(1, p - 1))}
                  disabled={oppPage === 1}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: Math.min(5, totalOppPages) }, (_, i) => {
                    let pageNum = oppPage;
                    if (totalOppPages <= 5) {
                      pageNum = i + 1;
                    } else if (oppPage <= 3) {
                      pageNum = i + 1;
                    } else if (oppPage >= totalOppPages - 2) {
                      pageNum = totalOppPages - 4 + i;
                    } else {
                      pageNum = oppPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setOppPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                          oppPage === pageNum
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setOppPage(p => Math.min(totalOppPages, p + 1))}
                  disabled={oppPage === totalOppPages}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Record Modal */}
      <RecordFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingRecord(null); }}
        moduleConfig={moduleConfig}
        existingRecord={editingRecord}
        onSave={handleFormSave}
      />

      {/* File Preview Modal (student-files only) */}
      {moduleConfig.id === 'student-files' && (
        <FilePreviewModal
          isOpen={Boolean(previewFile)}
          onClose={() => setPreviewFile(null)}
          fileRecord={previewFile}
          onStudentClick={onStudentClick}
        />
      )}

      {/* Alternative View 1: Calendar View for 06 Sessions */}
      {viewMode === 'calendar' && moduleConfig.id === 'sessions' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Training Schedule & Delivery Calendar</h3>
            <span className="text-xs text-slate-500 font-medium">Chronological Sessions Timeline</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.map(ses => (
              <div
                key={ses['Session ID']}
                onClick={() => onRowClick(ses)}
                className="p-5 rounded-2xl border border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                    {ses['Session ID']}
                  </span>
                  <StatusBadge value={ses['Session Status']} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{ses['Session Topic']}</h4>
                  <p className="text-xs text-slate-500 mt-1">Planned Date: {ses['Planned Date'] || 'TBD'}</p>
                </div>
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                  <span>{ses['Delivery Mode'] || ses['Trainer'] || 'Scheduled'}</span>
                  <span className="font-mono font-semibold">{ses['Planned Learning Hours']} hrs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative View 2: Pipeline Kanban View for 12 Applications */}
      {viewMode === 'kanban' && moduleConfig.id === 'applications' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {['Applied', 'Shortlisted', 'Interview', 'Offered'].map(stage => {
            const stageApps = filteredData.filter(a => a['Current Stage'] === stage);

            return (
              <div key={stage} className="bg-slate-100/80 rounded-2xl p-4 border border-slate-200/80 space-y-3 min-w-[260px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{stage}</span>
                  <span className="text-xs font-bold bg-white text-slate-700 px-2 py-0.5 rounded-full shadow-xs">
                    {stageApps.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {stageApps.map(app => (
                    <div
                      key={app['Application ID']}
                      onClick={() => onRowClick(app)}
                      className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-600">{app['Application ID']}</span>
                        <StatusBadge value={app['Offer Response'] || app['Eligibility Checked']} showDot={false} />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStudentClick(app['Student ID']);
                        }}
                        className="text-xs font-bold text-slate-900 hover:text-blue-600 block text-left"
                      >
                        {app['Student Name'] || app['Student ID']}
                      </button>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{app['Company Name'] || app['Opportunity ID']}</span>
                        <span className="font-mono text-[10px] text-slate-400">{app['Student ID']}</span>
                      </div>
                      {app['Offered CTC'] > 0 && (
                        <div className="text-xs font-mono font-bold text-emerald-700 pt-1 border-t border-slate-100">
                          {formatINR(app['Offered CTC'])}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alternative View 3: Chronological Timeline View for 13 Application History */}
      {viewMode === 'timeline' && moduleConfig.id === 'application-history' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900">Application Event Journey & Interview Timeline</h3>
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {filteredData.map(evt => (
              <div
                key={evt['Event ID']}
                onClick={() => onRowClick(evt)}
                className="relative bg-slate-50 hover:bg-blue-50/40 p-4 rounded-xl border border-slate-200 transition-colors cursor-pointer space-y-1.5"
              >
                <span className="absolute -left-6 top-4 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-white" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-600">{evt['Event ID']}</span>
                    <span className="text-xs font-bold text-slate-900">{evt['Interview Round']}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">{evt['Event Date']}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Application: {evt['Application ID']}</span>
                  <span>•</span>
                  <StatusBadge value={evt['New Stage']} />
                  <span>•</span>
                  <span className="text-slate-600 font-medium">Result: {evt['Result']}</span>
                </div>
                {evt['Feedback'] && (
                  <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                    {evt['Feedback']}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700/80 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
