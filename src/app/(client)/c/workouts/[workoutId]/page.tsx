"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Timer, Trophy, Loader2 } from "lucide-react";

// ─── Rest timer overlay ────────────────────────────────────────────────────────

function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const ref = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => {
    ref.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(ref.current); onDone(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pct = (remaining / seconds) * 100;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#3f3f46" strokeWidth="8" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="#22c55e" strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`}
              strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-white">{remaining}</span>
          </div>
        </div>
        <p className="text-stone-400 text-sm mb-4">Rest Timer</p>
        <button onClick={onDone} className="text-white text-sm underline">Skip</button>
      </div>
    </div>
  );
}

// ─── Set row types ─────────────────────────────────────────────────────────────

type SetRow = {
  id: string;
  setNumber: number;
  reps: number | null;       // target reps
  weight: number | null;     // target weight
  isCompleted: boolean;
  actualReps: number | null;
  actualWeight: number | null;
};

// ─── Individual set logger ─────────────────────────────────────────────────────

function SetLogger({
  set,
  onLog,
  loading,
}: {
  set: SetRow;
  onLog: (id: string, reps: number | null, weight: number | null) => void;
  loading: boolean;
}) {
  const [reps, setReps] = useState<string>(set.actualReps?.toString() ?? set.reps?.toString() ?? "");
  const [weight, setWeight] = useState<string>(set.actualWeight?.toString() ?? set.weight?.toString() ?? "");

  if (set.isCompleted) {
    return (
      <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-green-50 border border-green-200">
        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <Check className="h-3 w-3 text-white" />
        </div>
        <span className="text-sm text-green-700 font-medium">Set {set.setNumber}</span>
        <span className="text-xs text-green-600 ml-auto">
          {set.actualReps ?? "—"} reps @ {set.actualWeight ?? "—"} lbs
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-xl border border-stone-200 bg-white">
      <span className="text-sm font-medium text-stone-500 w-12 shrink-0">Set {set.setNumber}</span>
      <input
        type="number"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        placeholder={set.reps?.toString() ?? "Reps"}
        className="w-16 rounded-lg border border-stone-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-stone-400"
      />
      <span className="text-xs text-stone-400">×</span>
      <input
        type="number"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        placeholder={set.weight?.toString() ?? "lbs"}
        className="w-16 rounded-lg border border-stone-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-stone-400"
      />
      <span className="text-xs text-stone-400">lbs</span>
      <button
        onClick={() => onLog(set.id, reps ? Number(reps) : null, weight ? Number(weight) : null)}
        disabled={loading}
        className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-white disabled:opacity-50 shrink-0"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// ─── Exercise card ─────────────────────────────────────────────────────────────

type BlockExercise = {
  id: string;
  sets: SetRow[];
  exercise: {
    name: string;
    youtubeVideoId: string | null;
    muscleGroup: string | null;
    isEachSide: boolean;
  };
  restSeconds: number | null;
  notes: string | null;
};

function ExerciseCard({
  blockExercise,
  onSetLogged,
}: {
  blockExercise: BlockExercise;
  onSetLogged: (restSeconds: number) => void;
}) {
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(true);
  const [loggingId, setLoggingId] = useState<string | null>(null);

  const logSet = trpc.portal.logSet.useMutation({
    onSuccess: () => {
      void utils.portal.workoutSession.invalidate();
      const rest = blockExercise.restSeconds ?? 60;
      onSetLogged(rest);
      setLoggingId(null);
    },
  });

  const completed = blockExercise.sets.filter((s) => s.isCompleted).length;
  const total = blockExercise.sets.length;
  const allDone = completed === total && total > 0;

  return (
    <div className={`rounded-2xl border overflow-hidden ${allDone ? "border-green-200 bg-green-50" : "border-stone-200 bg-white"}`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${allDone ? "bg-green-500 text-white" : "bg-stone-100 text-stone-600"}`}>
          {allDone ? <Check className="h-4 w-4" /> : `${completed}/${total}`}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-stone-900">
            {blockExercise.exercise.name}
            {blockExercise.exercise.isEachSide ? " (each side)" : ""}
          </p>
          <p className="text-xs text-stone-500">
            {total} sets
            {blockExercise.sets[0]?.reps ? ` × ${blockExercise.sets[0].reps} reps` : ""}
            {blockExercise.sets[0]?.weight ? ` @ ${blockExercise.sets[0].weight} lbs` : ""}
            {blockExercise.restSeconds ? ` · ${blockExercise.restSeconds}s rest` : ""}
          </p>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-stone-400 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {blockExercise.notes && (
            <p className="text-xs text-stone-500 italic mb-2">{blockExercise.notes}</p>
          )}
          {blockExercise.sets.map((set) => (
            <SetLogger
              key={set.id}
              set={set}
              loading={loggingId === set.id && logSet.isPending}
              onLog={(id, reps, weight) => {
                setLoggingId(id);
                logSet.mutate({
                  setId: id,
                  actualReps: reps ?? undefined,
                  actualWeight: weight ?? undefined,
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function WorkoutSessionPage() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [restTimer, setRestTimer] = useState<{ seconds: number } | null>(null);
  const [done, setDone] = useState(false);

  const { data: workout, isLoading } = trpc.portal.workoutSession.useQuery({ workoutId });

  const complete = trpc.portal.completeWorkoutSession.useMutation({
    onSuccess: () => {
      void utils.portal.workouts.invalidate();
      setDone(true);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }
  if (!workout) {
    return <div className="p-4 text-center text-stone-500">Workout not found.</div>;
  }

  const allExercises = workout.blocks.flatMap((b) => b.exercises);
  const totalSets = allExercises.reduce((s, e) => s + e.sets.length, 0);
  const completedSets = allExercises.reduce((s, e) => s + e.sets.filter((x) => x.isCompleted).length, 0);
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Trophy className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Workout Complete!</h2>
        <p className="text-stone-500 mb-6">You crushed {completedSets} sets. Great work.</p>
        <Button onClick={() => router.push("/c/workouts")}>Back to Workouts</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-stone-500 hover:text-stone-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <p className="font-semibold text-stone-900 text-sm">{workout.title}</p>
            <p className="text-xs text-stone-500">{completedSets}/{totalSets} sets · {progressPct}%</p>
          </div>
          <Timer className="h-4 w-4 text-stone-400" />
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 rounded-full bg-stone-100 overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Exercises */}
      <div className="p-4 space-y-3 pb-24">
        {workout.blocks.map((block) => (
          <div key={block.id}>
            {workout.blocks.length > 1 && (
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2 px-1">
                {block.name}
              </p>
            )}
            {block.exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                blockExercise={exercise as unknown as BlockExercise}
                onSetLogged={(seconds) => setRestTimer({ seconds })}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Complete button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-stone-200">
        <Button
          className="w-full"
          disabled={complete.isPending || workout.isCompleted}
          onClick={() => complete.mutate({ workoutId })}
        >
          {complete.isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : workout.isCompleted
              ? "Already Completed"
              : `Complete Workout (${progressPct}% done)`}
        </Button>
      </div>

      {/* Rest timer overlay */}
      {restTimer && (
        <RestTimer seconds={restTimer.seconds} onDone={() => setRestTimer(null)} />
      )}
    </div>
  );
}
