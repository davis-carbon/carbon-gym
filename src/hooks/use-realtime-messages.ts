"use client";

import { useEffect, useId } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Subscribe to new messages in a specific thread via Supabase Realtime.
 * Calls the onNewMessage callback whenever a new message is inserted.
 */
export function useRealtimeMessages(threadId: string | null, onNewMessage: () => void) {
  useEffect(() => {
    if (!threadId) return;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `threadId=eq.${threadId}`,
        },
        () => onNewMessage()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, onNewMessage]);
}

/**
 * Subscribe to ALL new messages for a user (for unread count badge).
 * Calls onChange when any new message arrives.
 */
export function useRealtimeMessageCount(onChange: () => void, enabled = true) {
  const uid = useId();
  useEffect(() => {
    if (!enabled) return;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`all-messages-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Message" },
        () => onChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onChange, enabled]);
}
