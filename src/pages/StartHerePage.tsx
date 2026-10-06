import React from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Sliders,
  Database,
  Key,
  Award,
  ShieldCheck,
  FolderTree,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { initialDatabase } from '@/data/mockData';

interface StartHerePageProps {
  onNavigateModule: (moduleId: string) => void;
}

export const StartHerePage: React.FC<StartHerePageProps> = ({ onNavigateModule }) => {
  const data = initialDatabase.startHere;

  const cardIcons: Record<string, any> = {
    Sliders,
    Database,
    Key,
    Award,
    ShieldCheck,
    FolderTree,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner / Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-navy via-slate-900 to-blue-950 p-8 rounded-3xl text-white shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>00 — Master System Architecture & Guidelines</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {data.title}
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed">
            {data.overview}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateModule('students')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/30"
            >
              <span>Explore 01 Students Master</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateModule('dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/15"
            >
              <span>View Executive Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guidelines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.cards.map((card: any, idx: number) => {
          const Icon = cardIcons[card.icon] || FileSpreadsheet;

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{card.title}</h3>
                </div>

                <ul className="space-y-2.5">
                  {card.items.map((item: string, i: number) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Soundarya Master Protocol
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
