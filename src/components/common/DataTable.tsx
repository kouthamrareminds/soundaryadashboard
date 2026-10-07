import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink, Eye, ChevronLeft, ChevronRight, Pencil, Trash2, FileSearch } from 'lucide-react';
import { ColumnConfig } from '@/config/modulesConfig';
import { StatusBadge } from './StatusBadge';
import { formatINR, truncate } from '@/utils/formatters';

interface DataTableProps {
  columns: ColumnConfig[];
  visibleColumns: string[];
  data: any[];
  primaryKey: string;
  onRowClick?: (record: any) => void;
  onStudentClick?: (studentId: string) => void;
  onRelatedClick?: (targetModule: string, id: string) => void;
  onEditRow?: (record: any) => void;
  onDeleteRow?: (record: any) => void;
  onFilePreview?: (record: any) => void;
  moduleTitle?: string;
  allStudents?: any[];
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  visibleColumns,
  data,
  primaryKey,
  allStudents = [],
  onRowClick,
  onStudentClick,
  onRelatedClick,
  onEditRow,
  onDeleteRow,
  onFilePreview,
}) => {
  // Sort State
  const [sortKey, setSortKey] = useState<string>(primaryKey);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Active visible column objects in original order (with fallback if stale)
  const activeCols = useMemo(() => {
    const matched = columns.filter(c => visibleColumns.includes(c.key));
    if (matched.length === 0 && columns.length > 0) {
      return columns.slice(0, Math.min(columns.length, 9));
    }
    return matched;
  }, [columns, visibleColumns]);

  // Handle Sort Toggle
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Sorted Data
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDirection]);

  // Paginated Data
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Reset page when data length changes
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Cell Content Renderer
  const renderCellContent = (record: any, col: ColumnConfig) => {
    const rawVal = record[col.key];

    // Empty / null handling
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      return <span className="text-slate-300 font-mono text-xs">—</span>;
    }

    // Student ID Link -> Opens Student 360 with Student Name display
    if (col.key === 'Student ID') {
      const studentObj = allStudents?.find(
        s => s['Student ID'] === rawVal || s['College Registration/USN'] === rawVal
      );
      const studentName = studentObj ? (studentObj['Full Name'] || studentObj['Student Name']) : (record['Full Name'] || record['Student Name']);

      return (
        <div className="flex flex-col text-left py-0.5 min-w-[140px]">
          {studentName && (
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {studentName}
            </span>
          )}
          {onStudentClick ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStudentClick(rawVal);
              }}
              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline mt-0.5"
              title={`View 360 Profile for ${studentName || rawVal}`}
            >
              <span>{rawVal}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </button>
          ) : (
            <span className="font-mono text-[11px] text-slate-500 mt-0.5">{rawVal}</span>
          )}
        </div>
      );
    }

    // Primary Key Styling
    if (col.isPrimary) {
      return (
        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
          {rawVal}
        </span>
      );
    }

    // Opportunity ID Link -> Displays Company Name and links to opportunity
    if (col.key === 'Opportunity ID' && (record['Company Name'] || record['Company'])) {
      let compName = String(record['Company Name'] || record['Company'] || '');
      if (compName.toLowerCase() === 'radall') compName = 'Radiall';
      const displayOppId = String(rawVal).replace(/RADALL/g, 'RADIALL');
      return (
        <div className="flex flex-col text-left py-0.5 min-w-[140px]">
          <span className="text-xs font-bold text-slate-900 leading-tight">
            {compName}
          </span>
          {onRelatedClick ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRelatedClick(col.targetModule || 'opportunities', displayOppId);
              }}
              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline mt-0.5"
              title={`View Opportunity (${displayOppId})`}
            >
              <span>{displayOppId}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </button>
          ) : (
            <span className="font-mono text-[11px] text-slate-500 mt-0.5">{displayOppId}</span>
          )}
        </div>
      );
    }

    // Foreign Key Link -> Opens related module
    if (col.isForeignKey && col.targetModule && onRelatedClick) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRelatedClick(col.targetModule!, rawVal);
          }}
          className="inline-flex items-center gap-1 font-mono text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50/60 px-1.5 py-0.5 rounded transition-colors"
          title={`Go to ${col.targetModule} (${rawVal})`}
        >
          <span>{rawVal}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
        </button>
      );
    }

    // Status / Enum Badge
    if (col.type === 'enum' || col.options) {
      return <StatusBadge value={String(rawVal)} />;
    }

    // Currency Formatting
    if (col.type === 'currency') {
      return (
        <span className="font-mono text-xs font-semibold text-slate-900">
          {formatINR(rawVal)}
        </span>
      );
    }

    // URLs
    if (col.type === 'url') {
      return (
        <a
          href={String(rawVal)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[180px]"
          title={String(rawVal)}
        >
          <span className="truncate">{rawVal}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      );
    }

    // Numbers / Hours / Minutes
    if (col.type === 'number') {
      return (
        <span className="font-mono text-xs font-medium text-slate-800">
          {rawVal}
        </span>
      );
    }

    // Standard string with tooltip truncation
    const strVal = String(rawVal);
    return (
      <span className="text-xs text-slate-700 font-normal truncate block max-w-[240px]" title={strVal}>
        {strVal}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Scrollable Table Container */}
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {activeCols.map((col, index) => {
                const isSorted = sortKey === col.key;
                const isSticky = index === 0;

                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`py-3.5 px-4 cursor-pointer select-none transition-colors hover:bg-slate-100 ${
                      isSticky
                        ? 'sticky left-0 z-20 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-200'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{col.label}</span>
                      <div className="text-slate-400">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
              <th className="py-3.5 px-4 text-right w-16">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={activeCols.length + 1} className="py-12 text-center text-slate-400 text-xs">
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginatedData.map((record, rIdx) => (
                <tr
                  key={record[primaryKey] || rIdx}
                  onClick={() => onRowClick && onRowClick(record)}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                >
                  {activeCols.map((col, cIdx) => {
                    const isSticky = cIdx === 0;
                    return (
                      <td
                        key={col.key}
                        className={`py-3 px-4 text-xs whitespace-nowrap ${
                          isSticky
                            ? 'sticky left-0 z-10 bg-white group-hover:bg-[#f1f6ff] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-100'
                            : ''
                        }`}
                      >
                        {renderCellContent(record, col)}
                      </td>
                    );
                  })}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* View Detail Drawer */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick && onRowClick(record);
                        }}
                        className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="View Complete Record"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* File Preview (student-files only) */}
                      {onFilePreview && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFilePreview(record);
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          title="Preview File"
                        >
                          <FileSearch className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Edit Record */}
                      {onEditRow && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditRow(record);
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit Record"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete Record */}
                      {onDeleteRow && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRow(record);
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-slate-400 ml-2">
            Showing {data.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, data.length)} of {data.length} records
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
