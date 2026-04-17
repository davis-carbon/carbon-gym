"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Send, Loader2, ArrowLeft } from "lucide-react";

export default function ClientMessagesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const { data: threads, isLoading: threadsLoading } = trpc.portal.messageThreads.useQuery();
  const { data: thread, isLoading: threadLoading } = trpc.portal.thread.useQuery(
    { threadId: selectedThread! },
    { enabled: !!selectedThread }
  );

  const sendMessage = trpc.portal.sendMessage.useMutation({
    onSuccess: () => {
      setNewMessage("");
      utils.portal.thread.invalidate({ threadId: selectedThread! });
      utils.portal.messageThreads.invalidate();
    },
    onError: (err) => toast("error", err.message),
  });

  function handleSend() {
    if (!newMessage.trim() || !selectedThread) return;
    sendMessage.mutate({ threadId: selectedThread, body: newMessage.trim() });
  }

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
                  <Avatar name="Trainer" size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${t.unread ? "font-bold" : "font-medium"} text-stone-900`}>
                        Your Trainer
                      </span>
                      <span className="text-xs text-stone-400 flex-shrink-0 ml-2">
                        {new Date(t.lastMessageAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${t.unread ? "text-stone-700 font-medium" : "text-stone-500"}`}>
                      {t.unread && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1 align-middle" />}
                      {t.lastMessage}
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

  // Thread detail view
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 180px)" }}>
      <div className="flex items-center gap-3 pb-3 border-b border-stone-200">
        <button onClick={() => setSelectedThread(null)} className="text-stone-600 hover:text-stone-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar name="Trainer" size="sm" />
        <div>
          <p className="font-semibold text-sm">Your Trainer</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {threadLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
        ) : (
          (thread?.messages ?? []).map((msg) => {
            const isMe = msg.senderType === "CLIENT";
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-900"}`}>
                  <p className="text-sm">{msg.body}</p>
                  <p className={`text-xs mt-1 ${isMe ? "text-stone-400" : "text-stone-500"}`}>
                    {new Date(msg.sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-stone-200 pt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 resize-none"
            rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <Button size="sm" disabled={!newMessage.trim() || sendMessage.isPending} onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
