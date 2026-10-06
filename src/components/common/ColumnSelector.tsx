import React, { useState, useRef, useEffect } from 'react';
import { Columns, Check, RotateCcw } from 'lucide-react';
import { ColumnConfig } from '@/config/modulesConfig';

interface ColumnSelectorProps {
  columns: ColumnConfig[];
  visibleColumns: string[];
  onChange: (visibleKeys: string[]) => void;
  primaryKey: string;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  visibleColumns,
  onChange,
  primaryKey,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (key: string) => {
    if (key === primaryKey) return; // Primary ID cannot be hidden
    if (visibleColumns.includes(key)) {
      onChange(visibleColumns.filter(c => c !== key));
    } else {
      onChange([...visibleColumns, key]);
    }
  };

  const showAll = () => {
    onChange(columns.map(c => c.key));
  };

  const resetDefault = () => {
    // Default: first 8 columns or all if less than 8
    onChange(columns.slice(0, 8).map(c => c.key));
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Columns className="w-3.5 h-3.5 text-slate-500" />
        <span>Columns ({visibleColumns.length}/{columns.length})</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">Customize Columns</span>
            <div className="flex items-center gap-2">
              <button
                onClick={showAll}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
              >
                All
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={resetDefault}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto px-2 py-1 space-y-0.5">
            {columns.map(col => {
              const isSelected = visibleColumns.includes(col.key);
              const isPrimary = col.key === primaryKey;

              return (
                <button
                  key={col.key}
                  disabled={isPrimary}
                  onClick={() => toggleColumn(col.key)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isPrimary ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate text-left text-slate-700 font-medium">
                    {col.label}
                    {isPrimary && <span className="ml-1 text-[10px] text-blue-600">(Locked)</span>}
                  </span>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
