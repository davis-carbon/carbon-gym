"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Loader2, Search } from "lucide-react";

export function LifecycleTab({ clientId }: { clientId: string }) {
  const [search, setSearch] = useState("");

  const { data: events = [], isLoading } = trpc.lifecycle.listForClient.useQuery({ clientId });

  const filtered = events.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.fromStage ?? "").toLowerCase().includes(q) ||
      e.toStage.toLowerCase().includes(q) ||
      (e.source ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="rounded-xl border border-stone-200 bg-white">
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-100">
        <h3 className="font-semibold text-stone-900">Lifecycle</h3>
      </div>

      {/* Search */}
      <div className="px-5 py-3 border-b border-stone-100">
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
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-stone-400">
          <Search className="h-8 w-8" />
          <p className="text-sm">
            {events.length === 0
              ? "No lifecycle transitions found for this account."
              : "No transitions match this search"}
          </p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_140px_140px_200px] gap-4 px-5 py-2.5 border-b border-stone-100 bg-stone-50/50">
            <span className="text-xs font-medium text-stone-500">Date</span>
            <span className="text-xs font-medium text-stone-500">From</span>
            <span className="text-xs font-medium text-stone-500">To</span>
            <span className="text-xs font-medium text-stone-500">Source</span>
          </div>

          <div className="divide-y divide-stone-100">
            {filtered.map((e) => (
              <div
                key={e.id}
                className="grid grid-cols-[1fr_140px_140px_200px] gap-4 items-center px-5 py-3 hover:bg-stone-50 transition-colors"
              >
                <span className="text-sm text-stone-700">
                  {new Date(e.createdAt).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-sm text-stone-500">{e.fromStage ?? "—"}</span>
                <span className="text-sm text-stone-700 font-medium">{e.toStage}</span>
                <span className="text-sm text-stone-500 truncate">{e.source ?? "—"}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
