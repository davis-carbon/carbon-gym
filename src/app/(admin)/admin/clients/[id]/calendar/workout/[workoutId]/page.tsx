"use client";

import { use, useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Pencil,
  Check,
  Plus,
  Trash2,
  GripVertical,
  Search,
  Loader2,
  X,
  Heart,
  ArrowLeftRight,
  Copy,
  History,
  MoreVertical,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Video,
  ExternalLink,
  Link2,
  Unlink2,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

// ─── Measurement column definitions ──────────────────────────────────────────

type ColId = "reps" | "weight" | "percentage" | "time" | "distance" | "calories";

const ALL_COLUMNS = [
  { id: "reps"       as ColId, label: "Reps",       unit: (_m: boolean) => "",    width: 72 },
  { id: "weight"     as ColId, label: "Weight",     unit: (m: boolean) => m ? "kg" : "lbs", width: 80 },
  { id: "percentage" as ColId, label: "% of 1RM",   unit: (_m: boolean) => "%",   width: 80 },
  { id: "time"       as ColId, label: "Time",       unit: (_m: boolean) => "sec", width: 80 },
  { id: "distance"   as ColId, label: "Distance",   unit: (m: boolean) => m ? "m" : "mi",   width: 88 },
  { id: "calories"   as ColId, label: "Cals",       unit: (_m: boolean) => "",    width: 72 },
];

function parseCols(s: string): ColId[] {
  return (s || "reps,weight").split(",").filter((c): c is ColId => ALL_COLUMNS.some((d) => d.id === c));
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ExSet = { id: string; setNumber: number; reps: number | null; weight: number | null; percentage: number | null; time: number | null; distance: number | null; calories: number | null };
type AltExercise = { id: string; exerciseId: string; sortOrder: number; exercise: { id: string; name: string; muscleGroup: string | null; youtubeVideoId: string | null; thumbnailUrl: string | null } };

type BlockEx = {
  id: string; exerciseId: string; sortOrder: number;
  notes: string | null; restSeconds: number | null;
  measurementType: string; tempo: string | null; intensity: string | null;
  isAmrap: boolean; eachSide: boolean; progressions: boolean; saveAsRepMax: boolean;
  exercise: { id: string; name: string; muscleGroup: string | null; youtubeVideoId: string | null; thumbnailUrl: string | null; videoUrl: string | null };
  sets: ExSet[];
  alternates: AltExercise[];
};

type Block = { id: string; name: string; blockType: string; sortOrder: number; rounds: number | null; notes: string | null; exercises: BlockEx[] };

type Workout = {
  id: string; clientId: string; title: string; date: Date | string; notes: string | null; staffNotes: string | null; isCompleted: boolean; completedAt: Date | null;
  client: { id: string; firstName: string; lastName: string };
  trainer: { id: string; firstName: string; lastName: string } | null;
  blocks: Block[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtRest(s: number | null) {
  if (!s) return { mm: "00", ss: "00" };
  return { mm: String(Math.floor(s / 60)).padStart(2, "0"), ss: String(s % 60).padStart(2, "0") };
}

function buildSummary(ex: BlockEx): string {
  const sets = ex.sets.length;
  if (sets === 0) return "No sets";
  const first = ex.sets[0]!;
  const parts: string[] = [`${sets} Set${sets !== 1 ? "s" : ""}`];
  if (first.reps) parts.push(`${first.reps} reps`);
  if (first.weight) parts.push(`${first.weight} lbs`);
  if (ex.restSeconds) {
    const r = fmtRest(ex.restSeconds);
    parts.push(`${r.mm}:${r.ss} rest`);
  }
  return parts.join(" , ");
}

function computeLabels(blocks: Block[]): Map<string, string> {
  const labels = new Map<string, string>();
  let letter = 0;
  for (const block of blocks) {
    const grouped = ["Superset", "Circuit", "EMOM", "AMRAP", "Tabata"].includes(block.blockType) && block.exercises.length > 1;
    if (grouped) {
      const L = String.fromCharCode(65 + letter++);
      block.exercises.forEach((ex, i) => labels.set(ex.id, `${L}${i + 1}`));
    } else {
      for (const ex of block.exercises) {
        labels.set(ex.id, String.fromCharCode(65 + letter++));
      }
    }
  }
  return labels;
}

// ─── ExerciseSearch (reusable) ────────────────────────────────────────────────

function ExerciseSearch({ placeholder, onSelect, onClose }: {
  placeholder?: string;
  onSelect: (ex: { id: string; name: string; muscleGroup: string | null }) => void;
  onClose?: () => void;
}) {
  const [q, setQ] = useState("");
  const { data } = trpc.workouts.searchExercises.useQuery({ query: q, limit: 10 }, { enabled: q.length >= 2 });
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden">
        <Search className="h-3.5 w-3.5 text-stone-400 ml-2.5 shrink-0" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder ?? "Search exercises..."}
          className="flex-1 px-2 py-2 text-xs focus:outline-none"
        />
        {onClose && (
          <button onClick={onClose} className="px-2 text-stone-400 hover:text-stone-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {q.length >= 2 && data && (
        <div className="absolute z-50 top-full mt-0.5 left-0 right-0 bg-white border border-stone-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {data.length === 0
            ? <p className="text-center text-xs text-stone-400 py-4">No results</p>
            : data.map((ex) => (
              <button
                key={ex.id}
                onClick={() => { onSelect(ex); setQ(""); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-stone-50 border-b border-stone-50 last:border-0 text-left"
              >
                {ex.thumbnailUrl
                  ? <img src={ex.thumbnailUrl} className="h-6 w-9 rounded object-cover shrink-0" alt="" />
                  : <div className="h-6 w-9 rounded bg-stone-100 shrink-0" />}
                <div>
                  <p className="text-xs font-medium text-stone-900">{ex.name}</p>
                  {ex.muscleGroup && <p className="text-[10px] text-stone-400">{ex.muscleGroup}</p>}
                </div>
              </button>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ─── Left Panel — Exercise List ───────────────────────────────────────────────

function ExerciseListPanel({
  workout,
  selectedExId,
  selectedBlockId,
  onSelectExercise,
  onSelectBlock,
  onAddBlock,
  onAddExerciseToBlock,
  onInvalidate,
}: {
  workout: Workout;
  selectedExId: string | null;
  selectedBlockId: string | null;
  onSelectExercise: (exId: string) => void;
  onSelectBlock: (blockId: string) => void;
  onAddBlock: () => void;
  onAddExerciseToBlock: (blockId: string, exerciseId: string) => void;
  onInvalidate: () => void;
}) {
  const { toast } = useToast();
  const labels = useMemo(() => computeLabels(workout.blocks), [workout.blocks]);
  const [expandedSearch, setExpandedSearch] = useState<string | null>(null); // blockId with open search

  const deleteBlock = trpc.workouts.deleteBlock.useMutation({
    onSuccess: () => onInvalidate(),
    onError: (err) => toast("error", err.message),
  });

  const linkToBlock = trpc.workouts.linkExerciseToBlock.useMutation({
    onSuccess: () => onInvalidate(),
    onError: (e) => toast("error", e.message),
  });

  const unlinkEx = trpc.workouts.unlinkExercise.useMutation({
    onSuccess: () => onInvalidate(),
    onError: (e) => toast("error", e.message),
  });

  // Flatten exercises with block context for connector rendering
  type FlatItem = { ex: BlockEx; block: Block; isFirst: boolean; isLast: boolean };
  const flat: FlatItem[] = workout.blocks.flatMap((block) =>
    block.exercises.map((ex, i) => ({
      ex, block,
      isFirst: i === 0,
      isLast: i === block.exercises.length - 1,
    }))
  );

  return (
    <div className="w-[310px] shrink-0 border-r border-stone-200 bg-white flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-stone-200">
        <span className="text-xs font-semibold text-stone-600">Exercises</span>
        <button
          onClick={onAddBlock}
          className="p-1 text-stone-400 hover:text-stone-700 rounded"
          title="Add block"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto">
        {flat.map((item, i) => {
          const next = flat[i + 1] ?? null;
          const isGrouped = ["Superset", "Circuit", "EMOM", "AMRAP", "Tabata"].includes(item.block.blockType) && item.block.exercises.length > 1;
          const isSelected = selectedExId === item.ex.id;
          const label = labels.get(item.ex.id) ?? "";

          // Connector: next exercise exists?
          const sameBlock = next && next.block.id === item.block.id;
          const crossBlock = next && next.block.id !== item.block.id;

          return (
            <div key={item.ex.id}>
              {/* Block header before first exercise of grouped block */}
              {item.isFirst && isGrouped && (
                <div
                  className={`flex items-center justify-between px-3 pt-2 pb-1 cursor-pointer hover:bg-stone-50 transition-colors border-l-2 ${
                    selectedBlockId === item.block.id ? "border-stone-800 bg-stone-50" : "border-transparent"
                  }`}
                  onClick={() => onSelectBlock(item.block.id)}
                >
                  <div>
                    <p className={`text-xs font-semibold ${selectedBlockId === item.block.id ? "text-stone-900" : "text-stone-700"}`}>
                      {item.block.name}
                    </p>
                    <p className="text-[10px] text-stone-400">{item.block.blockType}{item.block.rounds ? ` · ${item.block.rounds} rounds` : ""}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${item.block.name}"?`)) deleteBlock.mutate({ blockId: item.block.id }); }}
                    className="text-stone-300 hover:text-red-400 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Exercise row */}
              <button
                onClick={() => onSelectExercise(item.ex.id)}
                className={`w-full text-left px-3 py-2.5 hover:bg-stone-50 transition-colors border-l-2 ${
                  isSelected ? "border-stone-800 bg-stone-50" : "border-transparent"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`shrink-0 text-xs font-bold mt-0.5 w-6 ${isSelected ? "text-stone-800" : "text-stone-400"}`}>
                    {label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${isSelected ? "text-stone-900" : "text-stone-700"}`}>
                      {item.ex.exercise.name}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5 truncate">{buildSummary(item.ex)}</p>
                  </div>
                  {isGrouped && (
                    <span className="shrink-0 text-stone-300 mt-0.5">
                      <Link2 className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </button>

              {/* Within-block unlink connector (between two exercises in the same superset) */}
              {sameBlock && (
                <div className="flex items-center gap-1.5 py-0.5 px-3">
                  <div className="flex-1 h-px bg-stone-100" />
                  <button
                    onClick={() => unlinkEx.mutate({ blockExerciseId: next!.ex.id })}
                    title="Unlink from superset"
                    className="flex items-center px-2 py-0.5 rounded-full border border-stone-200 bg-white text-stone-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Unlink2 className="h-3 w-3" />
                  </button>
                  <div className="flex-1 h-px bg-stone-100" />
                </div>
              )}

              {/* Search to add exercise — inside the block, after its last exercise */}
              {item.isLast && (
                expandedSearch === item.block.id ? (
                  <div className="px-3 pb-2 pt-1">
                    <ExerciseSearch
                      placeholder="Search to add exercise..."
                      onSelect={(ex) => {
                        onAddExerciseToBlock(item.block.id, ex.id);
                        setExpandedSearch(null);
                      }}
                      onClose={() => setExpandedSearch(null)}
                    />
                  </div>
                ) : (
                  <div className="px-3 pb-2 pt-1">
                    <button
                      onClick={() => setExpandedSearch(item.block.id)}
                      className="w-full flex items-center gap-1.5 rounded-lg border border-dashed border-stone-200 px-2.5 py-1.5 text-[10px] text-stone-400 hover:border-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      <Search className="h-2.5 w-2.5" /> Search to add exercise
                    </button>
                  </div>
                )
              )}

              {/* Cross-block link connector — between last of one block and first of next */}
              {crossBlock && (
                <div className="flex items-center gap-1.5 py-0.5 px-3">
                  <div className="flex-1 h-px bg-stone-100" />
                  <button
                    onClick={() => linkToBlock.mutate({ blockExerciseId: next!.ex.id, targetBlockId: item.block.id })}
                    title="Superset with above"
                    className="flex items-center px-2 py-0.5 rounded-full border border-stone-200 bg-white text-stone-300 hover:border-stone-500 hover:text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    <Link2 className="h-3 w-3" />
                  </button>
                  <div className="flex-1 h-px bg-stone-100" />
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state / Add block */}
        <div className="p-3">
          <button
            onClick={onAddBlock}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-200 py-2.5 text-xs text-stone-400 hover:border-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Block
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SetRow ───────────────────────────────────────────────────────────────────

function SetRow({ set, index, cols, useMetric, onDeleted }: {
  set: ExSet; index: number; cols: ColId[]; useMetric: boolean; onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [vals, setVals] = useState<Record<ColId, string>>({
    reps: set.reps?.toString() ?? "", weight: set.weight?.toString() ?? "",
    percentage: set.percentage?.toString() ?? "",
    time: set.time?.toString() ?? "", distance: set.distance?.toString() ?? "",
    calories: set.calories?.toString() ?? "",
  });

  const updateSet = trpc.workouts.updateSet.useMutation({ onError: (e) => toast("error", e.message) });
  const deleteSet = trpc.workouts.deleteSet.useMutation({
    onSuccess: onDeleted,
    onError: (e) => toast("error", e.message),
  });

  function save(col: ColId) {
    const raw = vals[col];
    const num = raw === "" ? null : parseFloat(raw);
    const isInt = col === "reps" || col === "calories";
    const v = num === null ? null : isInt ? Math.round(num) : num;
    updateSet.mutate({
      setId: set.id,
      reps: col === "reps" ? (v as number | null) : undefined,
      weight: col === "weight" ? v : undefined,
      percentage: col === "percentage" ? v : undefined,
      time: col === "time" ? (v as number | null) : undefined,
      distance: col === "distance" ? v : undefined,
      calories: col === "calories" ? (v as number | null) : undefined,
    });
  }

  const dotColors = ["bg-blue-500","bg-emerald-500","bg-amber-500","bg-purple-500","bg-rose-500","bg-sky-500","bg-orange-500","bg-teal-500"];

  return (
    <div className="flex items-center gap-2 py-1 group/row hover:bg-stone-50 rounded px-1">
      <GripVertical className="h-3.5 w-3.5 text-stone-300 shrink-0 cursor-grab" />
      <div className={`shrink-0 w-5 h-5 rounded-full ${dotColors[index % dotColors.length]} flex items-center justify-center`}>
        <span className="text-white text-[9px] font-bold">{set.setNumber}</span>
      </div>
      {cols.map((colId) => {
        const def = ALL_COLUMNS.find((c) => c.id === colId)!;
        const unit = def.unit(useMetric);
        return (
          <div key={colId} className="flex items-center gap-0.5" style={{ width: def.width }}>
            <input
              type="number"
              value={vals[colId]}
              onChange={(e) => setVals((p) => ({ ...p, [colId]: e.target.value }))}
              onBlur={() => save(colId)}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              placeholder="—"
              className="w-full rounded border border-stone-200 px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
            {unit && <span className="text-[9px] text-stone-400 shrink-0">{unit}</span>}
          </div>
        );
      })}
      <button
        onClick={() => deleteSet.mutate({ setId: set.id })}
        className="ml-auto opacity-0 group-hover/row:opacity-100 text-stone-300 hover:text-red-500 shrink-0"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Right Panel — Exercise Detail ────────────────────────────────────────────

function ExerciseDetailPanel({
  ex,
  useMetric,
  onInvalidate,
  onSwap,
}: {
  ex: BlockEx;
  useMetric: boolean;
  onInvalidate: () => void;
  onSwap: () => void;
}) {
  const { toast } = useToast();

  const [cols, setCols] = useState<ColId[]>(() => parseCols(ex.measurementType));
  const [notesVal, setNotesVal] = useState(ex.notes ?? "");
  const [tempoVal, setTempoVal] = useState(ex.tempo ?? "");
  const [intensityVal, setIntensityVal] = useState(ex.intensity ?? "");
  const [restMm, setRestMm] = useState(() => fmtRest(ex.restSeconds).mm);
  const [restSs, setRestSs] = useState(() => fmtRest(ex.restSeconds).ss);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [altSearchOpen, setAltSearchOpen] = useState(false);
  const [altExpanded, setAltExpanded] = useState(false);

  const colPickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!colPickerOpen) return;
    function h(e: MouseEvent) { if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setColPickerOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [colPickerOpen]);

  // Sync local state when exercise changes
  useEffect(() => {
    setCols(parseCols(ex.measurementType));
    setNotesVal(ex.notes ?? "");
    setTempoVal(ex.tempo ?? "");
    setIntensityVal(ex.intensity ?? "");
    setRestMm(fmtRest(ex.restSeconds).mm);
    setRestSs(fmtRest(ex.restSeconds).ss);
  }, [ex.id, ex.measurementType, ex.notes, ex.tempo, ex.intensity, ex.restSeconds]);

  const updateEx = trpc.workouts.updateBlockExercise.useMutation({
    onSuccess: () => onInvalidate(),
    onError: (e) => toast("error", e.message),
  });
  const addSet = trpc.workouts.addSet.useMutation({
    onSuccess: () => onInvalidate(),
    onError: (e) => toast("error", e.message),
  });
  const removeExercise = trpc.workouts.removeExercise.useMutation({
    onSuccess: () => onInvalidate(),
    onError: (e) => toast("error", e.message),
  });
  const addAlt = trpc.workouts.addAlternateExercise.useMutation({
    onSuccess: () => onInvalidate(),
    onError: (e) => toast("error", e.message),
  });
  const removeAlt = trpc.workouts.removeAlternateExercise.useMutation({
    onSuccess: () => onInvalidate(),
    onError: (e) => toast("error", e.message),
  });

  function saveRest() {
    const secs = parseInt(restMm || "0") * 60 + parseInt(restSs || "0");
    updateEx.mutate({ id: ex.id, restSeconds: secs });
  }

  function toggleCol(col: ColId) {
    const next = cols.includes(col) ? cols.filter((c) => c !== col) : [...cols, col];
    if (next.length === 0) return;
    setCols(next);
    updateEx.mutate({ id: ex.id, measurementType: next.join(",") });
  }

  const lastSet = ex.sets[ex.sets.length - 1];

  const videoId = ex.exercise.youtubeVideoId;
  const videoUrl = ex.exercise.videoUrl;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-stone-50">
      <div className="max-w-3xl mx-auto">
        {/* Exercise header */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 mb-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <button className="shrink-0 text-stone-300 hover:text-rose-500">
                <Heart className="h-4 w-4" />
              </button>
              <h2 className="text-lg font-semibold text-stone-900 truncate">{ex.exercise.name}</h2>
              {ex.exercise.muscleGroup && (
                <span className="shrink-0 text-xs text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">
                  {ex.exercise.muscleGroup}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onSwap} className="p-1.5 text-stone-400 hover:text-stone-700 rounded hover:bg-stone-50" title="Swap exercise">
                <ArrowLeftRight className="h-4 w-4" />
              </button>
              {videoId && (
                <a href={`https://youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 text-stone-400 hover:text-red-500 rounded hover:bg-stone-50" title="Watch video">
                  <Video className="h-4 w-4" />
                </a>
              )}
              <button className="p-1.5 text-stone-400 hover:text-stone-700 rounded hover:bg-stone-50" title="Copy">
                <Copy className="h-4 w-4" />
              </button>
              <button className="p-1.5 text-stone-400 hover:text-stone-700 rounded hover:bg-stone-50" title="History">
                <History className="h-4 w-4" />
              </button>
              <button
                onClick={() => { if (confirm(`Remove "${ex.exercise.name}" from this workout?`)) removeExercise.mutate({ blockExerciseId: ex.id }); }}
                className="p-1.5 text-stone-400 hover:text-red-500 rounded hover:bg-stone-50" title="Remove exercise"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Options row */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
            {/* + Measurements pill */}
            <div className="relative" ref={colPickerRef}>
              <button
                onClick={() => setColPickerOpen((p) => !p)}
                className="flex items-center gap-1 rounded-full border border-stone-300 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:border-stone-400"
              >
                <Plus className="h-3 w-3" /> Measurements
              </button>
              {colPickerOpen && (
                <div className="absolute z-50 top-full mt-1 left-0 bg-white border border-stone-200 rounded-xl shadow-xl p-3 w-44">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">Columns</p>
                  <div className="space-y-1">
                    {ALL_COLUMNS.map((col) => {
                      const active = cols.includes(col.id);
                      return (
                        <button
                          key={col.id}
                          onClick={() => toggleCol(col.id)}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${active ? "bg-stone-800 text-white" : "text-stone-600 hover:bg-stone-50"}`}
                        >
                          {col.label}{col.unit(useMetric) ? ` (${col.unit(useMetric)})` : ""}
                          {active && <Check className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Checkboxes */}
            {(["isAmrap", "eachSide", "saveAsRepMax"] as const).map((field) => {
              const labels: Record<string, string> = { isAmrap: "AMRAP", eachSide: "Each side", saveAsRepMax: "Save as rep max" };
              return (
                <label key={field} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ex[field]}
                    onChange={(e) => updateEx.mutate({ id: ex.id, [field]: e.target.checked })}
                    className="w-3.5 h-3.5 accent-stone-800"
                  />
                  <span className="text-xs text-stone-600">{labels[field]}</span>
                </label>
              );
            })}
          </div>

          {/* Set table */}
          <div className="border border-stone-200 rounded-lg overflow-hidden mb-4">
            {/* Column headers */}
            {ex.sets.length > 0 && (
              <div className="flex items-center gap-2 px-2 py-2 bg-stone-50 border-b border-stone-200">
                <div className="w-3.5 shrink-0" />{/* drag spacer */}
                <div className="w-5 shrink-0" />{/* dot spacer */}
                {cols.map((colId) => {
                  const def = ALL_COLUMNS.find((c) => c.id === colId)!;
                  return (
                    <div key={colId} className="text-center" style={{ width: def.width }}>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                        {def.label}{def.unit(useMetric) ? ` (${def.unit(useMetric)})` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Set rows */}
            <div className="px-2 py-1 divide-y divide-stone-50">
              {ex.sets.map((set, si) => (
                <SetRow
                  key={set.id}
                  set={set}
                  index={si}
                  cols={cols}
                  useMetric={useMetric}
                  onDeleted={onInvalidate}
                />
              ))}
              {ex.sets.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-4">No sets yet</p>
              )}
            </div>

            {/* Add Set */}
            <div className="px-3 py-2 border-t border-stone-100 bg-stone-50">
              <button
                onClick={() => addSet.mutate({
                  blockExerciseId: ex.id,
                  reps: lastSet?.reps ?? null,
                  weight: lastSet?.weight ?? null,
                  percentage: lastSet?.percentage ?? null,
                  time: lastSet?.time ?? null,
                  distance: lastSet?.distance ?? null,
                  calories: lastSet?.calories ?? null,
                })}
                disabled={addSet.isPending}
                className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 font-medium"
              >
                {addSet.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Add Set
              </button>
            </div>
          </div>

          {/* Rest / Tempo / Intensity row */}
          <div className="flex items-center gap-8 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-medium">Rest</span>
              <input
                type="text"
                value={restMm}
                onChange={(e) => setRestMm(e.target.value.replace(/\D/g, "").slice(0, 2))}
                onBlur={saveRest}
                className="w-10 rounded border border-stone-200 px-1.5 py-1 text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-stone-400"
                placeholder="00"
              />
              <span className="text-stone-400 font-medium">:</span>
              <input
                type="text"
                value={restSs}
                onChange={(e) => setRestSs(e.target.value.replace(/\D/g, "").slice(0, 2))}
                onBlur={saveRest}
                className="w-10 rounded border border-stone-200 px-1.5 py-1 text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-stone-400"
                placeholder="00"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-medium">Tempo</span>
              <input
                type="text"
                value={tempoVal}
                onChange={(e) => setTempoVal(e.target.value)}
                onBlur={() => updateEx.mutate({ id: ex.id, tempo: tempoVal || null })}
                className="w-28 rounded border border-stone-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                placeholder="e.g. 3-0-1-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-medium">RPE</span>
              <input
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={intensityVal}
                onChange={(e) => setIntensityVal(e.target.value)}
                onBlur={() => updateEx.mutate({ id: ex.id, intensity: intensityVal || null })}
                className="w-20 rounded border border-stone-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                placeholder="1–10"
              />
              <span className="text-[10px] text-stone-400">/10</span>
            </div>
          </div>

          {/* Notes + Video row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-xs text-stone-500 font-medium mb-1">Exercise notes</p>
              <textarea
                value={notesVal}
                onChange={(e) => setNotesVal(e.target.value)}
                onBlur={() => updateEx.mutate({ id: ex.id, notes: notesVal || null })}
                rows={4}
                placeholder="Add exercise notes..."
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-600 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none"
              />
            </div>
            {videoId && (
              <div className="shrink-0 w-44">
                <p className="text-xs text-stone-500 font-medium mb-1">Video</p>
                <a
                  href={videoUrl ?? `https://youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg overflow-hidden border border-stone-200 hover:border-stone-400 transition-colors"
                >
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                    alt={ex.exercise.name}
                    className="w-full h-24 object-cover"
                  />
                  <div className="px-2 py-1.5 bg-stone-50 flex items-center justify-between">
                    <span className="text-[10px] text-stone-500">Watch video</span>
                    <ExternalLink className="h-2.5 w-2.5 text-stone-400" />
                  </div>
                </a>
              </div>
            )}
          </div>

          {/* Manage global exercise link */}
          <div className="mt-3">
            <a
              href={`/admin/exercises`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-400 hover:text-stone-600 underline flex items-center gap-1"
            >
              Manage global exercise <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>

        {/* Alternate Exercises */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <button
            onClick={() => setAltExpanded((p) => !p)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-stone-50"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-stone-700">Alternate Exercises</span>
              <span className="text-xs bg-stone-100 text-stone-500 rounded-full px-2 py-0.5">{ex.alternates.length}</span>
            </div>
            {altExpanded ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
          </button>

          {altExpanded && (
            <div className="border-t border-stone-100 px-5 py-3 space-y-2">
              {ex.alternates.map((alt) => (
                <div key={alt.id} className="flex items-center gap-3 py-1">
                  {alt.exercise.thumbnailUrl
                    ? <img src={alt.exercise.thumbnailUrl} className="h-8 w-12 rounded object-cover shrink-0" alt="" />
                    : <div className="h-8 w-12 rounded bg-stone-100 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-800">{alt.exercise.name}</p>
                    {alt.exercise.muscleGroup && <p className="text-[10px] text-stone-400">{alt.exercise.muscleGroup}</p>}
                  </div>
                  <button
                    onClick={() => removeAlt.mutate({ id: alt.id })}
                    className="text-stone-300 hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {altSearchOpen ? (
                <ExerciseSearch
                  placeholder="Search alternate exercise..."
                  onSelect={(e) => { addAlt.mutate({ blockExerciseId: ex.id, exerciseId: e.id }); setAltSearchOpen(false); }}
                  onClose={() => setAltSearchOpen(false)}
                />
              ) : (
                <button
                  onClick={() => setAltSearchOpen(true)}
                  className="flex items-center gap-2 text-xs text-stone-400 hover:text-stone-700"
                >
                  <Search className="h-3.5 w-3.5" /> Add an alternate exercise
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function NoExerciseSelected({ onAddBlock }: { onAddBlock: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center bg-stone-50 p-8">
      <div className="w-16 h-16 rounded-2xl bg-white border border-stone-200 flex items-center justify-center mb-4 shadow-sm">
        <GripVertical className="h-7 w-7 text-stone-300" />
      </div>
      <h3 className="text-sm font-semibold text-stone-600 mb-1">Select an exercise</h3>
      <p className="text-xs text-stone-400 max-w-48 mb-5">Click any exercise in the list to view and edit its details</p>
      <button
        onClick={onAddBlock}
        className="flex items-center gap-1.5 text-xs bg-stone-800 text-white px-4 py-2 rounded-lg hover:bg-stone-700"
      >
        <Plus className="h-3.5 w-3.5" /> Add a block to get started
      </button>
    </div>
  );
}

// ─── Swap Exercise Modal ──────────────────────────────────────────────────────

function SwapModal({ exId, exerciseName, blockId, onClose, onSwapped }: {
  exId: string; exerciseName: string; blockId: string; onClose: () => void; onSwapped: (newExId: string) => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const swap = trpc.workouts.removeExercise.useMutation({ onError: (e) => toast("error", e.message) });
  const add = trpc.workouts.addExerciseToBlock.useMutation({
    onSuccess: (data) => { utils.workouts.byId.invalidate(); onSwapped(data.id); onClose(); },
    onError: (e) => toast("error", e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900 text-sm">Swap "{exerciseName}"</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-stone-400" /></button>
        </div>
        <div className="p-4">
          <ExerciseSearch
            placeholder="Search replacement exercise..."
            onSelect={(newEx) => {
              swap.mutate({ blockExerciseId: exId });
              add.mutate({ blockId, exerciseId: newEx.id, sets: [{ setNumber: 1, reps: null, weight: null, time: null, distance: null, calories: null }] });
            }}
          />
          <p className="text-xs text-stone-400 mt-3">The current exercise and all its sets will be replaced.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Block Detail Panel ───────────────────────────────────────────────────────

const BLOCK_TYPES = ["Normal", "Superset", "Circuit", "EMOM", "AMRAP", "Tabata"] as const;

function BlockDetailPanel({ block, workout, onInvalidate }: {
  block: Block;
  workout: Workout;
  onInvalidate: () => void;
}) {
  const { toast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(block.name);
  const [blockNotes, setBlockNotes] = useState(block.notes ?? "");
  const [workoutNotes, setWorkoutNotes] = useState(workout.notes ?? "");
  const [staffNotes, setStaffNotes] = useState(workout.staffNotes ?? "");
  // Local rounds state so stepper is instant — server follows
  const [rounds, setRounds] = useState(block.rounds ?? 1);
  const nameRef = useRef<HTMLInputElement>(null);

  // Keep local rounds in sync when server data refreshes
  useEffect(() => { setRounds(block.rounds ?? 1); }, [block.rounds]);

  const updateBlock = trpc.workouts.updateBlock.useMutation({
    onSuccess: onInvalidate,
    onError: (e) => toast("error", e.message),
  });
  const setBlockRounds = trpc.workouts.setBlockRounds.useMutation({
    onSuccess: onInvalidate,
    onError: (e) => toast("error", e.message),
  });
  const updateWorkout = trpc.workouts.update.useMutation({
    onSuccess: onInvalidate,
    onError: (e) => toast("error", e.message),
  });
  const deleteBlock = trpc.workouts.deleteBlock.useMutation({
    onSuccess: onInvalidate,
    onError: (e) => toast("error", e.message),
  });

  useEffect(() => { if (editingName) nameRef.current?.select(); }, [editingName]);

  function commitName() {
    setEditingName(false);
    const t = nameDraft.trim();
    if (t && t !== block.name) updateBlock.mutate({ blockId: block.id, name: t });
    else setNameDraft(block.name);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-2 min-w-0">
          {editingName ? (
            <input
              ref={nameRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setEditingName(false); setNameDraft(block.name); } }}
              className="text-xl font-semibold text-stone-900 border-b-2 border-stone-800 focus:outline-none bg-transparent"
            />
          ) : (
            <button onClick={() => { setEditingName(true); setNameDraft(block.name); }} className="flex items-center gap-1.5 group">
              <span className="text-xl font-semibold text-stone-900">{block.name}</span>
              <Pencil className="h-3.5 w-3.5 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
        <button
          onClick={() => { if (confirm(`Delete "${block.name}" and all its exercises?`)) deleteBlock.mutate({ blockId: block.id }); }}
          className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
          title="Delete block"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Type + Rounds row */}
      <div className="flex items-center gap-6 mb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-500">Type</span>
          <select
            value={block.blockType}
            onChange={(e) => updateBlock.mutate({ blockId: block.id, blockType: e.target.value })}
            className="text-sm border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-stone-400 bg-white text-stone-800"
          >
            {BLOCK_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        {block.blockType !== "Normal" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-stone-500">Rounds</span>
            <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden">
              <button
                onClick={() => {
                  const next = Math.max(1, rounds - 1);
                  setRounds(next);
                  setBlockRounds.mutate({ blockId: block.id, rounds: next });
                }}
                disabled={rounds <= 1}
                className="px-2.5 py-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors text-sm font-medium border-r border-stone-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >−</button>
              <span className="px-3 py-1.5 text-sm font-semibold text-stone-800 min-w-[2.5rem] text-center">
                {rounds}
              </span>
              <button
                onClick={() => {
                  const next = Math.min(99, rounds + 1);
                  setRounds(next);
                  setBlockRounds.mutate({ blockId: block.id, rounds: next });
                }}
                disabled={rounds >= 99}
                className="px-2.5 py-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors text-sm font-medium border-l border-stone-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >+</button>
            </div>
            {setBlockRounds.isPending && (
              <span className="text-[10px] text-stone-400">Updating sets…</span>
            )}
          </div>
        )}
      </div>

      {/* Block notes */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-stone-500 mb-1.5">Block notes</label>
        <textarea
          value={blockNotes}
          onChange={(e) => setBlockNotes(e.target.value)}
          onBlur={() => updateBlock.mutate({ blockId: block.id, notes: blockNotes || null })}
          placeholder="Add block notes..."
          rows={3}
          className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none placeholder:text-stone-300"
        />
      </div>

      <div className="border-t border-stone-100 my-5" />

      {/* Workout-level notes */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">Workout notes</label>
          <textarea
            value={workoutNotes}
            onChange={(e) => setWorkoutNotes(e.target.value)}
            onBlur={() => updateWorkout.mutate({ id: workout.id, notes: workoutNotes || null })}
            placeholder="Add workout notes..."
            rows={4}
            className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none placeholder:text-stone-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">
            Staff notes <span className="text-stone-300 font-normal">(private)</span>
          </label>
          <textarea
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
            onBlur={() => updateWorkout.mutate({ id: workout.id, staffNotes: staffNotes || null })}
            placeholder="Add private staff notes..."
            rows={4}
            className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none placeholder:text-stone-300"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkoutEditorPage({ params }: { params: Promise<{ id: string; workoutId: string }> }) {
  const { id, workoutId } = use(params);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [useMetric, setUseMetric] = useState(false);
  const [selectedExId, setSelectedExId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [swapFor, setSwapFor] = useState<{ exId: string; blockId: string; name: string } | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const { data: workout, isLoading, error } = trpc.workouts.byId.useQuery({ id: workoutId });

  const invalidate = useCallback(() => utils.workouts.byId.invalidate({ id: workoutId }), [utils, workoutId]);

  const updateWorkout = trpc.workouts.update.useMutation({
    onSuccess: () => invalidate(),
    onError: (e) => toast("error", e.message),
  });

  const addBlock = trpc.workouts.addBlock.useMutation({
    onSuccess: (block) => {
      invalidate();
      toast("success", "Block added");
      // Auto-expand the block's search
    },
    onError: (e) => toast("error", e.message),
  });

  const addExercise = trpc.workouts.addExerciseToBlock.useMutation({
    onSuccess: (data) => { invalidate(); setSelectedExId(data.id); },
    onError: (e) => toast("error", e.message),
  });

  // Auto-select first exercise when workout loads
  useEffect(() => {
    if (workout && !selectedExId && workout.blocks.length > 0) {
      const firstEx = workout.blocks[0]?.exercises[0];
      if (firstEx) setSelectedExId(firstEx.id);
    }
  }, [workout, selectedExId]);

  useEffect(() => {
    if (editingTitle) titleRef.current?.select();
  }, [editingTitle]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        <span className="ml-2 text-sm text-stone-500">Loading workout...</span>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white gap-3">
        <p className="text-sm text-red-600 font-medium">Failed to load workout</p>
        <p className="text-xs text-stone-500">{error?.message ?? "Workout not found"}</p>
        <button
          onClick={() => window.history.back()}
          className="mt-2 text-xs text-stone-600 underline hover:text-stone-900"
        >
          ← Go back
        </button>
      </div>
    );
  }

  const w = workout as unknown as Workout;
  const clientName = `${w.client.firstName} ${w.client.lastName}`;

  // Find selected exercise across all blocks
  const selectedEx = w.blocks.flatMap((b) => b.exercises).find((e) => e.id === selectedExId) ?? null;
  const selectedBlock = selectedEx ? w.blocks.find((b) => b.exercises.some((e) => e.id === selectedExId)) : null;

  function commitTitle() {
    setEditingTitle(false);
    const t = titleDraft.trim();
    if (t && t !== w.title) updateWorkout.mutate({ id: workoutId, title: t });
    else setTitleDraft(w.title);
  }

  const totalSets = w.blocks.reduce((acc, b) => acc + b.exercises.reduce((a, e) => a + e.sets.length, 0), 0);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* ── Header bar ───────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white">
        {/* Left: back + calendar + title */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href={`/admin/clients/${id}/calendar`} className="text-stone-400 hover:text-stone-700 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link href={`/admin/clients/${id}/calendar`} className="text-stone-400 hover:text-stone-700 shrink-0">
            <CalendarDays className="h-5 w-5" />
          </Link>

          {editingTitle ? (
            <input
              ref={titleRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(w.title); } }}
              className="text-lg font-semibold text-stone-900 border-b-2 border-stone-800 focus:outline-none bg-transparent min-w-0 max-w-64"
            />
          ) : (
            <button
              onClick={() => { setEditingTitle(true); setTitleDraft(w.title); }}
              className="flex items-center gap-1.5 group"
            >
              <span className="text-lg font-semibold text-stone-900">{w.title}</span>
              <Pencil className="h-3.5 w-3.5 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => updateWorkout.mutate({ id: workoutId, isCompleted: true, completedAt: new Date() })}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 border border-stone-200 rounded-lg px-3 py-1.5 hover:border-stone-400"
          >
            <Check className="h-3.5 w-3.5" /> Log workout
          </button>
          <div className="flex items-center gap-1 text-xs text-stone-400 border border-stone-200 rounded-lg px-3 py-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{fmtDate(w.date)}</span>
          </div>
          <button className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 border border-stone-200 rounded-lg px-3 py-1.5 hover:border-stone-400">
            <EyeOff className="h-3.5 w-3.5" /> Hide workout
          </button>
          <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden">
            <Link href={`/admin/clients/${id}/calendar`} className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-50">
              <ChevronDown className="h-4 w-4 rotate-90" />
            </Link>
            <Link href={`/admin/clients/${id}/calendar`} className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-50 border-l border-stone-200">
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </Link>
          </div>
          <div className="flex items-center gap-3 text-xs text-stone-500 border-l border-stone-200 pl-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={useMetric} onChange={() => setUseMetric((p) => !p)} className="w-3.5 h-3.5 accent-stone-800" />
              Metric
            </label>
          </div>
          <button className="text-stone-400 hover:text-stone-700">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Body: left list + right detail ───────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <ExerciseListPanel
          workout={w}
          selectedExId={selectedExId}
          selectedBlockId={selectedBlockId}
          onSelectExercise={(exId) => { setSelectedExId(exId); setSelectedBlockId(null); }}
          onSelectBlock={(blockId) => { setSelectedBlockId(blockId); setSelectedExId(null); }}
          onAddBlock={() => addBlock.mutate({ workoutId })}
          onAddExerciseToBlock={(blockId, exerciseId) =>
            addExercise.mutate({ blockId, exerciseId, sets: [{ setNumber: 1, reps: null, weight: null, time: null, distance: null, calories: null }] })
          }
          onInvalidate={invalidate}
        />

        {selectedBlockId ? (
          <BlockDetailPanel
            key={selectedBlockId}
            block={w.blocks.find((b) => b.id === selectedBlockId)!}
            workout={w}
            onInvalidate={invalidate}
          />
        ) : selectedEx && selectedBlock ? (
          <ExerciseDetailPanel
            key={selectedEx.id}
            ex={selectedEx as unknown as BlockEx}
            useMetric={useMetric}
            onInvalidate={invalidate}
            onSwap={() => setSwapFor({ exId: selectedEx.id, blockId: selectedBlock.id, name: selectedEx.exercise.name })}
          />
        ) : (
          <NoExerciseSelected onAddBlock={() => addBlock.mutate({ workoutId })} />
        )}
      </div>

      {/* Swap modal */}
      {swapFor && (
        <SwapModal
          exId={swapFor.exId}
          blockId={swapFor.blockId}
          exerciseName={swapFor.name}
          onClose={() => setSwapFor(null)}
          onSwapped={(newExId) => { setSelectedExId(newExId); setSwapFor(null); }}
        />
      )}
    </div>
  );
}
