"use client";

import { useCallback } from "react";
import { trpc } from "@/trpc/client";
import { useRealtimeMessageCount } from "@/hooks/use-realtime-messages";

/**
 * Live unread message count badge for the admin nav.
 * Uses Supabase Realtime to refresh automatically.
 */
export function AdminMessagesBadge() {
  const utils = trpc.useUtils();
  const { data: count = 0 } = trpc.messages.unreadCount.useQuery(undefined, {
    refetchInterval: 60_000, // fallback poll every 60s
  });

  const refresh = useCallback(() => {
    utils.messages.unreadCount.invalidate();
    utils.messages.listThreads.invalidate();
  }, [utils]);

  useRealtimeMessageCount(refresh);

  if (!count) return null;

  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
