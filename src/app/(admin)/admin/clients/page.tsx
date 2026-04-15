"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { AddClientModal } from "@/components/admin/add-client-modal";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Plus, Mail, Archive, Loader2 } from "lucide-react";

interface ClientRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  signupDate: Date;
  status: string;
  billingStatus: string;
  lifecycleStage: string;
  assignedStaff: string | null;
  profileImageUrl: string | null;
}

const billingBadge: Record<string, { label: string; variant: "success" | "warning" | "danger" | "outline" }> = {
  PAID: { label: "Paid", variant: "success" },
  NON_BILLED: { label: "Non-Billed", variant: "outline" },
  BILLED: { label: "Billed", variant: "success" },
  PAST_DUE: { label: "Past Due", variant: "danger" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
};

const statusBadge: Record<string, { label: string; variant: "success" | "warning" | "danger" | "outline" }> = {
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "outline" },
  PENDING_CANCELLATION: { label: "Pending Cancellation", variant: "warning" },
  SUSPENDED: { label: "Suspended", variant: "danger" },
};

const columns: ColumnDef<ClientRow, unknown>[] = [
  {
    accessorKey: "name",
    header: "Name",
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar name={`${row.original.firstName} ${row.original.lastName}`} src={row.original.profileImageUrl} size="sm" />
        <div>
          <p className="font-medium">{row.original.firstName} {row.original.lastName}</p>
          {row.original.email && (
            <p className="text-xs text-stone-500">{row.original.email}</p>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "signupDate",
    header: "Signup Date",
    cell: ({ getValue }) => {
      const d = new Date(getValue() as string);
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    },
  },
  {
    accessorKey: "billingStatus",
    header: "Status",
    cell: ({ row }) => {
      const billing = billingBadge[row.original.billingStatus] ?? { label: row.original.billingStatus, variant: "outline" as const };
      const status = statusBadge[row.original.status];
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          {status && status.label !== "Active" && <Badge variant={status.variant}>{status.label}</Badge>}
          <Badge variant={billing.variant}>{billing.label}</Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "lifecycleStage",
    header: "Lifecycle Stage",
    cell: ({ getValue }) => {
      const v = getValue() as string;
      return v.charAt(0) + v.slice(1).toLowerCase().replace("_", " ");
    },
  },
  {
    accessorKey: "assignedStaff",
    header: "Assigned To",
    cell: ({ getValue }) => (getValue() as string) || "—",
  },
  {
    id: "actions",
    header: "",
    size: 48,
    cell: ({ row }) => <ClientActions clientId={row.original.id} clientName={`${row.original.firstName} ${row.original.lastName}`} />,
    enableSorting: false,
  },
];

function ClientActions({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const archiveClient = trpc.clients.archive.useMutation({
    onSuccess: () => { toast("success", `${clientName} archived`); utils.clients.list.invalidate(); },
    onError: (err) => toast("error", err.message),
  });

  return (
    <DropdownMenu>
      <DropdownItem><Mail className="h-4 w-4" /> Message</DropdownItem>
      <DropdownItem
        danger
        onClick={() => { if (confirm(`Archive ${clientName}?`)) archiveClient.mutate({ id: clientId }); }}
      >
        <Archive className="h-4 w-4" /> Archive
      </DropdownItem>
    </DropdownMenu>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data, isLoading, error } = trpc.clients.list.useQuery({
    limit: 100,
  });

  const clientRows: ClientRow[] = (data?.clients ?? []).map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    signupDate: c.signupDate,
    status: c.status,
    billingStatus: c.billingStatus,
    lifecycleStage: c.lifecycleStage,
    assignedStaff: c.assignedStaff
      ? `${c.assignedStaff.firstName} ${c.assignedStaff.lastName}`
      : null,
    profileImageUrl: c.profileImageUrl,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" /> Add New Client
        </Button>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
            <span className="ml-2 text-sm text-stone-500">Loading clients...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-600">
            Failed to load clients. Make sure you&apos;re logged in.
          </div>
        ) : (
          <DataTable
            data={clientRows}
            columns={columns}
            searchPlaceholder="Search clients..."
            onRowClick={(row) => router.push(`/admin/clients/${row.id}`)}
          />
        )}
      </div>

      <AddClientModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}
