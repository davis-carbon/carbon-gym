"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import {
  Video, Plus, Trash2, Search, CheckCircle2, Clock, Loader2,
  ExternalLink, ChevronDown, Dumbbell,
} from "lucide-react";

// ── Assign Existing Video Modal ───────────────────────────────────────────────

function AssignExistingModal({
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
  const [selectedId, setSelectedId] = useState("");
  const [notifyClient, setNotifyClient] = useState(false);

  const { data: allVideos = [] } = trpc.videos.list.useQuery(undefined, { enabled: open });

  const assign = trpc.videos.assign.useMutation({
    onSuccess: () => {
      toast("success", "Video assigned");
      utils.videos.listAssignmentsForClient.invalidate({ clientId });
      handleClose();
    },
    onError: (e) => toast("error", e.message),
  });

  function handleClose() {
    setSelectedId("");
    setNotifyClient(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Assign Video"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={() => { if (selectedId) assign.mutate({ videoId: selectedId, clientId }); }}
            disabled={!selectedId || assign.isPending}
          >
            {assign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm font-medium text-stone-600">Assign from existing Video</p>
        <div>
          <label className="block text-sm text-stone-700 mb-1">Select a video:</label>
          <div className="relative">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-3 py-2 pr-8 text-sm text-stone-700 focus:border-stone-400 focus:outline-none"
            >
              <option value=""></option>
              {allVideos.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
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
            className="h-4 w-4 rounded border-stone-300"
          />
          <span className="text-sm text-stone-700">Notify Client</span>
        </label>
      </div>
    </Modal>
  );
}

// ── Create + Assign New Video Modal ──────────────────────────────────────────

function CreateVideoModal({
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
  const [name, setName] = useState("");
  const [videoType, setVideoType] = useState<"file" | "url">("file");
  const [videoUrl, setVideoUrl] = useState("");
  const [notifyClient, setNotifyClient] = useState(false);

  const assign = trpc.videos.assign.useMutation({
    onSuccess: () => {
      toast("success", "Video assigned");
      utils.videos.listAssignmentsForClient.invalidate({ clientId });
      handleClose();
    },
    onError: (e) => toast("error", e.message),
  });

  const create = trpc.videos.create.useMutation({
    onSuccess: (v) => {
      assign.mutate({ videoId: v.id, clientId });
    },
    onError: (e) => toast("error", e.message),
  });

  function handleClose() {
    setName("");
    setVideoType("file");
    setVideoUrl("");
    setNotifyClient(false);
    onClose();
  }

  const isSaving = create.isPending || assign.isPending;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Assign Video"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!name.trim()) return toast("error", "Video Name is required");
              if (videoType === "file") return toast("info", "File upload coming soon");
              if (!videoUrl.trim()) return toast("error", "Video URL is required");
              create.mutate({ name: name.trim(), videoUrl: videoUrl.trim() });
            }}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm font-medium text-stone-600">Create new video</p>

        <div>
          <label className="block text-sm text-stone-700 mb-1">Video Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          {(["file", "url"] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="videoType"
                value={t}
                checked={videoType === t}
                onChange={() => setVideoType(t)}
                className="h-4 w-4 text-stone-800"
              />
              <span className="text-sm text-stone-700">
                {t === "file" ? "Upload File" : "Enter URL"}
              </span>
            </label>
          ))}
        </div>

        {videoType === "file" ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-200 py-8 text-center">
            <div className="rounded-full bg-stone-100 p-2">
              <Video className="h-5 w-5 text-stone-400" />
            </div>
            <p className="text-sm text-stone-600">
              <span className="font-medium text-stone-800 underline cursor-pointer">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-stone-400">Max file size is 10,000 MB</p>
          </div>
        ) : (
          <div>
            <label className="block text-sm text-stone-700 mb-1">Video URL</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
            />
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyClient}
            onChange={(e) => setNotifyClient(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300"
          />
          <span className="text-sm text-stone-700">Notify Client</span>
        </label>
      </div>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function VideosTab({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [assignOpen, setAssignOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: assignments = [], isLoading } = trpc.videos.listAssignmentsForClient.useQuery({ clientId });

  const unassign = trpc.videos.unassign.useMutation({
    onSuccess: () => {
      toast("success", "Video removed");
      utils.videos.listAssignmentsForClient.invalidate({ clientId });
    },
    onError: (e) => toast("error", e.message),
  });

  return (
    <>
      <div className="rounded-xl border border-stone-200 bg-white">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-stone-100">
          <div>
            <h3 className="font-semibold text-stone-900">Assigned Videos</h3>
            <p className="text-xs text-stone-400 mt-0.5">Videos assigned to {clientName}</p>
          </div>
          <DropdownMenu
            trigger={
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors">
                <Plus className="h-3.5 w-3.5" />
                Add Video
              </span>
            }
            align="right"
          >
            <DropdownItem onClick={() => setAssignOpen(true)}>
              <span className="flex items-center gap-2"><Plus className="h-3.5 w-3.5" />Assign Existing Video</span>
            </DropdownItem>
            <DropdownItem onClick={() => toast("info", "Exercise video assignment coming soon")}>
              <span className="flex items-center gap-2"><Dumbbell className="h-3.5 w-3.5" />Assign from Exercise</span>
            </DropdownItem>
            <DropdownItem onClick={() => setCreateOpen(true)}>
              <span className="flex items-center gap-2"><Video className="h-3.5 w-3.5" />Create New Video</span>
            </DropdownItem>
          </DropdownMenu>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-stone-400">
            <Search className="h-8 w-8" />
            <p className="text-sm">No videos assigned</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50 transition-colors group"
              >
                {/* Thumbnail / icon */}
                <div className="flex h-12 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-stone-100 overflow-hidden">
                  <Video className="h-5 w-5 text-stone-400" />
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{a.video.name}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Assigned {new Date(a.assignedAt).toLocaleDateString()}
                  </p>
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
                    href={a.video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                    title="Open video"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => {
                      if (confirm(`Remove "${a.video.name}" from this client?`))
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

      <AssignExistingModal open={assignOpen} onClose={() => setAssignOpen(false)} clientId={clientId} />
      <CreateVideoModal open={createOpen} onClose={() => setCreateOpen(false)} clientId={clientId} />
    </>
  );
}
