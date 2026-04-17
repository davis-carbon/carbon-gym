"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { trpc } from "@/trpc/client";
import { CreatePlanModal } from "@/components/admin/create-plan-modal";
import { AssignPlanModal } from "@/components/admin/assign-plan-modal";
import { useToast } from "@/components/ui/toast";
import { Plus, Pencil, Copy, Archive, Users, Loader2 } from "lucide-react";

interface PlanRow {
  id: string;
  name: string;
  sizeWeeks: number;
  status: string;
  createdBy: string | null;
  assignmentCount: number;
  createdAt: Date;
}

const statusVariant: Record<string, "outline" | "success" | "info" | "warning"> = {
  DRAFT: "outline",
  PUBLISHED: "info",
  ASSIGNED: "success",
  ARCHIVED: "warning",
};

const columns: ColumnDef<PlanRow, unknown>[] = [
  { accessorKey: "name", header: "Name", cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
  { accessorKey: "sizeWeeks", header: "Size", cell: ({ getValue }) => `${getValue()} Weeks` },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const v = row.original.status;
      const label = v === "ASSIGNED" ? `Assigned — ${row.original.assignmentCount} clients` : v.charAt(0) + v.slice(1).toLowerCase();
      return <Badge variant={statusVariant[v] || "outline"}>{label}</Badge>;
    },
  },
  { accessorKey: "createdBy", header: "Created By", cell: ({ getValue }) => (getValue() as string) || "—" },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
  },
  {
    id: "actions",
    header: "",
    size: 48,
    cell: ({ row }) => <PlanActions planId={row.original.id} planName={row.original.name} />,
    enableSorting: false,
  },
];

function PlanActions({ planId, planName }: { planId: string; planName: string }) {
  const [showAssign, setShowAssign] = useState(false);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const duplicatePlan = trpc.plans.duplicate.useMutation({
    onSuccess: () => { toast("success", "Plan duplicated"); utils.plans.list.invalidate(); },
    onError: (err) => toast("error", err.message),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownItem onClick={() => setShowAssign(true)}>
          <Users className="h-4 w-4" /> Assign to Client
        </DropdownItem>
        <DropdownItem onClick={() => duplicatePlan.mutate({ id: planId })}>
          <Copy className="h-4 w-4" /> Duplicate
        </DropdownItem>
      </DropdownMenu>
      <AssignPlanModal open={showAssign} onClose={() => setShowAssign(false)} planId={planId} planName={planName} />
    </>
  );
}

export default function PlansPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = trpc.plans.list.useQuery();

  const planRows: PlanRow[] = (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    sizeWeeks: p.sizeWeeks,
    status: p.status,
    createdBy: p.createdBy ? `${p.createdBy.firstName} ${p.createdBy.lastName}` : null,
    assignmentCount: p._count.assignments,
    createdAt: p.createdAt,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Plans</h1>
        <div className="flex gap-2">
          <Button variant="secondary">Manage Routines</Button>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Add Plan</Button>
        </div>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
            <span className="ml-2 text-sm text-stone-500">Loading plans...</span>
          </div>
        ) : (
          <DataTable data={planRows} columns={columns} searchPlaceholder="Search plans..." onRowClick={(row) => { window.location.href = `/admin/plans/${row.id}`; }} />
        )}
      </div>

      <CreatePlanModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
