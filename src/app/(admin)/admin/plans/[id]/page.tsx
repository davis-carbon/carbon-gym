"use client";

import { use, useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Search,
  X,
  Loader2,
  Save,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Pencil,
  Tag,
  MoreHorizontal,
  DollarSign,
  UserPlus,
  Users,
  BookMarked,
  Settings,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type RoutineExercise = {
  id: string;
  sortOrder: number;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  restSeconds: number | null;
  tempo: string | null;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    muscleGroup: string | null;
    youtubeVideoId: string | null;
  };
};

type Routine = {
  id: string;
  weekNumber: number;
  dayNumber: number;
  name: string | null;
  sortOrder: number;
  exercises: RoutineExercise[];
};

type PlanAssignment = {
  id: string;
  createdAt: Date | string;
  startDate: Date | string | null;
  client: { id: string; firstName: string; lastName: string; email: string };
  assignedBy: { firstName: string; lastName: string } | null;
};

type PlanData = {
  id: string;
  name: string;
  description: string | null;
  sizeWeeks: number;
  status: string;
  tags: string[];
  planType: string | null;
  difficulty: string | null;
  equipment: string[];
  frequency: string | null;
  objectives: string | null;
  requireWorkoutLogging: boolean;
  isSellable: boolean;
  price: number | null;
  checkoutDescription: string | null;
  welcomeMessage: string | null;
  thankYouMessage: string | null;
  routines: Routine[];
  assignments: PlanAssignment[];
};

// dayNumber 1=MON … 7=SUN
const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const statusVariant: Record<string, "outline" | "success" | "info" | "warning"> = {
  DRAFT: "outline",
  PUBLISHED: "info",
  ASSIGNED: "success",
  ARCHIVED: "warning",
};

function fmtRest(s: number | null): string {
  if (!s) return "00:00";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Panel Sidebar Types ────────────────────────────────────────────────────────

type PanelId = "sell" | "clients" | "groups" | "habits" | "settings";

const PANEL_DEFS: { id: PanelId; label: string; Icon: React.ElementType }[] = [
  { id: "sell",     label: "Sell",     Icon: DollarSign },
  { id: "clients",  label: "Clients",  Icon: UserPlus },
  { id: "groups",   label: "Groups",   Icon: Users },
  { id: "habits",   label: "Habits",   Icon: BookMarked },
  { id: "settings", label: "Settings", Icon: Settings },
];

// ── Plan Tag Editor ───────────────────────────────────────────────────────────

function PlanTagEditor({ planId, tags }: { planId: string; tags: string[] }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const update = trpc.plans.update.useMutation({
    onSuccess: () => utils.plans.byId.invalidate({ id: planId }),
    onError: (err) => toast("error", err.message),
  });

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    update.mutate({ id: planId, tags: [...tags, trimmed] });
    setInput("");
  }

  function removeTag(name: string) {
    update.mutate({ id: planId, tags: tags.filter((t) => t !== name) });
  }

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600"
        >
          {t}
          <button onClick={() => removeTag(t)} className="opacity-50 hover:opacity-100 hover:text-red-500">
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-2.5 py-0.5 text-xs font-medium text-stone-400 hover:border-stone-500 hover:text-stone-600"
        >
          <Tag className="h-2.5 w-2.5" /> Add tag
        </button>
        {open && (
          <div className="absolute z-30 mt-1 left-0 min-w-[200px] rounded-lg border border-stone-200 bg-white shadow-lg py-1">
            <div className="px-2 py-1.5">
              <input
                autoFocus
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { addTag(input); }
                  if (e.key === "Escape") { setOpen(false); setInput(""); }
                }}
                placeholder="Type and press Enter…"
                className="w-full text-xs px-2 py-1 rounded border border-stone-200 focus:outline-none focus:border-stone-400"
              />
            </div>
            {input.trim() && !tags.includes(input.trim()) && (
              <button
                onClick={() => { addTag(input); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
              >
                <Plus className="h-3 w-3" /> Add &quot;{input.trim()}&quot;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Exercise Search Modal ─────────────────────────────────────────────────────

function ExerciseSearchModal({
  onSelect,
  onClose,
}: {
  onSelect: (exercise: { id: string; name: string }) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const { data } = trpc.exercises.list.useQuery(
    { search: q, limit: 20 },
    { placeholderData: (prev) => prev }
  );

  const exercises = data?.exercises ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
          <Search className="h-4 w-4 text-stone-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercises…"
            className="flex-1 text-sm focus:outline-none"
          />
          <button onClick={onClose}>
            <X className="h-4 w-4 text-stone-400" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-stone-50">
          {exercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => {
                onSelect({ id: ex.id, name: ex.name });
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-stone-50 transition-colors"
            >
              {ex.youtubeVideoId ? (
                <img
                  src={`https://img.youtube.com/vi/${ex.youtubeVideoId}/default.jpg`}
                  className="h-8 w-12 rounded object-cover shrink-0"
                  alt=""
                />
              ) : (
                <div className="h-8 w-12 rounded bg-stone-100 shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-stone-900">{ex.name}</p>
                {ex.muscleGroup && (
                  <p className="text-xs text-stone-400">{ex.muscleGroup}</p>
                )}
              </div>
            </button>
          ))}
          {exercises.length === 0 && (
            <p className="text-center text-sm text-stone-400 py-6">
              {q.length === 0 ? "Start typing to search…" : "No exercises found"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Exercise Row ──────────────────────────────────────────────────────────────

function ExerciseRow({ ex, planId, index }: { ex: RoutineExercise; planId: string; index: number }) {
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    sets: ex.sets?.toString() ?? "3",
    reps: ex.reps ?? "",
    weight: ex.weight ?? "",
    restSeconds: ex.restSeconds?.toString() ?? "60",
    tempo: ex.tempo ?? "",
    notes: ex.notes ?? "",
  });

  const update = trpc.plans.updateRoutineExercise.useMutation({
    onSuccess: () => {
      utils.plans.byId.invalidate({ id: planId });
      toast("success", "Saved");
    },
    onError: (err) => toast("error", err.message),
  });

  const remove = trpc.plans.deleteRoutineExercise.useMutation({
    onSuccess: () => utils.plans.byId.invalidate({ id: planId }),
    onError: (err) => toast("error", err.message),
  });

  const handleSave = () => {
    update.mutate({
      id: ex.id,
      sets: form.sets ? parseInt(form.sets) : null,
      reps: form.reps || null,
      weight: form.weight || null,
      restSeconds: form.restSeconds ? parseInt(form.restSeconds) : null,
      tempo: form.tempo || null,
      notes: form.notes || null,
    });
    setExpanded(false);
  };

  const letter = String.fromCharCode(65 + index); // A, B, C...

  return (
    <div className="mb-1">
      {/* Collapsed summary row */}
      <div
        className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-stone-50 cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-[10px] font-bold text-stone-400 mt-0.5 w-4 shrink-0">{letter}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-stone-800 truncate">{ex.exercise.name}</p>
          <p className="text-[11px] text-stone-400 mt-0.5">
            {ex.sets ?? "—"} Sets, {ex.reps ?? "—"} reps
            {ex.weight ? `, ${ex.weight}` : ", 0 lbs"}
            , {fmtRest(ex.restSeconds)} rest
          </p>
          {ex.notes && (
            <p className="text-[11px] text-stone-400 truncate max-w-[200px] mt-0.5">{ex.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
          {expanded ? (
            <ChevronUp className="h-3 w-3 text-stone-400" />
          ) : (
            <ChevronDown className="h-3 w-3 text-stone-400" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); remove.mutate({ id: ex.id }); }}
            disabled={remove.isPending}
            className="text-stone-300 hover:text-red-500 p-0.5 disabled:opacity-50"
          >
            {remove.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Expanded edit form */}
      {expanded && (
        <div className="mx-2 mb-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
          <div className="grid grid-cols-2 gap-2 mb-2">
            {(
              [
                { label: "Sets", key: "sets", placeholder: "3" },
                { label: "Reps", key: "reps", placeholder: "8-12" },
                { label: "Weight", key: "weight", placeholder: "135 lbs" },
                { label: "Rest (s)", key: "restSeconds", placeholder: "60" },
                { label: "Tempo", key: "tempo", placeholder: "3-1-2" },
              ] as { label: string; key: keyof typeof form; placeholder: string }[]
            ).map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] font-medium text-stone-500 uppercase tracking-wide block mb-0.5">{label}</label>
                <input
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-stone-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 bg-white"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-[10px] font-medium text-stone-500 uppercase tracking-wide block mb-0.5">Notes</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Cue or instruction…"
                className="w-full rounded-lg border border-stone-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 bg-white"
              />
            </div>
          </div>
          <Button size="sm" className="w-full text-xs" onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Routine Name Editor ───────────────────────────────────────────────────────

function RoutineNameEditor({ routine, planId }: { routine: Routine; planId: string }) {
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(routine.name ?? "Workout");

  const update = trpc.plans.updateRoutine.useMutation({
    onSuccess: () => utils.plans.byId.invalidate({ id: planId }),
    onError: (err) => toast("error", err.message),
  });

  if (editing) {
    return (
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          update.mutate({ id: routine.id, name });
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { update.mutate({ id: routine.id, name }); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
        className="text-xs font-semibold bg-transparent border-b border-stone-400 focus:outline-none flex-1 min-w-0"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-xs font-semibold text-stone-800 hover:text-stone-500 flex items-center gap-1 group truncate"
    >
      <span className="truncate">{routine.name || "Workout"}</span>
      <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}

// ── Add Routine Modal ─────────────────────────────────────────────────────────

type LibraryRoutine = {
  id: string;
  name: string | null;
  plan: { id: string; name: string };
  exercises: Array<{
    id: string;
    sortOrder: number;
    sets: number | null;
    reps: string | null;
    weight: string | null;
    restSeconds: number | null;
    exercise: { id: string; name: string };
  }>;
};

function AddRoutineModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (routine: LibraryRoutine) => void;
}) {
  const [q, setQ] = useState("");
  const { data: routines } = trpc.workouts.listRoutines.useQuery(
    { query: q || undefined },
    { enabled: open }
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
          <Search className="h-4 w-4 text-stone-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search routines…"
            className="flex-1 text-sm focus:outline-none"
          />
          <button onClick={onClose}><X className="h-4 w-4 text-stone-400" /></button>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-stone-50">
          {(routines ?? []).map((r) => (
            <button
              key={r.id}
              onClick={() => { onSelect(r as LibraryRoutine); onClose(); }}
              className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-stone-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-stone-900">{r.name || "Workout"}</p>
                <p className="text-xs text-stone-400">{r.plan.name} · {r.exercises.length} exercises</p>
              </div>
            </button>
          ))}
          {(routines ?? []).length === 0 && (
            <p className="text-center text-sm text-stone-400 py-6">
              {q.length === 0 ? "Start typing to search…" : "No routines found"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Day Cell "+" dropdown ─────────────────────────────────────────────────────

function DayCellAddDropdown({
  onBuildWorkout,
  onAddRoutine,
}: {
  onBuildWorkout: () => void;
  onAddRoutine: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-5 w-5 flex items-center justify-center rounded hover:bg-stone-200 text-stone-500 transition-colors"
        title="Add workout"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute z-30 left-0 top-6 min-w-[160px] rounded-lg border border-stone-200 bg-white shadow-lg py-1">
          <button
            onClick={() => { setOpen(false); onBuildWorkout(); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
          >
            <Plus className="h-3 w-3" /> Build Workout
          </button>
          <button
            onClick={() => { setOpen(false); onAddRoutine(); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
          >
            <GripVertical className="h-3 w-3" /> Add Routine
          </button>
        </div>
      )}
    </div>
  );
}

// ── Routine Card ──────────────────────────────────────────────────────────────

function RoutineCard({
  routine,
  planId,
  maxWeek,
  onAddExercise,
}: {
  routine: Routine;
  planId: string;
  maxWeek: number;
  onAddExercise: (routineId: string) => void;
}) {
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const deleteRoutine = trpc.plans.deleteRoutine.useMutation({
    onSuccess: () => utils.plans.byId.invalidate({ id: planId }),
    onError: (err) => toast("error", err.message),
  });

  const createRoutine = trpc.plans.addRoutine.useMutation({
    onSuccess: () => utils.plans.byId.invalidate({ id: planId }),
    onError: (err) => toast("error", err.message),
  });

  const addExercise = trpc.plans.addExerciseToRoutine.useMutation({
    onSuccess: () => utils.plans.byId.invalidate({ id: planId }),
    onError: (err) => toast("error", err.message),
  });

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  async function handleCopyToNextDay() {
    setMenuOpen(false);
    let nextWeek = routine.weekNumber;
    let nextDay = routine.dayNumber + 1;
    if (nextDay > 7) {
      nextDay = 1;
      nextWeek = routine.weekNumber + 1;
    }
    if (nextWeek > maxWeek) {
      toast("error", "Already at the last day of the plan");
      return;
    }

    try {
      const newRoutine = await createRoutine.mutateAsync({
        planId,
        weekNumber: nextWeek,
        dayNumber: nextDay,
        name: routine.name ?? "Workout",
      });
      for (const ex of routine.exercises) {
        await addExercise.mutateAsync({
          routineId: newRoutine.id,
          exerciseId: ex.exercise.id,
          sets: ex.sets ?? undefined,
          reps: ex.reps ?? undefined,
          weight: ex.weight ?? undefined,
          restSeconds: ex.restSeconds ?? undefined,
        });
      }
      toast("success", "Copied to next day");
    } catch {
      toast("error", "Failed to copy workout");
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white mb-2 overflow-visible">
      {/* Routine header */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-stone-100">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => setSelected(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-stone-300 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <RoutineNameEditor routine={routine} planId={planId} />
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-stone-100 text-stone-400"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute z-30 right-0 top-6 min-w-[160px] rounded-lg border border-stone-200 bg-white shadow-lg py-1">
              <button
                onClick={handleCopyToNextDay}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
              >
                <Plus className="h-3 w-3" /> Copy to next day
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (confirm(`Delete "${routine.name || "Workout"}" and all its exercises?`)) {
                    deleteRoutine.mutate({ id: routine.id });
                  }
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" /> Delete workout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Exercise list */}
      <div className="px-1 py-1.5">
        {routine.exercises.map((ex, i) => (
          <ExerciseRow key={ex.id} ex={ex} planId={planId} index={i} />
        ))}
        <button
          onClick={() => onAddExercise(routine.id)}
          className="mt-0.5 w-full flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors"
        >
          <Plus className="h-3 w-3" /> Add exercise
        </button>
      </div>
    </div>
  );
}

// ── Week Summary ──────────────────────────────────────────────────────────────

function weekSummary(weekRoutines: Routine[]) {
  const workoutCount = weekRoutines.length;
  const totalSets = weekRoutines.reduce(
    (sum, r) => sum + r.exercises.reduce((s, ex) => s + (ex.sets ?? 0), 0),
    0
  );
  return { workoutCount, totalSets };
}

// ── Day Column ────────────────────────────────────────────────────────────────

function DayColumn({
  routines,
  planId,
  weekNumber,
  dayIndex,
  maxWeek,
}: {
  routines: Routine[];
  planId: string;
  weekNumber: number;
  dayIndex: number;
  maxWeek: number;
}) {
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const [showAddRoutineModal, setShowAddRoutineModal] = useState(false);

  const dayNumber = dayIndex + 1;

  const createRoutine = trpc.plans.addRoutine.useMutation({
    onSuccess: () => utils.plans.byId.invalidate({ id: planId }),
    onError: (err) => toast("error", err.message),
  });

  const addExercise = trpc.plans.addExerciseToRoutine.useMutation({
    onSuccess: () => utils.plans.byId.invalidate({ id: planId }),
    onError: (err) => toast("error", err.message),
  });

  async function handleBuildWorkout() {
    await createRoutine.mutateAsync({ planId, weekNumber, dayNumber, name: "Workout" });
  }

  async function handleAddRoutineFromLibrary(source: LibraryRoutine) {
    try {
      const newRoutine = await createRoutine.mutateAsync({
        planId, weekNumber, dayNumber, name: source.name ?? "Workout",
      });
      for (const ex of source.exercises) {
        await addExercise.mutateAsync({
          routineId: newRoutine.id,
          exerciseId: ex.exercise.id,
          sets: ex.sets ?? undefined,
          reps: ex.reps ?? undefined,
          weight: ex.weight ?? undefined,
          restSeconds: ex.restSeconds ?? undefined,
        });
      }
      toast("success", "Routine added");
    } catch {
      toast("error", "Failed to add routine");
    }
  }

  const [showCellSearch, setShowCellSearch] = useState<string | null>(null);

  async function handleAddExercise(exercise: { id: string; name: string }, targetRoutineId: string | "new") {
    let routineId = targetRoutineId === "new" ? null : targetRoutineId;
    if (!routineId) {
      const r = await createRoutine.mutateAsync({ planId, weekNumber, dayNumber, name: "Workout" });
      routineId = r.id;
    }
    addExercise.mutate({ routineId, exerciseId: exercise.id, sets: 3, reps: "10", restSeconds: 60 });
  }

  return (
    <div className="overflow-visible">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">{DAY_NAMES[dayIndex]}</p>
          <p className="text-[10px] text-stone-400">Day {(weekNumber - 1) * 7 + dayIndex + 1}</p>
        </div>
        <DayCellAddDropdown
          onBuildWorkout={handleBuildWorkout}
          onAddRoutine={() => setShowAddRoutineModal(true)}
        />
      </div>

      <div className="min-h-[140px] overflow-visible">
        {routines.map((routine) => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            planId={planId}
            maxWeek={maxWeek}
            onAddExercise={(rId) => setShowCellSearch(rId)}
          />
        ))}
      </div>

      {showCellSearch !== null && (
        <ExerciseSearchModal
          onSelect={(exercise) => handleAddExercise(exercise, showCellSearch)}
          onClose={() => setShowCellSearch(null)}
        />
      )}
      <AddRoutineModal
        open={showAddRoutineModal}
        onClose={() => setShowAddRoutineModal(false)}
        onSelect={handleAddRoutineFromLibrary}
      />
    </div>
  );
}

// ── Week Section ──────────────────────────────────────────────────────────────

function WeekSection({
  weekNumber,
  sizeWeeks,
  routines,
  planId,
  collapsed,
  onToggle,
}: {
  weekNumber: number;
  sizeWeeks: number;
  routines: Routine[];
  planId: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { workoutCount, totalSets } = weekSummary(routines);

  return (
    <div className="mb-6">
      <div
        className="flex items-center justify-between px-3 py-2 bg-stone-100 rounded-xl mb-3 cursor-pointer hover:bg-stone-200 transition-colors select-none"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-stone-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-stone-500" />
          )}
          <span className="text-sm font-semibold text-stone-700">
            Week {weekNumber} of {sizeWeeks}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <span>{workoutCount} Workout{workoutCount !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{totalSets} sets</span>
          <button
            onClick={(e) => e.stopPropagation()}
            className="ml-1 h-6 w-6 flex items-center justify-center rounded hover:bg-stone-300 text-stone-500"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-2" style={{ minWidth: "700px" }}>
            {Array.from({ length: 7 }, (_, dayIndex) => {
              const dayNumber = dayIndex + 1;
              const dayRoutines = routines.filter((r) => r.dayNumber === dayNumber);
              return (
                <DayColumn
                  key={dayIndex}
                  routines={dayRoutines}
                  planId={planId}
                  weekNumber={weekNumber}
                  dayIndex={dayIndex}
                  maxWeek={sizeWeeks}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SIDEBAR PANELS ────────────────────────────────────────────────────────────

// ── Sell Panel ────────────────────────────────────────────────────────────────

function SellPanel({ plan, planId }: { plan: PlanData; planId: string }) {
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const [form, setForm] = useState({
    isSellable: plan.isSellable,
    isFree: !plan.isSellable && plan.status === "PUBLISHED",
    price: plan.price?.toString() ?? "",
    checkoutDescription: plan.checkoutDescription ?? "",
  });

  const update = trpc.plans.updateSettings.useMutation({
    onSuccess: () => { utils.plans.byId.invalidate({ id: planId }); toast("success", "Saved"); },
    onError: (e) => toast("error", e.message),
  });

  function handleSave() {
    update.mutate({
      id: planId,
      isSellable: form.isSellable,
      price: form.isSellable && form.price ? parseFloat(form.price) : null,
      checkoutDescription: form.checkoutDescription || null,
    });
  }

  return (
    <div className="p-4 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-stone-800 mb-0.5">Sell</h3>
        <p className="text-xs text-stone-400">Monetize or share this plan</p>
      </div>

      <div className="space-y-3">
        {/* Sell this plan */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={form.isSellable}
            onChange={(e) => setForm({ ...form, isSellable: e.target.checked, isFree: e.target.checked ? false : form.isFree })}
            className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-stone-800"
          />
          <div>
            <p className="text-sm text-stone-700 font-medium">Sell this plan</p>
            <p className="text-xs text-stone-400 mt-0.5">Clients purchase access via checkout</p>
          </div>
        </label>

        {/* Price — shown when sellable */}
        {form.isSellable && (
          <div className="ml-7 space-y-3 border-l-2 border-stone-100 pl-3">
            <div>
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block mb-1">Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="49.00"
                className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block mb-1">Checkout Description</label>
              <textarea
                rows={2}
                value={form.checkoutDescription}
                onChange={(e) => setForm({ ...form, checkoutDescription: e.target.value })}
                placeholder="What clients see at checkout…"
                className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
          </div>
        )}

        {/* Make available for free */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={form.isFree}
            onChange={(e) => setForm({ ...form, isFree: e.target.checked, isSellable: e.target.checked ? false : form.isSellable })}
            className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-stone-800"
          />
          <div>
            <p className="text-sm text-stone-700 font-medium">Make available for free</p>
            <p className="text-xs text-stone-400 mt-0.5">All clients on your platform can access this plan</p>
          </div>
        </label>
      </div>

      <Button
        size="sm"
        className="w-full"
        onClick={handleSave}
        disabled={update.isPending}
      >
        {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
        Save
      </Button>
    </div>
  );
}

// ── Clients Panel ─────────────────────────────────────────────────────────────

function ClientsPanel({ plan, planId }: { plan: PlanData; planId: string }) {
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const { data: clientsData } = trpc.clients.list.useQuery(
    { search, limit: 8 },
    { enabled: search.trim().length > 0 }
  );

  const assign = trpc.plans.assignToClient.useMutation({
    onSuccess: () => { utils.plans.byId.invalidate({ id: planId }); toast("success", "Plan assigned"); setSearch(""); },
    onError: (e) => toast("error", e.message),
  });

  const unassign = trpc.plans.unassignFromClient.useMutation({
    onSuccess: () => { utils.plans.byId.invalidate({ id: planId }); setConfirmRemoveId(null); toast("success", "Assignment removed"); },
    onError: (e) => toast("error", e.message),
  });

  const assignments = plan.assignments ?? [];
  const assignedClientIds = new Set(assignments.map((a) => a.client.id));
  const searchResults = (clientsData?.clients ?? []).filter((c) => !assignedClientIds.has(c.id));

  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-stone-800 mb-0.5">Clients</h3>
        <p className="text-xs text-stone-400">Add plan to client calendar</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for a client to add…"
          className="w-full pl-8 pr-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-300"
        />
      </div>

      {/* Search results dropdown */}
      {search.trim().length > 0 && (
        <div className="rounded-lg border border-stone-200 overflow-hidden -mt-2">
          {searchResults.length === 0 ? (
            <p className="text-xs text-stone-400 py-3 text-center">No clients found</p>
          ) : (
            searchResults.map((client) => (
              <button
                key={client.id}
                onClick={() => assign.mutate({ planId, clientId: client.id })}
                disabled={assign.isPending}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-stone-50 border-b border-stone-100 last:border-0 transition-colors"
              >
                <div>
                  <p className="text-xs font-medium text-stone-800">{client.firstName} {client.lastName}</p>
                  <p className="text-[11px] text-stone-400">{client.email}</p>
                </div>
                {assign.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400 shrink-0" />
                ) : (
                  <Plus className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* Assigned clients list */}
      {assignments.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-2">
            Assigned — {assignments.length}
          </p>
          <div className="space-y-1">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-stone-50 group"
              >
                <div>
                  <p className="text-xs font-medium text-stone-800">{a.client.firstName} {a.client.lastName}</p>
                  <p className="text-[11px] text-stone-400">{fmtDate(a.createdAt)}</p>
                </div>
                {confirmRemoveId === a.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => unassign.mutate({ assignmentId: a.id })}
                      disabled={unassign.isPending}
                      className="text-[11px] text-red-600 hover:text-red-700 font-medium px-1.5 py-0.5 rounded"
                    >
                      {unassign.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
                    </button>
                    <button
                      onClick={() => setConfirmRemoveId(null)}
                      className="text-[11px] text-stone-400 hover:text-stone-600 px-1.5 py-0.5 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRemoveId(a.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5 text-stone-400 hover:text-red-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-stone-400">
          <UserPlus className="h-6 w-6 mx-auto mb-2 text-stone-300" />
          <p className="text-xs">No clients assigned yet</p>
        </div>
      )}
    </div>
  );
}

// ── Groups Panel ──────────────────────────────────────────────────────────────

function GroupsPanel({ planId }: { planId: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const { data: groups } = trpc.groups.list.useQuery(
    search ? { search } : undefined
  );

  const assign = trpc.plans.assignToGroup.useMutation({
    onSuccess: (data, vars) => {
      setAssigningId(null);
      toast("success", `Plan assigned to ${data.assigned} client(s)`);
    },
    onError: (e) => { setAssigningId(null); toast("error", e.message); },
  });

  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-stone-800 mb-0.5">Groups</h3>
        <p className="text-xs text-stone-400">Assign plan to all group members</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search groups…"
          className="w-full pl-8 pr-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-300"
        />
      </div>

      {/* Groups list */}
      <div className="space-y-2">
        {(groups ?? []).length === 0 ? (
          <div className="text-center py-6 text-stone-400">
            <Users className="h-6 w-6 mx-auto mb-2 text-stone-300" />
            <p className="text-xs">{search ? "No groups match your search" : "No groups found"}</p>
          </div>
        ) : (
          (groups ?? []).map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between p-3 rounded-lg border border-stone-200 hover:border-stone-300 transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-stone-800">{group.name}</p>
                <p className="text-[11px] text-stone-400">{group._count.members} member{group._count.members !== 1 ? "s" : ""}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setAssigningId(group.id);
                  assign.mutate({ planId, groupId: group.id });
                }}
                disabled={assign.isPending && assigningId === group.id}
              >
                {assign.isPending && assigningId === group.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-3 w-3" /> Assign
                  </>
                )}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Habits Panel ──────────────────────────────────────────────────────────────

function HabitsPanel() {
  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-stone-800 mb-0.5">Habits</h3>
        <p className="text-xs text-stone-400">Attach daily habits to this plan</p>
      </div>
      <div className="text-center py-10 text-stone-400">
        <BookMarked className="h-8 w-8 mx-auto mb-2 text-stone-200" />
        <p className="text-xs font-medium text-stone-500">Coming soon</p>
        <p className="text-[11px] text-stone-400 mt-1">Habit tracking will be available in a future update</p>
      </div>
    </div>
  );
}

// ── Settings Panel ────────────────────────────────────────────────────────────

function SettingsPanel({ plan, planId }: { plan: PlanData; planId: string }) {
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const [tab, setTab] = useState<"general" | "image" | "resources">("general");
  const [form, setForm] = useState({
    description: plan.description ?? "",
    difficulty: plan.difficulty ?? "",
    frequency: plan.frequency ?? "",
    objectives: plan.objectives ?? "",
    requireWorkoutLogging: plan.requireWorkoutLogging ?? false,
  });
  const [saved, setSaved] = useState(false);

  const update = trpc.plans.updateSettings.useMutation({
    onSuccess: () => {
      utils.plans.byId.invalidate({ id: planId });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e) => toast("error", e.message),
  });

  function handleSave() {
    update.mutate({
      id: planId,
      description: form.description || null,
      difficulty: form.difficulty || null,
      frequency: form.frequency || null,
      objectives: form.objectives || null,
      requireWorkoutLogging: form.requireWorkoutLogging,
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-0">
        <h3 className="text-sm font-semibold text-stone-800 mb-3">Plan Settings</h3>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-stone-200">
          {(["general", "image", "resources"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors capitalize ${
                tab === t
                  ? "border-stone-800 text-stone-800"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "general" && (
          <div className="p-4 space-y-4">
            {/* Description */}
            <div>
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block mb-1">
                Plan Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what this plan is about…"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block mb-1">
                Difficulty Level
              </label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white"
              >
                <option value="">Select difficulty…</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="All Levels">All Levels</option>
              </select>
            </div>

            {/* Frequency */}
            <div>
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block mb-1">
                Frequency
              </label>
              <input
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                placeholder="e.g. 3 Days a Week"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>

            {/* Objectives */}
            <div>
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block mb-1">
                Plan Objectives
              </label>
              <input
                value={form.objectives}
                onChange={(e) => setForm({ ...form, objectives: e.target.value })}
                placeholder="e.g. Build strength, lose fat"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>

            {/* Require workout logging */}
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-stone-200 hover:border-stone-300 transition-colors">
              <input
                type="checkbox"
                checked={form.requireWorkoutLogging}
                onChange={(e) => setForm({ ...form, requireWorkoutLogging: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-stone-800"
              />
              <div>
                <p className="text-sm text-stone-700 font-medium">Require workout logging</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Clients must log each workout before moving on to the next scheduled session
                </p>
              </div>
            </label>

            <Button
              size="sm"
              className="w-full"
              onClick={handleSave}
              disabled={update.isPending}
            >
              {update.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : saved ? (
                <Check className="h-3.5 w-3.5 mr-1" />
              ) : null}
              {saved ? "Saved!" : "Save Settings"}
            </Button>
          </div>
        )}

        {tab === "image" && (
          <div className="p-4 text-center py-10">
            <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-stone-400">
              <p className="text-xs font-medium text-stone-500">Cover Image</p>
              <p className="text-[11px] mt-1">Image upload coming soon</p>
            </div>
          </div>
        )}

        {tab === "resources" && (
          <div className="p-4 text-center py-10">
            <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-stone-400">
              <p className="text-xs font-medium text-stone-500">Attached Resources</p>
              <p className="text-[11px] mt-1">Resource attachments coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PlanBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: plan, isLoading } = trpc.plans.byId.useQuery({ id });
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(new Set());
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);

  const updatePlan = trpc.plans.update.useMutation({
    onSuccess: () => {
      utils.plans.byId.invalidate({ id });
      toast("success", "Plan updated");
    },
    onError: (err) => toast("error", err.message),
  });

  const [editName, setEditName] = useState(false);
  const [name, setName] = useState("");

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }
  if (!plan) {
    return <div className="p-4 text-center text-stone-500">Plan not found.</div>;
  }

  const weeks = Array.from({ length: plan.sizeWeeks }, (_, i) => i + 1);
  const allRoutines = plan.routines as Routine[];

  const totalExercises = allRoutines.reduce((sum, r) => sum + r.exercises.length, 0);
  const assignmentCount = plan.assignments?.length ?? 0;

  function toggleWeek(w: number) {
    setCollapsedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  }

  function togglePanel(panelId: PanelId) {
    setActivePanel((prev) => (prev === panelId ? null : panelId));
  }

  function renderPanel() {
    if (!activePanel || !plan) return null;
    const p = plan as unknown as PlanData;
    switch (activePanel) {
      case "sell":     return <SellPanel plan={p} planId={id} />;
      case "clients":  return <ClientsPanel plan={p} planId={id} />;
      case "groups":   return <GroupsPanel planId={id} />;
      case "habits":   return <HabitsPanel />;
      case "settings": return <SettingsPanel plan={p} planId={id} />;
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 lg:px-6 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin/plans" className="text-stone-400 hover:text-stone-700 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {editName ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (name.trim()) updatePlan.mutate({ id, name });
                setEditName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) { updatePlan.mutate({ id, name }); setEditName(false); }
                if (e.key === "Escape") setEditName(false);
              }}
              className="flex-1 text-lg font-bold bg-transparent border-b-2 border-stone-400 focus:outline-none min-w-0"
            />
          ) : (
            <h1
              className="flex-1 text-lg font-bold text-stone-900 cursor-pointer hover:text-stone-600 flex items-center gap-2 group min-w-0"
              onClick={() => { setName(plan.name); setEditName(true); }}
            >
              <span className="truncate">{plan.name}</span>
              <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </h1>
          )}

          <Badge variant={statusVariant[plan.status] ?? "outline"}>
            {plan.status.charAt(0) + plan.status.slice(1).toLowerCase()}
          </Badge>

          <div className="flex gap-2 shrink-0">
            {plan.status === "DRAFT" && (
              <Button size="sm" onClick={() => updatePlan.mutate({ id, status: "PUBLISHED" })} disabled={updatePlan.isPending}>
                Publish
              </Button>
            )}
            {plan.status === "PUBLISHED" && (
              <Button size="sm" variant="secondary" onClick={() => updatePlan.mutate({ id, status: "DRAFT" })} disabled={updatePlan.isPending}>
                Unpublish
              </Button>
            )}
          </div>
        </div>

        {/* Stats + Tags row */}
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span>{plan.sizeWeeks} week{plan.sizeWeeks !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{totalExercises} exercises programmed</span>
            <span>·</span>
            <span>{assignmentCount} client{assignmentCount !== 1 ? "s" : ""} assigned</span>
          </div>
          <div className="flex-1 min-w-0">
            <PlanTagEditor planId={id} tags={(plan as unknown as PlanData).tags ?? []} />
          </div>
        </div>
      </div>

      {/* Body: icon strip + optional panel + week grid */}
      <div className="flex flex-1">
        {/* Icon strip */}
        <div className="w-10 shrink-0 flex flex-col items-center pt-3 gap-0.5 bg-white border-r border-stone-200">
          {PANEL_DEFS.map(({ id: panelId, label, Icon }) => (
            <button
              key={panelId}
              onClick={() => togglePanel(panelId)}
              title={label}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                activePanel === panelId
                  ? "bg-stone-900 text-white"
                  : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Slide-out panel */}
        {activePanel && (
          <div className="w-72 shrink-0 bg-white border-r border-stone-200 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
              <span className="text-sm font-semibold text-stone-700">
                {PANEL_DEFS.find((p) => p.id === activePanel)?.label}
              </span>
              <button
                onClick={() => setActivePanel(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderPanel()}
            </div>
          </div>
        )}

        {/* Week grid */}
        <div className="flex-1 p-4 lg:p-6 min-w-0 overflow-x-auto">
          {weeks.map((w) => {
            const weekRoutines = allRoutines.filter((r) => r.weekNumber === w);
            return (
              <WeekSection
                key={w}
                weekNumber={w}
                sizeWeeks={plan.sizeWeeks}
                routines={weekRoutines}
                planId={id}
                collapsed={collapsedWeeks.has(w)}
                onToggle={() => toggleWeek(w)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
