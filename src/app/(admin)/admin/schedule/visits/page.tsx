"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/trpc/client";
import { Loader2 } from "lucide-react";

interface VisitRow {
  id: string;
  clientName: string;
  service: string;
  staff: string;
  location: string;
  status: string;
  scheduledAt: Date;
  packageName: string | null;
}

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
  { accessorKey: "clientName", header: "Client", cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
  { accessorKey: "service", header: "Service" },
  { accessorKey: "staff", header: "Staff" },
  { accessorKey: "location", header: "Location", cell: ({ getValue }) => (getValue() as string) || "—" },
  {
    accessorKey: "scheduledAt",
    header: "When",
    cell: ({ getValue }) => {
      const d = new Date(getValue() as string);
      return <span>{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const s = statusMap[getValue() as string] ?? { label: getValue() as string, variant: "outline" as const };
      return <Badge variant={s.variant}>{s.label}</Badge>;
    },
  },
  {
    accessorKey: "packageName",
    header: "Package",
    cell: ({ getValue }) => (getValue() as string) || "—",
  },
];

export default function VisitsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const { data, isLoading } = trpc.schedule.visits.list.useQuery({
    limit: 100,
    status: statusFilter || undefined,
  });

  const visitRows: VisitRow[] = (data?.visits ?? []).map((v) => ({
    id: v.id,
    clientName: `${v.client.firstName} ${v.client.lastName}`,
    service: v.service.name,
    staff: `${v.staff.firstName} ${v.staff.lastName}`,
    location: v.location?.name ?? "",
    status: v.status,
    scheduledAt: v.scheduledAt,
    packageName: v.clientPackage?.package?.name ?? null,
  }));

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm">
          <option value="">All Statuses</option>
          <option value="RESERVED">Reserved</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EARLY_CANCEL">Early Cancel</option>
          <option value="NO_SHOW">No Show</option>
        </select>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>
        ) : (
          <DataTable data={visitRows} columns={columns} searchPlaceholder="Search visits..." />
        )}
      </div>
    </div>
  );
}
