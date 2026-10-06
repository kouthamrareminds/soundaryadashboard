import React from 'react';
import { getBadgeVariant } from '@/utils/formatters';

interface StatusBadgeProps {
  value: string | undefined | null;
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ value, showDot = true, className = '' }) => {
  if (!value) return <span className="text-slate-400 text-xs">—</span>;

  const { bg, text, dot } = getBadgeVariant(value);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${bg} ${text} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {value}
    </span>
  );
};
