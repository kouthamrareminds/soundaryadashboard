import React from 'react';
import { UploadCloud, Download, Plus, RefreshCw } from 'lucide-react';
import { ColumnSelector } from './ColumnSelector';
import { ColumnConfig } from '@/config/modulesConfig';

interface PageHeaderProps {
  number?: string;
  title: string;
  description: string;
  columns?: ColumnConfig[];
  visibleColumns?: string[];
  onColumnChange?: (keys: string[]) => void;
  primaryKey?: string;
  onUploadClick?: () => void;
  onExportClick?: () => void;
  onAddClick?: () => void;
  /** Alias for onAddClick — accepts handler from GenericModulePage */
  onAddRecord?: () => void;
  onRefreshClick?: () => void;
  customActions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  number,
  title,
  description,
  columns,
  visibleColumns,
  onColumnChange,
  primaryKey,
  onUploadClick,
  onExportClick,
  onAddClick,
  onAddRecord,
  onRefreshClick,
  customActions,
}) => {
  const handleAdd = onAddClick || onAddRecord;
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        </div>
        <p className="text-xs lg:text-sm text-slate-500">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {customActions}

        {columns && visibleColumns && onColumnChange && primaryKey && (
          <ColumnSelector
            columns={columns}
            visibleColumns={visibleColumns}
            onChange={onColumnChange}
            primaryKey={primaryKey}
          />
        )}

        {onRefreshClick && (
          <button
            onClick={onRefreshClick}
            title="Refresh Table Data"
            className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        {onExportClick && (
          <button
            onClick={onExportClick}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        )}

        {onUploadClick && (
          <button
            onClick={onUploadClick}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Upload Data</span>
          </button>
        )}

        {handleAdd && (
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Record</span>
          </button>
        )}
      </div>
    </div>
  );
};
