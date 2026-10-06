import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  iconName: string;
  change?: string;
  isPositive?: boolean;
  subtext?: string;
  colorScheme?: 'blue' | 'indigo' | 'emerald' | 'amber' | 'purple' | 'rose';
  delay?: number;
  onClick?: () => void;
  isSelected?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  iconName,
  change,
  isPositive = true,
  subtext,
  colorScheme = 'blue',
  delay = 0,
  onClick,
  isSelected = false,
}) => {
  // Dynamically resolve icon from Lucide
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Activity;

  const colorStyles = {
    blue: {
      bg: 'bg-blue-50 text-blue-600',
      border: 'hover:border-blue-300',
      accent: 'from-blue-500/10 to-transparent',
    },
    indigo: {
      bg: 'bg-indigo-50 text-indigo-600',
      border: 'hover:border-indigo-300',
      accent: 'from-indigo-500/10 to-transparent',
    },
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600',
      border: 'hover:border-emerald-300',
      accent: 'from-emerald-500/10 to-transparent',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600',
      border: 'hover:border-amber-300',
      accent: 'from-amber-500/10 to-transparent',
    },
    purple: {
      bg: 'bg-purple-50 text-purple-600',
      border: 'hover:border-purple-300',
      accent: 'from-purple-500/10 to-transparent',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600',
      border: 'hover:border-rose-300',
      accent: 'from-rose-500/10 to-transparent',
    },
  }[colorScheme];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      onClick={onClick}
      className={`relative overflow-hidden bg-white p-5 rounded-2xl border transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-blue-600 border-blue-500 shadow-md scale-[1.01]'
          : 'border-slate-200/80 shadow-sm'
      } ${
        onClick
          ? 'cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99]'
          : ''
      } ${colorStyles.border}`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${colorStyles.accent} rounded-bl-full pointer-events-none`} />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl ${colorStyles.bg} shadow-sm`}>
          <IconComponent className="w-5 h-5" />
        </div>
      </div>

      {(change || subtext) && (
        <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-2 border-t border-slate-100">
          {change && (
            <span
              className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {isPositive ? '↑' : '↓'} {change}
            </span>
          )}
          {subtext && (
            <span className="text-xs text-slate-500 leading-tight" title={subtext}>
              {subtext}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
