"use client";

import Link from "next/link";
import { trpc } from "@/trpc/client";
import { useRealtimeMessageCount } from "@/hooks/use-realtime-messages";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const utils = trpc.useUtils();
  const { data: unreadCount } = trpc.messages.unreadCount.useQuery(undefined, {
    refetchInterval: 60000, // Fallback poll every minute
  });

  // Realtime: refresh unread count immediately on new message
  useRealtimeMessageCount(() => {
    utils.messages.unreadCount.invalidate();
  });

  return (
    <Link
      href="/admin/messages"
      className="relative rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
    >
      <Bell className="h-5 w-5" />
      {unreadCount && unreadCount > 0 ? (
        <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
