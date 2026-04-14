"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Copy, Archive } from "lucide-react";

interface PlanRow {
  id: string;
  name: string;
  sizeWeeks: number;
  status: string;
  createdBy: string;
  createdAt: string;
}

const MOCK_PLANS: PlanRow[] = [
  { id: "1", name: "ORIGIN Post-Assessment", sizeWeeks: 4, status: "DRAFT", createdBy: "Brandon Sherwood", createdAt: "2026-02-06" },
  { id: "2", name: "ORIGIN Pre-Assessment", sizeWeeks: 4, status: "DRAFT", createdBy: "Brandon Sherwood", createdAt: "2026-02-06" },
  { id: "3", name: "Nutrition - Weekly Check In [M]", sizeWeeks: 4, status: "ASSIGNED", createdBy: "Bri Larson", createdAt: "2025-11-07" },
  { id: "4", name: "Nutrition - Weekly Check In [F]", sizeWeeks: 4, status: "ASSIGNED", createdBy: "Bri Larson", createdAt: "2025-11-07" },
  { id: "5", name: "At Home", sizeWeeks: 4, status: "DRAFT", createdBy: "Bri Larson", createdAt: "2026-02-13" },
  { id: "6", name: "Strength Foundations A", sizeWeeks: 6, status: "PUBLISHED", createdBy: "Aaron Davis", createdAt: "2024-09-01" },
  { id: "7", name: "Hypertrophy Block B", sizeWeeks: 4, status: "PUBLISHED", createdBy: "Mada Hauck", createdAt: "2025-01-15" },
  { id: "8", name: "Rehab — Knee Protocol", sizeWeeks: 8, status: "ASSIGNED", createdBy: "Madeline Gladu", createdAt: "2025-06-10" },
];

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
    cell: ({ getValue }) => {
      const v = getValue() as string;
      const label = v === "ASSIGNED" ? `Assigned` : v.charAt(0) + v.slice(1).toLowerCase();
      return <Badge variant={statusVariant[v] || "outline"}>{label}</Badge>;
    },
  },
  { accessorKey: "createdBy", header: "Created By" },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
  },
  {
    id: "actions",
    header: "",
    size: 48,
    cell: () => (
      <DropdownMenu>
        <DropdownItem><Pencil className="h-4 w-4" /> Edit</DropdownItem>
        <DropdownItem><Copy className="h-4 w-4" /> Duplicate</DropdownItem>
        <DropdownItem danger><Archive className="h-4 w-4" /> Archive</DropdownItem>
      </DropdownMenu>
    ),
    enableSorting: false,
  },
];

export default function PlansPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Plans</h1>
        <div className="flex gap-2">
          <Button variant="secondary">Manage Routines</Button>
          <Button><Plus className="h-4 w-4" /> Add Plan</Button>
        </div>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <DataTable
          data={MOCK_PLANS}
          columns={columns}
          searchPlaceholder="Search plans..."
        />
      </div>
    </div>
  );
}
