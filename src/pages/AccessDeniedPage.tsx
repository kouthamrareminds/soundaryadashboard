import React from 'react';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Lock } from 'lucide-react';

interface AccessDeniedPageProps {
  onGoBack: () => void;
  userRole?: string | null;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({ onGoBack, userRole }) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-rose-100 shadow-xl p-8 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200">
            <Lock className="w-3.5 h-3.5" />
            <span>403 Forbidden • Access Restricted</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Restricted Dashboard Area
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Your current account ({userRole === 'COLLEGE_VIEWER' ? 'College Viewer' : userRole || 'Viewer'}) has strictly <span className="font-semibold text-slate-800">View-Only</span> permissions. Administrative configurations and modification tools are reserved for Rareminds Administrators.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onGoBack}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 active:scale-95"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
