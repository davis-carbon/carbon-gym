"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Plus, Search, Loader2, Trash2, Image as ImageIcon, Video, ExternalLink } from "lucide-react";

// ── Add Photo/Video Modal ─────────────────────────────────────────────────────

function AddPhotoModal({
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
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [videoUrl, setVideoUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [takenAt, setTakenAt] = useState(() => new Date().toISOString().split("T")[0]);

  const create = trpc.progressPhotos.create.useMutation({
    onSuccess: () => {
      toast("success", "Progress photo added");
      utils.progressPhotos.listForClient.invalidate({ clientId });
      handleClose();
    },
    onError: (e) => toast("error", e.message),
  });

  function handleClose() {
    setMode("upload");
    setVideoUrl("");
    setCaption("");
    setTakenAt(new Date().toISOString().split("T")[0]);
    onClose();
  }

  function handleSave() {
    if (mode === "upload") {
      return toast("info", "File upload coming soon — use the video link option for now");
    }
    if (!videoUrl.trim()) return toast("error", "Please enter a YouTube or Vimeo link");
    create.mutate({
      clientId,
      videoUrl: videoUrl.trim(),
      caption: caption.trim() || undefined,
      takenAt: takenAt ? new Date(takenAt) : undefined,
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Progress Photo/Video"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Upload zone */}
        {mode === "upload" && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-200 py-8 text-center">
            <div className="rounded-full bg-stone-100 p-2">
              <ImageIcon className="h-5 w-5 text-stone-400" />
            </div>
            <p className="text-sm text-stone-600">
              <span className="font-medium text-stone-800 underline cursor-pointer">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-stone-400">Upload a photo or video (the photo must not exceed 8MB.)</p>
          </div>
        )}

        {/* Link to video */}
        <button
          type="button"
          onClick={() => setMode(mode === "link" ? "upload" : "link")}
          className="text-sm text-stone-500 underline hover:text-stone-700"
        >
          {mode === "link" ? "← Back to upload" : "Or, add a YouTube/Vimeo link"}
        </button>

        {mode === "link" && (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Video URL</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Caption</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
          <div className="relative">
            <input
              type="date"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Photo/video card ──────────────────────────────────────────────────────────

function PhotoCard({
  photo,
  onDelete,
}: {
  photo: {
    id: string;
    fileUrl: string | null;
    videoUrl: string | null;
    caption: string | null;
    takenAt: Date;
  };
  onDelete: () => void;
}) {
  const url = photo.fileUrl ?? photo.videoUrl ?? "";
  const isVideo = Boolean(photo.videoUrl) || /\.(mp4|mov|webm)$/i.test(url);

  return (
    <div className="group relative rounded-xl border border-stone-200 overflow-hidden bg-stone-50 hover:border-stone-300 transition-colors">
      {/* Thumbnail area */}
      <div className="aspect-[4/3] w-full flex items-center justify-center bg-stone-100">
        {photo.fileUrl && /\.(png|jpe?g|gif|webp)$/i.test(photo.fileUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.fileUrl} alt={photo.caption ?? "Progress photo"} className="h-full w-full object-cover" />
        ) : isVideo ? (
          <Video className="h-10 w-10 text-stone-300" />
        ) : (
          <ImageIcon className="h-10 w-10 text-stone-300" />
        )}
      </div>

      {/* Meta */}
      <div className="px-3 py-2">
        <p className="text-xs text-stone-500">
          {new Date(photo.takenAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
        {photo.caption && <p className="text-xs text-stone-700 mt-0.5 truncate">{photo.caption}</p>}
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-stone-600 shadow-sm hover:bg-white"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-stone-600 shadow-sm hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProgressPhotosTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);

  const { data: photos = [], isLoading } = trpc.progressPhotos.listForClient.useQuery({ clientId });

  const del = trpc.progressPhotos.delete.useMutation({
    onSuccess: () => {
      toast("success", "Photo removed");
      utils.progressPhotos.listForClient.invalidate({ clientId });
    },
    onError: (e) => toast("error", e.message),
  });

  return (
    <>
      <div className="rounded-xl border border-stone-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">
            Progress Photo {isLoading ? "" : photos.length}
          </h3>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Progress Photo/Video
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-stone-400">
            <Search className="h-8 w-8" />
            <p className="text-sm">No progress photos or videos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p) => (
              <PhotoCard
                key={p.id}
                photo={p}
                onDelete={() => {
                  if (confirm("Delete this progress photo?")) del.mutate({ id: p.id });
                }}
              />
            ))}
          </div>
        )}
      </div>

      <AddPhotoModal open={addOpen} onClose={() => setAddOpen(false)} clientId={clientId} />
    </>
  );
}
