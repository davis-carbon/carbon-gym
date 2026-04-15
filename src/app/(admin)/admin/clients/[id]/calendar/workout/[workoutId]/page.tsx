"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, GripVertical, Play, History, Star, Pill, ChevronUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ExerciseSet {
  id: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  time: string | null; // "00:00:00"
  distance: number | null;
  calories: number | null;
}

interface BlockExercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
  notes: string;
  restMM: string;
  restSS: string;
  overrideCalories: number | null;
  showReps: boolean;
  showWeight: boolean;
  showTime: boolean;
  showDistance: boolean;
}

interface WorkoutBlock {
  id: string;
  name: string;
  blockType: string;
  exercises: BlockExercise[];
}

// Initial mock workout
const initialBlocks: WorkoutBlock[] = [
  {
    id: "b1",
    name: "Block A",
    blockType: "Normal",
    exercises: [
      {
        id: "e1", name: "Run / Walk / Bike",
        sets: [{ id: "s1", setNumber: 1, reps: null, weight: null, time: "00:00:00", distance: null, calories: 350 }],
        notes: "", restMM: "", restSS: "", overrideCalories: null,
        showReps: false, showWeight: false, showTime: true, showDistance: false,
      },
    ],
  },
  {
    id: "b2",
    name: "Block B",
    blockType: "Normal",
    exercises: [
      {
        id: "e2", name: "Accel Build up",
        sets: [
          { id: "s2", setNumber: 1, reps: 0, weight: null, time: null, distance: 50, calories: null },
          { id: "s3", setNumber: 2, reps: 0, weight: null, time: null, distance: 50, calories: null },
          { id: "s4", setNumber: 3, reps: 0, weight: null, time: null, distance: 50, calories: null },
          { id: "s5", setNumber: 4, reps: 0, weight: null, time: null, distance: 50, calories: null },
          { id: "s6", setNumber: 5, reps: 0, weight: null, time: null, distance: 50, calories: null },
          { id: "s7", setNumber: 6, reps: 0, weight: null, time: null, distance: 50, calories: null },
        ],
        notes: "", restMM: "01", restSS: "30", overrideCalories: null,
        showReps: true, showWeight: false, showTime: false, showDistance: true,
      },
    ],
  },
];

export default function WorkoutEditorPage({ params }: { params: Promise<{ id: string; workoutId: string }> }) {
  const { id, workoutId } = use(params);
  const [blocks, setBlocks] = useState<WorkoutBlock[]>(initialBlocks);
  const [title, setTitle] = useState("Aerobic");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [useMetric, setUseMetric] = useState(false);
  const [autofillEmpty, setAutofillEmpty] = useState(false);

  function addBlock() {
    const letter = String.fromCharCode(65 + blocks.length);
    setBlocks([...blocks, {
      id: crypto.randomUUID(),
      name: `Block ${letter}`,
      blockType: "Normal",
      exercises: [],
    }]);
  }

  function deleteBlock(blockId: string) {
    setBlocks(blocks.filter(b => b.id !== blockId));
  }

  function addSet(blockId: string, exerciseId: string) {
    setBlocks(blocks.map(b => {
      if (b.id !== blockId) return b;
      return {
        ...b,
        exercises: b.exercises.map(e => {
          if (e.id !== exerciseId) return e;
          return {
            ...e,
            sets: [...e.sets, {
              id: crypto.randomUUID(),
              setNumber: e.sets.length + 1,
              reps: e.showReps ? 0 : null,
              weight: e.showWeight ? 0 : null,
              time: e.showTime ? "00:00:00" : null,
              distance: e.showDistance ? 0 : null,
              calories: null,
            }],
          };
        }),
      };
    }));
  }

  function toggleSetField(blockId: string, exerciseId: string, field: "showReps" | "showWeight" | "showTime" | "showDistance") {
    setBlocks(blocks.map(b => {
      if (b.id !== blockId) return b;
      return {
        ...b,
        exercises: b.exercises.map(e => {
          if (e.id !== exerciseId) return e;
          return { ...e, [field]: !e[field] };
        }),
      };
    }));
  }

  // Calculate totals
  const totalSets = blocks.reduce((acc, b) => acc + b.exercises.reduce((a, e) => a + e.sets.length, 0), 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Stats bar */}
      <div className="bg-stone-900 text-white px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-medium">This workout</span>
        <div className="flex items-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-stone-400">⏱</span>
            <span className="text-2xl font-light">00:00:00</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-400">🏋️</span>
            <span className="text-2xl font-light">0</span>
            <span className="text-stone-400">lbs</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-400">🏃</span>
            <span className="text-2xl font-light">0</span>
            <span className="text-stone-400">mi</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-400">#</span>
            <span className="text-2xl font-light">0</span>
            <span className="text-stone-400">reps</span>
          </div>
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
            <p className="text-sm font-semibold">{title}</p>
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
          </div>

          <button
            onClick={addBlock}
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
              No favorited exercises, yet. After adding a(n) exercise to a workout, you can click the star icon to add it as a favorite.
            </p>
          </div>

          {/* Recent Exercises */}
          <div>
            <p className="text-sm font-semibold">Recent Exercises</p>
            <div className="mt-2 space-y-1 text-xs text-stone-600">
              <p className="cursor-pointer hover:text-stone-900">Run / Walk / Bike</p>
              <p className="cursor-pointer hover:text-stone-900">Accel Build up</p>
              <p className="cursor-pointer hover:text-stone-900">Aerobic Power Intervals</p>
              <p className="cursor-pointer hover:text-stone-900">Threshold Run</p>
              <p className="cursor-pointer hover:text-stone-900">C2 Bike</p>
            </div>
          </div>
        </div>

        {/* Right panel — Workout Builder */}
        <div className="flex-1 p-6">
          {/* Workout header */}
          <div className="mb-4">
            <p className="text-sm text-stone-500">
              Workout for <span className="font-semibold text-stone-900">Miguel Garza</span> on Monday, Mar 30 2:44pm
            </p>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button className="text-xs text-stone-400 hover:text-stone-600">edit</button>
            </div>
          </div>

          {/* Metric / Autofill toggles */}
          <div className="flex items-center gap-6 mb-4 text-xs text-stone-500">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={useMetric} onChange={() => setUseMetric(!useMetric)} className="rounded border-stone-300" />
              USE METRIC?
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={autofillEmpty} onChange={() => setAutofillEmpty(!autofillEmpty)} className="rounded border-stone-300" />
              AUTOFILL EMPTY?
            </label>
          </div>

          {/* Blocks */}
          <div className="space-y-6">
            {blocks.map((block, blockIndex) => (
              <div key={block.id} className="border border-stone-200 rounded-lg overflow-hidden">
                {/* Block header */}
                <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-stone-300 cursor-grab" />
                    <h3 className="font-bold text-lg">{block.name}</h3>
                    <button className="text-xs text-stone-400 hover:text-stone-600">edit</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-stone-400">▼ next block</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500">Type</span>
                      <select
                        value={block.blockType}
                        onChange={() => {}}
                        className="text-sm border border-stone-300 rounded px-2 py-1"
                      >
                        <option>Normal</option>
                        <option>Superset</option>
                        <option>Circuit</option>
                        <option>EMOM</option>
                        <option>AMRAP</option>
                      </select>
                    </div>
                    <button onClick={() => deleteBlock(block.id)} className="text-stone-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Exercises in block */}
                <div className="divide-y divide-stone-100">
                  {block.exercises.map((exercise, exIndex) => (
                    <div key={exercise.id} className="px-4 py-4">
                      {/* Exercise header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-stone-300 cursor-grab" />
                          <span className="w-7 h-7 rounded-full border-2 border-stone-300 flex items-center justify-center text-xs font-medium text-stone-500">
                            {exIndex + 1}
                          </span>
                          <h4 className="text-base font-semibold text-stone-900">{exercise.name}</h4>
                          <button className="text-xs text-stone-400 hover:text-stone-600">swap</button>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="secondary" size="sm" onClick={() => addSet(block.id, exercise.id)}>
                            + Add a Set
                          </Button>
                          <button className="p-1.5 text-stone-400 hover:text-stone-600"><Play className="h-4 w-4" /></button>
                          <button className="p-1.5 text-stone-400 hover:text-stone-600"><History className="h-4 w-4" /></button>
                          <button className="p-1.5 text-stone-400 hover:text-stone-600"><Star className="h-4 w-4" /></button>
                          <button className="p-1.5 text-stone-400 hover:text-stone-600"><Pill className="h-4 w-4" /></button>
                          <button className="p-1.5 text-stone-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                          <button className="p-1.5 text-stone-400 hover:text-stone-600"><ChevronUp className="h-4 w-4" /></button>
                        </div>
                      </div>

                      {/* Sets */}
                      <div className="space-y-2 ml-10">
                        {exercise.sets.map((set) => (
                          <div key={set.id} className="flex items-center gap-3 text-sm">
                            <span className="text-stone-400 w-14">Set #{set.setNumber}:</span>

                            {exercise.showReps && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-stone-500">Reps</span>
                                <input
                                  type="number"
                                  value={set.reps ?? ""}
                                  className="w-14 rounded border border-stone-300 px-2 py-1 text-sm text-center"
                                  readOnly
                                />
                              </div>
                            )}

                            {exercise.showWeight && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-stone-500">Weight</span>
                                <input
                                  type="number"
                                  value={set.weight ?? ""}
                                  className="w-14 rounded border border-stone-300 px-2 py-1 text-sm text-center"
                                  readOnly
                                />
                              </div>
                            )}

                            {exercise.showTime && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-stone-500">Time</span>
                                <div className="flex items-center gap-0.5">
                                  <input type="text" value="00" className="w-8 rounded border border-stone-300 px-1 py-1 text-sm text-center" readOnly />
                                  <span>:</span>
                                  <input type="text" value="00" className="w-8 rounded border border-stone-300 px-1 py-1 text-sm text-center" readOnly />
                                  <span>:</span>
                                  <input type="text" value="00" className="w-8 rounded border border-stone-300 px-1 py-1 text-sm text-center" readOnly />
                                </div>
                              </div>
                            )}

                            {exercise.showDistance && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-stone-500">Meters</span>
                                <input
                                  type="number"
                                  value={set.distance ?? ""}
                                  className="w-14 rounded border border-stone-300 px-2 py-1 text-sm text-center"
                                  readOnly
                                />
                              </div>
                            )}

                            {set.calories != null && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-stone-500">Calories</span>
                                <input
                                  type="number"
                                  value={set.calories}
                                  className="w-14 rounded border border-stone-300 px-2 py-1 text-sm text-center"
                                  readOnly
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Set field toggles */}
                      <div className="flex items-center gap-4 mt-2 ml-10 text-xs text-stone-400">
                        <button
                          onClick={() => toggleSetField(block.id, exercise.id, "showReps")}
                          className="hover:text-stone-600"
                        >
                          {exercise.showReps ? "- remove reps" : "+ add reps"}
                        </button>
                        <button
                          onClick={() => toggleSetField(block.id, exercise.id, "showWeight")}
                          className="hover:text-stone-600"
                        >
                          {exercise.showWeight ? "- remove weight" : "+ add weight"}
                        </button>
                        <button
                          onClick={() => toggleSetField(block.id, exercise.id, "showTime")}
                          className="hover:text-stone-600"
                        >
                          {exercise.showTime ? "- remove time" : "+ add time"}
                        </button>
                        <button
                          onClick={() => toggleSetField(block.id, exercise.id, "showDistance")}
                          className="hover:text-stone-600"
                        >
                          {exercise.showDistance ? "- remove distance" : "+ add distance"}
                        </button>
                      </div>

                      {/* Exercise notes + rest */}
                      <div className="flex items-start gap-4 mt-3 ml-10">
                        <textarea
                          placeholder="Add Exercise Notes"
                          value={exercise.notes}
                          className="flex-1 rounded border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 resize-none"
                          rows={2}
                          readOnly
                        />
                        <div className="space-y-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-stone-500">Rest</span>
                            <input type="text" value={exercise.restMM} placeholder="MM" className="w-10 rounded border border-stone-300 px-1 py-1 text-sm text-center" readOnly />
                            <span>:</span>
                            <input type="text" value={exercise.restSS} placeholder="SS" className="w-10 rounded border border-stone-300 px-1 py-1 text-sm text-center" readOnly />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-stone-500 whitespace-nowrap">Override Calories Burned</span>
                            <input type="number" value={exercise.overrideCalories ?? ""} className="w-14 rounded border border-stone-300 px-1 py-1 text-sm text-center" readOnly />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Add Block button at bottom */}
          <button
            onClick={addBlock}
            className="mt-4 text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add Block
          </button>
        </div>
      </div>
    </div>
  );
}
