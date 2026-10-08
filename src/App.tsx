import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { Student360Page } from '@/pages/Student360Page';
import { GenericModulePage } from '@/pages/GenericModulePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LoginPage } from '@/pages/LoginPage';
import { AccessDeniedPage } from '@/pages/AccessDeniedPage';
import { DatabaseState, initialDatabase, MODULE_DATA_KEY_MAP } from '@/data/mockData';
import { MODULES_CONFIG, ModuleConfig } from '@/config/modulesConfig';
import {
  loadDatabase, saveDatabase, resetDatabase,
  createRecord, updateRecord, deleteRecord, bulkImport,
  upsertAttendanceMatrixRecord, createAttendanceSessionColumn,
} from '@/services/dataService';
import { getAuthSession, setAuthSession, logout as authLogout, AuthSession } from '@/services/authService';
import { syncAllFromGoogleSheets } from '@/services/googleSheetsService';

// ─── URL Hash Utilities ──────────────────────────────────────────────────────

function getInitialRoute(isAuthenticated: boolean): string {
  try {
    const hash = window.location.hash.replace('#', '').split('?')[0];
    if (!isAuthenticated) return 'login';
    if (
      !hash ||
      hash === 'login' ||
      hash === 'start-here' ||
      hash === 'commitments' ||
      hash === 'finance' ||
      hash === 'assessment-scores' ||
      hash === 'session-tasks' ||
      hash === 'application-history'
    ) return 'dashboard';
    return hash;
  } catch {
    return isAuthenticated ? 'dashboard' : 'login';
  }
}

function getHashParam(param: string): string | null {
  try {
    const parts = window.location.hash.split('?');
    if (parts.length < 2) return null;
    const searchParams = new URLSearchParams(parts[1]);
    return searchParams.get(param);
  } catch {
    return null;
  }
}

function setHash(route: string, params?: Record<string, string>) {
  try {
    let hash = '#' + route;
    if (params && Object.keys(params).length > 0) {
      const sp = new URLSearchParams(params);
      hash += '?' + sp.toString();
    }
    window.history.pushState(null, '', hash);
  } catch {
    // Ignore
  }
}

// ─── App Component ───────────────────────────────────────────────────────────

export const App: React.FC = () => {
  // ── Authentication Session State ───────────────────────────────────────────
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());

  // ── Database State: load from localStorage on mount ──────────────────────
  const [db, setDb] = useState<DatabaseState>(() => loadDatabase());
  const [currentRoute, setCurrentRoute] = useState<string>(() => getInitialRoute(!!session));
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    () => getHashParam('student') || db.students?.[0]?.['Student ID'] || 'P03KU24M015038'
  );

  // Sync hash if session is missing
  useEffect(() => {
    if (!session) {
      if (window.location.hash !== '#login') {
        window.location.hash = '#login';
      }
      setCurrentRoute('login');
    }
  }, [session]);

  // Auto-verify and purge any legacy dummy or stale data on startup
  useEffect(() => {
    const firstId = db.students?.[0]?.['Student ID'] || '';
    const testFile = db.studentFiles?.find((f: any) => f['File ID'] === 'FILE-0288');
    if (
      firstId.startsWith('SOU-') ||
      firstId.startsWith('SIMS_') ||
      (db.students?.length !== initialDatabase.students.length) ||
      (db.attendance?.length < 900) ||
      (db.studentFiles?.length < 354) ||
      (db.assessmentAttempts?.length < 500) ||
      (db.sessions?.find((s: any) => s['Session ID'] === 'SES-MBA-016')?.['Actual Learning Hours'] !== 3) ||
      (testFile && testFile['File Name'] === 'Submission 1') ||
      (db.opportunities?.length < 10) ||
      (db.companies?.length < 10) ||
      (!db.companies?.[0]?.['Company ID'] || !db.companies?.[0]?.['Company Name']) ||
      (!db.sessions?.[0]?.['Actual Learning Hours']) ||
      (db.students?.some((s: any) => s['Student ID'] === 'Po4ku24m015060')) ||
      (db.companies?.some((c: any) => c['Website'])) ||
      (db.applications?.some((a: any) => a['Company Name'] === 'Radall' || a['Opportunity ID'] === 'EXP-MBA-RADALL')) ||
      (db.students?.some((s: any) => s['Student ID'] === 'P03KU24M015012' || s['Student ID'] === 'P03KU24M015063'))
    ) {
      setDb(resetDatabase());
    }
  }, []);

  // ── Automatic Two-Way Synchronization with Google Sheets ────────────────────
  useEffect(() => {
    let isCancelled = false;

    const pullLatest = async () => {
      try {
        const res = await syncAllFromGoogleSheets();
        if (!isCancelled && res.success && res.updatedDb) {
          setDb(res.updatedDb);
        }
      } catch {
        // silent background sync
      }
    };

    // 1. Initial pull on startup
    pullLatest();

    // 2. Auto-sync whenever user returns to dashboard tab
    const handleFocus = () => {
      pullLatest();
    };
    window.addEventListener('focus', handleFocus);

    // 3. Background periodic sync every 30 seconds
    const interval = setInterval(pullLatest, 30000);

    return () => {
      isCancelled = true;
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  // Record Drawer State
  const [activeDrawerRecord, setActiveDrawerRecord] = useState<any | null>(null);
  const [activeDrawerModule, setActiveDrawerModule] = useState<ModuleConfig | null>(null);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [uploadDefaultModule, setUploadDefaultModule] = useState<string>('students');

  // ── Persist DB to localStorage whenever it changes ─────────────────────────
  useEffect(() => {
    saveDatabase(db);
  }, [db]);

  // ── URL Hash Routing: sync route → hash ──────────────────────────────────
  const navigate = useCallback((route: string, params?: Record<string, string>) => {
    setCurrentRoute(route);
    setHash(route, params);
    // Reset the drawer when navigating
    setActiveDrawerRecord(null);
    setActiveDrawerModule(null);
  }, []);

  // ── URL Hash Routing: sync hash → route (browser back/forward) ────────────
  useEffect(() => {
    const handlePopState = () => {
      const activeSession = getAuthSession();
      if (!activeSession) {
        setSession(null);
        setCurrentRoute('login');
        window.location.hash = '#login';
        return;
      }

      let route = window.location.hash.replace('#', '').split('?')[0] || 'dashboard';
      if (
        !route ||
        route === 'login' ||
        route === 'start-here' ||
        route === 'commitments' ||
        route === 'finance' ||
        route === 'assessment-scores' ||
        route === 'session-tasks' ||
        route === 'application-history'
      ) {
        route = 'dashboard';
        window.location.hash = '#dashboard';
      }
      const studentParam = getHashParam('student');
      setCurrentRoute(route);
      if (route === 'student-360' && studentParam) {
        setSelectedStudentId(studentParam);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ── Logout Handler ────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    authLogout();
    setSession(null);
    setCurrentRoute('login');
    window.location.hash = '#login';
    setActiveDrawerRecord(null);
    setActiveDrawerModule(null);
  }, []);

  // ── Login Success Handler ─────────────────────────────────────────────────
  const handleLoginSuccess = useCallback((newSession: AuthSession) => {
    setSession(newSession);
    setCurrentRoute('dashboard');
    setHash('dashboard');
  }, []);

  // ── Compute sidebar record counts ─────────────────────────────────────────
  const counts: Record<string, number> = {
    'students': db.students.length,
    'assessment-attempts': db.assessmentAttempts.length,
    'assessment-scores': db.assessmentScores.length,
    'career-profiles': db.careerProfiles.length,
    'student-files': db.studentFiles.length,
    'sessions': db.sessions.length,
    'attendance': db.attendance.length,
    'student-submissions': db.studentSubmissions.length,
    'companies': db.companies.length,
    'opportunities': db.opportunities.length,
    'applications': db.applications.length,
  };

  // ── Navigation Handlers ───────────────────────────────────────────────────
  const handleStudentClick = (studentId: string) => {
    setSelectedStudentId(studentId);
    navigate('student-360', { student: studentId });
  };

  const handleRelatedClick = (targetModule: string, id: string) => {
    if (targetModule === 'students') {
      handleStudentClick(id);
    } else if (MODULES_CONFIG[targetModule]) {
      navigate(targetModule);
    }
  };

  const handleRowClick = (record: any, moduleConfig: ModuleConfig) => {
    setActiveDrawerRecord(record);
    setActiveDrawerModule(moduleConfig);
  };

  // ── CRUD Handlers with RBAC Safety ────────────────────────────────────────

  /** Add a new record to a module */
  const handleAddRecord = (moduleId: string, record: any) => {
    try {
      if (session && !getAuthSession()) {
        setAuthSession(session);
      }
      setDb(prev => createRecord(prev, moduleId, record));
    } catch (err: any) {
      alert(err.message || '403 Forbidden: Insufficient permissions to add record.');
    }
  };

  /** Edit an existing record in a module */
  const handleEditRecord = (
    moduleId: string,
    primaryId: string,
    primaryValue: string,
    updates: any
  ) => {
    try {
      if (session && !getAuthSession()) {
        setAuthSession(session);
      }
      setDb(prev => updateRecord(prev, moduleId, primaryId, primaryValue, updates));
      // If drawer is showing this record, update it
      if (activeDrawerRecord && activeDrawerRecord[primaryId] === primaryValue) {
        setActiveDrawerRecord({ ...activeDrawerRecord, ...updates });
      }
    } catch (err: any) {
      alert(err.message || '403 Forbidden: Insufficient permissions to edit record.');
    }
  };

  /** Delete a record from a module */
  const handleDeleteRecord = (moduleId: string, primaryId: string, primaryValue: string) => {
    try {
      if (session && !getAuthSession()) {
        setAuthSession(session);
      }
      setDb(prev => deleteRecord(prev, moduleId, primaryId, primaryValue));
      // Close drawer if it was showing this record
      if (activeDrawerRecord && activeDrawerRecord[primaryId] === primaryValue) {
        setActiveDrawerRecord(null);
        setActiveDrawerModule(null);
      }
    } catch (err: any) {
      alert(err.message || '403 Forbidden: Insufficient permissions to delete record.');
    }
  };

  /** Import records from UploadModal (real SheetJS parsed rows) */
  const handleImportSuccess = (
    moduleId: string,
    newRecords: any[],
    _imported?: number,
    _skipped?: number
  ) => {
    try {
      const moduleConfig = MODULES_CONFIG[moduleId];
      const primaryId = moduleConfig?.primaryId || '';
      const { updatedDb } = bulkImport(db, moduleId, primaryId, newRecords);
      setDb(updatedDb);
    } catch (err: any) {
      alert(err.message || '403 Forbidden: Insufficient permissions to import records.');
    }
  };

  /** Reset all data to original mock workbook data */
  const handleResetDatabase = () => {
    try {
      setDb(resetDatabase());
    } catch (err: any) {
      alert(err.message || '403 Forbidden: Insufficient permissions to reset database.');
    }
  };

  /** Real-time single attendance matrix cell toggle / update */
  const handleUpsertAttendance = useCallback((sessionId: string, studentId: string, status: string) => {
    try {
      setDb(prevDb => upsertAttendanceMatrixRecord(prevDb, sessionId, studentId, status));
    } catch (err: any) {
      alert(err.message || '403 Forbidden: Insufficient permissions to update attendance.');
    }
  }, []);

  /** Add new attendance date / session column */
  const handleAddSessionColumn = useCallback((sessionData: any, defaultStatus?: string) => {
    try {
      setDb(prevDb => createAttendanceSessionColumn(prevDb, sessionData, defaultStatus));
    } catch (err: any) {
      alert(err.message || '403 Forbidden: Insufficient permissions to create session column.');
    }
  }, []);

  // ── Unauthenticated User Gate ─────────────────────────────────────────────
  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // ── Page Renderer ─────────────────────────────────────────────────────────
  const renderCurrentPage = () => {
    if (currentRoute === 'dashboard' || currentRoute === 'start-here' || currentRoute === 'assessment-scores') {
      return (
        <DashboardPage
          db={db}
          onNavigateModule={navigate}
          onStudentClick={handleStudentClick}
        />
      );
    }

    if (currentRoute === 'student-360') {
      return (
        <Student360Page
          studentId={selectedStudentId}
          db={db}
          onBack={() => navigate('students')}
          onNavigateModule={navigate}
          allStudents={db.students}
          onStudentChange={handleStudentClick}
        />
      );
    }

    if (currentRoute === 'settings') {
      if (session.user.role === 'COLLEGE_VIEWER') {
        return (
          <AccessDeniedPage
            onGoBack={() => navigate('dashboard')}
            userRole={session.user.role}
          />
        );
      }
      return <SettingsPage onResetDatabase={handleResetDatabase} />;
    }

    // Standard 15 Module Pages (01_Students through 15_Finance)
    const moduleConfig = MODULES_CONFIG[currentRoute];
    if (moduleConfig) {
      const dataKey = MODULE_DATA_KEY_MAP[currentRoute];
      const records = dataKey ? (db as any)[dataKey] || [] : [];

      return (
        <GenericModulePage
          key={currentRoute}
          moduleConfig={moduleConfig}
          data={records}
          allStudents={db.students}
          allSessions={db.sessions}
          allAttendance={db.attendance}
          allCareerProfiles={db.careerProfiles}
          allAssessmentAttempts={db.assessmentAttempts}
          allCompanies={db.companies}
          userRole={session.user.role}
          onRowClick={(rec) => handleRowClick(rec, moduleConfig)}
          onStudentClick={handleStudentClick}
          onRelatedClick={handleRelatedClick}
          onUploadClick={() => {
            setUploadDefaultModule(moduleConfig.id);
            setIsUploadOpen(true);
          }}
          onAddRecord={handleAddRecord}
          onEditRecord={handleEditRecord}
          onDeleteRecord={handleDeleteRecord}
          onUpsertAttendance={handleUpsertAttendance}
          onAddSessionColumn={handleAddSessionColumn}
        />
      );
    }

    return (
      <div className="py-16 text-center text-slate-500">
        Page not found. <button onClick={() => navigate('dashboard')} className="text-blue-600 underline">Go to Dashboard</button>
      </div>
    );
  };

  return (
    <AppLayout
      currentRoute={currentRoute}
      onNavigate={navigate}
      counts={counts}
      allStudents={db.students}
      allCompanies={db.companies}
      currentUser={session.user}
      onLogout={handleLogout}
      activeDrawerRecord={activeDrawerRecord}
      activeDrawerModule={activeDrawerModule}
      onCloseDrawer={() => {
        setActiveDrawerRecord(null);
        setActiveDrawerModule(null);
      }}
      onStudentClick={handleStudentClick}
      onRelatedClick={handleRelatedClick}
      isUploadOpen={isUploadOpen}
      onCloseUpload={() => setIsUploadOpen(false)}
      uploadDefaultModule={uploadDefaultModule}
      onImportSuccess={handleImportSuccess}
      onSyncSuccess={(newDb) => setDb(newDb)}
    >
      {renderCurrentPage()}
    </AppLayout>
  );
};

export default App;
