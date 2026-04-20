"use client";

import { use, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  MoreVertical,
  Plus,
  Trash2,
  Copy,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkoutSet = {
  id: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  time: number | null;
  distance: number | null;
  calories: number | null;
};

type WorkoutBlockExercise = {
  id: string;
  exerciseId: string;
  sortOrder: number;
  notes: string | null;
  restSeconds: number | null;
  overrideCalories: number | null;
  exercise: { id: string; name: string };
  sets: WorkoutSet[];
};

type WorkoutBlock = {
  id: string;
  name: string;
  blockType: string;
  sortOrder: number;
  exercises: WorkoutBlockExercise[];
};

type Workout = {
  id: string;
  clientId: string;
  title: string;
  date: Date | string;
  isCompleted: boolean;
  completedAt: Date | null;
  blocks: WorkoutBlock[];
};

// ─── Exercise label logic ─────────────────────────────────────────────────────

function computeExerciseLabels(workout: Workout): Map<string, string> {
  const labels = new Map<string, string>();
  let globalLetterIdx = 0;

  for (const block of workout.blocks) {
    const isGrouped =
      block.blockType === "Superset" ||
      block.blockType === "Circuit" ||
      block.blockType === "EMOM" ||
      block.blockType === "AMRAP";

    if (isGrouped && block.exercises.length > 1) {
      const letter = String.fromCharCode(65 + globalLetterIdx);
      globalLetterIdx++;
      block.exercises.forEach((ex, i) => {
        labels.set(ex.id, `${letter}${i + 1}`);
      });
    } else {
      for (const ex of block.exercises) {
        const letter = String.fromCharCode(65 + globalLetterIdx);
        globalLetterIdx++;
        labels.set(ex.id, letter);
      }
    }
  }

  return labels;
}

// ─── Set summary helper ────────────────────────────────────────────────────────

function setsSummary(ex: WorkoutBlockExercise): string {
  const count = ex.sets.length;
  if (count === 0) return "";
  const first = ex.sets[0];
  const parts: string[] = [`${count} Set${count > 1 ? "s" : ""}`];
  if (first?.reps) parts.push(`${first.reps} reps`);
  if (first?.weight) parts.push(`${first.weight} lbs`);
  if (ex.restSeconds) {
    const m = Math.floor(ex.restSeconds / 60);
    const s = ex.restSeconds % 60;
    parts.push(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} rest`);
  }
  return parts.join(", ");
}

// ─── CopyWorkoutPopover ────────────────────────────────────────────────────────

function CopyWorkoutPopover({
  workoutId,
  clientId,
  onClose,
  onCopied,
}: {
  workoutId: string;
  clientId: string;
  onClose: () => void;
  onCopied: () => void;
}) {
  const { toast } = useToast();
  const [targetDate, setTargetDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const copy = trpc.workouts.copy.useMutation({
    onSuccess: () => {
      toast("success", "Workout copied");
      onCopied();
      onClose();
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div
      className="absolute z-40 right-0 top-6 bg-white border border-stone-200 rounded-xl shadow-xl p-3 w-52"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-semibold text-stone-700 mb-2">Copy to date</p>
      <input
        type="date"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
        className="w-full rounded border border-stone-200 px-2 py-1 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-stone-400"
      />
      <div className="flex gap-1.5">
        <button
          onClick={onClose}
          className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs hover:bg-stone-50"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            copy.mutate({
              workoutId,
              targetDate: new Date(targetDate + "T12:00:00"),
              targetClientId: clientId,
            })
          }
          disabled={copy.isPending || !targetDate}
          className="flex-1 rounded bg-stone-800 text-white px-2 py-1 text-xs hover:bg-stone-700 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {copy.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ─── WorkoutCard ──────────────────────────────────────────────────────────────

function WorkoutCard({
  workout,
  clientId,
  isSelected,
  onToggleSelect,
  weekWorkoutIds,
  allVisibleWorkoutIds,
  onSelectionSet,
  onInvalidate,
}: {
  workout: Workout;
  clientId: string;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  weekWorkoutIds: string[];
  allVisibleWorkoutIds: string[];
  onSelectionSet: (ids: string[]) => void;
  onInvalidate: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCopyPanel, setShowCopyPanel] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setShowCopyPanel(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const logWorkout = trpc.workouts.update.useMutation({
    onSuccess: () => { toast("success", "Workout logged"); onInvalidate(); },
    onError: (err) => toast("error", err.message),
  });

  const createWorkout = trpc.workouts.create.useMutation({
    onSuccess: () => { toast("success", "Alternate workout added"); onInvalidate(); },
    onError: (err) => toast("error", err.message),
  });

  const deleteWorkout = trpc.workouts.delete.useMutation({
    onSuccess: () => { toast("success", "Workout deleted"); onInvalidate(); },
    onError: (err) => toast("error", err.message),
  });

  const labels = useMemo(() => computeExerciseLabels(workout), [workout]);

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData("workoutId", workout.id);
  }

  const workoutDate = new Date(workout.date);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`relative rounded p-1.5 text-xs border cursor-grab active:cursor-grabbing transition-colors ${
        workout.isCompleted
          ? "bg-emerald-50 border-emerald-200 hover:border-emerald-400"
          : "bg-stone-50 border-stone-200 hover:border-stone-400"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-1 mb-0.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(workout.id)}
          className="h-3 w-3 shrink-0 cursor-pointer accent-stone-700"
          onClick={(e) => e.stopPropagation()}
        />
        <span
          className={`font-medium flex-1 truncate cursor-pointer ${
            workout.isCompleted ? "text-emerald-700" : "text-stone-700"
          }`}
          onClick={() => router.push(`/admin/clients/${clientId}/calendar/workout/${workout.id}`)}
        >
          {workout.title}
        </span>

        {/* ⋮ menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
              setShowCopyPanel(false);
            }}
            className="text-stone-400 hover:text-stone-600 p-0.5 rounded"
          >
            <MoreVertical className="h-3 w-3" />
          </button>

          {menuOpen && (
            <div className="absolute z-50 right-0 top-5 bg-white border border-stone-200 rounded-xl shadow-xl w-52 overflow-hidden text-xs">
              {!showCopyPanel ? (
                <>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2"
                    onClick={(e) => { e.stopPropagation(); setShowCopyPanel(true); }}
                  >
                    <Copy className="h-3 w-3 text-stone-400" /> Copy workout
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      logWorkout.mutate({ id: workout.id, isCompleted: true, completedAt: new Date() });
                      setMenuOpen(false);
                    }}
                  >
                    ✓ Log workout
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast("info", "Saved as routine (stub)");
                      setMenuOpen(false);
                    }}
                  >
                    📋 Create routine from workout
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      createWorkout.mutate({ clientId, title: "Workout", date: workoutDate });
                      setMenuOpen(false);
                    }}
                  >
                    <Plus className="h-3 w-3 text-stone-400" /> New alternate workout
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectionSet(weekWorkoutIds);
                      setMenuOpen(false);
                    }}
                  >
                    ☑ Select all workouts from week
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectionSet(allVisibleWorkoutIds);
                      setMenuOpen(false);
                    }}
                  >
                    ☑ Select all workouts from month
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2 border-t border-stone-100 text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${workout.title}"?`)) {
                        deleteWorkout.mutate({ id: workout.id });
                      }
                      setMenuOpen(false);
                    }}
                  >
                    <Trash2 className="h-3 w-3" /> Delete workout
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/admin/clients/${clientId}/calendar/workout/${workout.id}`, "_blank");
                      setMenuOpen(false);
                    }}
                  >
                    🖨 Print workout
                  </button>
                </>
              ) : (
                <div className="p-3">
                  <p className="font-semibold text-stone-700 mb-2">Copy to date</p>
                  <CopyWorkoutPopover
                    workoutId={workout.id}
                    clientId={clientId}
                    onClose={() => { setShowCopyPanel(false); setMenuOpen(false); }}
                    onCopied={onInvalidate}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Blocks / exercises */}
      <div
        className="cursor-pointer"
        onClick={() => router.push(`/admin/clients/${clientId}/calendar/workout/${workout.id}`)}
      >
        {workout.blocks.map((block) => (
          <div key={block.id} className="mt-0.5">
            {block.exercises.map((ex) => {
              const label = labels.get(ex.id) ?? "";
              const summary = setsSummary(ex);
              return (
                <div key={ex.id} className="ml-1">
                  <p className="text-[10px] text-stone-600">
                    <span className="font-semibold text-stone-400 mr-0.5">{label}</span>
                    {ex.exercise.name}
                  </p>
                  {summary && (
                    <p className="text-[10px] text-stone-400 ml-3">{summary}</p>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {workout.blocks.length === 0 && (
          <p className="text-[10px] text-stone-400 italic">Empty — click to add exercises</p>
        )}
      </div>
    </div>
  );
}

// ─── WeekRowMenu ──────────────────────────────────────────────────────────────

function WeekRowMenu({
  clientId,
  weekDays,
  onInvalidate,
}: {
  clientId: string;
  weekDays: Date[];
  onInvalidate: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const weekStart = weekDays[0]!;
  const weekEnd = weekDays[6]!;

  const duplicateWeek = trpc.workouts.duplicateWeek.useMutation({
    onSuccess: (data) => {
      toast("success", `Duplicated ${data.created} workout${data.created !== 1 ? "s" : ""}`);
      onInvalidate();
      setOpen(false);
    },
    onError: (err) => toast("error", err.message),
  });

  const deleteWeek = trpc.workouts.deleteWeek.useMutation({
    onSuccess: (data) => {
      toast("success", `Deleted ${data.count} workout${data.count !== 1 ? "s" : ""}`);
      onInvalidate();
      setOpen(false);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-100"
        title="Week actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute z-50 right-0 top-7 bg-white border border-stone-200 rounded-xl shadow-xl w-72 overflow-hidden text-xs">
          <button
            className="w-full text-left px-4 py-3 hover:bg-stone-50 border-b border-stone-100"
            onClick={(e) => {
              e.stopPropagation();
              duplicateWeek.mutate({ clientId, weekStart, weekEnd });
            }}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <input type="checkbox" readOnly checked={false} className="h-3 w-3 accent-stone-700" />
              <span className="font-medium text-stone-700">Duplicate week workouts</span>
            </div>
            <p className="text-stone-400 ml-5">The new workouts will be added after this week</p>
          </button>

          <button
            className="w-full text-left px-4 py-3 hover:bg-stone-50"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete all workouts in this week?")) {
                deleteWeek.mutate({ clientId, weekStart, weekEnd });
              }
            }}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <Trash2 className="h-3 w-3 text-red-500" />
              <span className="font-medium text-red-600">Delete week workouts</span>
            </div>
            <p className="text-stone-400 ml-5">All workouts in this week will be removed</p>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientWorkoutCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "day">("month");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Chunk days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const { data: client } = trpc.clients.byId.useQuery({ id });

  const { data: workouts, isLoading } = trpc.workouts.listByClientAndDateRange.useQuery({
    clientId: id,
    startDate: calendarStart,
    endDate: calendarEnd,
  });

  const utils = trpc.useUtils();

  const invalidate = useCallback(() => {
    utils.workouts.listByClientAndDateRange.invalidate();
  }, [utils]);

  const createWorkout = trpc.workouts.create.useMutation({
    onSuccess: () => { invalidate(); toast("success", "Workout created"); },
    onError: (err) => toast("error", err.message),
  });

  const deleteWorkout = trpc.workouts.delete.useMutation({
    onSuccess: () => { invalidate(); toast("success", "Workout deleted"); },
    onError: (err) => toast("error", err.message),
  });

  const moveToDate = trpc.workouts.moveToDate.useMutation({
    onSuccess: () => { invalidate(); },
    onError: (err) => toast("error", err.message),
  });

  // Group workouts by date key
  const workoutsByDate = useMemo(() => {
    const map: Record<string, Workout[]> = {};
    for (const w of (workouts ?? []) as Workout[]) {
      const key = format(new Date(w.date), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key]!.push(w);
    }
    return map;
  }, [workouts]);

  const allVisibleWorkoutIds = useMemo(
    () => (workouts ?? []).map((w) => w.id),
    [workouts]
  );

  const clientName = client ? `${client.firstName} ${client.lastName}` : "Loading...";

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectionSet(ids: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, dateKey: string) {
    e.preventDefault();
    setDragOverDate(null);
    const workoutId = e.dataTransfer.getData("workoutId");
    if (!workoutId) return;
    moveToDate.mutate({ id: workoutId, date: new Date(dateKey + "T12:00:00") });
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await deleteWorkout.mutateAsync({ id });
    }
    setSelectedIds(new Set());
    toast("success", `Deleted ${ids.length} workout${ids.length !== 1 ? "s" : ""}`);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-stone-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold">
                {format(currentMonth, "MMM yyyy")}{" "}
                <span className="font-normal text-stone-600">{clientName}</span>
              </h1>
              <div className="text-xs text-stone-500">
                <Link href={`/admin/clients/${id}`} className="hover:underline">
                  Manage
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 border border-stone-300 rounded-lg">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-stone-50 rounded-l-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1.5 text-sm font-medium hover:bg-stone-50"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-stone-50 rounded-r-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex border border-stone-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("month")}
                className={`px-4 py-1.5 text-sm ${
                  viewMode === "month" ? "bg-stone-100 font-medium" : "hover:bg-stone-50"
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode("day")}
                className={`px-4 py-1.5 text-sm ${
                  viewMode === "day" ? "bg-stone-800 text-white font-medium" : "hover:bg-stone-50"
                }`}
              >
                Day
              </button>
            </div>

            <button className="p-2 text-stone-400 hover:text-stone-600">
              <Download className="h-4 w-4" />
            </button>
            <button className="p-2 text-stone-400 hover:text-stone-600">
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          <span className="ml-2 text-sm text-stone-500">Loading workouts...</span>
        </div>
      )}

      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-stone-200">
        {dayNames.map((day) => (
          <div
            key={day}
            className="border-r border-stone-200 px-2 py-2 text-xs font-medium text-stone-500 text-center last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar weeks */}
      {weeks.map((week, wi) => {
        const weekWorkoutIds = week.flatMap((day) => {
          const key = format(day, "yyyy-MM-dd");
          return (workoutsByDate[key] ?? []).map((w) => w.id);
        });

        return (
          <div key={wi} className="relative group grid grid-cols-7 border-b border-stone-200">
            {/* Week ⋮ button */}
            <div className="absolute top-1 right-1 z-10">
              <WeekRowMenu
                clientId={id}
                weekDays={week}
                onInvalidate={invalidate}
              />
            </div>

            {week.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayWorkouts = workoutsByDate[dateKey] ?? [];
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const isDragOver = dragOverDate === dateKey;

              return (
                <div
                  key={dateKey}
                  className={`border-r border-stone-200 min-h-[140px] last:border-r-0 transition-colors ${
                    !inMonth ? "bg-stone-50" : "bg-white"
                  } ${isDragOver ? "ring-2 ring-inset ring-stone-400 bg-stone-100" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverDate(dateKey); }}
                  onDragLeave={() => setDragOverDate(null)}
                  onDrop={(e) => handleDrop(e, dateKey)}
                >
                  {/* Date header */}
                  <div className="flex items-center justify-between px-2 pt-1">
                    <button
                      onClick={() =>
                        createWorkout.mutate({
                          clientId: id,
                          title: "Workout",
                          date: new Date(dateKey + "T12:00:00"),
                        })
                      }
                      className="text-stone-300 hover:text-stone-500 transition-colors"
                      title="Add workout"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span
                      className={`text-xs ${
                        today
                          ? "bg-stone-900 text-white rounded-full w-5 h-5 flex items-center justify-center"
                          : inMonth
                          ? "text-stone-600"
                          : "text-stone-300"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    <span className="w-3" />
                  </div>

                  {/* Workouts */}
                  <div className="px-1 pb-1 space-y-1">
                    {dayWorkouts.map((workout) => (
                      <WorkoutCard
                        key={workout.id}
                        workout={workout}
                        clientId={id}
                        isSelected={selectedIds.has(workout.id)}
                        onToggleSelect={toggleSelect}
                        weekWorkoutIds={weekWorkoutIds}
                        allVisibleWorkoutIds={allVisibleWorkoutIds}
                        onSelectionSet={handleSelectionSet}
                        onInvalidate={invalidate}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Multi-select floating bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-stone-900 text-white rounded-2xl shadow-2xl px-6 py-3 text-sm">
          <span>{selectedIds.size} workout{selectedIds.size !== 1 ? "s" : ""} selected</span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-stone-300 hover:text-white underline text-xs"
          >
            Deselect All
          </button>
          <button
            onClick={handleDeleteSelected}
            className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5"
          >
            <Trash2 className="h-3 w-3" />
            Delete Selected
          </button>
        </div>
      )}
    </div>
  );
}
