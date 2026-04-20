"use client";

import { useRef, useState, useCallback } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { useRealtimeMessages, useRealtimeMessageCount } from "@/hooks/use-realtime-messages";
import { Send, Paperclip, PenSquare, Loader2, X, FileText, Image as ImageIcon, Video as VideoIcon, Download, Check, CheckCheck, Clock, Trash2 } from "lucide-react";

interface PendingAttachment {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
}

function attachmentIcon(mime?: string | null) {
  if (!mime) return <FileText className="h-4 w-4" />;
  if (mime.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  if (mime.startsWith("video/")) return <VideoIcon className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function prettyBytes(n?: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessagesPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "scheduled">("all");
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [newConvoType, setNewConvoType] = useState<"individual" | "group">("individual");
  const [newConvoClientId, setNewConvoClientId] = useState("");
  const [newConvoGroupId, setNewConvoGroupId] = useState("");
  const [newConvoMsg, setNewConvoMsg] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  // Fetch thread list
  const { data: threads, isLoading: threadsLoading } = trpc.messages.listThreads.useQuery({
    unreadOnly: filter === "unread",
  });

  // Fetch scheduled messages (for "Scheduled" tab)
  const { data: scheduledMessages, isLoading: scheduledLoading } = trpc.messages.listScheduled.useQuery(
    undefined,
    { enabled: filter === "scheduled" }
  );

  const sendScheduled = trpc.messages.sendScheduled.useMutation({
    onSuccess: () => {
      toast("success", "Message scheduled");
      setScheduleOpen(false);
      setScheduledAt("");
      setNewMessage("");
      utils.messages.listScheduled.invalidate();
    },
    onError: (err) => toast("error", err.message),
  });

  const cancelScheduled = trpc.messages.cancelScheduled.useMutation({
    onSuccess: () => {
      toast("success", "Scheduled message cancelled");
      utils.messages.listScheduled.invalidate();
    },
    onError: (err) => toast("error", err.message),
  });

  // Fetch selected thread messages
  const { data: thread, isLoading: threadLoading } = trpc.messages.getThread.useQuery(
    { threadId: selectedThread! },
    { enabled: !!selectedThread }
  );

  // Send message mutation
  const utils = trpc.useUtils();
  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      setNewMessage("");
      setPendingAttachments([]);
      utils.messages.getThread.invalidate({ threadId: selectedThread! });
      utils.messages.listThreads.invalidate();
    },
    onError: (err) => toast("error", err.message),
  });

  const createThread = trpc.messages.createThread.useMutation({
    onSuccess: (newThread) => {
      toast("success", "Conversation started");
      utils.messages.listThreads.invalidate();
      setSelectedThread(newThread.id);
      setShowNewConvo(false);
      setNewConvoClientId("");
      setNewConvoMsg("");
    },
    onError: (err) => toast("error", err.message),
  });

  const createGroupThread = trpc.messages.createGroupThread.useMutation({
    onSuccess: (newThread) => {
      toast("success", "Group message sent");
      utils.messages.listThreads.invalidate();
      setSelectedThread(newThread.id);
      setShowNewConvo(false);
      setNewConvoGroupId("");
      setNewConvoMsg("");
    },
    onError: (err) => toast("error", err.message),
  });

  const { data: clientsForConvo } = trpc.clients.list.useQuery({ limit: 50 }, { enabled: showNewConvo && newConvoType === "individual" });
  const { data: groupsForConvo } = trpc.groups.list.useQuery(undefined, { enabled: showNewConvo && newConvoType === "group" });

  // Subscribe to realtime updates for the selected thread
  useRealtimeMessages(selectedThread, () => {
    utils.messages.getThread.invalidate({ threadId: selectedThread! });
    utils.messages.listThreads.invalidate();
    utils.messages.unreadCount.invalidate();
  });

  // Refresh thread list when any new message arrives (even if no thread open)
  const refreshList = useCallback(() => {
    utils.messages.listThreads.invalidate();
    utils.messages.unreadCount.invalidate();
  }, [utils]);
  useRealtimeMessageCount(refreshList);

  const filteredThreads = (threads ?? []).filter((t) => {
    if (search && !t.clientName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedClient = threads?.find((t) => t.id === selectedThread);

  async function handleFileSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 25 * 1024 * 1024) {
          toast("error", `${file.name} too large (max 25MB)`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("bucket", "message-attachments");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Upload failed" }));
          toast("error", err.error || `Failed to upload ${file.name}`);
          continue;
        }
        const { url } = await res.json();
        setPendingAttachments((prev) => [
          ...prev,
          { fileName: file.name, fileUrl: url, fileSize: file.size, mimeType: file.type || undefined },
        ]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePendingAttachment(index: number) {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSend() {
    if (!selectedThread) return;
    const body = newMessage.trim();
    if (!body && pendingAttachments.length === 0) return;
    sendMessage.mutate({
      threadId: selectedThread,
      body,
      attachments: pendingAttachments,
    });
  }

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-xl border border-stone-200 bg-white overflow-hidden">
      {/* Thread list */}
      <div className="w-80 flex-shrink-0 border-r border-stone-200 flex flex-col">
        <div className="p-4 border-b border-stone-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold">Messages</h1>
            <button onClick={() => setShowNewConvo(true)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors">
              <PenSquare className="h-5 w-5" />
            </button>
          </div>
          <SearchInput placeholder="Search messages" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex gap-2 mt-3">
            {(["all", "unread", "scheduled"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  filter === f ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {f === "unread" && "● "}{f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threadsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">No conversations yet.</p>
          ) : (
            filteredThreads.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedThread(t.id)}
                className={`w-full text-left px-4 py-3 border-b border-stone-100 hover:bg-stone-50 transition-colors ${
                  selectedThread === t.id ? "bg-stone-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={t.clientName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${t.unread ? "font-bold" : "font-medium"} text-stone-900 truncate`}>
                        {t.clientName}
                      </span>
                      <span className="text-xs text-stone-400 flex-shrink-0 ml-2">
                        {new Date(t.lastMessageAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${t.unread ? "text-stone-700 font-medium" : "text-stone-500"}`}>
                      {t.unread && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 align-middle" />}
                      {t.lastMessage}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message detail */}
      <div className="flex-1 flex flex-col">
        {selectedThread && selectedClient ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-stone-200">
              <Avatar name={selectedClient.clientName} size="sm" />
              <p className="font-semibold text-sm">{selectedClient.clientName}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {threadLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
                </div>
              ) : (() => {
                const messages = thread?.messages ?? [];
                const clientLastReadAt = thread?.clientLastReadAt ? new Date(thread.clientLastReadAt) : null;
                const reverseIdx = [...messages].reverse().findIndex((m) => m.senderType === "STAFF");
                const lastStaffMsgIdx = reverseIdx === -1 ? -1 : messages.length - 1 - reverseIdx;

                return messages.map((msg, i) => {
                  const isStaff = msg.senderType === "STAFF";
                  const isLastStaffMsg = isStaff && i === lastStaffMsgIdx;
                  const seenByClient = !!(isLastStaffMsg && clientLastReadAt && new Date(msg.sentAt) <= clientLastReadAt);
                  return (
                    <div key={msg.id} className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
                      <div className="flex flex-col items-end max-w-[70%]">
                        <div className={`rounded-2xl px-4 py-2.5 ${
                          isStaff ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-900"
                        }`}>
                          {msg.body && <p className="text-sm whitespace-pre-wrap">{msg.body}</p>}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className={`${msg.body ? "mt-2" : ""} space-y-1.5`}>
                              {msg.attachments.map((a) => {
                                const isImage = a.mimeType?.startsWith("image/");
                                if (isImage) {
                                  return (
                                    <a key={a.id} href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                                      <img src={a.fileUrl} alt={a.fileName} className="rounded-lg max-w-xs max-h-60 object-cover" />
                                    </a>
                                  );
                                }
                                return (
                                  <a
                                    key={a.id}
                                    href={a.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                                      isStaff ? "bg-stone-800 hover:bg-stone-700" : "bg-white hover:bg-stone-50 border border-stone-200"
                                    }`}
                                  >
                                    {attachmentIcon(a.mimeType)}
                                    <span className="flex-1 truncate max-w-[180px]">{a.fileName}</span>
                                    {a.fileSize && <span className={`${isStaff ? "text-stone-400" : "text-stone-500"}`}>{prettyBytes(a.fileSize)}</span>}
                                    <Download className="h-3 w-3 opacity-60" />
                                  </a>
                                );
                              })}
                            </div>
                          )}
                          <p className={`text-xs mt-1 ${isStaff ? "text-stone-400" : "text-stone-500"}`}>
                            {new Date(msg.sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                        {isLastStaffMsg && (
                          <span className="flex items-center gap-0.5 text-[10px] text-stone-400 mt-1 pr-1">
                            {seenByClient ? <><CheckCheck className="h-3 w-3 text-blue-500" /> Seen</> : <><Check className="h-3 w-3" /> Sent</>}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Pending attachments preview */}
            {pendingAttachments.length > 0 && (
              <div className="border-t border-stone-200 px-4 py-2 flex flex-wrap gap-2 bg-stone-50">
                {pendingAttachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs">
                    {attachmentIcon(a.mimeType)}
                    <span className="max-w-[160px] truncate">{a.fileName}</span>
                    {a.fileSize && <span className="text-stone-400">{prettyBytes(a.fileSize)}</span>}
                    <button onClick={() => removePendingAttachment(i)} className="text-stone-400 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {uploading && (
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-stone-200 p-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelected(e.target.files)}
              />
              <div className="flex items-end gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors disabled:opacity-50"
                  aria-label="Attach file"
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                </button>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-1 resize-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                />
                <Button
                  size="sm"
                  disabled={(!newMessage.trim() && pendingAttachments.length === 0) || sendMessage.isPending || uploading}
                  onClick={handleSend}
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!newMessage.trim() || uploading}
                  onClick={() => setScheduleOpen(true)}
                  title="Schedule send"
                >
                  <Clock className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : filter === "scheduled" ? (
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-base font-semibold text-stone-900 mb-4">Scheduled Messages</h2>
            {scheduledLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
            ) : (scheduledMessages ?? []).length === 0 ? (
              <div className="text-center text-stone-400 py-12">
                <Clock className="h-8 w-8 mx-auto mb-2 text-stone-300" />
                <p className="text-sm">No scheduled messages.</p>
                <p className="text-xs text-stone-300 mt-1">Select a conversation, type a message, and click the clock icon to schedule.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(scheduledMessages ?? []).map((msg) => (
                  <div key={msg.id} className="rounded-xl border border-stone-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900">{msg.clientName}</p>
                        <p className="text-sm text-stone-600 mt-0.5 line-clamp-2">{msg.body}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-stone-400">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Sends {msg.scheduledAt ? new Date(msg.scheduledAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm("Cancel this scheduled message?")) {
                            cancelScheduled.mutate({ id: msg.id });
                          }
                        }}
                        className="text-stone-300 hover:text-red-500 transition-colors p-1"
                        title="Cancel"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-stone-400">
            <div className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-stone-100 flex items-center justify-center">
                <PenSquare className="h-7 w-7 text-stone-300" />
              </div>
              <p className="text-sm">Select or start a new message</p>
            </div>
          </div>
        )}
      </div>

      {/* Schedule send modal */}
      {scheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setScheduleOpen(false)}>
          <div className="fixed inset-0 bg-black/40" />
          <div className="relative w-full max-w-sm rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-stone-200 px-6 py-4">
              <h2 className="text-base font-semibold">Schedule Message</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700 line-clamp-3 border border-stone-200">
                {newMessage}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Send at</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-stone-200 px-6 py-4">
              <Button variant="secondary" onClick={() => setScheduleOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!selectedThread || !scheduledAt) return;
                  sendScheduled.mutate({
                    threadId: selectedThread,
                    body: newMessage,
                    scheduledAt: new Date(scheduledAt),
                  });
                }}
                disabled={!scheduledAt || sendScheduled.isPending}
              >
                {sendScheduled.isPending ? "Scheduling…" : "Schedule"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New conversation modal */}
      {showNewConvo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowNewConvo(false)}>
          <div className="fixed inset-0 bg-black/40" />
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-stone-200 px-6 py-4">
              <h2 className="text-lg font-semibold">New Message</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2">
                {(["individual", "group"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewConvoType(t)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      newConvoType === t ? "bg-stone-900 text-white border-stone-900" : "border-stone-200 text-stone-600 hover:border-stone-400"
                    }`}
                  >
                    {t === "individual" ? "Individual" : "Group"}
                  </button>
                ))}
              </div>

              {newConvoType === "individual" ? (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Client</label>
                  <select
                    value={newConvoClientId}
                    onChange={(e) => setNewConvoClientId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                  >
                    <option value="">Select client…</option>
                    {(clientsForConvo?.clients ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Group</label>
                  <select
                    value={newConvoGroupId}
                    onChange={(e) => setNewConvoGroupId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                  >
                    <option value="">Select group…</option>
                    {(groupsForConvo ?? []).map((g) => (
                      <option key={g.id} value={g.id}>{g.name} ({g._count.members} members)</option>
                    ))}
                  </select>
                  <p className="text-xs text-stone-400 mt-1">All group members will receive this message.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Message</label>
                <textarea
                  value={newConvoMsg}
                  onChange={(e) => setNewConvoMsg(e.target.value)}
                  placeholder="Type your message…"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-stone-200 px-6 py-4">
              <Button variant="secondary" onClick={() => setShowNewConvo(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (newConvoType === "individual") {
                    createThread.mutate({ clientId: newConvoClientId, initialMessage: newConvoMsg });
                  } else {
                    createGroupThread.mutate({ groupId: newConvoGroupId, initialMessage: newConvoMsg });
                  }
                }}
                disabled={
                  (newConvoType === "individual" ? !newConvoClientId : !newConvoGroupId)
                  || !newConvoMsg.trim()
                  || createThread.isPending
                  || createGroupThread.isPending
                }
              >
                {(createThread.isPending || createGroupThread.isPending) ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
