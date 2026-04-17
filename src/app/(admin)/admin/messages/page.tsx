"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { useRealtimeMessages } from "@/hooks/use-realtime-messages";
import { Send, Paperclip, PenSquare, Loader2 } from "lucide-react";

export default function MessagesPage() {
  const { toast } = useToast();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "scheduled">("all");
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [newConvoClientId, setNewConvoClientId] = useState("");
  const [newConvoMsg, setNewConvoMsg] = useState("");

  // Fetch thread list
  const { data: threads, isLoading: threadsLoading } = trpc.messages.listThreads.useQuery({
    unreadOnly: filter === "unread",
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

  const { data: clientsForConvo } = trpc.clients.list.useQuery({ limit: 50 }, { enabled: showNewConvo });

  // Subscribe to realtime updates for the selected thread
  useRealtimeMessages(selectedThread, () => {
    utils.messages.getThread.invalidate({ threadId: selectedThread! });
    utils.messages.listThreads.invalidate();
  });

  const filteredThreads = (threads ?? []).filter((t) => {
    if (search && !t.clientName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedClient = threads?.find((t) => t.id === selectedThread);

  function handleSend() {
    if (!newMessage.trim() || !selectedThread) return;
    sendMessage.mutate({ threadId: selectedThread, body: newMessage.trim() });
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
              ) : (
                (thread?.messages ?? []).map((msg) => {
                  const isStaff = msg.senderType === "STAFF";
                  return (
                    <div key={msg.id} className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        isStaff ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-900"
                      }`}>
                        <p className="text-sm">{msg.body}</p>
                        <p className={`text-xs mt-1 ${isStaff ? "text-stone-400" : "text-stone-500"}`}>
                          {new Date(msg.sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <div className="border-t border-stone-200 p-4">
              <div className="flex items-end gap-2">
                <button className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors">
                  <Paperclip className="h-5 w-5" />
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
                  disabled={!newMessage.trim() || sendMessage.isPending}
                  onClick={handleSend}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
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

      {/* New conversation modal */}
      {showNewConvo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowNewConvo(false)}>
          <div className="fixed inset-0 bg-black/40" />
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()} style={{ animation: "fade-in 0.15s ease-out" }}>
            <div className="border-b border-stone-200 px-6 py-4">
              <h2 className="text-lg font-semibold">New Conversation</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Client</label>
                <select
                  value={newConvoClientId}
                  onChange={(e) => setNewConvoClientId(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                >
                  <option value="">Select client...</option>
                  {(clientsForConvo?.clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Message</label>
                <textarea
                  value={newConvoMsg}
                  onChange={(e) => setNewConvoMsg(e.target.value)}
                  placeholder="Type your first message..."
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-stone-200 px-6 py-4">
              <Button variant="secondary" onClick={() => setShowNewConvo(false)}>Cancel</Button>
              <Button
                onClick={() => createThread.mutate({ clientId: newConvoClientId, initialMessage: newConvoMsg })}
                disabled={!newConvoClientId || !newConvoMsg.trim() || createThread.isPending}
              >
                {createThread.isPending ? "Starting..." : "Start Conversation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
