"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Users, Globe, Lock, Image as ImageIcon, X,
  Loader2, ChevronDown, Upload, ChevronLeft, ChevronRight,
  MessageSquare, CreditCard, Settings, Send, Dumbbell, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

const LIFECYCLE_STAGES = [
  { value: "", label: "None — don't change lifecycle" },
  { value: "LEAD", label: "Lead" },
  { value: "PROSPECT", label: "Prospect" },
  { value: "CLIENT", label: "Client" },
  { value: "MEMBER", label: "Member" },
  { value: "ALUMNI", label: "Alumni" },
];

type Section = "settings" | "members" | "feed" | "payments";

const NAV_ITEMS: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "settings", label: "Settings",  icon: Settings },
  { id: "members",  label: "Members",   icon: Users },
  { id: "feed",     label: "Feed",      icon: MessageSquare },
  { id: "payments", label: "Payments",  icon: CreditCard },
];

// Placeholder for sections that need a saved group first
function PendingSection({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white flex flex-col items-center justify-center py-20 gap-3 text-stone-400">
      <div className="h-12 w-12 rounded-xl bg-stone-100 flex items-center justify-center">
        {label === "Members"  && <Users      className="h-6 w-6 text-stone-300" />}
        {label === "Feed"     && <MessageSquare className="h-6 w-6 text-stone-300" />}
        {label === "Payments" && <CreditCard className="h-6 w-6 text-stone-300" />}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-stone-500">{label} not available yet</p>
        <p className="text-xs text-stone-400 mt-0.5">Create the group first, then access {label.toLowerCase()} here</p>
      </div>
    </div>
  );
}

export default function NewGroupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [section, setSection] = useState<Section>("settings");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [maxMembers, setMaxMembers] = useState("");
  const [lifecycleOnJoin, setLifecycleOnJoin] = useState("");
  const [allowClientPosts, setAllowClientPosts] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) { toast("error", "Please select an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast("error", "Image must be under 10MB"); return; }
    setImageUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("bucket", "group-images");
      form.append("path", "group-images");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      const { url } = await res.json();
      setImageUrl(url);
    } catch (e: unknown) {
      toast("error", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setImageUploading(false);
    }
  }

  const create = trpc.groups.create.useMutation({
    onSuccess: (group) => {
      toast("success", `Group "${group.name}" created`);
      router.push(`/admin/groups/${group.id}`);
    },
    onError: (e) => toast("error", e.message),
  });

  function handleSubmit() {
    if (!name.trim()) return;
    create.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      imageUrl: imageUrl ?? undefined,
      isPublic,
      maxMembers: maxMembers ? parseInt(maxMembers) : undefined,
      lifecycleOnJoin: lifecycleOnJoin || undefined,
      allowClientPosts,
    });
  }

  const canSubmit = name.trim().length > 0 && !create.isPending;

  function renderSection() {
    if (section === "members")  return <PendingSection label="Members" />;
    if (section === "feed")     return <PendingSection label="Feed" />;
    if (section === "payments") return <PendingSection label="Payments" />;

    // Settings = creation form
    return (
      <div className="space-y-5">
        {/* Image + name card */}
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
          />

          {imageUrl ? (
            <div className="relative h-44">
              <img src={imageUrl} alt="Group image" className="w-full h-full object-cover" />
              <button onClick={() => setImageUrl(null)}
                className="absolute top-3 right-3 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors">
                <X className="h-4 w-4" />
              </button>
              <button onClick={() => imageInputRef.current?.click()}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5 text-xs text-white hover:bg-black/70 transition-colors">
                <Upload className="h-3 w-3" /> Change
              </button>
            </div>
          ) : (
            <div
              onClick={() => !imageUploading && imageInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setImageDragOver(true); }}
              onDragLeave={() => setImageDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setImageDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadImage(f); }}
              className={`h-44 flex flex-col items-center justify-center gap-2 border-b border-stone-200 cursor-pointer transition-colors ${imageDragOver ? "bg-stone-100" : "bg-stone-50 hover:bg-stone-100"}`}
            >
              {imageUploading ? (
                <><Loader2 className="h-6 w-6 animate-spin text-stone-400" /><p className="text-sm text-stone-400">Uploading…</p></>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-xl bg-white border border-stone-200 shadow-sm flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-stone-400" />
                  </div>
                  <p className="text-sm font-medium text-stone-600">{imageDragOver ? "Drop to upload" : "Add a group image"}</p>
                  <p className="text-xs text-stone-400">Drag & drop or click · JPG, PNG, WebP · Max 10MB</p>
                </>
              )}
            </div>
          )}

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Group Name <span className="text-red-400">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 8-Week Challenge, Morning Crew…"
                autoFocus
                className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this group for? (optional)"
                rows={2}
                className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm placeholder:text-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Visibility</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setIsPublic(false)}
              className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors ${!isPublic ? "border-stone-900 bg-stone-50" : "border-stone-200 hover:border-stone-300"}`}>
              <Lock className={`h-4 w-4 mt-0.5 shrink-0 ${!isPublic ? "text-stone-900" : "text-stone-400"}`} />
              <div>
                <p className={`text-sm font-medium ${!isPublic ? "text-stone-900" : "text-stone-600"}`}>Private</p>
                <p className="text-xs text-stone-400 mt-0.5">Only staff can add members</p>
              </div>
            </button>
            <button onClick={() => setIsPublic(true)}
              className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors ${isPublic ? "border-stone-900 bg-stone-50" : "border-stone-200 hover:border-stone-300"}`}>
              <Globe className={`h-4 w-4 mt-0.5 shrink-0 ${isPublic ? "text-stone-900" : "text-stone-400"}`} />
              <div>
                <p className={`text-sm font-medium ${isPublic ? "text-stone-900" : "text-stone-600"}`}>Public</p>
                <p className="text-xs text-stone-400 mt-0.5">Clients can join via a link</p>
              </div>
            </button>
          </div>
        </div>

        {/* Membership */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Membership</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Max Members</label>
              <input type="number" min={1} value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)}
                placeholder="Unlimited"
                className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400" />
              <p className="text-xs text-stone-400 mt-1">Leave blank for unlimited</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Lifecycle Stage on Join</label>
              <div className="relative">
                <select value={lifecycleOnJoin} onChange={(e) => setLifecycleOnJoin(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white pr-8">
                  {LIFECYCLE_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
              </div>
              <p className="text-xs text-stone-400 mt-1">Auto-updates stage when member joins</p>
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Feed</p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={allowClientPosts} onChange={(e) => setAllowClientPosts(e.target.checked)}
              className="w-4 h-4 accent-stone-800 cursor-pointer mt-0.5" />
            <div>
              <p className="text-sm font-medium text-stone-700">Allow clients to post</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {allowClientPosts ? "Members can create posts in the group feed." : "Only staff can post. Members can still comment."}
              </p>
            </div>
          </label>
        </div>

        {/* Preview */}
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Preview</p>
          <div className="flex items-center gap-3 bg-white rounded-lg border border-stone-200 px-4 py-3">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-stone-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{name || <span className="text-stone-400 font-normal">Group name</span>}</p>
              <p className="text-xs text-stone-400 truncate">{description || "No description"}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isPublic
                ? <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200"><Globe className="h-3 w-3" /> Public</span>
                : <span className="inline-flex items-center gap-1 text-xs text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200"><Lock className="h-3 w-3" /> Private</span>
              }
              <span className="text-xs text-stone-400">0 members</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pb-8">
          <Link href="/admin/groups">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {create.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
              : <><Users className="h-4 w-4" /> Create Group</>
            }
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back */}
      <Link href="/admin/groups" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
        <ArrowLeft className="h-4 w-4" /> Back to groups
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-stone-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-stone-500" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-stone-900">{name || "New Group"}</h1>
            <p className="text-sm text-stone-400">Fill out the Settings tab to create this group</p>
          </div>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex gap-4 items-start">
        {/* Sidebar */}
        <div className={`shrink-0 rounded-xl border border-stone-200 bg-white overflow-hidden transition-all ${sidebarCollapsed ? "w-12" : "w-52"}`}>
          <div className={`flex items-center border-b border-stone-100 px-3 py-3 ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
            {!sidebarCollapsed && <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Group</span>}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-stone-400 hover:text-stone-700 p-0.5">
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          <nav className="py-1">
            {NAV_ITEMS.map(({ id: navId, label, icon: Icon }) => {
              const active = section === navId;
              const isPending = navId !== "settings";
              return (
                <button key={navId} onClick={() => setSection(navId)} title={sidebarCollapsed ? label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    active ? "bg-stone-100 text-stone-900 font-medium" : isPending ? "text-stone-400 hover:bg-stone-50 hover:text-stone-600" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  } ${sidebarCollapsed ? "justify-center" : ""}`}
                >
                  <Icon className="shrink-0 h-4 w-4" />
                  {!sidebarCollapsed && <span className="truncate">{label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
