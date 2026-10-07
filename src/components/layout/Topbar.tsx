import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  HelpCircle,
  ChevronDown,
  User,
  Shield,
  LogOut,
  ExternalLink,
  GraduationCap,
  Calendar,
  Building2,
  CheckCircle2,
  Menu,
  FileSpreadsheet
} from 'lucide-react';

import { AuthUser } from '@/services/authService';
import { GoogleSheetsSyncModal } from '@/components/common/GoogleSheetsSyncModal';

interface TopbarProps {
  onSearchSelect?: (targetModule: string, id: string) => void;
  onNavigate?: (route: string) => void;
  allStudents?: any[];
  allCompanies?: any[];
  onToggleMobileMenu?: () => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onSyncSuccess?: (newDb: any) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onSearchSelect,
  onNavigate,
  allStudents = [],
  allCompanies = [],
  onToggleMobileMenu,
  currentUser,
  onLogout,
  onSyncSuccess,
}) => {
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [academicYear, setAcademicYear] = useState('2024–2026 (Active)');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showGoogleSync, setShowGoogleSync] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filter global search results
  const matchingStudents = globalSearch.trim()
    ? allStudents.filter(
        s =>
          s['Full Name']?.toLowerCase().includes(globalSearch.toLowerCase()) ||
          s['Student ID']?.toLowerCase().includes(globalSearch.toLowerCase()) ||
          s['College Registration/USN']?.toLowerCase().includes(globalSearch.toLowerCase())
      ).slice(0, 5)
    : [];

  const matchingCompanies = globalSearch.trim()
    ? allCompanies.filter(
        c =>
          c['Company Name']?.toLowerCase().includes(globalSearch.toLowerCase()) ||
          c['Company ID']?.toLowerCase().includes(globalSearch.toLowerCase()) ||
          c['Industry']?.toLowerCase().includes(globalSearch.toLowerCase())
      ).slice(0, 4)
    : [];

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between z-20 sticky top-0 shadow-xs">
      <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0 mr-2">
        {/* Mobile Hamburger Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0"
            title="Open navigation menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-[200px] sm:max-w-xs md:max-w-sm lg:w-96" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search students, USN, companies..."
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Global Search Results Dropdown */}
          {showSearchDropdown && globalSearch.trim() && (
          <div className="absolute left-0 mt-2 w-full bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50">
            {matchingStudents.length === 0 && matchingCompanies.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching students or companies found for "{globalSearch}".
              </div>
            ) : (
              <div className="space-y-3">
                {matchingStudents.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                      Students ({matchingStudents.length})
                    </span>
                    {matchingStudents.map(s => (
                      <button
                        key={s['Student ID']}
                        onClick={() => {
                          if (onSearchSelect) onSearchSelect('student-360', s['Student ID']);
                          setShowSearchDropdown(false);
                          setGlobalSearch('');
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-blue-600" />
                          <div>
                            <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-600">
                              {s['Full Name']}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {s['Student ID']} • {s['Programme']} {s['Primary Specialisation']}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-blue-600 font-medium">360 View →</span>
                      </button>
                    ))}
                  </div>
                )}

                {matchingCompanies.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                      Companies ({matchingCompanies.length})
                    </span>
                    {matchingCompanies.map(c => (
                      <button
                        key={c['Company ID']}
                        onClick={() => {
                          if (onSearchSelect) onSearchSelect('companies', c['Company ID']);
                          setShowSearchDropdown(false);
                          setGlobalSearch('');
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          <div>
                            <div className="text-xs font-semibold text-slate-800">{c['Company Name']}</div>
                            <div className="text-[10px] text-slate-400">{c['Industry']}</div>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500">View →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Right Controls: Cohort Selector, Notifications, User Profile */}
      <div className="flex items-center gap-3">
        {/* Google Sheets Live Sync Trigger */}
        <button
          onClick={() => setShowGoogleSync(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          title="Google Sheets Live Sync"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Google Sheets</span>
        </button>

        {/* Academic Year Selector */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer text-xs"
          >
            <option value="2024–2026 (Active)">Batch 2024–2026 (Active)</option>
            <option value="2025–2027 (Upcoming)">Batch 2025–2027 (Upcoming)</option>
          </select>
        </div>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1.5 pl-2 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-xs ${
                currentUser?.role === 'COLLEGE_VIEWER'
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-600'
                  : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
              }`}
            >
              {currentUser?.role === 'COLLEGE_VIEWER' ? 'S' : currentUser?.name ? currentUser.name.charAt(0) : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-xs font-bold text-slate-800 block leading-tight truncate max-w-[150px]">
                {currentUser?.role === 'COLLEGE_VIEWER' ? 'Soundarya Dashboard' : currentUser?.name || 'User'}
              </span>
              {currentUser?.role !== 'COLLEGE_VIEWER' && (
                <span className="text-[10px] font-semibold block leading-tight text-blue-600">
                  Admin (Full Access)
                </span>
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in space-y-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {currentUser?.role === 'COLLEGE_VIEWER' ? 'Soundarya Dashboard' : currentUser?.name || 'Authorized User'}
                </span>
                <span className="text-[11px] text-slate-500 block truncate mt-0.5 font-mono">
                  {currentUser?.email || 'user@domain.in'}
                </span>
                {currentUser?.role !== 'COLLEGE_VIEWER' && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-blue-700 bg-blue-100/80">
                      <Shield className="w-3 h-3" />
                      Rareminds Administrator
                    </span>
                  </div>
                )}
              </div>

              {/* Logout Option */}
              {onLogout && (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={showGoogleSync}
        onClose={() => setShowGoogleSync(false)}
        onSyncSuccess={onSyncSuccess}
      />
    </header>
  );
};
