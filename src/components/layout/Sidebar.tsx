import React from 'react';
import raremindsLogo from '@/assets/rareminds-logo.png';
import raremindsBulbLogo from '@/assets/rareminds-bulb-logo.png';
import {
  LayoutDashboard,
  HelpCircle,
  GraduationCap,
  FileSpreadsheet,
  Compass,
  FolderArchive,
  Calendar,
  UserCheck,
  ClipboardCheck,
  Building2,
  Briefcase,
  Send,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  X,
  LogOut
} from 'lucide-react';
import { UserRole } from '@/services/authService';

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  counts?: Record<string, number>;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  userRole?: UserRole | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  counts = {},
  isOpenMobile = false,
  onCloseMobile,
  userRole,
  onLogout,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, isSpecial: true },
    { id: 'students', label: 'Students', icon: GraduationCap, count: counts['students'] },
    { id: 'assessment-attempts', label: 'Assessment Taken', icon: FileSpreadsheet, count: counts['assessment-attempts'] },
    { id: 'career-profiles', label: 'Career Profiles', icon: Compass, count: counts['career-profiles'] },
    { id: 'student-files', label: 'Student Files', icon: FolderArchive, count: counts['student-files'] },
    { id: 'sessions', label: 'Training Calendar', icon: Calendar, count: counts['sessions'] },
    { id: 'attendance', label: 'Attendance', icon: UserCheck, count: counts['attendance'] },
    { id: 'companies', label: 'Market Opportunity', icon: Building2, count: counts['companies'] },
    { id: 'opportunities', label: 'Rareminds Opportunity', icon: Briefcase, count: counts['opportunities'] },
    { id: 'applications', label: 'SIMS Application', icon: Send, count: counts['applications'] },
  ];

  return (
    <aside
      className={`bg-brand-navy border-r border-brand-navy-border flex flex-col transition-all duration-300 select-none ${
        isOpenMobile
          ? 'fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl z-50 flex'
          : `hidden md:flex relative z-30 ${isCollapsed ? 'w-20' : 'w-64'}`
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-3.5 border-b border-brand-navy-border/80">
        {!isCollapsed || isOpenMobile ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="bg-white rounded-lg px-2.5 py-1 flex items-center justify-center shadow-xs">
              <img
                src={raremindsLogo}
                alt="Rareminds - Applied Learning. Transforming Work"
                className="h-7 w-auto object-contain max-w-[165px]"
              />
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 mx-auto rounded-lg bg-white p-1 flex items-center justify-center shadow-md">
            <img
              src={raremindsBulbLogo}
              alt="Rareminds"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Collapse Button (Desktop) */}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className={`hidden md:block p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
            isCollapsed ? 'hidden' : 'block'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Close Button (Mobile) */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            title="Close Menu"
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* College Cohort Badge */}
      {!isCollapsed && (
        <div className="px-4 py-3 bg-brand-navy-light/60 border-b border-brand-navy-border/50 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-300">Soundarya Institute</div>
            <div className="text-[10px] text-slate-500">MBA & MCA Delivery Portal</div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scrollbar">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-transform ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-105'
                }`}
              />
              
              {!isCollapsed && (
                <span className="flex-1 truncate text-left">{item.label}</span>
              )}

              {/* Collapsed Hover Tooltip */}
              {isCollapsed && (
                <div className="fixed left-20 ml-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg shadow-xl border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer / Settings, Sign Out & Expand button */}
      <div className="p-3 border-t border-brand-navy-border/80 space-y-1">
        {userRole !== 'COLLEGE_VIEWER' && (
          <button
            onClick={() => onNavigate('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
              currentRoute === 'settings' ? 'bg-slate-800 text-white' : ''
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </button>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            title={isCollapsed ? 'Sign Out' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-rose-400/90 hover:text-rose-200 hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 text-rose-400" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        )}

        {isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
