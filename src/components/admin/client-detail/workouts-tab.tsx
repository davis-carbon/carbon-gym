"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import {
  Plus,
  Loader2,
  Search,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Check,
  MoreHorizontal,
  Dumbbell,
  ClipboardList,
  MessageSquare,
  FolderOpen,
  BarChart2,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateLabel(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function defaultCompRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return { from, to };
}

/** Format seconds as HH:MM:SS or MM:SS */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${String(h).padStart(2, "0")}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

/** Get weeks covering a given month */
function getWeeksForMonth(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Find Sunday on or before firstDay
  const startSunday = new Date(firstDay);
  startSunday.setDate(firstDay.getDate() - firstDay.getDay());

  // Find Saturday on or after lastDay
  const endSaturday = new Date(lastDay);
  endSaturday.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const weeks: Date[][] = [];
  const cursor = new Date(startSunday);
  while (cursor <= endSaturday) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type WorkoutWithBlocks = {
  id: string;
  title: string;
  date: Date;
  isCompleted: boolean;
  blocks: {
    id: string;
    name: string;
    sortOrder: number;
    exercises: {
      id: string;
      sortOrder: number;
      exercise: { id: string; name: string };
      sets: {
        id: string;
        setNumber: number;
        reps?: number | null;
        weight?: number | null;
        time?: number | null;
        distance?: number | null;
      }[];
    }[];
  }[];
};

// ── Workout Card Summary ──────────────────────────────────────────────────────

function buildExerciseSummary(workout: WorkoutWithBlocks): string[] {
  const lines: string[] = [];
  const sorted = [...workout.blocks].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const block of sorted) {
    const letter = String.fromCharCode(65 + block.sortOrder);
    const exSorted = [...block.exercises].sort((a, b) => a.sortOrder - b.sortOrder);
    for (let ei = 0; ei < exSorted.length; ei++) {
      const ex = exSorted[ei];
      const prefix = `${letter}${ei + 1}`;
      const setCount = ex.sets.length;
      const firstSet = ex.sets[0];
      let detail = `${setCount} Set${setCount !== 1 ? "s" : ""}`;
      if (firstSet) {
        if (firstSet.time != null) detail += `, ${formatTime(firstSet.time)}`;
        else if (firstSet.reps != null) detail += `, ${firstSet.reps} reps`;
        else if (firstSet.distance != null) detail += `, ${firstSet.distance} mi`;
      }
      lines.push(`${prefix} ${ex.exercise.name}  ${detail}`);
    }
  }
  return lines;
}

// ── Add Routine Modal ─────────────────────────────────────────────────────────

function AddRoutineModal({
  clientId,
  date,
  open,
  onClose,
  onAdded,
}: {
  clientId: string;
  date: Date | null;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: routines = [], isLoading } = trpc.workouts.listRoutines.useQuery(
    { query: query || undefined },
    { enabled: open }
  );

  const addRoutine = trpc.workouts.addRoutineToCalendar.useMutation({
    onSuccess: () => {
      toast("success", "Routine added to calendar");
      onAdded();
      onClose();
      setSelectedId(null);
      setQuery("");
    },
    onError: () => toast("error", "Failed to add routine"),
  });

  function handleAdd() {
    if (!selectedId || !date) return;
    addRoutine.mutate({ clientId, routineId: selectedId, date });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Routine"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!selectedId || addRoutine.isPending}>
            {addRoutine.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to Calendar"}
          </Button>
        </>
      }
    >
      {date && (
        <p className="text-sm text-stone-500 mb-4">
          Adding to <span className="font-medium text-stone-700">{dateLabel(date)}</span>
        </p>
      )}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search routines..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
        </div>
      ) : routines.length === 0 ? (
        <p className="text-center text-sm text-stone-400 py-8">No routines found.</p>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {routines.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={[
                "w-full flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                selectedId === r.id
                  ? "border-stone-800 bg-stone-50"
                  : "border-stone-200 hover:bg-stone-50",
              ].join(" ")}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{r.name || "Untitled Routine"}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {r.plan.name} · {r.exercises.length} exercise{r.exercises.length !== 1 ? "s" : ""}
                </p>
              </div>
              {selectedId === r.id && <Check className="h-4 w-4 text-stone-800 shrink-0 mt-0.5" />}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Add Rep Max Modal ─────────────────────────────────────────────────────────

function AddRepMaxModal({
  clientId,
  open,
  onClose,
}: {
  clientId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [exerciseId, setExerciseId] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: exerciseData } = trpc.exercises.list.useQuery(
    { isActive: true, limit: 200 },
    { enabled: open }
  );
  const allExercises = exerciseData?.exercises ?? [];

  const add = trpc.workouts.addRepMax.useMutation({
    onSuccess: () => {
      utils.workouts.listRepMaxes.invalidate({ clientId });
      onClose();
      setExerciseId("");
      setReps("");
      setWeight("");
      toast("success", "Rep max added");
    },
    onError: () => toast("error", "Failed to add rep max"),
  });

  function handleSubmit() {
    if (!exerciseId || !reps || !weight) {
      toast("error", "Please fill in all fields");
      return;
    }
    add.mutate({ clientId, exerciseId, reps: parseInt(reps), weight: parseFloat(weight) });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Rep Max"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={add.isPending}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Select Exercise</label>
          <select
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
            className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            <option value="">— choose —</option>
            {allExercises.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Reps</label>
          <Input type="number" min={1} value={reps} onChange={(e) => setReps(e.target.value)} placeholder="e.g. 1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Weight (lbs)</label>
          <Input type="number" min={0} step={0.5} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 225" />
        </div>
      </div>
    </Modal>
  );
}

// ── Workout Card ──────────────────────────────────────────────────────────────

function WorkoutCard({
  workout,
  clientId,
  onRefresh,
}: {
  workout: WorkoutWithBlocks;
  clientId: string;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const toggle = trpc.workouts.update.useMutation({
    onSuccess: () => utils.workouts.listByClientAndDateRange.invalidate(),
    onError: () => toast("error", "Failed to update"),
  });

  const deleteWorkout = trpc.workouts.delete.useMutation({
    onSuccess: () => {
      toast("success", "Workout deleted");
      onRefresh();
    },
    onError: () => toast("error", "Failed to delete"),
  });

  const copyWorkout = trpc.workouts.copy.useMutation({
    onSuccess: () => {
      toast("success", "Workout copied to tomorrow");
      onRefresh();
    },
    onError: () => toast("error", "Failed to copy"),
  });

  const summaryLines = buildExerciseSummary(workout);

  return (
    <div
      className="rounded-lg border border-stone-200 bg-white p-2 cursor-pointer hover:border-stone-300 hover:shadow-sm transition-all text-left group"
      onClick={() => router.push(`/admin/clients/${clientId}/workouts/${workout.id}`)}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggle.mutate({
                id: workout.id,
                isCompleted: !workout.isCompleted,
                completedAt: !workout.isCompleted ? new Date() : null,
              });
            }}
            className={[
              "shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors",
              workout.isCompleted
                ? "bg-green-500 border-green-500"
                : "border-stone-300 hover:border-stone-500",
            ].join(" ")}
          >
            {workout.isCompleted && <Check className="h-2.5 w-2.5 text-white" />}
          </button>
          <span className="text-xs font-medium text-stone-800 truncate">{workout.title}</span>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu trigger={<MoreHorizontal className="h-3.5 w-3.5" />} align="right">
            <DropdownItem
              onClick={() => {
                const tomorrow = new Date(workout.date);
                tomorrow.setDate(tomorrow.getDate() + 1);
                copyWorkout.mutate({ workoutId: workout.id, targetDate: tomorrow });
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy workout
            </DropdownItem>
            <DropdownItem onClick={() => toast("info", "Log workout — coming soon")}>
              <ClipboardList className="h-3.5 w-3.5" />
              Log workout
            </DropdownItem>
            <DropdownItem onClick={() => toast("info", "Hide workout — coming soon")}>
              Hide workout
            </DropdownItem>
            <DropdownItem
              danger
              onClick={() => {
                if (confirm("Delete this workout?")) {
                  deleteWorkout.mutate({ id: workout.id });
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete workout
            </DropdownItem>
          </DropdownMenu>
        </div>
      </div>

      {summaryLines.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {summaryLines.slice(0, 3).map((line, i) => (
            <p key={i} className="text-[10px] text-stone-500 truncate">{line}</p>
          ))}
          {summaryLines.length > 3 && (
            <p className="text-[10px] text-stone-400">+{summaryLines.length - 3} more</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Day Cell "+" Dropdown ─────────────────────────────────────────────────────

function DayAddMenu({
  clientId,
  date,
  onBuildWorkout,
  onAddRoutine,
}: {
  clientId: string;
  date: Date;
  onBuildWorkout: (date: Date) => void;
  onAddRoutine: (date: Date) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();

  return (
    <DropdownMenu trigger={<Plus className="h-3 w-3" />} align="left">
      <DropdownItem onClick={() => onBuildWorkout(date)}>
        <Dumbbell className="h-3.5 w-3.5" />
        Build Workout
      </DropdownItem>
      <DropdownItem onClick={() => onAddRoutine(date)}>
        <ClipboardList className="h-3.5 w-3.5" />
        Add Routine
      </DropdownItem>
      <DropdownItem onClick={() => router.push(`/admin/clients/${clientId}?section=assessments`)}>
        <ClipboardList className="h-3.5 w-3.5" />
        Add Assessment
      </DropdownItem>
      <DropdownItem onClick={() => router.push(`/admin/clients/${clientId}?section=messages`)}>
        <MessageSquare className="h-3.5 w-3.5" />
        Send Message
      </DropdownItem>
      <DropdownItem onClick={() => router.push(`/admin/clients/${clientId}?section=resources`)}>
        <FolderOpen className="h-3.5 w-3.5" />
        Send Resource
      </DropdownItem>
    </DropdownMenu>
  );
}

// ── Weekly Calendar ───────────────────────────────────────────────────────────

function WorkoutCalendar({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [routineDate, setRoutineDate] = useState<Date | null>(null);
  const [addRoutineOpen, setAddRoutineOpen] = useState(false);

  const weeks = getWeeksForMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const rangeStart = toDateOnly(weeks[0][0]);
  const rangeEnd = toDateOnly(weeks[weeks.length - 1][6]);
  // Extend range end to end of day
  const rangeEndFull = new Date(rangeEnd);
  rangeEndFull.setHours(23, 59, 59, 999);

  const { data: workouts = [], isLoading, refetch } = trpc.workouts.listByClientAndDateRange.useQuery({
    clientId,
    startDate: rangeStart,
    endDate: rangeEndFull,
  });

  const createWorkout = trpc.workouts.create.useMutation({
    onSuccess: (w) => {
      router.push(`/admin/clients/${clientId}/workouts/${w.id}`);
    },
    onError: () => toast("error", "Failed to create workout"),
  });

  function handleBuildWorkout(date: Date) {
    createWorkout.mutate({
      clientId,
      title: "Workout",
      date: toDateOnly(date),
      source: "calendar",
      blocks: [],
    });
  }

  function handleAddRoutine(date: Date) {
    setRoutineDate(date);
    setAddRoutineOpen(true);
  }

  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-stone-800">{monthLabel}</span>
          <span className="text-sm text-stone-500">{clientName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            Today
          </Button>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="p-1.5 rounded-md text-stone-500 hover:bg-stone-100 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="p-1.5 rounded-md text-stone-500 hover:bg-stone-100 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-stone-200">
        {DAYS.map((d) => (
          <div key={d} className="px-2 py-1.5 text-center text-xs font-medium text-stone-500 border-r last:border-r-0 border-stone-200">
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        </div>
      ) : (
        <div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b last:border-b-0 border-stone-200">
              {week.map((day, di) => {
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = isSameDay(day, today);
                const dayWorkouts = workouts.filter((w) => isSameDay(new Date(w.date), day)) as WorkoutWithBlocks[];

                return (
                  <div
                    key={di}
                    className={[
                      "min-h-[100px] p-1.5 border-r last:border-r-0 border-stone-200 relative",
                      !isCurrentMonth ? "bg-stone-50" : "bg-white",
                    ].join(" ")}
                  >
                    {/* Day header row */}
                    <div className="flex items-center justify-between mb-1">
                      <DayAddMenu
                        clientId={clientId}
                        date={day}
                        onBuildWorkout={handleBuildWorkout}
                        onAddRoutine={handleAddRoutine}
                      />
                      <span
                        className={[
                          "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full",
                          isToday
                            ? "bg-stone-900 text-white"
                            : isCurrentMonth
                            ? "text-stone-700"
                            : "text-stone-400",
                        ].join(" ")}
                      >
                        {day.getDate()}
                      </span>
                    </div>

                    {/* Workout cards */}
                    <div className="space-y-1">
                      {dayWorkouts.map((w) => (
                        <WorkoutCard
                          key={w.id}
                          workout={w}
                          clientId={clientId}
                          onRefresh={() => refetch()}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <AddRoutineModal
        clientId={clientId}
        date={routineDate}
        open={addRoutineOpen}
        onClose={() => setAddRoutineOpen(false)}
        onAdded={() => refetch()}
      />
    </div>
  );
}

// ── Compliance Widget ─────────────────────────────────────────────────────────

function ComplianceWidget({ clientId }: { clientId: string }) {
  const [compRange, setCompRange] = useState(defaultCompRange);

  const { data: compliance } = trpc.workouts.getComplianceStats.useQuery({
    clientId,
    dateFrom: compRange.from,
    dateTo: compRange.to,
  });

  const pct = compliance?.compliancePct ?? 0;
  const completed = compliance?.completed ?? 0;
  const total = compliance?.total ?? 0;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-stone-700">Workout Compliance</h4>
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <input
            type="date"
            value={compRange.from.toISOString().split("T")[0]}
            onChange={(e) => setCompRange((r) => ({ ...r, from: new Date(e.target.value) }))}
            className="rounded border border-stone-200 px-2 py-1 text-xs"
          />
          <span>–</span>
          <input
            type="date"
            value={compRange.to.toISOString().split("T")[0]}
            onChange={(e) => setCompRange((r) => ({ ...r, to: new Date(e.target.value) }))}
            className="rounded border border-stone-200 px-2 py-1 text-xs"
          />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative shrink-0 w-20 h-20">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e7e5e4" strokeWidth="3.8" />
            <circle
              cx="18" cy="18" r="15.9"
              fill="none" stroke="#16a34a" strokeWidth="3.8"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-stone-800">{pct}%</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-700">{pct}% Compliance</p>
          <p className="text-xs text-stone-500 mt-1">{completed}/{total} completed</p>
        </div>
      </div>
    </div>
  );
}

// ── Rep Maxes Section ─────────────────────────────────────────────────────────

function RepMaxesSection({ clientId }: { clientId: string }) {
  const [repMaxOpen, setRepMaxOpen] = useState(false);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: repMaxes = [], isLoading } = trpc.workouts.listRepMaxes.useQuery({ clientId });

  const deleteRepMax = trpc.workouts.deleteRepMax.useMutation({
    onSuccess: () => utils.workouts.listRepMaxes.invalidate({ clientId }),
    onError: () => toast("error", "Failed to delete"),
  });

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-stone-700">Rep Maxes</h4>
        <Button size="sm" variant="secondary" onClick={() => setRepMaxOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Rep Max
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
        </div>
      ) : repMaxes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-stone-400 border border-dashed border-stone-200 rounded-lg">
          <Search className="h-8 w-8 mb-2" />
          <p className="text-sm">No rep maxes yet. Add your first!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left">
                <th className="px-3 py-2 font-medium text-stone-600">Exercise</th>
                <th className="px-3 py-2 font-medium text-stone-600">Reps</th>
                <th className="px-3 py-2 font-medium text-stone-600">Weight (lbs)</th>
                <th className="px-3 py-2 font-medium text-stone-600">Date</th>
                <th className="px-3 py-2 font-medium text-stone-600"></th>
              </tr>
            </thead>
            <tbody>
              {repMaxes.map((rm) => (
                <tr key={rm.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-3 py-2.5 font-medium">{rm.exercise.name}</td>
                  <td className="px-3 py-2.5">{rm.reps}</td>
                  <td className="px-3 py-2.5">{rm.weight}</td>
                  <td className="px-3 py-2.5 text-stone-500">{dateLabel(rm.recordedAt)}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => deleteRepMax.mutate({ id: rm.id })}
                      className="text-stone-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddRepMaxModal clientId={clientId} open={repMaxOpen} onClose={() => setRepMaxOpen(false)} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function WorkoutsTab({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  return (
    <div className="space-y-6">
      {/* Weekly Calendar */}
      <WorkoutCalendar clientId={clientId} clientName={clientName} />

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ComplianceWidget clientId={clientId} />
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h4 className="font-semibold text-stone-700 mb-3">Reports</h4>
          <div className="space-y-2">
            {[
              { icon: <BarChart2 className="h-4 w-4" />, title: "Workout Compliance Report", desc: "Detailed compliance statistics" },
              { icon: <BarChart2 className="h-4 w-4" />, title: "Rep Max Report", desc: "Rep max history and progress" },
            ].map((card) => (
              <button
                key={card.title}
                onClick={() => {}}
                className="w-full text-left flex items-start gap-3 rounded-lg border border-stone-200 p-3 hover:bg-stone-50 transition-colors"
              >
                <span className="text-stone-500 mt-0.5">{card.icon}</span>
                <div>
                  <p className="font-medium text-sm">{card.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{card.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rep Maxes */}
      <RepMaxesSection clientId={clientId} />
    </div>
  );
}
