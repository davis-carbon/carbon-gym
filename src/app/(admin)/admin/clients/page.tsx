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
import { Plus, Mail, Archive } from "lucide-react";

// Temporary mock data until Supabase is connected
const MOCK_CLIENTS: ClientRow[] = [
  { id: "1", firstName: "Tres", lastName: "Teschke", email: "tres.teschke@gmail.com", phone: "+1 214 453 9765", signupDate: "2019-07-24", status: "ACTIVE", billingStatus: "PAID", lifecycleStage: "CLIENT", assignedStaff: "Mada Hauck", profileImageUrl: null },
  { id: "2", firstName: "Jaxon", lastName: "Honea", email: "jaxon@email.com", phone: "", signupDate: "2025-04-17", status: "ACTIVE", billingStatus: "PAID", lifecycleStage: "CLIENT", assignedStaff: "Mada Hauck", profileImageUrl: null },
  { id: "3", firstName: "Jesse", lastName: "Weissburg", email: "j.weissburg@gmail.com", phone: "", signupDate: "2024-07-11", status: "PENDING_CANCELLATION", billingStatus: "BILLED", lifecycleStage: "CLIENT", assignedStaff: "Bri Larson", profileImageUrl: null },
  { id: "4", firstName: "Shane", lastName: "Flores", email: "shane@email.com", phone: "", signupDate: "2024-09-15", status: "ACTIVE", billingStatus: "PAID", lifecycleStage: "CLIENT", assignedStaff: "Mada Hauck", profileImageUrl: null },
  { id: "5", firstName: "Matthew", lastName: "Schweitzer", email: "matt@email.com", phone: "", signupDate: "2024-03-22", status: "ACTIVE", billingStatus: "PAID", lifecycleStage: "CLIENT", assignedStaff: "Aaron Davis", profileImageUrl: null },
  { id: "6", firstName: "Miguel", lastName: "Garza", email: "miguel@email.com", phone: "", signupDate: "2024-11-01", status: "ACTIVE", billingStatus: "PAID", lifecycleStage: "CLIENT", assignedStaff: "Aaron Davis", profileImageUrl: null },
  { id: "7", firstName: "Caroline", lastName: "Joyner", email: "caroline@email.com", phone: "", signupDate: "2025-01-14", status: "ACTIVE", billingStatus: "PAID", lifecycleStage: "CLIENT", assignedStaff: "Aaron Davis", profileImageUrl: null },
  { id: "8", firstName: "JOHN Peter", lastName: "Leonard", email: "jpleonard2000@yahoo.com", phone: "", signupDate: "2026-04-13", status: "ACTIVE", billingStatus: "NON_BILLED", lifecycleStage: "CLIENT", assignedStaff: "CARBON Training Centre", profileImageUrl: null },
  { id: "9", firstName: "Ruth", lastName: "ofondu", email: "ruginalegend@gmail.com", phone: "", signupDate: "2026-04-13", status: "ACTIVE", billingStatus: "NON_BILLED", lifecycleStage: "CLIENT", assignedStaff: "CARBON Training Centre", profileImageUrl: null },
  { id: "10", firstName: "Ed", lastName: "Hockfield", email: "ed@email.com", phone: "", signupDate: "2024-06-10", status: "ACTIVE", billingStatus: "PAID", lifecycleStage: "CLIENT", assignedStaff: "Aaron Davis", profileImageUrl: null },
  { id: "11", firstName: "Max", lastName: "Rice", email: "max@email.com", phone: "", signupDate: "2025-02-20", status: "ACTIVE", billingStatus: "PAID", lifecycleStage: "CLIENT", assignedStaff: "Aaron Davis", profileImageUrl: null },
  { id: "12", firstName: "Brett", lastName: "Hart", email: "brett@email.com", phone: "", signupDate: "2024-08-05", status: "ACTIVE", billingStatus: "PAID", lifecycleStage: "CLIENT", assignedStaff: "Bri Larson", profileImageUrl: null },
];

interface ClientRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  signupDate: string;
  status: string;
  billingStatus: string;
  lifecycleStage: string;
  assignedStaff: string;
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
  },
  {
    id: "actions",
    header: "",
    size: 48,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownItem onClick={() => {}}>
          <Mail className="h-4 w-4" /> Message
        </DropdownItem>
        <DropdownItem onClick={() => {}} danger>
          <Archive className="h-4 w-4" /> Archive
        </DropdownItem>
      </DropdownMenu>
    ),
    enableSorting: false,
  },
];

export default function ClientsPage() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" /> Add New Client
        </Button>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <DataTable
          data={MOCK_CLIENTS}
          columns={columns}
          searchPlaceholder="Search clients..."
          onRowClick={(row) => router.push(`/admin/clients/${row.id}`)}
        />
      </div>

      <AddClientModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}
