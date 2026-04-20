"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Calendar, MessageSquare, User, CreditCard, Ruler, Users } from "lucide-react";
import { ClientMessagesBadge } from "./messages-badge";

const tabs = [
  { name: "Home", href: "/c", icon: Home },
  { name: "Workouts", href: "/c/workouts", icon: Dumbbell },
  { name: "Schedule", href: "/c/schedule", icon: Calendar },
  { name: "Groups", href: "/c/groups", icon: Users },
  { name: "Messages", href: "/c/messages", icon: MessageSquare },
  { name: "Profile", href: "/c/profile", icon: User },
];

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Register service worker for push notifications
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {/* non-fatal */});
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-stone-900">carbon</h1>
          <span className="text-xs uppercase tracking-widest text-stone-400">Training Centre</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">
        <div className="max-w-lg mx-auto px-4 py-4">
          {children}
        </div>
      </main>

      {/* Bottom tab navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || (tab.href !== "/c" && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  isActive ? "text-stone-900" : "text-stone-400"
                }`}
              >
                <tab.icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                {tab.name === "Messages" && <ClientMessagesBadge />}
                <span className="text-[10px] font-medium">{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
