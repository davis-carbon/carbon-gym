"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

interface VisitRow {
  id: string;
  clientName: string;
  service: string;
  staff: string;
  location: string;
  status: string;
  scheduledAt: string;
  bookedAt: string;
}

const MOCK_VISITS: VisitRow[] = [
  { id: "1", clientName: "Meagan Keefe", service: "1-on-1", staff: "Mada Hauck", location: "CARBON", status: "RESERVED", scheduledAt: "2026-06-04T17:30:00", bookedAt: "2026-04-13T16:00:00" },
  { id: "2", clientName: "Meagan Keefe", service: "1-on-1", staff: "Mada Hauck", location: "CARBON", status: "EARLY_CANCEL", scheduledAt: "2026-05-27T17:30:00", bookedAt: "2026-04-13T09:00:00" },
  { id: "3", clientName: "Jamey Whitlock", service: "1-on-1", staff: "Mada Hauck", location: "CARBON", status: "CONFIRMED", scheduledAt: "2026-04-14T08:30:00", bookedAt: "2026-04-10T14:00:00" },
  { id: "4", clientName: "Scott Redding", service: "1-on-1", staff: "Mada Hauck", location: "CARBON", status: "COMPLETED", scheduledAt: "2026-04-14T09:30:00", bookedAt: "2026-04-10T14:00:00" },
  { id: "5", clientName: "Jesse Weissburg", service: "1-on-1", staff: "Aaron Davis", location: "CARBON", status: "COMPLETED", scheduledAt: "2026-04-14T06:45:00", bookedAt: "2026-04-10T14:00:00" },
];

const statusMap: Record<string, { label: string; variant: "success" | "info" | "danger" | "warning" | "outline" }> = {
  RESERVED: { label: "Reserved", variant: "info" },
  CONFIRMED: { label: "Confirmed", variant: "info" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
  EARLY_CANCEL: { label: "Early cancel", variant: "danger" },
  NO_SHOW: { label: "No show", variant: "warning" },
  LATE_CANCEL: { label: "Late cancel", variant: "warning" },
};

const columns: ColumnDef<VisitRow, unknown>[] = [
  { accessorKey: "clientName", header: "Name" },
  {
    accessorKey: "service",
    header: "Service",
    cell: ({ getValue }) => (
      <div>
        <p className="text-sm">{getValue() as string}</p>
        <p className="text-xs text-stone-500">{}</p>
      </div>
    ),
  },
  { accessorKey: "staff", header: "Staff" },
  { accessorKey: "location", header: "Location" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const s = statusMap[getValue() as string] ?? { label: getValue() as string, variant: "outline" as const };
      return <Badge variant={s.variant}>{s.label}</Badge>;
    },
  },
  {
    accessorKey: "bookedAt",
    header: "Booked",
    cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  },
];

export default function VisitsPage() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6">
      <DataTable data={MOCK_VISITS} columns={columns} searchPlaceholder="Search visits..." />
    </div>
  );
}
