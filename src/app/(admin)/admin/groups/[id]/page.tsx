"use client";

import { use, useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, Loader2, Search, MessageSquare, Users,
  Settings, Megaphone, Pin, Globe, Lock, Send, Dumbbell, FileText,
  ChevronRight, ChevronLeft, CalendarDays, X, Check, Image as ImageIcon, Upload,
  CreditCard, MoreVertical, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

type Section = "members" | "feed" | "payments" | "settings";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const LIFECYCLE_COLORS: Record<string, string> = {
  LEAD:     "bg-stone-100 text-stone-600",
  PROSPECT: "bg-amber-100 text-amber-700",
  CLIENT:   "bg-emerald-100 text-emerald-700",
  MEMBER:   "bg-blue-100 text-blue-700",
  ALUMNI:   "bg-purple-100 text-purple-700",
};

// ─── Send Message Modal ───────────────────────────────────────────────────────

function SendMessageModal({ groupId, groupName, memberCount, onClose }: {
  groupId: string; groupName: string; memberCount: number; onClose: () => void;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { textareaRef.current?.focus(); }, []);

  const createGroupThread = trpc.messages.createGroupThread.useMutation({
    onSuccess: () => {
      toast("success", `Message sent to ${memberCount} member${memberCount !== 1 ? "s" : ""}`);
      onClose();
    },
    onError: (e) => toast("error", e.message),
  });

  return (
    <Modal open onClose={onClose} title={`Message "${groupName}"`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => createGroupThread.mutate({ groupId, initialMessage: message.trim() })}
            disabled={!message.trim() || createGroupThread.isPending}
          >
            {createGroupThread.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to {memberCount} member{memberCount !== 1 ? "s" : ""}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-stone-500">
          Creates a group thread that all {memberCount} member{memberCount !== 1 ? "s" : ""} can see and reply to.
        </p>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your message…"
          rows={5}
          className="w-full resize-none rounded-lg border border-stone-300 px-3 py-2.5 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>
    </Modal>
  );
}

// ─── Assign Plan Modal ────────────────────────────────────────────────────────

function AssignPlanModal({ groupId, memberCount, onClose }: {
  groupId: string; memberCount: number; onClose: () => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");

  const { data: plans, isLoading } = trpc.plans.list.useQuery({ status: "PUBLISHED", search: search || undefined });

  const assignToGroup = trpc.plans.assignToGroup.useMutation({
    onSuccess: (res) => {
      toast("success", `Plan assigned to ${res.assigned} member${res.assigned !== 1 ? "s" : ""}`);
      onClose();
    },
    onError: (e) => toast("error", e.message),
  });

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);

  return (
    <Modal open onClose={onClose} title="Assign Workout Plan to Group"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => assignToGroup.mutate({ planId: selectedPlanId!, groupId, startDate: startDate ? new Date(startDate) : undefined })}
            disabled={!selectedPlanId || assignToGroup.isPending}
          >
            {assignToGroup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dumbbell className="h-4 w-4" />}
            Assign to {memberCount} member{memberCount !== 1 ? "s" : ""}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search published plans…"
            className="w-full rounded-lg border border-stone-300 pl-9 pr-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>

        <div className="max-h-52 overflow-y-auto rounded-lg border border-stone-200 divide-y divide-stone-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          ) : (plans?.length ?? 0) === 0 ? (
            <p className="text-center text-sm text-stone-400 py-6">No published plans found.</p>
          ) : plans!.map((plan) => (
            <button key={plan.id} onClick={() => setSelectedPlanId(plan.id === selectedPlanId ? null : plan.id)}
              className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-stone-50 transition-colors ${selectedPlanId === plan.id ? "bg-stone-50" : ""}`}
            >
              <div>
                <p className="text-sm font-medium text-stone-800">{plan.name}</p>
                <p className="text-xs text-stone-400">{plan.sizeWeeks} week{plan.sizeWeeks !== 1 ? "s" : ""}{plan.difficulty ? ` · ${plan.difficulty}` : ""}</p>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${selectedPlanId === plan.id ? "bg-stone-800 border-stone-800" : "border-stone-300"}`}>
                {selectedPlanId === plan.id && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <CalendarDays className="h-4 w-4 text-stone-400 shrink-0" />
          <div className="flex-1">
            <label className="block text-xs font-medium text-stone-600 mb-1">Start Date <span className="text-stone-400 font-normal">(optional)</span></label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
        </div>

        {selectedPlan && (
          <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-xs text-stone-600">
            <span className="font-medium">"{selectedPlan.name}"</span> will be assigned to all {memberCount} members. Members who already have it will be skipped.
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Assign Resource Modal ────────────────────────────────────────────────────

function AssignResourceModal({ groupId, memberCount, onClose }: {
  groupId: string; memberCount: number; onClose: () => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  const { data: resources, isLoading } = trpc.resources.list.useQuery({});
  const filtered = (resources ?? []).filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  const assignToGroup = trpc.resources.assignToGroup.useMutation({
    onSuccess: (res) => {
      toast("success", `Resource assigned to ${res.assigned} member${res.assigned !== 1 ? "s" : ""}`);
      onClose();
    },
    onError: (e) => toast("error", e.message),
  });

  const selectedResource = resources?.find((r) => r.id === selectedResourceId);

  return (
    <Modal open onClose={onClose} title="Assign Resource to Group"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => assignToGroup.mutate({ resourceId: selectedResourceId!, groupId })}
            disabled={!selectedResourceId || assignToGroup.isPending}
          >
            {assignToGroup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Assign to {memberCount} member{memberCount !== 1 ? "s" : ""}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources…"
            className="w-full rounded-lg border border-stone-300 pl-9 pr-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>

        <div className="max-h-52 overflow-y-auto rounded-lg border border-stone-200 divide-y divide-stone-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-stone-400 py-6">No resources found.</p>
          ) : filtered.map((r) => (
            <button key={r.id} onClick={() => setSelectedResourceId(r.id === selectedResourceId ? null : r.id)}
              className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-stone-50 transition-colors ${selectedResourceId === r.id ? "bg-stone-50" : ""}`}
            >
              <div>
                <p className="text-sm font-medium text-stone-800">{r.name}</p>
                <p className="text-xs text-stone-400">{r.category ?? r.fileType ?? "File"} · {r._count.assignments} assigned</p>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${selectedResourceId === r.id ? "bg-stone-800 border-stone-800" : "border-stone-300"}`}>
                {selectedResourceId === r.id && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
            </button>
          ))}
        </div>

        {selectedResource && (
          <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-xs text-stone-600">
            <span className="font-medium">"{selectedResource.name}"</span> will be assigned to all {memberCount} members. Members who already have it will be skipped.
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Members Section ──────────────────────────────────────────────────────────

function MembersSection({ groupId, group }: {
  groupId: string;
  group: {
    name: string;
    maxMembers: number | null;
    _count: { members: number };
    members: Array<{
      joinedAt: Date;
      client: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; profileImageUrl: string | null; lifecycleStage: string | null };
    }>;
  };
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data: clientsData } = trpc.clients.list.useQuery(
    { limit: 100, search: search || undefined },
    { enabled: showAdd },
  );

  const memberIds = new Set(group.members.map((m) => m.client.id));
  const availableClients = (clientsData?.clients ?? []).filter((c) => !memberIds.has(c.id));

  const addMember = trpc.groups.addMember.useMutation({
    onSuccess: () => {
      toast("success", "Member added");
      utils.groups.byId.invalidate({ id: groupId });
      utils.groups.list.invalidate();
      setShowAdd(false);
      setSearch("");
    },
    onError: (e) => toast("error", e.message),
  });

  const removeMember = trpc.groups.removeMember.useMutation({
    onSuccess: () => { toast("success", "Member removed"); utils.groups.byId.invalidate({ id: groupId }); utils.groups.list.invalidate(); },
    onError: (e) => toast("error", e.message),
  });

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-stone-900">Members</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            {group._count.members}{group.maxMembers ? ` / ${group.maxMembers}` : ""} member{group._count.members !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="h-4 w-4" /> Add Member
        </Button>
      </div>

      {/* Add member search */}
      {showAdd && (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-stone-700">Search clients</p>
            <button onClick={() => { setShowAdd(false); setSearch(""); }} className="text-stone-400 hover:text-stone-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients to add…"
              className="w-full rounded-lg border border-stone-300 pl-10 pr-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
              autoFocus
            />
          </div>
          {search.length >= 2 && (
            <div className="mt-2 max-h-48 overflow-y-auto border border-stone-200 rounded-lg">
              {availableClients.length === 0 ? (
                <p className="px-3 py-4 text-sm text-stone-400 text-center">No clients found.</p>
              ) : availableClients.slice(0, 20).map((c) => (
                <button key={c.id}
                  onClick={() => addMember.mutate({ groupId, clientId: c.id })}
                  disabled={addMember.isPending}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 border-b border-stone-100 last:border-0 flex items-center gap-2"
                >
                  <Avatar name={`${c.firstName} ${c.lastName}`} size="sm" />
                  <span className="font-medium">{c.firstName} {c.lastName}</span>
                  {c.email && <span className="text-xs text-stone-400">{c.email}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members list */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Member</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Joined</p>
        </div>

        {group.members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Users className="h-8 w-8 text-stone-200" />
            <p className="text-sm text-stone-400">No members yet.</p>
            <button onClick={() => setShowAdd(true)} className="text-xs text-stone-500 hover:text-stone-800 underline">Add the first member</button>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {group.members.map((m) => {
              const lifecycle = (m.client as unknown as { lifecycleStage?: string | null }).lifecycleStage ?? null;
              return (
                <div key={m.client.id} className="flex items-center px-4 py-3 hover:bg-stone-50 group transition-colors">
                  <Link href={`/admin/clients/${m.client.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar name={`${m.client.firstName} ${m.client.lastName}`} src={m.client.profileImageUrl ?? undefined} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-stone-800">{m.client.firstName} {m.client.lastName}</p>
                        {lifecycle && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${LIFECYCLE_COLORS[lifecycle] ?? "bg-stone-100 text-stone-500"}`}>
                            {lifecycle.charAt(0) + lifecycle.slice(1).toLowerCase()}
                          </span>
                        )}
                      </div>
                      {m.client.email && <p className="text-xs text-stone-400 truncate">{m.client.email}</p>}
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <p className="text-xs text-stone-400">{fmtDate(m.joinedAt)}</p>
                    <button
                      onClick={() => { if (confirm(`Remove ${m.client.firstName} from this group?`)) removeMember.mutate({ groupId, clientId: m.client.id }); }}
                      className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feed Section ─────────────────────────────────────────────────────────────

type Post = {
  id: string; content: string; mediaUrl: string | null;
  isAnnouncement: boolean; isPinned: boolean; createdAt: Date; updatedAt: Date;
  staffAuthor: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
  clientAuthor: { id: string; firstName: string; lastName: string; profileImageUrl: string | null } | null;
  comments: {
    id: string; content: string; createdAt: Date;
    staffAuthor: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
    clientAuthor: { id: string; firstName: string; lastName: string; profileImageUrl: string | null } | null;
  }[];
  _count: { comments: number };
};

function PostCard({ post, groupId, onDeleted }: { post: Post; groupId: string; onDeleted: () => void }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const deletePost = trpc.groups.deletePost.useMutation({
    onSuccess: () => { toast("success", "Post deleted"); onDeleted(); },
    onError: (e) => toast("error", e.message),
  });
  const addComment = trpc.groups.addComment.useMutation({
    onSuccess: () => { setCommentText(""); utils.groups.listPosts.invalidate({ groupId }); },
    onError: (e) => toast("error", e.message),
  });
  const deleteComment = trpc.groups.deleteComment.useMutation({
    onSuccess: () => utils.groups.listPosts.invalidate({ groupId }),
    onError: (e) => toast("error", e.message),
  });

  const authorName = post.staffAuthor
    ? `${post.staffAuthor.firstName} ${post.staffAuthor.lastName}`
    : post.clientAuthor ? `${post.clientAuthor.firstName} ${post.clientAuthor.lastName}` : "Unknown";
  const authorAvatar = post.staffAuthor?.avatarUrl ?? post.clientAuthor?.profileImageUrl ?? null;

  return (
    <div className={`rounded-xl border bg-white p-4 space-y-3 ${post.isPinned ? "border-stone-400" : "border-stone-200"}`}>
      {(post.isPinned || post.isAnnouncement) && (
        <div className="flex gap-2">
          {post.isPinned && <span className="inline-flex items-center gap-1 text-xs text-stone-500 font-medium"><Pin className="h-3 w-3" /> Pinned</span>}
          {post.isAnnouncement && <Badge variant="info" className="gap-1"><Megaphone className="h-3 w-3" /> Announcement</Badge>}
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar name={authorName} src={authorAvatar ?? undefined} size="sm" />
          <div>
            <p className="text-sm font-medium">{authorName}</p>
            <p className="text-xs text-stone-400">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownItem danger onClick={() => { if (confirm("Delete this post?")) deletePost.mutate({ id: post.id }); }}>
            <Trash2 className="h-4 w-4" /> Delete Post
          </DropdownItem>
        </DropdownMenu>
      </div>
      <p className="text-sm text-stone-700 whitespace-pre-wrap">{post.content}</p>
      {post.mediaUrl && <img src={post.mediaUrl} alt="" className="rounded-lg max-h-80 w-full object-cover border border-stone-100" />}
      <button onClick={() => setShowComments((v) => !v)} className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1">
        <MessageSquare className="h-3.5 w-3.5" />
        {post._count.comments > 0 ? `${post._count.comments} comment${post._count.comments !== 1 ? "s" : ""}` : "Add a comment"}
      </button>
      {showComments && (
        <div className="space-y-3 pt-2 border-t border-stone-100">
          {post.comments.map((c) => {
            const cName = c.staffAuthor ? `${c.staffAuthor.firstName} ${c.staffAuthor.lastName}` : c.clientAuthor ? `${c.clientAuthor.firstName} ${c.clientAuthor.lastName}` : "Unknown";
            return (
              <div key={c.id} className="flex items-start gap-2 group">
                <Avatar name={cName} src={c.staffAuthor?.avatarUrl ?? c.clientAuthor?.profileImageUrl ?? undefined} size="sm" />
                <div className="flex-1 bg-stone-50 rounded-lg px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium">{cName}</span>
                    <span className="text-xs text-stone-400">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-xs text-stone-700 mt-0.5">{c.content}</p>
                </div>
                <button onClick={() => deleteComment.mutate({ id: c.id })} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all mt-1">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          <div className="flex items-center gap-2">
            <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && commentText.trim()) { e.preventDefault(); addComment.mutate({ postId: post.id, content: commentText.trim() }); } }}
              placeholder="Write a comment…"
              className="flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
            <button onClick={() => { if (commentText.trim()) addComment.mutate({ postId: post.id, content: commentText.trim() }); }} disabled={!commentText.trim() || addComment.isPending} className="text-stone-500 hover:text-stone-900 disabled:opacity-30">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedSection({ groupId }: { groupId: string }) {
  const [content, setContent] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.groups.listPosts.useQuery({ groupId });
  const createPost = trpc.groups.createPost.useMutation({
    onSuccess: () => { setContent(""); setIsAnnouncement(false); setIsPinned(false); utils.groups.listPosts.invalidate({ groupId }); },
    onError: (e) => toast("error", e.message),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-stone-900">Group Feed</h2>
      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write a post for the group…" rows={3}
          className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-stone-600">
              <input type="checkbox" checked={isAnnouncement} onChange={(e) => setIsAnnouncement(e.target.checked)} className="rounded" />
              <Megaphone className="h-3.5 w-3.5" /> Announcement
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-stone-600">
              <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="rounded" />
              <Pin className="h-3.5 w-3.5" /> Pin post
            </label>
          </div>
          <Button size="sm" onClick={() => { if (content.trim()) createPost.mutate({ groupId, content: content.trim(), isAnnouncement, isPinned }); }} disabled={!content.trim() || createPost.isPending}>
            {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Post
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">No posts yet.</div>
      ) : (
        <div className="space-y-3">
          {data!.items.map((post) => (
            <PostCard key={post.id} post={post} groupId={groupId} onDeleted={() => utils.groups.listPosts.invalidate({ groupId })} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings Section ─────────────────────────────────────────────────────────

const LIFECYCLE_STAGES = [
  { value: "", label: "None" },
  { value: "LEAD", label: "Lead" },
  { value: "PROSPECT", label: "Prospect" },
  { value: "CLIENT", label: "Client" },
  { value: "MEMBER", label: "Member" },
  { value: "ALUMNI", label: "Alumni" },
];

function SettingsSection({ groupId, group }: {
  groupId: string;
  group: { name: string; description: string | null; imageUrl?: string | null; isPublic: boolean; publicSlug: string | null; maxMembers: number | null; lifecycleOnJoin: string | null; allowClientPosts: boolean };
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    name: group.name, description: group.description ?? "",
    imageUrl: group.imageUrl ?? null,
    isPublic: group.isPublic, maxMembers: group.maxMembers ? String(group.maxMembers) : "",
    lifecycleOnJoin: group.lifecycleOnJoin ?? "", allowClientPosts: group.allowClientPosts,
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) { toast("error", "Please select an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast("error", "Image must be under 10MB"); return; }
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "group-images");
      fd.append("path", "group-images");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      const { url } = await res.json();
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (e: unknown) {
      toast("error", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setImageUploading(false);
    }
  }
  const update = trpc.groups.update.useMutation({
    onSuccess: () => { toast("success", "Settings saved"); utils.groups.byId.invalidate({ id: groupId }); utils.groups.list.invalidate(); },
    onError: (e) => toast("error", e.message),
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-base font-semibold text-stone-900">Group Settings</h2>

      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">General</p>

        {/* Group image */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Group Image</label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }}
          />
          {form.imageUrl ? (
            <div className="relative rounded-lg overflow-hidden border border-stone-200 h-36">
              <img src={form.imageUrl} alt="Group image" className="w-full h-full object-cover" />
              <button
                onClick={() => setForm((f) => ({ ...f, imageUrl: null }))}
                className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => imageInputRef.current?.click()}
                className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/50 px-2.5 py-1 text-xs text-white hover:bg-black/70 transition-colors"
              >
                <Upload className="h-3 w-3" /> Change
              </button>
            </div>
          ) : (
            <div
              onClick={() => !imageUploading && imageInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setImageDragOver(true); }}
              onDragLeave={() => setImageDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setImageDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadImage(f); }}
              className={`h-32 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                imageDragOver ? "border-stone-400 bg-stone-100" : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-stone-100"
              }`}
            >
              {imageUploading ? (
                <><Loader2 className="h-5 w-5 animate-spin text-stone-400" /><p className="text-xs text-stone-400">Uploading…</p></>
              ) : (
                <>
                  <ImageIcon className="h-5 w-5 text-stone-300" />
                  <p className="text-xs text-stone-500">{imageDragOver ? "Drop to upload" : "Click or drag & drop an image"}</p>
                  <p className="text-xs text-stone-400">JPG, PNG, WebP · Max 10MB</p>
                </>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Group Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Max Members <span className="text-stone-400 font-normal text-xs">(blank = unlimited)</span></label>
          <input type="number" value={form.maxMembers} onChange={(e) => setForm({ ...form, maxMembers: e.target.value })} placeholder="Unlimited"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Joining</p>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Lifecycle Stage on Join</label>
          <select value={form.lifecycleOnJoin} onChange={(e) => setForm({ ...form, lifecycleOnJoin: e.target.value })}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none"
          >
            {LIFECYCLE_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <p className="text-xs text-stone-400 mt-1">Automatically updates each new member&apos;s lifecycle stage when they join.</p>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Visibility</p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} className="rounded mt-0.5" />
          <div>
            <p className="text-sm font-medium text-stone-700 flex items-center gap-1.5">
              {form.isPublic ? <Globe className="h-3.5 w-3.5 text-blue-500" /> : <Lock className="h-3.5 w-3.5" />}
              {form.isPublic ? "Public Group" : "Private Group"}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              {form.isPublic ? "Clients can find and join via a public link." : "Only staff can add members."}
            </p>
          </div>
        </label>
        {form.isPublic && group.publicSlug && (
          <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2">
            <p className="text-xs text-stone-500 font-medium mb-0.5">Public URL</p>
            <p className="text-xs font-mono text-stone-700 break-all">{appUrl}/join/{group.publicSlug}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Posts</p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.allowClientPosts} onChange={(e) => setForm({ ...form, allowClientPosts: e.target.checked })} className="rounded mt-0.5" />
          <div>
            <p className="text-sm font-medium text-stone-700">Allow clients to post</p>
            <p className="text-xs text-stone-400 mt-0.5">
              {form.allowClientPosts ? "Members can create posts in the group feed." : "Only staff can post. Members can still comment."}
            </p>
          </div>
        </label>
      </div>

      <Button onClick={() => update.mutate({ id: groupId, name: form.name, description: form.description || null, imageUrl: form.imageUrl ?? null, isPublic: form.isPublic, maxMembers: form.maxMembers ? parseInt(form.maxMembers) : null, lifecycleOnJoin: form.lifecycleOnJoin || null, allowClientPosts: form.allowClientPosts })} disabled={update.isPending}>
        {update.isPending ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}

// ─── Payments Section ─────────────────────────────────────────────────────────

type PaymentSubTab = "subscriptions" | "charges" | "invoices" | "account-balance" | "service-balance" | "online-training";

const PAYMENT_SUB_TABS: { id: PaymentSubTab; label: string }[] = [
  { id: "subscriptions",   label: "Subscriptions" },
  { id: "charges",         label: "Charges" },
  { id: "invoices",        label: "Invoices" },
  { id: "account-balance", label: "Account Balance" },
  { id: "service-balance", label: "Service Balance" },
  { id: "online-training", label: "Online Training" },
];

function fmt$(n: number) { return `$${n.toFixed(2)}`; }
function fmtD(d: Date | string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

function MemberCell({ client }: { client: { id: string; firstName: string; lastName: string; profileImageUrl?: string | null } }) {
  return (
    <div className="flex items-center gap-2">
      {client.profileImageUrl ? (
        <img src={client.profileImageUrl} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
      ) : (
        <div className="h-7 w-7 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-semibold text-stone-500">{client.firstName[0]}{client.lastName[0]}</span>
        </div>
      )}
      <span className="text-sm font-medium text-stone-800">{client.firstName} {client.lastName}</span>
    </div>
  );
}

function PaymentEmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-stone-400">
      <CreditCard className="h-7 w-7" />
      <p className="text-sm font-medium text-stone-500">{text}</p>
    </div>
  );
}

// Subscriptions sub-tab
function GroupSubscriptionsTab({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const { data: subs = [], isLoading } = trpc.groups.listMemberSubscriptions.useQuery({ groupId, status: filterStatus || undefined });

  const cancel = trpc.schedule.clientPackages.cancel.useMutation({
    onSuccess: () => { toast("success", "Subscription cancelled"); utils.groups.listMemberSubscriptions.invalidate({ groupId }); },
    onError: (e) => toast("error", e.message),
  });
  const pause = trpc.schedule.clientPackages.pause.useMutation({
    onSuccess: () => { toast("success", "Paused"); utils.groups.listMemberSubscriptions.invalidate({ groupId }); },
    onError: (e) => toast("error", e.message),
  });
  const resume = trpc.schedule.clientPackages.resume.useMutation({
    onSuccess: () => { toast("success", "Resumed"); utils.groups.listMemberSubscriptions.invalidate({ groupId }); },
    onError: (e) => toast("error", e.message),
  });

  const filtered = subs.filter((s) => {
    if (!filterSearch) return true;
    const name = `${s.client.firstName} ${s.client.lastName}`.toLowerCase();
    return name.includes(filterSearch.toLowerCase()) || s.package.name.toLowerCase().includes(filterSearch.toLowerCase());
  });

  const activeCount = subs.filter((s) => s.status === "active").length;
  const mrr = subs.filter((s) => s.status === "active" && s.package.billingCycle === "MONTHLY").reduce((n, s) => n + s.package.price, 0);

  const statusBadge = (status: string) => {
    if (status === "active") return <Badge variant="success">Active</Badge>;
    if (status === "paused") return <Badge variant="warning">Paused</Badge>;
    if (status === "cancelled") return <Badge variant="danger">Cancelled</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Total Subscriptions</p>
          <p className="text-2xl font-bold text-stone-900">{subs.length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 mb-1">Monthly Recurring</p>
          <p className="text-2xl font-bold text-stone-900">{fmt$(mrr)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input type="text" placeholder="Search member or package..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400" />
        </div>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          : filtered.length === 0 ? <PaymentEmptyState text={subs.length === 0 ? "No subscriptions for group members" : "No results — try clearing filters"} />
          : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-stone-200 bg-stone-50/60 text-left">
                <th className="px-4 py-3 font-medium text-stone-600">Member</th>
                <th className="px-4 py-3 font-medium text-stone-600">Package</th>
                <th className="px-4 py-3 font-medium text-stone-600">Status</th>
                <th className="px-4 py-3 font-medium text-stone-600">Price</th>
                <th className="px-4 py-3 font-medium text-stone-600">Started</th>
                <th className="px-4 py-3 font-medium text-stone-600">Ends</th>
                <th className="px-4 py-3 w-10" />
              </tr></thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                    <td className="px-4 py-3"><MemberCell client={s.client} /></td>
                    <td className="px-4 py-3 font-medium text-stone-800">{s.package.name}</td>
                    <td className="px-4 py-3">{statusBadge(s.status)}</td>
                    <td className="px-4 py-3 text-stone-700">{fmt$(s.package.price)}{s.package.billingCycle !== "ONE_TIME" && <span className="text-stone-400 text-xs"> / {s.package.billingCycle.toLowerCase()}</span>}</td>
                    <td className="px-4 py-3 text-stone-500">{fmtD((s as any).startDate ?? (s as any).createdAt)}</td>
                    <td className="px-4 py-3 text-stone-500">{s.endDate ? fmtD(s.endDate) : <span className="text-stone-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu align="right">
                        <DropdownItem onClick={() => window.open(`/admin/clients/${s.client.id}?tab=payments`, "_blank")}><ExternalLink className="h-4 w-4" /> View Client</DropdownItem>
                        {s.status === "active" && <DropdownItem onClick={() => pause.mutate({ id: s.id })}>Pause</DropdownItem>}
                        {s.status === "paused" && <DropdownItem onClick={() => resume.mutate({ id: s.id })}>Resume</DropdownItem>}
                        <DropdownItem danger onClick={() => { if (confirm("Cancel this subscription?")) cancel.mutate({ id: s.id }); }}>Cancel</DropdownItem>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

// Charges sub-tab
function GroupChargesTab({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const { data: payments = [], isLoading } = trpc.groups.listMemberPayments.useQuery({ groupId, status: filterStatus || undefined });

  const refund = trpc.billing.refund.useMutation({
    onSuccess: () => { toast("success", "Refund initiated"); utils.groups.listMemberPayments.invalidate({ groupId }); },
    onError: (e) => toast("error", e.message),
  });

  const filtered = payments.filter((p) => {
    if (!filterSearch) return true;
    const name = `${p.client.firstName} ${p.client.lastName}`.toLowerCase();
    const desc = (p.description || p.clientPackage?.package?.name || "").toLowerCase();
    return name.includes(filterSearch.toLowerCase()) || desc.includes(filterSearch.toLowerCase());
  });

  const totalRevenue = payments.filter((p) => p.status === "SUCCEEDED").reduce((sum, p) => sum + p.amount, 0);
  const statusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = { SUCCEEDED: "success", PENDING: "warning", FAILED: "danger", REFUNDED: "outline" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500 mb-1">Total Charges</p><p className="text-2xl font-bold text-stone-900">{payments.length}</p></div>
        <div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500 mb-1">Revenue Collected</p><p className="text-2xl font-bold text-emerald-600">{fmt$(totalRevenue)}</p></div>
        <div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500 mb-1">Paying Members</p><p className="text-2xl font-bold text-stone-900">{new Set(payments.filter((p) => p.status === "SUCCEEDED").map((p) => p.clientId)).size}</p></div>
      </div>
      <div className="flex items-center gap-2">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400">
          <option value="">All statuses</option>
          <option value="SUCCEEDED">Succeeded</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input type="text" placeholder="Search member or item..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400" />
        </div>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          : filtered.length === 0 ? <PaymentEmptyState text={payments.length === 0 ? "No charges from group members yet" : "No results"} />
          : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-stone-200 bg-stone-50/60 text-left">
                <th className="px-4 py-3 font-medium text-stone-600">Member</th>
                <th className="px-4 py-3 font-medium text-stone-600">Item</th>
                <th className="px-4 py-3 font-medium text-stone-600">Date</th>
                <th className="px-4 py-3 font-medium text-stone-600">Amount</th>
                <th className="px-4 py-3 font-medium text-stone-600">Status</th>
                <th className="px-4 py-3 w-10" />
              </tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                    <td className="px-4 py-3"><MemberCell client={p.client} /></td>
                    <td className="px-4 py-3 text-stone-700">{p.description || p.clientPackage?.package?.name || "Charge"}</td>
                    <td className="px-4 py-3 text-stone-500">{fmtD(p.paidAt ?? p.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-stone-900">{fmt$(p.amount)}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant[p.status] ?? "outline"}>{p.status.charAt(0) + p.status.slice(1).toLowerCase()}</Badge></td>
                    <td className="px-4 py-3">
                      <DropdownMenu align="right">
                        <DropdownItem onClick={() => window.open(`/admin/clients/${p.client.id}?tab=payments`, "_blank")}><ExternalLink className="h-4 w-4" /> View Client</DropdownItem>
                        {p.status === "SUCCEEDED" && p.stripePaymentIntentId && (
                          <DropdownItem danger onClick={() => { if (confirm(`Refund ${fmt$(p.amount)}?`)) refund.mutate({ paymentId: p.id }); }}>Refund</DropdownItem>
                        )}
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

// Invoices sub-tab (same data as charges, invoice view)
function GroupInvoicesTab({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  const [filterSearch, setFilterSearch] = useState("");
  const { data: payments = [], isLoading } = trpc.groups.listMemberPayments.useQuery({ groupId });

  const filtered = payments.filter((p) => {
    if (!filterSearch) return true;
    const name = `${p.client.firstName} ${p.client.lastName}`.toLowerCase();
    const desc = (p.description || p.clientPackage?.package?.name || "").toLowerCase();
    return name.includes(filterSearch.toLowerCase()) || desc.includes(filterSearch.toLowerCase());
  });

  const statusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = { SUCCEEDED: "success", PENDING: "warning", FAILED: "danger", REFUNDED: "outline" };
  const statusLabel: Record<string, string> = { SUCCEEDED: "Paid", PENDING: "Due", FAILED: "Failed", REFUNDED: "Refunded" };

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">{payments.length} invoice{payments.length !== 1 ? "s" : ""} from group members</p>
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
        <input type="text" placeholder="Search..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400" />
      </div>
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          : filtered.length === 0 ? <PaymentEmptyState text="No invoices from group members" />
          : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-stone-200 bg-stone-50/60 text-left">
                <th className="px-4 py-3 font-medium text-stone-600">Member</th>
                <th className="px-4 py-3 font-medium text-stone-600">Item</th>
                <th className="px-4 py-3 font-medium text-stone-600">Date</th>
                <th className="px-4 py-3 font-medium text-stone-600">Amount</th>
                <th className="px-4 py-3 font-medium text-stone-600">Status</th>
                <th className="px-4 py-3 w-10" />
              </tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                    <td className="px-4 py-3"><MemberCell client={p.client} /></td>
                    <td className="px-4 py-3 text-stone-700">{p.description || p.clientPackage?.package?.name || "Invoice"}</td>
                    <td className="px-4 py-3 text-stone-500">{fmtD(p.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-stone-900">{fmt$(p.amount)}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant[p.status] ?? "outline"}>{statusLabel[p.status] ?? p.status}</Badge></td>
                    <td className="px-4 py-3">
                      <DropdownMenu align="right">
                        <DropdownItem onClick={() => { if ((p as any).stripeInvoiceId) window.open(`https://dashboard.stripe.com/invoices/${(p as any).stripeInvoiceId}`, "_blank"); else toast("info", "No Stripe invoice linked"); }}>
                          <ExternalLink className="h-4 w-4" /> View in Stripe
                        </DropdownItem>
                        <DropdownItem onClick={() => window.open(`/admin/clients/${p.client.id}?tab=payments`, "_blank")}><ExternalLink className="h-4 w-4" /> View Client</DropdownItem>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

// Account Balance sub-tab
function GroupAccountBalanceTab({ groupId }: { groupId: string }) {
  const { data: balances = [], isLoading } = trpc.groups.listMemberAccountBalances.useQuery({ groupId });
  const total = balances.reduce((s, b) => s + b.runningBalance, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500 mb-1">Members with Balance</p><p className="text-2xl font-bold text-stone-900">{balances.length}</p></div>
        <div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500 mb-1">Total Balance</p><p className={`text-2xl font-bold ${total >= 0 ? "text-stone-900" : "text-red-600"}`}>{total >= 0 ? "+" : ""}{fmt$(total)}</p></div>
      </div>
      <p className="text-sm text-stone-500">Account balances reduce the amount due on future charges. Only members with a non-zero balance are shown.</p>
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          : balances.length === 0 ? <PaymentEmptyState text="No account balances for group members" />
          : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-stone-200 bg-stone-50/60 text-left">
                <th className="px-4 py-3 font-medium text-stone-600">Member</th>
                <th className="px-4 py-3 font-medium text-stone-600">Last Updated</th>
                <th className="px-4 py-3 font-medium text-stone-600">Description</th>
                <th className="px-4 py-3 font-medium text-stone-600">Balance</th>
                <th className="px-4 py-3 w-10" />
              </tr></thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                    <td className="px-4 py-3"><MemberCell client={b.client} /></td>
                    <td className="px-4 py-3 text-stone-500">{fmtD(b.createdAt)}</td>
                    <td className="px-4 py-3 text-stone-600">{b.description || "Balance adjustment"}</td>
                    <td className={`px-4 py-3 font-semibold ${b.runningBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{b.runningBalance >= 0 ? "+" : ""}{fmt$(b.runningBalance)}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu align="right">
                        <DropdownItem onClick={() => window.open(`/admin/clients/${b.client.id}?tab=payments`, "_blank")}><ExternalLink className="h-4 w-4" /> View Client</DropdownItem>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

// Service Balance sub-tab
function GroupServiceBalanceTab({ groupId }: { groupId: string }) {
  const { data: balances = [], isLoading } = trpc.groups.listMemberServiceBalances.useQuery({ groupId });
  const total = balances.reduce((s, b) => s + b.endingBalance, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500 mb-1">Members with Balance</p><p className="text-2xl font-bold text-stone-900">{balances.length}</p></div>
        <div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500 mb-1">Total Outstanding</p><p className={`text-2xl font-bold ${total >= 0 ? "text-stone-900" : "text-red-600"}`}>{fmt$(total)}</p></div>
      </div>
      <p className="text-sm text-stone-500">Service balance accrues per visit and can be billed in bulk. Only members with a non-zero balance are shown.</p>
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          : balances.length === 0 ? <PaymentEmptyState text="No service balances for group members" />
          : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-stone-200 bg-stone-50/60 text-left">
                <th className="px-4 py-3 font-medium text-stone-600">Member</th>
                <th className="px-4 py-3 font-medium text-stone-600">Last Updated</th>
                <th className="px-4 py-3 font-medium text-stone-600">Description</th>
                <th className="px-4 py-3 font-medium text-stone-600">Balance</th>
                <th className="px-4 py-3 w-10" />
              </tr></thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                    <td className="px-4 py-3"><MemberCell client={b.client} /></td>
                    <td className="px-4 py-3 text-stone-500">{fmtD(b.createdAt)}</td>
                    <td className="px-4 py-3 text-stone-600">{b.description || "Balance adjustment"}</td>
                    <td className={`px-4 py-3 font-semibold ${b.endingBalance >= 0 ? "text-stone-900" : "text-red-600"}`}>{fmt$(b.endingBalance)}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu align="right">
                        <DropdownItem onClick={() => window.open(`/admin/clients/${b.client.id}?tab=payments`, "_blank")}><ExternalLink className="h-4 w-4" /> View Client</DropdownItem>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

// Online Training sub-tab
function GroupOnlineTrainingTab({ groupId }: { groupId: string }) {
  const { data: subs = [], isLoading } = trpc.groups.listMemberSubscriptions.useQuery({ groupId, status: "active" });
  const mrr = subs.filter((s) => s.package.billingCycle === "MONTHLY").reduce((n, s) => n + s.package.price, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-2">
        <h3 className="text-sm font-semibold text-stone-800">Online Training Subscriptions</h3>
        <p className="text-sm text-stone-600">Active recurring subscriptions for group members not tied to a physical location.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500 mb-1">Active</p><p className="text-2xl font-bold text-emerald-600">{subs.length}</p></div>
        <div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500 mb-1">Monthly Revenue</p><p className="text-2xl font-bold text-stone-900">{fmt$(mrr)}</p></div>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          : subs.length === 0 ? <PaymentEmptyState text="No active online training subscriptions" />
          : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-stone-200 bg-stone-50/60 text-left">
                <th className="px-4 py-3 font-medium text-stone-600">Member</th>
                <th className="px-4 py-3 font-medium text-stone-600">Package</th>
                <th className="px-4 py-3 font-medium text-stone-600">Price</th>
                <th className="px-4 py-3 font-medium text-stone-600">Started</th>
                <th className="px-4 py-3 w-10" />
              </tr></thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                    <td className="px-4 py-3"><MemberCell client={s.client} /></td>
                    <td className="px-4 py-3 font-medium text-stone-800">{s.package.name}</td>
                    <td className="px-4 py-3 text-stone-700">{fmt$(s.package.price)}{s.package.billingCycle !== "ONE_TIME" && <span className="text-stone-400 text-xs"> / {s.package.billingCycle.toLowerCase()}</span>}</td>
                    <td className="px-4 py-3 text-stone-500">{fmtD((s as any).startDate ?? (s as any).createdAt)}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu align="right">
                        <DropdownItem onClick={() => window.open(`/admin/clients/${s.client.id}?tab=payments`, "_blank")}><ExternalLink className="h-4 w-4" /> View Client</DropdownItem>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

// Main PaymentsSection with sub-tabs
function PaymentsSection({ groupId }: { groupId: string }) {
  const [activeTab, setActiveTab] = useState<PaymentSubTab>("subscriptions");

  return (
    <div className="space-y-4">
      {/* Sub-tab nav */}
      <div className="border-b border-stone-200">
        <div className="flex gap-0.5 overflow-x-auto">
          {PAYMENT_SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 px-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-stone-900 text-stone-900"
                  : "text-stone-500 hover:text-stone-700 border-b-2 border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "subscriptions"   && <GroupSubscriptionsTab   groupId={groupId} />}
      {activeTab === "charges"         && <GroupChargesTab         groupId={groupId} />}
      {activeTab === "invoices"        && <GroupInvoicesTab        groupId={groupId} />}
      {activeTab === "account-balance" && <GroupAccountBalanceTab  groupId={groupId} />}
      {activeTab === "service-balance" && <GroupServiceBalanceTab  groupId={groupId} />}
      {activeTab === "online-training" && <GroupOnlineTrainingTab  groupId={groupId} />}
    </div>
  );
}

// ─── Sidebar nav ──────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "members",  label: "Members",  icon: Users },
  { id: "feed",     label: "Feed",     icon: MessageSquare },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
];

const ACTION_ITEMS: { id: "message" | "plan" | "resource"; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "message",  label: "Message Group",   icon: Send },
  { id: "plan",     label: "Assign Plan",      icon: Dumbbell },
  { id: "resource", label: "Assign Resource",  icon: FileText },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [section, setSection] = useState<Section>("members");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modal, setModal] = useState<"message" | "plan" | "resource" | null>(null);

  const { data: group, isLoading } = trpc.groups.byId.useQuery({ id });

  if (isLoading || !group) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;
  }

  const memberCount = group._count.members;

  function renderSection() {
    switch (section) {
      case "members":  return <MembersSection groupId={id} group={group!} />;
      case "feed":     return <FeedSection groupId={id} />;
      case "payments": return <PaymentsSection groupId={id} />;
      case "settings": return <SettingsSection groupId={id} group={group!} />;
    }
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link href="/admin/groups" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700">
        <ArrowLeft className="h-4 w-4" /> Back to groups
      </Link>

      {/* Group header card */}
      <div className="rounded-xl border border-stone-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {(group as unknown as { imageUrl?: string | null }).imageUrl ? (
              <img src={(group as unknown as { imageUrl: string }).imageUrl} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-stone-500" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-bold text-stone-900">{group.name}</h1>
                {group.isPublic
                  ? <Badge variant="info" className="gap-1"><Globe className="h-3 w-3" /> Public</Badge>
                  : <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Private</Badge>}
              </div>
              <p className="text-sm text-stone-400">
                {memberCount}{group.maxMembers ? ` / ${group.maxMembers}` : ""} member{memberCount !== 1 ? "s" : ""}
                {group.description && ` · ${group.description}`}
              </p>
            </div>
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

          {/* Nav items */}
          <nav className="py-1">
            {NAV_ITEMS.map(({ id: navId, label, icon: Icon }) => {
              const active = section === navId;
              return (
                <button key={navId} onClick={() => setSection(navId)} title={sidebarCollapsed ? label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${active ? "bg-stone-100 text-stone-900 font-medium" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"} ${sidebarCollapsed ? "justify-center" : ""}`}
                >
                  <Icon className="shrink-0 h-4 w-4" />
                  {!sidebarCollapsed && <span className="truncate">{label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Divider + Actions */}
          <div className="border-t border-stone-100 pt-1 pb-1">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider px-3 py-1.5">Actions</p>
            )}
            {ACTION_ITEMS.map(({ id: actionId, label, icon: Icon }) => (
              <button key={actionId}
                onClick={() => memberCount > 0 ? setModal(actionId) : undefined}
                title={sidebarCollapsed ? label : undefined}
                disabled={memberCount === 0}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-stone-600 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed ${sidebarCollapsed ? "justify-center" : ""}`}
              >
                <Icon className="shrink-0 h-4 w-4" />
                {!sidebarCollapsed && <span className="truncate">{label}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {renderSection()}
        </div>
      </div>

      {/* Modals */}
      {modal === "message" && (
        <SendMessageModal groupId={id} groupName={group.name} memberCount={memberCount} onClose={() => setModal(null)} />
      )}
      {modal === "plan" && (
        <AssignPlanModal groupId={id} memberCount={memberCount} onClose={() => setModal(null)} />
      )}
      {modal === "resource" && (
        <AssignResourceModal groupId={id} memberCount={memberCount} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
