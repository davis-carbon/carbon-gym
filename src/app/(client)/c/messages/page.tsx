"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

const MOCK_MESSAGES = [
  { id: "1", sender: "Mada Hauck", senderType: "staff" as const, body: "Great session today! Remember to stretch before bed tonight.", sentAt: "2026-04-14T15:30:00" },
  { id: "2", sender: "Tres Teschke", senderType: "client" as const, body: "Thanks! My knee felt way better with the safety bar.", sentAt: "2026-04-14T15:35:00" },
  { id: "3", sender: "Mada Hauck", senderType: "staff" as const, body: "Awesome, let's keep using that for the next couple weeks. See you Thursday!", sentAt: "2026-04-14T15:37:00" },
];

export default function ClientMessagesPage() {
  const [newMessage, setNewMessage] = useState("");

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 180px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-stone-200">
        <Avatar name="Mada Hauck" size="sm" />
        <div>
          <p className="font-semibold text-sm">Mada Hauck</p>
          <p className="text-xs text-stone-500">Your trainer</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {MOCK_MESSAGES.map((msg) => {
          const isMe = msg.senderType === "client";
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                isMe ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-900"
              }`}>
                <p className="text-sm">{msg.body}</p>
                <p className={`text-xs mt-1 ${isMe ? "text-stone-400" : "text-stone-500"}`}>
                  {new Date(msg.sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="border-t border-stone-200 pt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 resize-none"
            rows={1}
          />
          <Button size="sm" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
