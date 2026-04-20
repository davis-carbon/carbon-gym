"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, ScrollText, Filter, X } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function actionBadgeVariant(action: string): "success" | "warning" | "danger" | "info" | "outline" {
  if (action.startsWith("CREATE") || action === "AUTOMATION_EXECUTED") return "success";
  if (action.startsWith("UPDATE") || action.startsWith("EDIT")) return "info";
  if (action.startsWith("DELETE") || action.startsWith("ARCHIVE")) return "danger";
  if (action.startsWith("BULK")) return "warning";
  return "outline";
}

function formatAction(action: string): string {
  return action
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function MetaDisplay({ meta }: { meta: Record<string, unknown> }) {
  const entries = Object.entries(meta).filter(
    ([k]) => !["clientId"].includes(k), // clientId shown in main row already
  );
  if (entries.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
      {entries.map(([k, v]) => (
        <span key={k} className="text-[11px] text-stone-400">
          <span className="text-stone-500">{k}:</span>{" "}
          {Array.isArray(v) ? v.join(", ") : String(v ?? "")}
        </span>
      ))}
    </div>
  );
}

// ─── Filter bar ──────────────────────────────────────────────────────────────

interface Filters {
  entityType: string;
  action: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: Filters = { entityType: "", action: "", dateFrom: "", dateTo: "" };

function FilterBar({
  filters,
  setFilters,
  entityTypes,
  actions,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  entityTypes: string[];
  actions: string[];
}) {
  const hasActive = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-xs text-stone-500 mb-1">Entity type</label>
        <select
          value={filters.entityType}
          onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
          className="h-8 rounded-md border border-stone-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="">All types</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-stone-500 mb-1">Action</label>
        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          className="h-8 rounded-md border border-stone-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{formatAction(a)}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-stone-500 mb-1">From</label>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          className="h-8 rounded-md border border-stone-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>

      <div>
        <label className="block text-xs text-stone-500 mb-1">To</label>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          className="h-8 rounded-md border border-stone-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>

      {hasActive && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setFilters(EMPTY_FILTERS)}
          className="self-end"
        >
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const { data: entityTypes = [] } = trpc.auditLog.entityTypes.useQuery();
  const { data: actions = [] } = trpc.auditLog.actions.useQuery();

  const { data, isLoading, isFetching } = trpc.auditLog.list.useQuery(
    {
      page,
      limit: 50,
      entityType: filters.entityType || undefined,
      action: filters.action || undefined,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo + "T23:59:59") : undefined,
    },
    { placeholderData: keepPreviousData },
  );

  function handleFiltersChange(f: Filters) {
    setFilters(f);
    setPage(1);
  }

  const rows = data?.rows ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Audit Log</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            System activity — automations, edits, and staff actions.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter className="h-4 w-4" />
          {showFilters ? "Hide filters" : "Filter"}
        </Button>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <FilterBar
              filters={filters}
              setFilters={handleFiltersChange}
              entityTypes={entityTypes}
              actions={actions}
            />
          </CardContent>
        </Card>
      )}

      {/* Log table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-stone-500">
            {isLoading ? "Loading…" : `${total.toLocaleString()} event${total !== 1 ? "s" : ""}`}
            {isFetching && !isLoading && (
              <Loader2 className="inline ml-2 h-3.5 w-3.5 animate-spin" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-400">
              <ScrollText className="h-8 w-8 mb-2" />
              <p className="text-sm">No events found.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {rows.map((row) => (
                <div key={row.id} className="px-5 py-3 hover:bg-stone-50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Timestamp */}
                    <div className="w-36 shrink-0">
                      <p className="text-xs text-stone-500">
                        {new Date(row.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-stone-400">
                        {new Date(row.createdAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={actionBadgeVariant(row.action)} className="text-[11px]">
                          {formatAction(row.action)}
                        </Badge>
                        <span className="text-sm font-medium text-stone-800">
                          {row.entityType}
                          {row.entityLabel && (
                            <span className="text-stone-500 font-normal"> · {row.entityLabel}</span>
                          )}
                        </span>
                        {row.metaClientName && row.entityType !== "Client" && (
                          <span className="text-xs text-stone-400">for {row.metaClientName}</span>
                        )}
                      </div>
                      <MetaDisplay meta={row.metadata} />
                    </div>

                    {/* Actor */}
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-stone-500">{row.actorName}</p>
                      {row.ipAddress && (
                        <p className="text-[11px] text-stone-300">{row.ipAddress}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
