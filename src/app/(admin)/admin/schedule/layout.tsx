"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { name: "Calendar", href: "/admin/schedule" },
  { name: "Visits", href: "/admin/schedule/visits" },
  { name: "Recurring Members", href: "/admin/schedule/recurring" },
  { name: "Services", href: "/admin/schedule/services" },
  { name: "Packages", href: "/admin/schedule/packages" },
  { name: "Locations", href: "/admin/schedule/locations" },
  { name: "Availability", href: "/admin/schedule/availability" },
];

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 border-b border-stone-200 -mx-4 px-4 lg:-mx-6 lg:px-6 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? "border-stone-900 text-stone-900"
                  : "border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300"
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
