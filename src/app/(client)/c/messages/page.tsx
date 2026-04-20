"use client";

import { useRef, useState, useCallback } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { useRealtimeMessages, useRealtimeMessageCount } from "@/hooks/use-realtime-messages";
import { Send, Loader2, ArrowLeft, Paperclip, X, FileText, Image as ImageIcon, Video as VideoIcon, Download, Check, CheckCheck } from "lucide-react";

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

export default function ClientMessagesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: threads, isLoading: threadsLoading } = trpc.portal.messageThreads.useQuery();
  const { data: thread, isLoading: threadLoading } = trpc.portal.thread.useQuery(
    { threadId: selectedThread! },
    { enabled: !!selectedThread }
  );

  const sendMessage = trpc.portal.sendMessage.useMutation({
    onSuccess: () => {
      setNewMessage("");
      setPendingAttachments([]);
      utils.portal.thread.invalidate({ threadId: selectedThread! });
      utils.portal.messageThreads.invalidate();
    },
    onError: (err) => toast("error", err.message),
  });

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

  function removePending(index: number) {
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

  // Realtime: refresh selected thread on new message
  useRealtimeMessages(selectedThread, () => {
    utils.portal.thread.invalidate({ threadId: selectedThread! });
    utils.portal.messageThreads.invalidate();
    utils.portal.unreadMessageCount.invalidate();
  });

  // Realtime: refresh thread list even when no thread is open
  const refreshThreadList = useCallback(() => {
    utils.portal.messageThreads.invalidate();
    utils.portal.unreadMessageCount.invalidate();
  }, [utils]);
  useRealtimeMessageCount(refreshThreadList);

  // Thread list view (when no thread selected)
  if (!selectedThread) {
    return (
      <div>
        <h2 className="text-lg font-bold mb-4">Messages</h2>
        {threadsLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
        ) : (threads ?? []).length === 0 ? (
          <p className="text-center text-sm text-stone-400 py-8">No messages yet.</p>
        ) : (
          <div className="space-y-1">
            {(threads ?? []).map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedThread(t.id)}
                className="w-full text-left rounded-lg border border-stone-200 bg-white p-3 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar name={t.displayName} src={t.avatarUrl ?? undefined} size="sm" />
                    {t.unread && (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${t.unread ? "font-bold" : "font-medium"} text-stone-900`}>
                        {t.displayName}
                      </span>
                      <span className="text-xs text-stone-400 flex-shrink-0 ml-2">
                        {new Date(t.lastMessageAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${t.unread ? "text-stone-700 font-medium" : "text-stone-500"}`}>
                      {t.lastMessage || <span className="italic">No messages yet</span>}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const staffLastReadAt = thread?.staffLastReadAt ? new Date(thread.staffLastReadAt) : null;

  // Find the last CLIENT message index — only it gets a receipt indicator
  const messages = thread?.messages ?? [];
  const lastClientMsgIndex = [...messages].reverse().findIndex((m) => m.senderType === "CLIENT");
  const lastClientMsgAbsoluteIndex = lastClientMsgIndex === -1 ? -1 : messages.length - 1 - lastClientMsgIndex;

  // Thread detail view
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 180px)" }}>
      {(() => {
        const activeThread = threads?.find((t) => t.id === selectedThread);
        return (
          <div className="flex items-center gap-3 pb-3 border-b border-stone-200">
            <button onClick={() => { setSelectedThread(null); setPendingAttachments([]); setNewMessage(""); }} className="text-stone-600 hover:text-stone-900">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Avatar name={activeThread?.displayName ?? "Trainer"} src={activeThread?.avatarUrl ?? undefined} size="sm" />
            <div>
              <p className="font-semibold text-sm">{activeThread?.displayName ?? "Your Trainer"}</p>
            </div>
          </div>
        );
      })()}

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {threadLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderType === "CLIENT";
            const isLastClientMsg = isMe && i === lastClientMsgAbsoluteIndex;
            const seenByStaff = !!(isLastClientMsg && staffLastReadAt && new Date(msg.sentAt) <= staffLastReadAt);
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className="flex flex-col items-end max-w-[85%]">
                  <div className={`rounded-2xl px-4 py-2.5 ${isMe ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-900"}`}>
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
                                isMe ? "bg-stone-800 hover:bg-stone-700" : "bg-white hover:bg-stone-50 border border-stone-200"
                              }`}
                            >
                              {attachmentIcon(a.mimeType)}
                              <span className="flex-1 truncate max-w-[180px]">{a.fileName}</span>
                              {a.fileSize && <span className={`${isMe ? "text-stone-400" : "text-stone-500"}`}>{prettyBytes(a.fileSize)}</span>}
                              <Download className="h-3 w-3 opacity-60" />
                            </a>
                          );
                        })}
                      </div>
                    )}
                    <p className={`text-xs mt-1 ${isMe ? "text-stone-400" : "text-stone-500"}`}>
                      {new Date(msg.sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                  {isLastClientMsg && (
                    <span className="flex items-center gap-0.5 text-[10px] text-stone-400 mt-1 pr-1">
                      {seenByStaff ? <><CheckCheck className="h-3 w-3 text-blue-500" /> Seen</> : <><Check className="h-3 w-3" /> Sent</>}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pending attachments */}
      {pendingAttachments.length > 0 && (
        <div className="border-t border-stone-200 px-2 py-2 flex flex-wrap gap-2">
          {pendingAttachments.map((a, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs">
              {attachmentIcon(a.mimeType)}
              <span className="max-w-[140px] truncate">{a.fileName}</span>
              {a.fileSize && <span className="text-stone-400">{prettyBytes(a.fileSize)}</span>}
              <button onClick={() => removePending(i)} className="text-stone-400 hover:text-red-500">
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

      <div className="border-t border-stone-200 pt-3">
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
            className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 resize-none"
            rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <Button
            size="sm"
            disabled={(!newMessage.trim() && pendingAttachments.length === 0) || sendMessage.isPending || uploading}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
