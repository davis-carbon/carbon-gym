"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Plus, X } from "lucide-react";

interface TagEditorProps {
  clientId: string;
  clientTags: Array<{ tag: { id: string; name: string; color: string | null } }>;
}

export function TagEditor({ clientId, clientTags }: TagEditorProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: allTags } = trpc.tags.list.useQuery(undefined, { enabled: open });

  const invalidate = () => utils.clients.byId.invalidate({ id: clientId });

  const addTag = trpc.tags.addToClient.useMutation({
    onSuccess: () => { invalidate(); setSearch(""); },
    onError: (err) => toast("error", err.message),
  });

  const removeTag = trpc.tags.removeFromClient.useMutation({
    onSuccess: invalidate,
    onError: (err) => toast("error", err.message),
  });

  const createTag = trpc.tags.create.useMutation({
    onSuccess: (tag) => {
      addTag.mutate({ clientId, tagId: tag.id });
      utils.tags.list.invalidate();
      setCreating(false);
      setSearch("");
    },
    onError: (err) => { toast("error", err.message); setCreating(false); },
  });

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const assignedIds = new Set(clientTags.map((t) => t.tag.id));
  const available = (allTags ?? []).filter((t) => !assignedIds.has(t.id));
  const filtered = search
    ? available.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : available;
  const exactMatch = (allTags ?? []).some((t) => t.name.toLowerCase() === search.toLowerCase());

  return (
    <div className="flex flex-wrap items-center gap-2">
      {clientTags.map((t) => (
        <span
          key={t.tag.id}
          className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700"
          style={t.tag.color ? { backgroundColor: `${t.tag.color}20`, color: t.tag.color } : undefined}
        >
          {t.tag.name}
          <button
            onClick={() => removeTag.mutate({ clientId, tagId: t.tag.id })}
            className="opacity-60 hover:opacity-100 hover:text-red-500"
            aria-label={`Remove ${t.tag.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <div ref={wrapRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-500 hover:border-stone-500 hover:text-stone-700"
        >
          <Plus className="h-3 w-3" /> Add tag
        </button>
        {open && (
          <div className="absolute z-30 mt-1 left-0 min-w-[220px] rounded-lg border border-stone-200 bg-white shadow-lg py-1">
            <div className="px-2 py-1.5 border-b border-stone-100">
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search or create tag..."
                className="w-full text-sm px-2 py-1 outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.length > 0 ? (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => addTag.mutate({ clientId, tagId: t.id })}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color || "#6B7280" }} />
                    {t.name}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-stone-400">
                  {search ? "No matching tags" : "No more tags available"}
                </p>
              )}
              {search && !exactMatch && (
                <button
                  onClick={() => { setCreating(true); createTag.mutate({ name: search }); }}
                  disabled={creating || createTag.isPending}
                  className="flex w-full items-center gap-2 border-t border-stone-100 px-3 py-1.5 text-sm text-stone-900 hover:bg-stone-50 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  Create &quot;{search}&quot;
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
