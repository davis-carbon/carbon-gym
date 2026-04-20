"use client";

import { useCallback } from "react";
import { trpc } from "@/trpc/client";
import { useRealtimeMessageCount } from "@/hooks/use-realtime-messages";

/**
 * Live unread message count badge for the client bottom nav.
 */
export function ClientMessagesBadge() {
  const utils = trpc.useUtils();
  const { data: count = 0 } = trpc.portal.unreadMessageCount.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const refresh = useCallback(() => {
    utils.portal.unreadMessageCount.invalidate();
    utils.portal.messageThreads.invalidate();
  }, [utils]);

  useRealtimeMessageCount(refresh);

  if (!count) return null;

  return (
    <span className="absolute -top-0.5 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
