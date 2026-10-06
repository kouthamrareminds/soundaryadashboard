// Format currency to Indian Rupee (INR) format e.g. ₹1,25,000
export const formatINR = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
  if (isNaN(num)) return String(value);
  if (num === 0) return '₹0';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

// Format date to standard format e.g. 15-Aug-2024
export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '—';
  return dateStr;
};

// Truncate string with ellipsis
export const truncate = (str: string | undefined | null, length: number = 32): string => {
  if (!str) return '—';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

// Status badge styling helper based on common workbook values
export const getBadgeVariant = (val: string | undefined | null): { bg: string; text: string; dot: string } => {
  if (!val) return { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };
  const lower = val.toLowerCase().trim();

  // Success / Green
  if (['completed', 'approved', 'pass', 'ready', 'active', 'accepted', 'joined', 'offered', 'present', 'low', 'yes'].includes(lower)) {
    return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  }

  // Warning / Yellow / Amber
  if (['conditional', 'rework required', 'needs rework', 'under review', 'late', 'medium', 'open', 'prospect', 'on hold', 'pending', 'started', 'partial'].includes(lower)) {
    return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' };
  }

  // Danger / Red
  if (['absent', 'fail', 'needs support', 'withdrawn', 'rejected', 'declined', 'cancelled', 'high', 'critical', 'no', 'incomplete'].includes(lower)) {
    return { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' };
  }

  // Primary / Blue
  if (['mba', 'interview', 'shortlisted', 'screening', 'assessment', 'contacted', 'planned', 'submitted', 'seeking placement'].includes(lower)) {
    return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' };
  }

  // Purple
  if (['mca', 'individual', 'contract value', 'invoice'].includes(lower)) {
    return { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' };
  }

  // Default neutral
  return { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400' };
};
