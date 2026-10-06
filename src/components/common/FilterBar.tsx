import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { ColumnConfig } from '@/config/modulesConfig';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  filterableColumns: ColumnConfig[];
  totalRecords: number;
  filteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  filterableColumns,
  totalRecords,
  filteredCount,
}) => {
  const hasActiveFilters = searchQuery.trim() !== '' || Object.values(filters).some(v => v !== '');

  // Take top 4 most useful dropdown filters
  const dropdownCols = filterableColumns.filter(c => c.options && c.options.length > 0).slice(0, 4);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Global Search within module */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search records by ID, name, keywords..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dynamic Dropdowns based on Excel Validation Lists */}
        {dropdownCols.map(col => (
          <div key={col.key} className="min-w-[150px]">
            <select
              value={filters[col.key] || ''}
              onChange={e => onFilterChange(col.key, e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer truncate"
            >
              <option value="">All {col.label}</option>
              {col.options?.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Record Counter & Active Filter Indicators */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="w-3 h-3 text-slate-400" />
          <span>
            Showing <strong className="text-slate-800 font-semibold">{filteredCount}</strong> of{' '}
            <strong className="text-slate-800 font-semibold">{totalRecords}</strong> records
          </span>
        </div>

        {hasActiveFilters && (
          <span className="text-blue-600 font-medium">Filtered results active</span>
        )}
      </div>
    </div>
  );
};
