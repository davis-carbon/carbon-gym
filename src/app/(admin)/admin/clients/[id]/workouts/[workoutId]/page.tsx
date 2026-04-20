"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Heart,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type SetRow = {
  id: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  time: number | null;
  distance: number | null;
  calories: number | null;
  isCompleted: boolean;
};

type BlockExercise = {
  id: string;
  sortOrder: number;
  notes: string | null;
  restSeconds: number | null;
  exercise: { id: string; name: string; muscleGroup: string | null; thumbnailUrl: string | null; videoUrl: string | null };
  sets: SetRow[];
};

type Block = {
  id: string;
  name: string;
  blockType: string;
  sortOrder: number;
  exercises: BlockExercise[];
};

type Workout = {
  id: string;
  title: string;
  date: Date;
  isCompleted: boolean;
  notes: string | null;
  clientId: string;
  client: { id: string; firstName: string; lastName: string };
  blocks: Block[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${String(h).padStart(2, "0")}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

function parseTimeInput(val: string): number {
  const parts = val.split(":").map(Number);
  if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  if (parts.length === 2) return (parts[0] * 60) + parts[1];
  return parseInt(val) || 0;
}

function parseRestInput(mm: string, ss: string): number {
  return (parseInt(mm) || 0) * 60 + (parseInt(ss) || 0);
}

function getBlockLetter(sortOrder: number): string {
  return String.fromCharCode(65 + sortOrder);
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
}

// ── Inline Title Editor ───────────────────────────────────────────────────────

function TitleEditor({ workoutId, initialTitle }: { workoutId: string; initialTitle: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialTitle);
  const { toast } = useToast();

  const update = trpc.workouts.update.useMutation({
    onError: () => toast("error", "Failed to save title"),
  });

  useEffect(() => { setValue(initialTitle); }, [initialTitle]);

  function save() {
    setEditing(false);
    if (value.trim() && value !== initialTitle) {
      update.mutate({ id: workoutId, title: value.trim() });
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setValue(initialTitle); setEditing(false); } }}
          className="text-xl font-bold text-stone-900 border-b-2 border-stone-800 bg-transparent outline-none min-w-0 w-64"
        />
        <button onClick={save} className="text-green-600 hover:text-green-700">
          <Check className="h-4 w-4" />
        </button>
        <button onClick={() => { setValue(initialTitle); setEditing(false); }} className="text-stone-400 hover:text-stone-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-2 group"
    >
      <h1 className="text-xl font-bold text-stone-900">{value || "Untitled Workout"}</h1>
      <Pencil className="h-4 w-4 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ── Set Row ───────────────────────────────────────────────────────────────────

function SetRowEditor({
  set,
  onDelete,
}: {
  set: SetRow;
  onDelete: (setId: string) => void;
}) {
  const { toast } = useToast();

  const updateSet = trpc.workouts.updateSet.useMutation({
    onError: () => toast("error", "Failed to save"),
  });

  const deleteSet = trpc.workouts.deleteSet.useMutation({
    onSuccess: () => onDelete(set.id),
    onError: () => toast("error", "Failed to delete set"),
  });

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs text-stone-400 w-5 text-right shrink-0">{set.setNumber}</span>
      <input
        type="number"
        defaultValue={set.reps ?? ""}
        placeholder="reps"
        onBlur={(e) => {
          const v = e.target.value ? parseInt(e.target.value) : null;
          updateSet.mutate({ setId: set.id, reps: v });
        }}
        className="w-16 rounded border border-stone-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-stone-400"
      />
      <input
        type="number"
        defaultValue={set.weight ?? ""}
        placeholder="lbs"
        step={0.5}
        onBlur={(e) => {
          const v = e.target.value ? parseFloat(e.target.value) : null;
          updateSet.mutate({ setId: set.id, weight: v });
        }}
        className="w-16 rounded border border-stone-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-stone-400"
      />
      <input
        type="text"
        defaultValue={set.time != null ? formatTime(set.time) : ""}
        placeholder="MM:SS"
        onBlur={(e) => {
          const v = e.target.value ? parseTimeInput(e.target.value) : null;
          updateSet.mutate({ setId: set.id, time: v });
        }}
        className="w-20 rounded border border-stone-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-stone-400"
      />
      <button
        onClick={() => deleteSet.mutate({ setId: set.id })}
        className="text-stone-300 hover:text-red-400 transition-colors ml-1"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Exercise Detail Panel ─────────────────────────────────────────────────────

function ExerciseDetail({
  blockExercise,
  blockLetter,
  exerciseIndex,
  onRemove,
  onRefetch,
}: {
  blockExercise: BlockExercise;
  blockLetter: string;
  exerciseIndex: number;
  onRemove: (id: string) => void;
  onRefetch: () => void;
}) {
  const { toast } = useToast();
  const [sets, setSets] = useState<SetRow[]>(blockExercise.sets);
  const [restMM, setRestMM] = useState(
    String(Math.floor((blockExercise.restSeconds ?? 0) / 60)).padStart(2, "0")
  );
  const [restSS, setRestSS] = useState(
    String((blockExercise.restSeconds ?? 0) % 60).padStart(2, "0")
  );
  const [notes, setNotes] = useState(blockExercise.notes ?? "");

  useEffect(() => {
    setSets(blockExercise.sets);
    setRestMM(String(Math.floor((blockExercise.restSeconds ?? 0) / 60)).padStart(2, "0"));
    setRestSS(String((blockExercise.restSeconds ?? 0) % 60).padStart(2, "0"));
    setNotes(blockExercise.notes ?? "");
  }, [blockExercise.id]);

  const updateBE = trpc.workouts.updateBlockExercise.useMutation({
    onError: () => toast("error", "Failed to save"),
  });

  const removeExercise = trpc.workouts.removeExercise.useMutation({
    onSuccess: () => onRemove(blockExercise.id),
    onError: () => toast("error", "Failed to remove exercise"),
  });

  const addSet = trpc.workouts.addSet.useMutation({
    onSuccess: (newSet) => {
      setSets((prev) => [...prev, newSet as SetRow]);
    },
    onError: () => toast("error", "Failed to add set"),
  });

  function handleDeleteSet(setId: string) {
    setSets((prev) => prev.filter((s) => s.id !== setId));
  }

  function saveRest() {
    const secs = parseRestInput(restMM, restSS);
    updateBE.mutate({ id: blockExercise.id, restSeconds: secs });
  }

  function saveNotes() {
    updateBE.mutate({ id: blockExercise.id, notes: notes || null });
  }

  const prefix = `${blockLetter}${exerciseIndex + 1}`;

  return (
    <div className="space-y-4">
      {/* Exercise header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">{prefix}</span>
          <h3 className="font-semibold text-stone-900 truncate">{blockExercise.exercise.name}</h3>
          <button className="text-stone-300 hover:text-red-400 transition-colors">
            <Heart className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => removeExercise.mutate({ blockExerciseId: blockExercise.id })}
          className="text-stone-400 hover:text-red-500 transition-colors shrink-0"
          title="Remove exercise"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Set table header */}
      <div className="flex items-center gap-2 px-0">
        <span className="w-5"></span>
        <span className="w-16 text-xs text-center text-stone-500">Reps</span>
        <span className="w-16 text-xs text-center text-stone-500">Weight</span>
        <span className="w-20 text-xs text-center text-stone-500">Time</span>
      </div>

      {/* Sets */}
      <div className="space-y-0.5">
        {sets.map((s) => (
          <SetRowEditor key={s.id} set={s} onDelete={handleDeleteSet} />
        ))}
      </div>

      <button
        onClick={() => addSet.mutate({ blockExerciseId: blockExercise.id })}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
        disabled={addSet.isPending}
      >
        {addSet.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
        Add Set
      </button>

      {/* Rest */}
      <div>
        <label className="text-xs font-medium text-stone-600 block mb-1">Rest</label>
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={restMM}
            onChange={(e) => setRestMM(e.target.value)}
            onBlur={saveRest}
            className="w-12 rounded border border-stone-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-stone-400"
            placeholder="00"
          />
          <span className="text-stone-400">:</span>
          <input
            type="text"
            value={restSS}
            onChange={(e) => setRestSS(e.target.value)}
            onBlur={saveRest}
            className="w-12 rounded border border-stone-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-stone-400"
            placeholder="00"
          />
          <span className="text-xs text-stone-400">mm:ss</span>
        </div>
      </div>

      {/* Exercise notes */}
      <div>
        <label className="text-xs font-medium text-stone-600 block mb-1">Exercise Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={3}
          placeholder="Add notes for this exercise..."
          className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none"
        />
      </div>

      <div className="pt-2">
        <button
          onClick={() => {
            if (confirm("Remove this exercise?")) {
              removeExercise.mutate({ blockExerciseId: blockExercise.id });
            }
          }}
          className="text-sm text-red-500 hover:text-red-600 transition-colors"
        >
          Remove exercise
        </button>
      </div>
    </div>
  );
}

// ── Exercise Search + Add ─────────────────────────────────────────────────────

function ExerciseSearch({
  blockId,
  onAdded,
}: {
  blockId: string;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const ref = useRef<HTMLDivElement>(null);

  const { data: results = [], isLoading } = trpc.workouts.searchExercises.useQuery(
    { query: query.trim() },
    { enabled: query.trim().length >= 1 }
  );

  const addExercise = trpc.workouts.addExerciseToBlock.useMutation({
    onSuccess: () => {
      setQuery("");
      setOpen(false);
      onAdded();
      toast("success", "Exercise added");
    },
    onError: () => toast("error", "Failed to add exercise"),
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative mt-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search to add exercise..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-400 bg-stone-50"
        />
      </div>

      {open && query.trim().length >= 1 && (
        <div className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-stone-200 bg-white shadow-lg max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-stone-400 text-center">No exercises found</div>
          ) : (
            results.map((ex) => (
              <button
                key={ex.id}
                onClick={() => addExercise.mutate({ blockId, exerciseId: ex.id })}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-stone-50 transition-colors"
              >
                <span className="text-stone-800">{ex.name}</span>
                {ex.muscleGroup && (
                  <span className="text-xs text-stone-400 ml-auto">{ex.muscleGroup}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Block Panel ───────────────────────────────────────────────────────────────

function BlockPanel({
  block,
  selectedExerciseId,
  onSelectExercise,
  onRefetch,
}: {
  block: Block;
  selectedExerciseId: string | null;
  onSelectExercise: (id: string) => void;
  onRefetch: () => void;
}) {
  const letter = getBlockLetter(block.sortOrder);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-lg border border-stone-200">
      {/* Block header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-stone-50 text-left hover:bg-stone-100 transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-stone-400" /> : <ChevronDown className="h-3.5 w-3.5 text-stone-400" />}
        <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">{block.name}</span>
      </button>

      {!collapsed && (
        <div className="divide-y divide-stone-100">
          {block.exercises.map((ex, ei) => (
            <button
              key={ex.id}
              onClick={() => onSelectExercise(ex.id)}
              className={[
                "w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors",
                selectedExerciseId === ex.id ? "bg-stone-800 text-white" : "hover:bg-stone-50",
              ].join(" ")}
            >
              <span
                className={[
                  "text-[10px] font-bold px-1 py-0.5 rounded shrink-0",
                  selectedExerciseId === ex.id ? "bg-white/20 text-white" : "bg-stone-200 text-stone-600",
                ].join(" ")}
              >
                {letter}{ei + 1}
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-medium truncate ${selectedExerciseId === ex.id ? "text-white" : "text-stone-800"}`}>
                  {ex.exercise.name}
                </p>
                <p className={`text-[10px] truncate ${selectedExerciseId === ex.id ? "text-white/70" : "text-stone-400"}`}>
                  {ex.sets.length} Set{ex.sets.length !== 1 ? "s" : ""}
                </p>
              </div>
            </button>
          ))}

          <div className="px-3 py-2">
            <ExerciseSearch blockId={block.id} onAdded={onRefetch} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Workout Notes Panel ───────────────────────────────────────────────────────

function WorkoutNotes({ workoutId, initialNotes }: { workoutId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const { toast } = useToast();

  const update = trpc.workouts.update.useMutation({
    onError: () => toast("error", "Failed to save notes"),
  });

  useEffect(() => { setNotes(initialNotes ?? ""); }, [initialNotes]);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-stone-700">Workout Notes</h3>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => update.mutate({ id: workoutId, notes: notes || null })}
        rows={6}
        placeholder="Add notes for this workout..."
        className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none"
      />
      <p className="text-xs text-stone-400">Changes are saved automatically on blur.</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkoutEditorPage({
  params,
}: {
  params: Promise<{ id: string; workoutId: string }>;
}) {
  const { id: clientId, workoutId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const { data: workout, isLoading, refetch } = trpc.workouts.byId.useQuery({ id: workoutId });

  const updateWorkout = trpc.workouts.update.useMutation({
    onError: () => toast("error", "Failed to update"),
  });

  const addBlock = trpc.workouts.addBlock.useMutation({
    onSuccess: () => refetch(),
    onError: () => toast("error", "Failed to add block"),
  });

  // Find selected exercise across all blocks
  const selectedBlockExercise = workout?.blocks
    .flatMap((b) => b.exercises.map((ex) => ({ ...ex, block: b })))
    .find((ex) => ex.id === selectedExerciseId) ?? null;

  function handleRemoveExercise(id: string) {
    setSelectedExerciseId(null);
    refetch();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-stone-500">Workout not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: back + title */}
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.push(`/admin/clients/${clientId}?section=workouts`)}
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <TitleEditor workoutId={workout.id} initialTitle={workout.title} />
          </div>

          {/* Right: completion + date */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-stone-500">{formatDate(workout.date)}</span>
            <button
              onClick={() =>
                updateWorkout.mutate({
                  id: workout.id,
                  isCompleted: !workout.isCompleted,
                  completedAt: !workout.isCompleted ? new Date() : null,
                })
              }
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                workout.isCompleted
                  ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50",
              ].join(" ")}
            >
              {workout.isCompleted ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Completed
                </>
              ) : (
                "Mark Complete"
              )}
            </button>
            <Badge variant={workout.isCompleted ? "success" : "outline"}>
              {workout.isCompleted ? "Done" : "Scheduled"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Left panel: exercise builder */}
          <div className="space-y-3">
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-stone-700 mb-3">Exercises</h2>

              {workout.blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-stone-400">
                  <Dumbbell className="h-8 w-8 mb-2" />
                  <p className="text-sm text-center">No blocks yet.<br />Add a block to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workout.blocks.map((block) => (
                    <BlockPanel
                      key={block.id}
                      block={block as Block}
                      selectedExerciseId={selectedExerciseId}
                      onSelectExercise={setSelectedExerciseId}
                      onRefetch={() => refetch()}
                    />
                  ))}
                </div>
              )}

              <button
                onClick={() => addBlock.mutate({ workoutId: workout.id })}
                disabled={addBlock.isPending}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-stone-300 text-sm text-stone-500 hover:border-stone-400 hover:text-stone-700 transition-colors"
              >
                {addBlock.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Block
              </button>
            </div>
          </div>

          {/* Right panel: exercise detail or workout notes */}
          <div className="rounded-xl border border-stone-200 bg-white p-6">
            {selectedBlockExercise ? (
              <ExerciseDetail
                key={selectedBlockExercise.id}
                blockExercise={selectedBlockExercise as BlockExercise}
                blockLetter={getBlockLetter(selectedBlockExercise.block.sortOrder)}
                exerciseIndex={selectedBlockExercise.sortOrder}
                onRemove={handleRemoveExercise}
                onRefetch={() => refetch()}
              />
            ) : (
              <WorkoutNotes workoutId={workout.id} initialNotes={workout.notes} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Lucide icon used inline
function Dumbbell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 5v14" />
      <path d="M18 5v14" />
      <path d="M2 9v6" />
      <path d="M22 9v6" />
      <path d="M6 8H2" />
      <path d="M22 8h-4" />
      <path d="M6 16H2" />
      <path d="M22 16h-4" />
      <path d="M6 5h12" />
      <path d="M6 19h12" />
    </svg>
  );
}
