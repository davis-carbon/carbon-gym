"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Dumbbell,
  ClipboardList,
  UsersRound,
  MessageSquare,
  Zap,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { GlobalSearch } from "./global-search";
import { NotificationBell } from "./notification-bell";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Clients", href: "/admin/clients", icon: Users },
  { name: "Schedule", href: "/admin/schedule", icon: Calendar },
  { name: "Exercises", href: "/admin/exercises", icon: Dumbbell },
  { name: "Plans", href: "/admin/plans", icon: ClipboardList },
  { name: "Groups", href: "/admin/groups", icon: UsersRound },
  { name: "Messages", href: "/admin/messages", icon: MessageSquare },
  { name: "Automations", href: "/admin/automations", icon: Zap },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--color-surface-sidebar)] text-[var(--color-text-on-dark)] transform transition-transform lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight">carbon</span>
            </Link>
            <button
              className="lg:hidden text-stone-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="px-6 -mt-3 mb-4 text-xs uppercase tracking-widest text-stone-500">
            Training Centre
          </p>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-stone-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-3 lg:px-6">
          <button
            className="lg:hidden text-stone-600 hover:text-stone-900"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <GlobalSearch />
          <div className="flex-1" />
          <NotificationBell />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
