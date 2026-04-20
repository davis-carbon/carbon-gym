"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import {
  ChevronRight, Check, Loader2, Dumbbell, ChevronDown, ChevronUp,
  Play, Video, Info, Calendar,
} from "lucide-react";

// ─── Day names ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Exercise detail modal ─────────────────────────────────────────────────────

type Exercise = {
  id: string; name: string; muscleGroup: string | null;
  videoUrl: string | null; youtubeVideoId: string | null;
  exerciseType: string | null; steps: string[]; tips: string[];
  isEachSide: boolean;
};

type RoutineExercise = {
  id: string; sets: number | null; reps: string | null;
  weight: string | null; restSeconds: number | null;
  duration: string | null; tempo: string | null; notes: string | null;
  exercise: Exercise;
};

function ExerciseDetailModal({ ex, open, onClose }: { ex: RoutineExercise | null; open: boolean; onClose: () => void }) {
  if (!ex) return null;
  const e = ex.exercise;
  const youtubeId = e.youtubeVideoId;

  return (
    <Modal open={open} onClose={onClose} title={e.name} size="lg">
      <div className="space-y-4">
        {/* Video */}
        {youtubeId && (
          <div className="rounded-xl overflow-hidden" style={{ paddingBottom: "56.25%", position: "relative" }}>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen title={e.name}
            />
          </div>
        )}
        {!youtubeId && e.videoUrl && (
          <a href={e.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-500 hover:underline">
            <Video className="h-4 w-4" /> Watch exercise video
          </a>
        )}

        {/* Prescription */}
        <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            {ex.sets && <div><p className="text-stone-500 text-xs">Sets</p><p className="font-bold text-lg">{ex.sets}</p></div>}
            {ex.reps && <div><p className="text-stone-500 text-xs">Reps</p><p className="font-bold text-lg">{ex.reps}{e.isEachSide ? " ea" : ""}</p></div>}
            {ex.weight && <div><p className="text-stone-500 text-xs">Weight</p><p className="font-bold text-lg">{ex.weight}</p></div>}
            {ex.duration && <div><p className="text-stone-500 text-xs">Duration</p><p className="font-bold text-lg">{ex.duration}</p></div>}
            {ex.restSeconds && <div><p className="text-stone-500 text-xs">Rest</p><p className="font-bold text-lg">{ex.restSeconds}s</p></div>}
            {ex.tempo && <div><p className="text-stone-500 text-xs">Tempo</p><p className="font-bold text-base font-mono">{ex.tempo}</p></div>}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex gap-2 flex-wrap">
          {e.muscleGroup && <Badge variant="outline">{e.muscleGroup.charAt(0) + e.muscleGroup.slice(1).toLowerCase()}</Badge>}
          {e.exerciseType && <Badge variant="info">{e.exerciseType}</Badge>}
          {e.isEachSide && <Badge variant="warning">Each Side</Badge>}
        </div>

        {/* Steps */}
        {e.steps && e.steps.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-stone-700 mb-2">How to perform</p>
            <ol className="space-y-2">
              {e.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stone-900 text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  <span className="text-stone-700">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Tips */}
        {e.tips && e.tips.length > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
            <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Coaching Tips</p>
            <ul className="space-y-1">
              {e.tips.map((tip, i) => <li key={i} className="text-sm text-amber-800">• {tip}</li>)}
            </ul>
          </div>
        )}

        {ex.notes && (
          <div className="text-sm text-stone-600 bg-stone-50 rounded-lg p-3 border border-stone-200">
            <span className="font-medium">Notes: </span>{ex.notes}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Routine card ──────────────────────────────────────────────────────────────

type Routine = {
  id: string; weekNumber: number; dayNumber: number;
  name: string | null; notes: string | null;
  exercises: RoutineExercise[];
};

function RoutineCard({
  routine, isCompleted, onComplete, isLogging,
}: {
  routine: Routine; isCompleted: boolean; onComplete: () => void; isLogging: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedEx, setSelectedEx] = useState<RoutineExercise | null>(null);

  const label = routine.name || `Day ${routine.dayNumber}`;
  const dayName = DAY_NAMES[(routine.dayNumber - 1) % 7];
  const totalSets = routine.exercises.reduce((a, e) => a + (e.sets ?? 1), 0);

  return (
    <>
      <div className={`rounded-xl border transition-all ${isCompleted ? "border-emerald-200 bg-emerald-50/50" : "border-stone-200 bg-white"}`}>
        {/* Header */}
        <button className="w-full flex items-center justify-between p-4" onClick={() => setExpanded((v) => !v)}>
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-700"}`}>
              {isCompleted ? <Check className="h-4 w-4" /> : dayName}
            </div>
            <div className="text-left">
              <p className="font-medium text-sm text-stone-900">{label}</p>
              <p className="text-xs text-stone-500">{routine.exercises.length} exercises · {totalSets} sets</p>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronRight className="h-4 w-4 text-stone-400" />}
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="px-4 pb-4 space-y-2 border-t border-stone-100 pt-3">
            {routine.exercises.map((ex) => (
              <div
                key={ex.id}
                className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2.5 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {ex.exercise.youtubeVideoId ? (
                    <img
                      src={`https://img.youtube.com/vi/${ex.exercise.youtubeVideoId}/default.jpg`}
                      alt=""
                      className="h-8 w-12 rounded object-cover bg-stone-100"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="h-3.5 w-3.5 text-stone-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {ex.exercise.name}
                      {ex.exercise.isEachSide && <span className="ml-1 text-xs text-stone-400">(ea side)</span>}
                    </p>
                    <p className="text-xs text-stone-500">
                      {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.weight && ex.weight, ex.duration].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEx(ex)}
                  className="text-stone-400 hover:text-stone-700 transition-colors p-1"
                  title="Exercise details"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            ))}

            {routine.notes && (
              <p className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2 border border-stone-100">{routine.notes}</p>
            )}

            {!isCompleted && (
              <Button
                variant="primary"
                size="sm"
                className="w-full mt-2"
                onClick={onComplete}
                disabled={isLogging}
              >
                {isLogging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Mark Complete
              </Button>
            )}
            {isCompleted && (
              <p className="text-xs text-emerald-600 text-center font-medium flex items-center justify-center gap-1">
                <Check className="h-3.5 w-3.5" /> Completed
              </p>
            )}
          </div>
        )}
      </div>

      <ExerciseDetailModal ex={selectedEx} open={!!selectedEx} onClose={() => setSelectedEx(null)} />
    </>
  );
}

// ─── Active plan view ──────────────────────────────────────────────────────────

function ActivePlanView() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [loggingRoutineId, setLoggingRoutineId] = useState<string | null>(null);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [pushStartDate, setPushStartDate] = useState<string>(() => {
    // Default to next Monday
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  });

  const { data, isLoading } = trpc.portal.activePlan.useQuery();

  const logComplete = trpc.portal.logRoutineComplete.useMutation({
    onSuccess: () => {
      toast("success", "Workout logged! 🎉");
      utils.portal.activePlan.invalidate();
      utils.portal.dashboard.invalidate();
      setLoggingRoutineId(null);
    },
    onError: (e) => { toast("error", e.message); setLoggingRoutineId(null); },
  });

  const pushToCalendar = trpc.portal.pushPlanToCalendar.useMutation({
    onSuccess: (res) => {
      toast("success", `${res.created} workout${res.created === 1 ? "" : "s"} added to your calendar!`);
      utils.portal.workouts.invalidate();
      setPushModalOpen(false);
    },
    onError: (e) => toast("error", e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>;
  if (!data) return (
    <div className="text-center py-8 text-stone-400">
      <Dumbbell className="h-8 w-8 mx-auto mb-2 text-stone-300" />
      <p className="text-sm">No plan assigned yet.</p>
      <p className="text-xs mt-1">Your trainer will assign a workout plan when you&apos;re ready.</p>
    </div>
  );

  const { plan, assignment, completedRoutineIds } = data;
  const completedSet = new Set(completedRoutineIds);

  // Group routines by week
  const weeks = Array.from({ length: plan.sizeWeeks }, (_, i) => i + 1);
  const routinesByWeek: Record<number, Routine[]> = {};
  for (const r of plan.routines as Routine[]) {
    if (!routinesByWeek[r.weekNumber]) routinesByWeek[r.weekNumber] = [];
    routinesByWeek[r.weekNumber].push(r);
  }

  // Progress stats
  const totalRoutines = plan.routines.length;
  const completedCount = plan.routines.filter((r) => completedSet.has(r.id)).length;
  const progressPct = totalRoutines > 0 ? Math.round((completedCount / totalRoutines) * 100) : 0;

  const weekRoutines = routinesByWeek[selectedWeek] ?? [];

  return (
    <div className="space-y-4">
      {/* Plan header */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-0.5">Active Plan</p>
              <p className="font-bold text-stone-900">{plan.name}</p>
              <p className="text-xs text-stone-500 mt-0.5">{plan.sizeWeeks} weeks · {totalRoutines} workouts</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold text-stone-900">{progressPct}%</p>
              <p className="text-xs text-stone-400">complete</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-stone-200 rounded-full h-2">
              <div
                className="bg-stone-900 h-2 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-stone-400 mt-1">{completedCount} of {totalRoutines} workouts done</p>
          </div>
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={() => setPushModalOpen(true)} className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Push to Calendar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Push to Calendar modal */}
      <Modal open={pushModalOpen} onClose={() => setPushModalOpen(false)} title="Push Plan to Calendar">
        <div className="space-y-4">
          <p className="text-sm text-stone-600">Choose a start date (Monday of week 1). Each workout day will be added to your calendar.</p>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Start Date</label>
            <input
              type="date"
              value={pushStartDate}
              onChange={(e) => setPushStartDate(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setPushModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              disabled={pushToCalendar.isPending || !pushStartDate}
              onClick={() => pushToCalendar.mutate({ planAssignmentId: assignment.id, startDate: new Date(pushStartDate + "T12:00:00") })}
            >
              {pushToCalendar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Push to Calendar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Week selector */}
      {weeks.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {weeks.map((week) => {
            const weekRoutinesAll = routinesByWeek[week] ?? [];
            const weekDone = weekRoutinesAll.filter((r) => completedSet.has(r.id)).length;
            const weekComplete = weekRoutinesAll.length > 0 && weekDone === weekRoutinesAll.length;
            return (
              <button
                key={week}
                onClick={() => setSelectedWeek(week)}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedWeek === week
                    ? "bg-stone-900 text-white"
                    : weekComplete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Week {week}
                {weekComplete && " ✓"}
              </button>
            );
          })}
        </div>
      )}

      {/* Routines for selected week */}
      {weekRoutines.length === 0 ? (
        <p className="text-center text-sm text-stone-400 py-4">No workouts for this week.</p>
      ) : (
        <div className="space-y-3">
          {weekRoutines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              isCompleted={completedSet.has(routine.id)}
              isLogging={loggingRoutineId === routine.id}
              onComplete={() => {
                setLoggingRoutineId(routine.id);
                logComplete.mutate({ planAssignmentId: assignment.id, routineId: routine.id });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Calendar workouts (individual sessions) ───────────────────────────────────

function CalendarWorkoutsView() {
  const { toast } = useToast();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: workouts, isLoading } = trpc.portal.workouts.useQuery();

  const completeWorkout = trpc.portal.completeWorkout.useMutation({
    onSuccess: () => { toast("success", "Workout completed!"); utils.portal.workouts.invalidate(); utils.portal.dashboard.invalidate(); },
    onError: (err) => toast("error", err.message),
  });

  if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const todaysWorkouts = (workouts ?? []).filter((w) => { const d = new Date(w.date); return d >= today && d < tomorrow; });
  const upcomingWorkouts = (workouts ?? []).filter((w) => new Date(w.date) >= tomorrow);
  const recentWorkouts = (workouts ?? []).filter((w) => new Date(w.date) < today).slice(0, 8);

  if ((workouts ?? []).length === 0) return null;

  return (
    <div className="space-y-4 pt-2">
      <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2"><Calendar className="h-4 w-4" /> Scheduled Sessions</h3>

      {todaysWorkouts.map((w) => {
        const totalEx = w.blocks.reduce((a, b) => a + b.exercises.length, 0);
        return (
          <Card key={w.id}>
            <CardHeader>
              <div><CardTitle>{w.title}</CardTitle><p className="text-xs text-stone-500 mt-0.5">{totalEx} exercises</p></div>
              {w.isCompleted ? <Badge variant="success">Done</Badge> : <Badge variant="info">Today</Badge>}
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => router.push(`/c/workouts/${w.id}`)}>
                  <Play className="h-4 w-4" /> Start
                </Button>
                {!w.isCompleted && (
                  <Button variant="primary" className="flex-1" onClick={() => completeWorkout.mutate({ workoutId: w.id })} disabled={completeWorkout.isPending}>
                    <Check className="h-4 w-4" /> Mark Complete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {upcomingWorkouts.slice(0, 3).map((w) => (
        <Card key={w.id}>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{w.title}</p>
                <p className="text-xs text-stone-500">{new Date(w.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push(`/c/workouts/${w.id}`)}>
                <Play className="h-3.5 w-3.5 mr-1" /> Start
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {recentWorkouts.map((w) => (
        <Card key={w.id}>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-stone-500">{w.title}</p>
                <p className="text-xs text-stone-400">{new Date(w.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
              </div>
              <div className="flex items-center gap-2">
                {w.isCompleted && <Badge variant="success">Done</Badge>}
                <Button variant="ghost" size="sm" onClick={() => router.push(`/c/workouts/${w.id}`)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ClientWorkoutsPage() {
  const [tab, setTab] = useState<"plan" | "sessions">("plan");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Workouts</h2>

      {/* Tab switch */}
      <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
        <button
          onClick={() => setTab("plan")}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${tab === "plan" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}
        >
          My Plan
        </button>
        <button
          onClick={() => setTab("sessions")}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${tab === "sessions" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}
        >
          Sessions
        </button>
      </div>

      {tab === "plan" ? <ActivePlanView /> : <CalendarWorkoutsView />}
    </div>
  );
}
