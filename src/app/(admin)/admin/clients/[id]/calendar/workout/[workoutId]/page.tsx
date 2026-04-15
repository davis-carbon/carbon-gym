"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, GripVertical, Play, History, Star, Pill, ChevronUp, Search, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

export default function WorkoutEditorPage({ params }: { params: Promise<{ id: string; workoutId: string }> }) {
  const { id, workoutId } = use(params);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [exerciseSearch, setExerciseSearch] = useState("");
  const [useMetric, setUseMetric] = useState(false);

  // Fetch workout data
  const { data: workout, isLoading } = trpc.workouts.byId.useQuery({ id: workoutId });

  // Search exercises
  const { data: searchResults } = trpc.workouts.searchExercises.useQuery(
    { query: exerciseSearch, limit: 15 },
    { enabled: exerciseSearch.length >= 2 }
  );

  // Mutations
  const addBlock = trpc.workouts.addBlock.useMutation({
    onSuccess: () => { utils.workouts.byId.invalidate({ id: workoutId }); toast("success", "Block added"); },
  });

  const deleteBlock = trpc.workouts.deleteBlock.useMutation({
    onSuccess: () => { utils.workouts.byId.invalidate({ id: workoutId }); },
  });

  const addExercise = trpc.workouts.addExerciseToBlock.useMutation({
    onSuccess: () => { utils.workouts.byId.invalidate({ id: workoutId }); setExerciseSearch(""); },
  });

  const addSet = trpc.workouts.addSet.useMutation({
    onSuccess: () => { utils.workouts.byId.invalidate({ id: workoutId }); },
  });

  const removeExercise = trpc.workouts.removeExercise.useMutation({
    onSuccess: () => { utils.workouts.byId.invalidate({ id: workoutId }); },
  });

  const updateWorkout = trpc.workouts.update.useMutation({
    onSuccess: () => { utils.workouts.byId.invalidate({ id: workoutId }); },
  });

  const deleteWorkout = trpc.workouts.delete.useMutation({
    onSuccess: () => { window.location.href = `/admin/clients/${id}/calendar`; },
  });

  if (isLoading || !workout) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        <span className="ml-2 text-sm text-stone-500">Loading workout...</span>
      </div>
    );
  }

  const clientName = `${workout.client.firstName} ${workout.client.lastName}`;
  const totalSets = workout.blocks.reduce((acc, b) => acc + b.exercises.reduce((a, e) => a + e.sets.length, 0), 0);

  function handleAddExerciseToBlock(blockId: string, exerciseId: string) {
    addExercise.mutate({
      blockId,
      exerciseId,
      sets: [{ setNumber: 1, reps: null, weight: null, time: null, distance: null, calories: null }],
    });
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Stats bar */}
      <div className="bg-stone-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/clients/${id}/calendar`} className="text-stone-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-sm font-medium">This workout</span>
        </div>
        <div className="flex items-center gap-8 text-sm">
          <div><span className="text-2xl font-light">{totalSets}</span> <span className="text-stone-400">sets</span></div>
          <div><span className="text-2xl font-light">{workout.blocks.length}</span> <span className="text-stone-400">blocks</span></div>
        </div>
      </div>

      <div className="flex">
        {/* Left panel */}
        <div className="w-72 border-r border-stone-200 p-4 space-y-4 flex-shrink-0">
          <div>
            <p className="text-xs text-stone-500 mb-1">Workout Plan</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-stone-900 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">C</span>
              </div>
              <span className="text-sm font-medium">Client Calendar</span>
            </div>
          </div>

          <div>
            <p className="text-xs text-stone-500 mb-1">Selected Workout</p>
            <p className="text-sm font-semibold">{workout.title}</p>
          </div>

          {/* Exercise search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              placeholder="Add Exercise"
              className="w-full rounded-lg border border-stone-300 pl-10 pr-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
            {/* Search results dropdown */}
            {exerciseSearch.length >= 2 && searchResults && searchResults.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      // Add to first block, or create one if none exist
                      if (workout.blocks.length === 0) {
                        addBlock.mutate({ workoutId }, {
                          onSuccess: (newBlock) => {
                            handleAddExerciseToBlock(newBlock.id, ex.id);
                          },
                        });
                      } else {
                        handleAddExerciseToBlock(workout.blocks[0].id, ex.id);
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 border-b border-stone-100 last:border-0"
                  >
                    <span className="font-medium">{ex.name}</span>
                    {ex.muscleGroup && <span className="text-xs text-stone-400 ml-2">{ex.muscleGroup}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => addBlock.mutate({ workoutId })}
            disabled={addBlock.isPending}
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            + Add Block
          </button>

          {/* Favorite Exercises */}
          <div className="bg-stone-50 rounded-lg p-3">
            <p className="text-sm font-semibold flex items-center gap-1">
              Favorite Exercises <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Search and add exercises above.
            </p>
          </div>

          {/* Delete workout */}
          <button
            onClick={() => { if (confirm("Delete this workout?")) deleteWorkout.mutate({ id: workoutId }); }}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Delete Workout
          </button>
        </div>

        {/* Right panel — Workout Builder */}
        <div className="flex-1 p-6">
          <div className="mb-4">
            <p className="text-sm text-stone-500">
              Workout for <span className="font-semibold text-stone-900">{clientName}</span> on {new Date(workout.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <h2 className="text-lg font-semibold mt-1">{workout.title}</h2>
          </div>

          <div className="flex items-center gap-6 mb-4 text-xs text-stone-500">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={useMetric} onChange={() => setUseMetric(!useMetric)} className="rounded border-stone-300" />
              USE METRIC?
            </label>
          </div>

          {/* Blocks */}
          <div className="space-y-6">
            {workout.blocks.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-stone-200 rounded-lg">
                <p className="text-stone-400 mb-3">No blocks yet. Add a block to start building.</p>
                <Button size="sm" onClick={() => addBlock.mutate({ workoutId })}>
                  <Plus className="h-4 w-4" /> Add Block
                </Button>
              </div>
            )}

            {workout.blocks.map((block) => (
              <div key={block.id} className="border border-stone-200 rounded-lg overflow-hidden">
                {/* Block header */}
                <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-stone-300" />
                    <h3 className="font-bold text-lg">{block.name}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <select defaultValue={block.blockType} className="text-sm border border-stone-300 rounded px-2 py-1">
                      <option>Normal</option>
                      <option>Superset</option>
                      <option>Circuit</option>
                      <option>EMOM</option>
                      <option>AMRAP</option>
                    </select>
                    <button
                      onClick={() => deleteBlock.mutate({ blockId: block.id })}
                      className="text-stone-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Exercises in block */}
                <div className="divide-y divide-stone-100">
                  {block.exercises.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-stone-400">
                      Search and add exercises from the left panel.
                    </div>
                  )}

                  {block.exercises.map((exercise, exIndex) => (
                    <div key={exercise.id} className="px-4 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full border-2 border-stone-300 flex items-center justify-center text-xs font-medium text-stone-500">
                            {exIndex + 1}
                          </span>
                          <h4 className="text-base font-semibold text-stone-900">{exercise.exercise.name}</h4>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => addSet.mutate({ blockExerciseId: exercise.id })}
                          >
                            + Add a Set
                          </Button>
                          <button className="p-1.5 text-stone-400 hover:text-stone-600"><Play className="h-4 w-4" /></button>
                          <button className="p-1.5 text-stone-400 hover:text-stone-600"><History className="h-4 w-4" /></button>
                          <button className="p-1.5 text-stone-400 hover:text-stone-600"><Star className="h-4 w-4" /></button>
                          <button
                            onClick={() => removeExercise.mutate({ blockExerciseId: exercise.id })}
                            className="p-1.5 text-stone-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Sets */}
                      <div className="space-y-2 ml-10">
                        {exercise.sets.map((set) => (
                          <div key={set.id} className="flex items-center gap-3 text-sm">
                            <span className="text-stone-400 w-14">Set #{set.setNumber}:</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-stone-500">Reps</span>
                              <input type="number" defaultValue={set.reps ?? ""} className="w-14 rounded border border-stone-300 px-2 py-1 text-sm text-center" />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-stone-500">{useMetric ? "kg" : "lbs"}</span>
                              <input type="number" defaultValue={set.weight ?? ""} className="w-14 rounded border border-stone-300 px-2 py-1 text-sm text-center" />
                            </div>
                            {set.time != null && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-stone-500">Time</span>
                                <input type="number" defaultValue={set.time ?? ""} className="w-14 rounded border border-stone-300 px-2 py-1 text-sm text-center" placeholder="sec" />
                              </div>
                            )}
                            {set.distance != null && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-stone-500">{useMetric ? "m" : "mi"}</span>
                                <input type="number" defaultValue={set.distance ?? ""} className="w-14 rounded border border-stone-300 px-2 py-1 text-sm text-center" />
                              </div>
                            )}
                          </div>
                        ))}
                        {exercise.sets.length === 0 && (
                          <p className="text-xs text-stone-400">No sets — click &quot;+ Add a Set&quot;</p>
                        )}
                      </div>

                      {/* Notes + Rest */}
                      <div className="flex items-start gap-4 mt-3 ml-10">
                        <textarea
                          placeholder="Exercise notes..."
                          defaultValue={exercise.notes || ""}
                          className="flex-1 rounded border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 resize-none"
                          rows={2}
                        />
                        <div className="text-xs text-stone-500">
                          <span>Rest: {exercise.restSeconds ? `${Math.floor(exercise.restSeconds / 60)}:${(exercise.restSeconds % 60).toString().padStart(2, "0")}` : "—"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add exercise to this specific block */}
                <div className="px-4 py-3 border-t border-stone-100 bg-stone-50">
                  <ExerciseSearchInBlock
                    blockId={block.id}
                    onAdd={(exerciseId) => handleAddExerciseToBlock(block.id, exerciseId)}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => addBlock.mutate({ workoutId })}
            className="mt-4 text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add Block
          </button>
        </div>
      </div>
    </div>
  );
}

/** Inline exercise search within a block */
function ExerciseSearchInBlock({ blockId, onAdd }: { blockId: string; onAdd: (exerciseId: string) => void }) {
  const [query, setQuery] = useState("");
  const { data: results } = trpc.workouts.searchExercises.useQuery(
    { query, limit: 10 },
    { enabled: query.length >= 2 }
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercise to add..."
        className="w-full rounded border border-stone-300 px-3 py-1.5 text-xs placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-500"
      />
      {query.length >= 2 && results && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((ex) => (
            <button
              key={ex.id}
              onClick={() => { onAdd(ex.id); setQuery(""); }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-stone-50 border-b border-stone-100 last:border-0"
            >
              {ex.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
