"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  /** Optional row-id extractor; required when enableRowSelection is true */
  getRowId?: (row: T) => string;
  /** Opt in to multi-select checkbox column */
  enableRowSelection?: boolean;
  /** Called when selection changes — receives selected row ids */
  onSelectionChange?: (ids: string[]) => void;
  /** External reset signal — when changed, selection is cleared */
  resetSelectionSignal?: number;
}

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = "Search...",
  onRowClick,
  pageSize = 25,
  getRowId,
  enableRowSelection,
  onSelectionChange,
  resetSelectionSignal,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Prepend selection column when enabled
  const effectiveColumns: ColumnDef<T, unknown>[] = enableRowSelection
    ? [
        {
          id: "__select",
          size: 40,
          enableSorting: false,
          header: ({ table }) => (
            <input
              type="checkbox"
              checked={table.getIsAllPageRowsSelected()}
              ref={(el) => {
                if (el) el.indeterminate = table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected();
              }}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
            />
          ),
          cell: ({ row }) => (
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
            />
          ),
        },
        ...columns,
      ]
    : columns;

  const table = useReactTable({
    data,
    columns: effectiveColumns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection,
    getRowId: getRowId as ((row: T, index: number) => string) | undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  // Propagate selection changes upward
  useEffect(() => {
    if (!enableRowSelection || !onSelectionChange) return;
    const ids = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    onSelectionChange(ids);
  }, [rowSelection, enableRowSelection, onSelectionChange]);

  // External reset
  useEffect(() => {
    if (resetSelectionSignal !== undefined) setRowSelection({});
  }, [resetSelectionSignal]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder={searchPlaceholder}
        className="w-full max-w-sm rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-1"
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-stone-200">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-stone-200 bg-stone-50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-medium text-stone-600"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        className={`inline-flex items-center gap-1 ${
                          header.column.getCanSort() ? "cursor-pointer select-none hover:text-stone-900" : ""
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-stone-400">
                            {header.column.getIsSorted() === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5" />
                            )}
                          </span>
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={effectiveColumns.length}
                  className="px-4 py-12 text-center text-stone-400"
                >
                  No results found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-stone-100 last:border-0 ${
                    onRowClick
                      ? "cursor-pointer hover:bg-stone-50 transition-colors"
                      : ""
                  } ${row.getIsSelected() ? "bg-stone-50" : ""}`}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-stone-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-sm text-stone-600">
          <span>
            Showing {table.getState().pagination.pageIndex * pageSize + 1}–
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            of {table.getFilteredRowModel().rows.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-lg border border-stone-300 p-1.5 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-lg border border-stone-300 p-1.5 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
