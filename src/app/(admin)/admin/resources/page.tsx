"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import {
  Plus, FileText, Image as ImageIcon, Video as VideoIcon,
  Trash2, Pencil, Download, Loader2,
} from "lucide-react";

interface ResourceForm {
  name: string;
  description: string;
  fileUrl: string;
  fileType: string;
  category: string;
}

function iconFor(fileType: string | null, fileUrl: string) {
  const mime = (fileType ?? "").toLowerCase();
  const url = fileUrl.toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/.test(url)) return <ImageIcon className="h-5 w-5 text-stone-600" />;
  if (mime.startsWith("video/") || /\.(mp4|mov|webm)$/.test(url)) return <VideoIcon className="h-5 w-5 text-stone-600" />;
  return <FileText className="h-5 w-5 text-stone-600" />;
}

function prettyType(fileType: string | null, fileUrl: string) {
  if (fileType) return fileType.split("/").pop()?.toUpperCase() ?? fileType;
  const ext = fileUrl.split(".").pop()?.toUpperCase();
  return ext ?? "File";
}

const emptyForm: ResourceForm = { name: "", description: "", fileUrl: "", fileType: "", category: "" };

export default function ResourcesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ResourceForm>(emptyForm);
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data: resources, isLoading } = trpc.resources.list.useQuery({ category: categoryFilter || undefined });

  const createResource = trpc.resources.create.useMutation({
    onSuccess: () => {
      toast("success", "Resource created");
      utils.resources.list.invalidate();
      closeModal();
    },
    onError: (err) => toast("error", err.message),
  });

  const updateResource = trpc.resources.update.useMutation({
    onSuccess: () => {
      toast("success", "Resource updated");
      utils.resources.list.invalidate();
      closeModal();
    },
    onError: (err) => toast("error", err.message),
  });

  const deleteResource = trpc.resources.delete.useMutation({
    onSuccess: () => {
      toast("success", "Resource deleted");
      utils.resources.list.invalidate();
    },
    onError: (err) => toast("error", err.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(r: {
    id: string; name: string; description: string | null; fileUrl: string;
    fileType: string | null; category: string | null;
  }) {
    setEditingId(r.id);
    setForm({
      name: r.name,
      description: r.description ?? "",
      fileUrl: r.fileUrl,
      fileType: r.fileType ?? "",
      category: r.category ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleSubmit() {
    if (editingId) {
      updateResource.mutate({
        id: editingId,
        name: form.name,
        description: form.description || null,
        fileUrl: form.fileUrl,
        fileType: form.fileType || null,
        category: form.category || null,
      });
    } else {
      createResource.mutate({
        name: form.name,
        description: form.description || undefined,
        fileUrl: form.fileUrl,
        fileType: form.fileType || undefined,
        category: form.category || undefined,
      });
    }
  }

  // Collect unique categories from current list for filter select
  const categories = Array.from(new Set((resources ?? []).map((r) => r.category).filter(Boolean))) as string[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Resources</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Upload Resource
        </Button>
      </div>

      {categories.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {categoryFilter && (
            <button onClick={() => setCategoryFilter("")} className="text-xs text-stone-500 hover:text-stone-700 underline">
              Clear
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>
      ) : (resources ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white py-16 text-center">
          <FileText className="h-8 w-8 text-stone-400 mx-auto mb-3" />
          <p className="text-sm text-stone-500">No resources yet. Upload one to share with clients.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(resources ?? []).map((r) => (
            <div key={r.id} className="rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-stone-100 p-2 flex-shrink-0">
                  {iconFor(r.fileType, r.fileUrl)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-stone-900 truncate">{r.name}</h3>
                  </div>
                  {r.description && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{r.description}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline">{prettyType(r.fileType, r.fileUrl)}</Badge>
                    {r.category && <Badge variant="info">{r.category}</Badge>}
                    <span className="text-xs text-stone-400">{r._count.assignments} assigned</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                <a
                  href={r.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900"
                >
                  <Download className="h-3 w-3" /> Open
                </a>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(r)} className="text-stone-400 hover:text-stone-600 p-1" aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete "${r.name}"? This will remove all client assignments.`)) deleteResource.mutate({ id: r.id }); }}
                    className="text-stone-400 hover:text-red-500 p-1"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Resource" : "Upload Resource"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name || !form.fileUrl || createResource.isPending || updateResource.isPending}
            >
              {(createResource.isPending || updateResource.isPending) ? "Saving..." : editingId ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Beginner Program Handbook"
          />
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional — shown to clients"
              rows={2}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">File</label>
            <FileUpload
              bucket="resources"
              label="Upload PDF, image, video, etc."
              currentUrl={form.fileUrl || null}
              onUploaded={(url) => {
                // Try to infer file type from URL
                const ext = url.split(".").pop()?.toLowerCase() ?? "";
                let mime = form.fileType;
                if (!mime) {
                  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) mime = `image/${ext === "jpg" ? "jpeg" : ext}`;
                  else if (["mp4", "mov", "webm"].includes(ext)) mime = `video/${ext}`;
                  else if (ext === "pdf") mime = "application/pdf";
                }
                setForm({ ...form, fileUrl: url, fileType: mime });
              }}
              maxSizeMB={25}
            />
          </div>
          <Input
            label="Category (optional)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="e.g. Nutrition, Onboarding, Recovery"
          />
        </div>
      </Modal>
    </div>
  );
}
