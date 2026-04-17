"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2, Search, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [editingMeta, setEditingMeta] = useState(false);
  const [meta, setMeta] = useState({ name: "", sizeWeeks: "4", description: "" });
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedRoutine, setSelectedRoutine] = useState<string | null>(null);

  const { data: plan, isLoading } = trpc.plans.byId.useQuery({ id });
  const { data: exerciseResults } = trpc.workouts.searchExercises.useQuery(
    { query: exerciseSearch, limit: 15 },
    { enabled: exerciseSearch.length >= 2 }
  );

  const updatePlan = trpc.plans.update.useMutation({
    onSuccess: () => { toast("success", "Plan updated"); utils.plans.byId.invalidate({ id }); setEditingMeta(false); },
    onError: (err) => toast("error", err.message),
  });

  const addRoutine = trpc.plans.addRoutine.useMutation({
    onSuccess: () => utils.plans.byId.invalidate({ id }),
  });

  const deleteRoutine = trpc.plans.deleteRoutine.useMutation({
    onSuccess: () => utils.plans.byId.invalidate({ id }),
  });

  const addExerciseToRoutine = trpc.plans.addExerciseToRoutine.useMutation({
    onSuccess: () => { utils.plans.byId.invalidate({ id }); setExerciseSearch(""); setSelectedRoutine(null); },
  });

  const deleteRoutineExercise = trpc.plans.deleteRoutineExercise.useMutation({
    onSuccess: () => utils.plans.byId.invalidate({ id }),
  });

  if (isLoading || !plan) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;
  }

  // Group routines by week
  const routinesByWeekAndDay: Record<number, Record<number, typeof plan.routines>> = {};
  for (let w = 1; w <= plan.sizeWeeks; w++) {
    routinesByWeekAndDay[w] = {};
    for (let d = 1; d <= 7; d++) {
      routinesByWeekAndDay[w][d] = plan.routines.filter((r) => r.weekNumber === w && r.dayNumber === d);
    }
  }

  function startEdit() {
    setMeta({ name: plan!.name, sizeWeeks: String(plan!.sizeWeeks), description: plan!.description ?? "" });
    setEditingMeta(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/plans" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to plans
        </Link>
        <div className="flex items-start justify-between">
          <div>
            {editingMeta ? (
              <div className="space-y-2 max-w-md">
                <Input label="Name" value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Weeks" type="number" value={meta.sizeWeeks} onChange={(e) => setMeta({ ...meta, sizeWeeks: e.target.value })} />
                  <div className="flex items-end gap-2">
                    <Button size="sm" onClick={() => updatePlan.mutate({ id, name: meta.name, sizeWeeks: parseInt(meta.sizeWeeks) || 4, description: meta.description })} disabled={updatePlan.isPending}>
                      <Save className="h-4 w-4" /> Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingMeta(false)}>Cancel</Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{plan.name}</h1>
                  <Badge variant={plan.status === "ASSIGNED" ? "success" : plan.status === "PUBLISHED" ? "info" : "outline"}>
                    {plan.status.charAt(0) + plan.status.slice(1).toLowerCase()}
                  </Badge>
                  <button onClick={startEdit} className="text-stone-400 hover:text-stone-600"><Pencil className="h-4 w-4" /></button>
                </div>
                <p className="text-sm text-stone-500 mt-1">{plan.sizeWeeks} weeks · {plan.assignments.length} clients assigned</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Week-by-week grid */}
      <div className="space-y-6">
        {Array.from({ length: plan.sizeWeeks }, (_, i) => i + 1).map((weekNum) => (
          <Card key={weekNum}>
            <CardHeader>
              <CardTitle>Week {weekNum}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {DAY_NAMES.map((dayName, idx) => {
                  const dayNum = idx + 1;
                  const dayRoutines = routinesByWeekAndDay[weekNum][dayNum] ?? [];

                  return (
                    <div key={dayNum} className="min-h-[160px] border border-stone-200 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-stone-500">{dayName}</span>
                        {dayRoutines.length === 0 && (
                          <button
                            onClick={() => addRoutine.mutate({ planId: id, weekNumber: weekNum, dayNumber: dayNum, name: "Workout" })}
                            className="text-stone-400 hover:text-stone-600"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {dayRoutines.map((routine) => (
                        <div key={routine.id} className="mb-2 group">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-stone-700">{routine.name || "Workout"}</span>
                            <button
                              onClick={() => { if (confirm("Delete?")) deleteRoutine.mutate({ id: routine.id }); }}
                              className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Exercises */}
                          {routine.exercises.map((ex, ei) => (
                            <div key={ex.id} className="text-[10px] text-stone-600 bg-stone-50 rounded px-1.5 py-0.5 mb-0.5 group/ex relative">
                              <span className="text-stone-400 mr-1">{String.fromCharCode(65 + ei)}.</span>
                              <span>{ex.exercise.name}</span>
                              {ex.sets && <span className="text-stone-400 ml-1">{ex.sets}×{ex.reps || "?"}</span>}
                              <button
                                onClick={() => deleteRoutineExercise.mutate({ id: ex.id })}
                                className="absolute right-1 top-0 opacity-0 group-hover/ex:opacity-100 text-red-500 text-xs"
                              >
                                ×
                              </button>
                            </div>
                          ))}

                          {/* Add exercise */}
                          {selectedRoutine === routine.id ? (
                            <div className="relative mt-1">
                              <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400" />
                              <input
                                type="text"
                                value={exerciseSearch}
                                onChange={(e) => setExerciseSearch(e.target.value)}
                                placeholder="Add exercise..."
                                autoFocus
                                onBlur={() => setTimeout(() => setSelectedRoutine(null), 200)}
                                className="w-full pl-6 pr-1 py-0.5 text-[10px] rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-500"
                              />
                              {exerciseSearch.length >= 2 && exerciseResults && exerciseResults.length > 0 && (
                                <div className="absolute z-50 mt-0.5 w-full bg-white border border-stone-200 rounded shadow-lg max-h-40 overflow-y-auto">
                                  {exerciseResults.map((ex) => (
                                    <button
                                      key={ex.id}
                                      onClick={() => addExerciseToRoutine.mutate({ routineId: routine.id, exerciseId: ex.id, sets: 3, reps: "10" })}
                                      className="w-full text-left px-1.5 py-1 text-[10px] hover:bg-stone-50 border-b border-stone-100 last:border-0"
                                    >
                                      {ex.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => setSelectedRoutine(routine.id)}
                              className="text-[10px] text-stone-400 hover:text-stone-600"
                            >
                              + exercise
                            </button>
                          )}
                        </div>
                      ))}

                      {dayRoutines.length > 0 && (
                        <button
                          onClick={() => addRoutine.mutate({ planId: id, weekNumber: weekNum, dayNumber: dayNum, name: "Workout" })}
                          className="text-[10px] text-stone-400 hover:text-stone-600 mt-1"
                        >
                          + routine
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
