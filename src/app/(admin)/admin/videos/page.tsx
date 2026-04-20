"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Loader2, Plus, Trash2, ExternalLink, Video } from "lucide-react";

// ─── YouTube / Vimeo thumbnail helper ────────────────────────────────────────

function getThumbnailUrl(videoUrl: string): string | null {
  try {
    const url = new URL(videoUrl);
    // YouTube watch links: youtube.com/watch?v=ID
    const ytId = url.searchParams.get("v");
    if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
    // YouTube short links: youtu.be/ID
    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1);
      if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
    }
    // YouTube embed: youtube.com/embed/ID
    if (url.pathname.startsWith("/embed/")) {
      const id = url.pathname.split("/embed/")[1]?.split("?")[0];
      if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
    }
  } catch {
    // ignore invalid URLs
  }
  return null;
}

function fmtDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Upload Video Modal ───────────────────────────────────────────────────────

function UploadVideoModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", videoUrl: "" });

  const create = trpc.videos.create.useMutation({
    onSuccess: () => {
      toast("success", "Video added to library");
      onCreated();
      onClose();
    },
    onError: (e) => toast("error", e.message),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Add Video"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => create.mutate({ name: form.name, videoUrl: form.videoUrl })}
            disabled={create.isPending || !form.name.trim() || !form.videoUrl.trim()}
          >
            {create.isPending ? "Adding…" : "Add Video"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Title"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Squat Tutorial"
          autoFocus
        />
        <Input
          label="Video URL"
          value={form.videoUrl}
          onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
        />
        {form.videoUrl && getThumbnailUrl(form.videoUrl) && (
          <div>
            <p className="text-xs text-stone-500 mb-1">Preview</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getThumbnailUrl(form.videoUrl)!}
              alt="thumbnail"
              className="w-48 rounded-lg border border-stone-200"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VideosPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: videos = [], isLoading } = trpc.videos.list.useQuery(
    search ? { search } : undefined,
  );

  const del = trpc.videos.delete.useMutation({
    onSuccess: () => {
      utils.videos.list.invalidate();
      setConfirmDeleteId(null);
      toast("success", "Video deleted");
    },
    onError: (e) => toast("error", e.message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Video Library</h1>
        <Button size="sm" onClick={() => setShowUpload(true)}>
          <Plus className="h-4 w-4" /> Add Video
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-stone-300" />
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-400">
              <Video className="h-10 w-10 mb-3 text-stone-300" />
              <p className="text-sm">
                {search ? "No videos match your search." : "No videos in the library yet."}
              </p>
              {!search && (
                <Button size="sm" variant="secondary" className="mt-4" onClick={() => setShowUpload(true)}>
                  <Plus className="h-4 w-4" /> Add your first video
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left">
                    <th className="px-4 py-3 font-medium text-stone-500 w-16">Thumb</th>
                    <th className="px-4 py-3 font-medium text-stone-500">Title</th>
                    <th className="px-4 py-3 font-medium text-stone-500">Added by</th>
                    <th className="px-4 py-3 font-medium text-stone-500">Assignments</th>
                    <th className="px-4 py-3 font-medium text-stone-500">Date Added</th>
                    <th className="px-4 py-3 font-medium text-stone-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {videos.map((video) => {
                    const thumb = getThumbnailUrl(video.videoUrl);
                    return (
                      <tr key={video.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt={video.name}
                              className="h-10 w-16 rounded object-cover border border-stone-200"
                            />
                          ) : (
                            <div className="h-10 w-16 rounded bg-stone-100 flex items-center justify-center">
                              <Video className="h-4 w-4 text-stone-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={video.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-stone-900 hover:underline flex items-center gap-1"
                          >
                            {video.name}
                            <ExternalLink className="h-3 w-3 text-stone-400" />
                          </a>
                        </td>
                        <td className="px-4 py-3 text-stone-500">
                          {video.createdBy
                            ? `${video.createdBy.firstName} ${video.createdBy.lastName}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-stone-500 tabular-nums">
                          {video._count.assignments}
                        </td>
                        <td className="px-4 py-3 text-stone-400">
                          {fmtDate(video.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {confirmDeleteId === video.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-red-600">Delete?</span>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => del.mutate({ id: video.id })}
                                disabled={del.isPending}
                              >
                                {del.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDeleteId(video.id)}
                            >
                              <Trash2 className="h-4 w-4 text-stone-400" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showUpload && (
        <UploadVideoModal
          onClose={() => setShowUpload(false)}
          onCreated={() => utils.videos.list.invalidate()}
        />
      )}
    </div>
  );
}
