"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Image as ImageIcon, Video as VideoIcon, Plus, Trash2,
  Search, CheckCircle2, Clock, Loader2, ExternalLink, SlidersHorizontal,
  Tag, ChevronDown,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

function iconFor(fileType: string | null | undefined, fileUrl: string) {
  const mime = (fileType ?? "").toLowerCase();
  const url = fileUrl.toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/.test(url))
    return <ImageIcon className="h-4 w-4 text-stone-500" />;
  if (mime.startsWith("video/") || /\.(mp4|mov|webm)$/.test(url))
    return <VideoIcon className="h-4 w-4 text-stone-500" />;
  return <FileText className="h-4 w-4 text-stone-500" />;
}

// ── Assign Resource Modal ─────────────────────────────────────────────────────

type Step = "select" | "create";

function AssignResourceModal({
  open,
  onClose,
  clientId,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [step, setStep] = useState<Step>("select");
  const [selectedId, setSelectedId] = useState("");
  const [notifyClient, setNotifyClient] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [resourceType, setResourceType] = useState<"url" | "file">("url");
  const [resourceUrl, setResourceUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  const { data: allResources = [] } = trpc.resources.list.useQuery(undefined, { enabled: open });

  const assign = trpc.resources.assign.useMutation({
    onSuccess: () => {
      toast("success", "Resource assigned");
      utils.resources.listAssignmentsForClient.invalidate({ clientId });
      handleClose();
    },
    onError: (e) => toast("error", e.message),
  });

  const create = trpc.resources.create.useMutation({
    onSuccess: (res) => {
      // Immediately assign the newly created resource
      assign.mutate({ resourceId: res.id, clientId });
    },
    onError: (e) => toast("error", e.message),
  });

  function handleClose() {
    setStep("select");
    setSelectedId("");
    setNotifyClient(false);
    setName("");
    setResourceType("url");
    setResourceUrl("");
    setThumbnailUrl("");
    onClose();
  }

  if (step === "select") {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Resource"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={() => { if (selectedId) assign.mutate({ resourceId: selectedId, clientId }); }}
              disabled={!selectedId || assign.isPending}
            >
              {assign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Select"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Select an existing resource
            </label>
            <div className="relative">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-3 py-2 pr-8 text-sm text-stone-700 focus:border-stone-400 focus:outline-none"
              >
                <option value=""></option>
                {allResources.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-stone-400" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyClient}
              onChange={(e) => setNotifyClient(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-stone-800 focus:ring-stone-500"
            />
            <span className="text-sm text-stone-700">Notify Client</span>
          </label>

          <button
            type="button"
            onClick={() => setStep("create")}
            className="text-sm text-stone-600 underline hover:text-stone-800"
          >
            Create New Resource
          </button>
        </div>
      </Modal>
    );
  }

  // Create step
  const isSaving = create.isPending || assign.isPending;
  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Resource"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!name.trim()) return toast("error", "Name is required");
              if (resourceType === "url" && !resourceUrl.trim()) return toast("error", "Resource URL is required");
              if (resourceType === "file") return toast("info", "File upload coming soon");
              create.mutate({ name: name.trim(), fileUrl: resourceUrl.trim() });
            }}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setStep("select")}
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          ← Back to Resource Selection
        </button>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700 mb-2">Resource</p>
          <div className="space-y-1">
            {(["file", "url"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="resourceType"
                  value={t}
                  checked={resourceType === t}
                  onChange={() => setResourceType(t)}
                  className="h-4 w-4 text-stone-800"
                />
                <span className="text-sm text-stone-700">
                  {t === "file" ? "Upload File" : "Enter URL"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {resourceType === "file" ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-200 py-8 text-center">
            <div className="rounded-full bg-stone-100 p-2">
              <FileText className="h-5 w-5 text-stone-400" />
            </div>
            <p className="text-sm text-stone-600">
              <span className="font-medium text-stone-800 underline cursor-pointer">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-stone-400">Max file size is 32MB</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Resource URL</label>
              <input
                type="url"
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                placeholder="https://"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Thumbnail <span className="font-normal text-stone-400">(Optional)</span>
              </label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ResourcesTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [assignOpen, setAssignOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const [tagMenuOpen, setTagMenuOpen] = useState(false);

  const { data: assignments = [], isLoading } = trpc.resources.listAssignmentsForClient.useQuery({ clientId });

  const unassign = trpc.resources.unassign.useMutation({
    onSuccess: () => {
      toast("success", "Resource removed");
      utils.resources.listAssignmentsForClient.invalidate({ clientId });
    },
    onError: (e) => toast("error", e.message),
  });

  // Collect unique categories/tags for the Tags filter
  const allTags = [...new Set(assignments.map((a) => a.resource.category).filter(Boolean) as string[])];

  const filtered = tagFilter
    ? assignments.filter((a) => a.resource.category === tagFilter)
    : assignments;

  return (
    <>
      <div className="rounded-xl border border-stone-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">Assigned Resources</h3>
          <button
            onClick={() => setAssignOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Assign Resource
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-stone-100">
          <button className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50">
            <SlidersHorizontal className="h-3 w-3" />
            Filters
          </button>
          <div className="relative">
            <button
              onClick={() => setTagMenuOpen(!tagMenuOpen)}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50"
            >
              <Tag className="h-3 w-3" />
              {tagFilter || "Tags"}
              <ChevronDown className="h-3 w-3" />
            </button>
            {tagMenuOpen && (
              <div className="absolute left-0 top-full mt-1 z-10 min-w-[140px] rounded-lg border border-stone-200 bg-white shadow-md py-1">
                <button
                  onClick={() => { setTagFilter(""); setTagMenuOpen(false); }}
                  className="w-full px-3 py-1.5 text-left text-xs text-stone-600 hover:bg-stone-50"
                >
                  All tags
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTagFilter(t); setTagMenuOpen(false); }}
                    className="w-full px-3 py-1.5 text-left text-xs text-stone-600 hover:bg-stone-50"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
          {tagFilter && (
            <Badge variant="outline" className="text-xs">
              {tagFilter}
              <button onClick={() => setTagFilter("")} className="ml-1 hover:text-red-500">
                ×
              </button>
            </Badge>
          )}
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-stone-400">
            <Search className="h-8 w-8" />
            <p className="text-sm">{tagFilter ? "No resources match this filter" : "No resources assigned"}</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filtered.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50 transition-colors group"
              >
                {/* File icon */}
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-stone-100">
                  {iconFor(a.resource.fileType, a.resource.fileUrl)}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{a.resource.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-stone-400">
                      Assigned {new Date(a.assignedAt).toLocaleDateString()}
                    </span>
                    {a.resource.category && (
                      <Badge variant="outline" className="text-xs">{a.resource.category}</Badge>
                    )}
                  </div>
                </div>

                {/* Viewed status */}
                {a.viewedAt ? (
                  <Badge variant="success" className="text-xs shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-0.5" />Viewed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs shrink-0">
                    <Clock className="h-3 w-3 mr-0.5" />Not viewed
                  </Badge>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={a.resource.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                    title="Open resource"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => {
                      if (confirm(`Remove "${a.resource.name}" from this client?`))
                        unassign.mutate({ assignmentId: a.id });
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-opacity"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign modal */}
      <AssignResourceModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        clientId={clientId}
      />
    </>
  );
}
