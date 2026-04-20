"use client";

import { useState, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { trpc } from "@/trpc/client";
import { CreatePlanModal } from "@/components/admin/create-plan-modal";
import { AssignPlanModal } from "@/components/admin/assign-plan-modal";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import { Plus, Copy, Users, UsersRound, Settings2, Pencil, Loader2, ChevronDown } from "lucide-react";

interface PlanRow {
  id: string;
  name: string;
  sizeWeeks: number;
  status: string;
  planType: string | null;
  createdBy: string | null;
  createdById: string | null;
  assignmentCount: number;
  createdAt: Date;
  tags: string[];
}

const PLAN_TYPES = ["All", "Strength", "Cardio", "HIIT", "Mobility", "Nutrition"];

// ─── Assign to Group Modal ───────────────────────────────────────────────────

function AssignToGroupModal({ open, onClose, planId, planName }: {
  open: boolean; onClose: () => void; planId: string; planName: string;
}) {
  const { toast } = useToast();
  const [groupId, setGroupId] = useState("");
  const { data: groups } = trpc.groups.list.useQuery(undefined, { enabled: open });
  const assign = trpc.plans.assignToGroup.useMutation({
    onSuccess: (r) => { toast("success", `Assigned to ${r.assigned} of ${r.total} members`); onClose(); },
    onError: (e) => toast("error", e.message),
  });
  return (
    <Modal open={open} onClose={onClose} title={`Assign "${planName}" to Group`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => assign.mutate({ planId, groupId })} disabled={!groupId || assign.isPending}>
          {assign.isPending ? "Assigning…" : "Assign"}
        </Button>
      </>}>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Select Group</label>
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500">
          <option value="">Choose a group…</option>
          {(groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <p className="text-xs text-stone-400 mt-2">Plan will be assigned to all active members who don&apos;t already have it.</p>
      </div>
    </Modal>
  );
}

// ─── Plan Settings Modal ─────────────────────────────────────────────────────

const EQUIPMENT_OPTIONS = ["Barbell", "Rack", "Kettlebells", "Dumbbells", "Cardio Machine", "Resistance Bands", "Pull-up Bar", "Bodyweight Only"];
const DIFFICULTY_OPTIONS = ["Beginner", "Intermediate", "Advanced", "Expert"];

function PlanSettingsModal({ open, onClose, planId }: { open: boolean; onClose: () => void; planId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: plan } = trpc.plans.byId.useQuery({ id: planId }, { enabled: open });
  const [form, setForm] = useState({
    isSellable: false, price: "", checkoutDescription: "", welcomeMessage: "", thankYouMessage: "",
    difficulty: "", equipment: [] as string[], frequency: "", objectives: "", requireWorkoutLogging: false,
  });

  const [seeded, setSeeded] = useState(false);
  if (plan && !seeded) {
    setForm({
      isSellable: plan.isSellable,
      price: plan.price != null ? String(plan.price) : "",
      checkoutDescription: plan.checkoutDescription ?? "",
      welcomeMessage: plan.welcomeMessage ?? "",
      thankYouMessage: plan.thankYouMessage ?? "",
      difficulty: plan.difficulty ?? "",
      equipment: plan.equipment ?? [],
      frequency: plan.frequency ?? "",
      objectives: plan.objectives ?? "",
      requireWorkoutLogging: plan.requireWorkoutLogging,
    });
    setSeeded(true);
  }

  const save = trpc.plans.updateSettings.useMutation({
    onSuccess: () => { toast("success", "Settings saved"); utils.plans.byId.invalidate({ id: planId }); utils.plans.list.invalidate(); onClose(); },
    onError: (e) => toast("error", e.message),
  });

  function toggleEquipment(eq: string) {
    setForm((f) => ({
      ...f,
      equipment: f.equipment.includes(eq) ? f.equipment.filter((e) => e !== eq) : [...f.equipment, eq],
    }));
  }

  function handleSave() {
    save.mutate({
      id: planId,
      isSellable: form.isSellable,
      price: form.price ? Number(form.price) : null,
      checkoutDescription: form.checkoutDescription || null,
      welcomeMessage: form.welcomeMessage || null,
      thankYouMessage: form.thankYouMessage || null,
      difficulty: form.difficulty || null,
      equipment: form.equipment,
      frequency: form.frequency || null,
      objectives: form.objectives || null,
      requireWorkoutLogging: form.requireWorkoutLogging,
    });
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setSeeded(false); }} title="Plan Settings"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
      </>}>
      <div className="space-y-5">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">General</p>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Difficulty</label>
            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none">
              <option value="">None</option>
              {DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Frequency (e.g. 3x/week)</label>
            <input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Equipment Required</label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((eq) => (
                <button key={eq} type="button" onClick={() => toggleEquipment(eq)}
                  className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                    form.equipment.includes(eq) ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-600 hover:border-stone-500"
                  }`}>{eq}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Objectives</label>
            <textarea value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })}
              rows={2} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm resize-none focus:outline-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.requireWorkoutLogging} onChange={(e) => setForm({ ...form, requireWorkoutLogging: e.target.checked })} className="rounded" />
            <span className="text-sm text-stone-700">Require workout logging to advance</span>
          </label>
        </div>

        <div className="space-y-3 border-t border-stone-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Selling</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isSellable} onChange={(e) => setForm({ ...form, isSellable: e.target.checked })} className="rounded" />
            <span className="text-sm text-stone-700">Sell this plan</span>
          </label>
          {form.isSellable && (
            <>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Price (USD)</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Checkout Description</label>
                <textarea value={form.checkoutDescription} onChange={(e) => setForm({ ...form, checkoutDescription: e.target.value })}
                  rows={2} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm resize-none focus:outline-none" placeholder="Why should someone buy this plan?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Welcome Message</label>
                <input value={form.welcomeMessage} onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })} placeholder="Sent after purchase"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Thank You Message</label>
                <input value={form.thankYouMessage} onChange={(e) => setForm({ ...form, thankYouMessage: e.target.value })} placeholder="Thank you page message"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none" />
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Tags Dropdown ────────────────────────────────────────────────────────────

function TagsDropdown({ selectedTags, onChange }: { selectedTags: string[]; onChange: (tags: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const { data: allTags } = trpc.tags.list.useQuery();

  function toggle(name: string) {
    if (selectedTags.includes(name)) {
      onChange(selectedTags.filter((t) => t !== name));
    } else {
      onChange([...selectedTags, name]);
    }
  }

  const label = selectedTags.length === 0 ? "Tags" : selectedTags.length === 1 ? selectedTags[0] : `${selectedTags.length} tags`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:border-stone-400 focus:outline-none"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 left-0 min-w-[180px] rounded-lg border border-stone-200 bg-white shadow-lg py-1">
            {(allTags ?? []).length === 0 && (
              <p className="px-3 py-2 text-xs text-stone-400">No tags yet</p>
            )}
            {(allTags ?? []).map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag.name)}
                  onChange={() => toggle(tag.name)}
                  className="h-3.5 w-3.5 rounded border-stone-300"
                />
                {tag.name}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Created By Dropdown ──────────────────────────────────────────────────────

function CreatedByDropdown({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { data: staff } = trpc.staff.list.useQuery();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:border-stone-400 focus:outline-none"
    >
      <option value="">Created By</option>
      {(staff ?? []).map((s) => (
        <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
      ))}
    </select>
  );
}

// ─── Row actions ─────────────────────────────────────────────────────────────

function PlanActions({ planId, planName }: { planId: string; planName: string }) {
  const [showAssign, setShowAssign] = useState(false);
  const [showAssignGroup, setShowAssignGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
        <DropdownItem onClick={() => setShowAssignGroup(true)}>
          <UsersRound className="h-4 w-4" /> Assign to Group
        </DropdownItem>
        <DropdownItem onClick={() => duplicatePlan.mutate({ id: planId })}>
          <Copy className="h-4 w-4" /> Duplicate
        </DropdownItem>
        <DropdownItem onClick={() => setShowSettings(true)}>
          <Settings2 className="h-4 w-4" /> Settings
        </DropdownItem>
      </DropdownMenu>
      <AssignPlanModal open={showAssign} onClose={() => setShowAssign(false)} planId={planId} planName={planName} />
      <AssignToGroupModal open={showAssignGroup} onClose={() => setShowAssignGroup(false)} planId={planId} planName={planName} />
      <PlanSettingsModal open={showSettings} onClose={() => setShowSettings(false)} planId={planId} />
    </>
  );
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnDef<PlanRow, unknown>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link href={`/admin/plans/${row.original.id}`} className="font-medium hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "sizeWeeks", header: "Size", cell: ({ getValue }) => `${getValue()} Weeks` },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const v = row.original.status;
      const count = row.original.assignmentCount;
      if (v === "ASSIGNED") {
        return (
          <span className="text-sm text-stone-700">
            Assigned{count > 1 ? ` — ${count} clients` : ""}
          </span>
        );
      }
      const label: Record<string, string> = {
        DRAFT: "Draft",
        PUBLISHED: "Published",
        ARCHIVED: "Archived",
      };
      return <span className="text-sm text-stone-700">{label[v] ?? v}</span>;
    },
  },
  { accessorKey: "createdBy", header: "Created By", cell: ({ getValue }) => (getValue() as string) || "—" },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
  },
  {
    id: "build",
    header: "",
    size: 80,
    cell: ({ row }) => (
      <Link
        href={`/admin/plans/${row.original.id}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-stone-900 px-2 py-1 rounded-lg border border-stone-200 hover:border-stone-400 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <Pencil className="h-3 w-3" /> Build
      </Link>
    ),
    enableSorting: false,
  },
  {
    id: "actions",
    header: "",
    size: 48,
    cell: ({ row }) => <PlanActions planId={row.original.id} planName={row.original.name} />,
    enableSorting: false,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlansPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [planTypeFilter, setPlanTypeFilter] = useState("All");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [createdByFilter, setCreatedByFilter] = useState("");

  const { data, isLoading } = trpc.plans.list.useQuery(
    createdByFilter ? { createdById: createdByFilter } : undefined
  );

  const planRows: PlanRow[] = useMemo(() => {
    const raw = (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      sizeWeeks: p.sizeWeeks,
      status: p.status,
      planType: p.planType ?? null,
      createdBy: p.createdBy ? `${p.createdBy.firstName} ${p.createdBy.lastName}` : null,
      createdById: p.createdById ?? null,
      assignmentCount: p._count.assignments,
      createdAt: p.createdAt,
      tags: p.tags ?? [],
    }));

    return raw.filter((p) => {
      if (planTypeFilter !== "All" && p.planType !== planTypeFilter) return false;
      if (selectedTags.length > 0 && !selectedTags.some((t) => p.tags.includes(t))) return false;
      return true;
    });
  }, [data, planTypeFilter, selectedTags]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Plans</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Add Plan</Button>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select
            value={planTypeFilter}
            onChange={(e) => setPlanTypeFilter(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:border-stone-400 focus:outline-none"
          >
            {PLAN_TYPES.map((t) => <option key={t} value={t}>{t === "All" ? "Plan Type" : t}</option>)}
          </select>
          <TagsDropdown selectedTags={selectedTags} onChange={setSelectedTags} />
          <CreatedByDropdown value={createdByFilter} onChange={setCreatedByFilter} />
          {(planTypeFilter !== "All" || selectedTags.length > 0 || createdByFilter) && (
            <button
              onClick={() => { setPlanTypeFilter("All"); setSelectedTags([]); setCreatedByFilter(""); }}
              className="text-xs text-stone-400 hover:text-stone-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
            <span className="ml-2 text-sm text-stone-500">Loading plans...</span>
          </div>
        ) : (
          <DataTable
            data={planRows}
            columns={columns}
            searchPlaceholder="Search plans..."
            getRowId={(row) => row.id}
            enableRowSelection
            onRowClick={(row) => { window.location.href = `/admin/plans/${row.id}`; }}
          />
        )}
      </div>

      <CreatePlanModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
