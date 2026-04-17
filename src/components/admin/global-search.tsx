"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { Search, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Use debounced query for search
  const { data, isLoading } = trpc.clients.list.useQuery(
    { search: query, limit: 8 },
    { enabled: query.length >= 2 }
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        placeholder="Search clients..."
        className="w-full rounded-lg border border-stone-300 pl-10 pr-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
      />

      {/* Results dropdown */}
      {focused && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-stone-400" /></div>
          ) : (data?.clients ?? []).length === 0 ? (
            <p className="px-3 py-4 text-sm text-stone-400 text-center">No clients found.</p>
          ) : (
            (data?.clients ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  router.push(`/admin/clients/${c.id}`);
                  setQuery("");
                  setFocused(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-stone-50 border-b border-stone-100 last:border-0 flex items-center gap-3"
              >
                <Avatar name={`${c.firstName} ${c.lastName}`} src={c.profileImageUrl} size="sm" />
                <div>
                  <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                  {c.email && <p className="text-xs text-stone-500">{c.email}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
