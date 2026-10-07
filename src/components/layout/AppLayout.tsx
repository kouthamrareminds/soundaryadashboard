import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { RecordDrawer } from '@/components/common/RecordDrawer';
import { UploadModal } from '@/components/common/UploadModal';
import { MODULES_CONFIG, ModuleConfig } from '@/config/modulesConfig';
import { AuthUser } from '@/services/authService';

interface AppLayoutProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
  counts?: Record<string, number>;
  allStudents?: any[];
  allCompanies?: any[];
  onImportSuccess?: (moduleId: string, records: any[]) => void;
  activeDrawerRecord?: any;
  activeDrawerModule?: ModuleConfig | null;
  onCloseDrawer?: () => void;
  onStudentClick?: (studentId: string) => void;
  onRelatedClick?: (targetModule: string, id: string) => void;
  isUploadOpen?: boolean;
  onCloseUpload?: () => void;
  uploadDefaultModule?: string;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onSyncSuccess?: (newDb: any) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentRoute,
  onNavigate,
  children,
  counts,
  allStudents,
  allCompanies,
  onImportSuccess,
  activeDrawerRecord,
  activeDrawerModule,
  onCloseDrawer,
  onStudentClick,
  onRelatedClick,
  isUploadOpen = false,
  onCloseUpload,
  uploadDefaultModule = 'students',
  currentUser,
  onLogout,
  onSyncSuccess,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMobileNavigate = (route: string) => {
    setIsMobileMenuOpen(false);
    onNavigate(route);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Persistent Desktop Sidebar & Sliding Mobile Drawer */}
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={handleMobileNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        counts={counts}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        userRole={currentUser?.role}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar with Mobile Menu Trigger */}
        <Topbar
          allStudents={allStudents}
          allCompanies={allCompanies}
          currentUser={currentUser}
          onLogout={onLogout}
          onSearchSelect={(mod, id) => {
            if (mod === 'student-360' && onStudentClick) {
              onStudentClick(id);
            } else if (onRelatedClick) {
              onRelatedClick(mod, id);
            }
          }}
          onNavigate={handleMobileNavigate}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onSyncSuccess={onSyncSuccess}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>

      {/* Global Record Detail Drawer */}
      {activeDrawerRecord && activeDrawerModule && onCloseDrawer && (
        <RecordDrawer
          isOpen={true}
          onClose={onCloseDrawer}
          record={activeDrawerRecord}
          moduleConfig={activeDrawerModule}
          onStudentClick={onStudentClick}
          onRelatedClick={onRelatedClick}
        />
      )}

      {/* Global Upload Data Modal */}
      {isUploadOpen && onCloseUpload && (
        <UploadModal
          isOpen={true}
          onClose={onCloseUpload}
          defaultModuleId={uploadDefaultModule}
          onImportSuccess={onImportSuccess}
        />
      )}
    </div>
  );
};
