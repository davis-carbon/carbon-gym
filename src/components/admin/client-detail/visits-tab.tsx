"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/trpc/client";
import { Loader2, Search, SlidersHorizontal, ChevronDown } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  RESERVED: "Reserved",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EARLY_CANCEL: "Early cancel",
  NO_SHOW: "No show",
  LATE_CANCEL: "Late cancel",
};

const statusVariant: Record<string, "success" | "info" | "warning" | "danger" | "outline"> = {
  RESERVED: "info",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
  EARLY_CANCEL: "danger",
  NO_SHOW: "warning",
  LATE_CANCEL: "warning",
};

export function VisitsTab({ clientId }: { clientId: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = trpc.clients.listVisits.useInfiniteQuery(
    { clientId, limit: 20 },
    { getNextPageParam: (last) => last.nextCursor }
  );

  const allVisits = data?.pages.flatMap((p) => p.visits) ?? [];

  const filtered = allVisits.filter((v) => {
    const matchesSearch = !search || v.service.name.toLowerCase().includes(search.toLowerCase())
      || `${v.staff.firstName} ${v.staff.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const uniqueStatuses = [...new Set(allVisits.map((v) => v.status))];

  return (
    <div className="rounded-xl border border-stone-200 bg-white">
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-100">
        <h3 className="font-semibold text-stone-900">Visits</h3>
      </div>

      {/* Search + filter bar */}
      <div className="px-5 py-3 border-b border-stone-100 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-stone-50 pl-9 pr-3 py-2 text-sm focus:border-stone-400 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50">
            <SlidersHorizontal className="h-3 w-3" />
            {allVisits.length > 0 && <span className="bg-stone-800 text-white rounded-full px-1.5 py-0.5 text-[10px]">1</span>}
            Filters
          </button>

          <span className="inline-flex items-center rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
            Session Visits
          </span>

          {/* Visit Status filter */}
          <div className="relative">
            <button
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50"
            >
              {statusFilter ? STATUS_LABELS[statusFilter] : "Visit Status"}
              <ChevronDown className="h-3 w-3" />
            </button>
            {statusMenuOpen && (
              <div className="absolute left-0 top-full mt-1 z-10 min-w-[160px] rounded-lg border border-stone-200 bg-white shadow-md py-1">
                <button
                  onClick={() => { setStatusFilter(""); setStatusMenuOpen(false); }}
                  className="w-full px-3 py-1.5 text-left text-xs text-stone-600 hover:bg-stone-50"
                >
                  All statuses
                </button>
                {uniqueStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setStatusMenuOpen(false); }}
                    className="w-full px-3 py-1.5 text-left text-xs text-stone-600 hover:bg-stone-50"
                  >
                    {STATUS_LABELS[s] ?? s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-stone-400">
          <Search className="h-8 w-8" />
          <p className="text-sm">{allVisits.length === 0 ? "No visits recorded" : "No visits match this filter"}</p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_160px_120px_160px_160px] gap-4 px-5 py-2.5 border-b border-stone-100 bg-stone-50/50">
            <div className="flex items-center gap-1 text-xs font-medium text-stone-500">
              Service <ChevronDown className="h-3 w-3" />
            </div>
            <span className="text-xs font-medium text-stone-500">Staff</span>
            <span className="text-xs font-medium text-stone-500">Location</span>
            <span className="text-xs font-medium text-stone-500">Status</span>
            <span className="text-xs font-medium text-stone-500">Booked</span>
          </div>

          <div className="divide-y divide-stone-100">
            {filtered.map((v) => (
              <div
                key={v.id}
                className="grid grid-cols-[1fr_160px_120px_160px_160px] gap-4 items-center px-5 py-3 hover:bg-stone-50 transition-colors"
              >
                {/* Service + datetime */}
                <div>
                  <p className="text-sm font-medium text-stone-900">{v.service.name}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {new Date(v.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {" · "}
                    {new Date(v.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    {v.endAt && (
                      <> – {new Date(v.endAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>
                    )}
                  </p>
                </div>

                <span className="text-sm text-stone-700 truncate">
                  {v.staff.firstName} {v.staff.lastName}
                </span>

                <span className="text-sm text-stone-700 truncate">
                  {v.location?.name ?? "—"}
                </span>

                <Badge variant={statusVariant[v.status] ?? "outline"} className="text-xs w-fit">
                  {STATUS_LABELS[v.status] ?? v.status}
                </Badge>

                <span className="text-sm text-stone-500">
                  {new Date(v.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>

          {/* Load more */}
          {hasNextPage && (
            <div className="px-5 py-4 border-t border-stone-100 text-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-sm text-stone-600 hover:text-stone-800 disabled:opacity-50"
              >
                {isFetchingNextPage ? (
                  <span className="flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</span>
                ) : (
                  "Load more visits"
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
