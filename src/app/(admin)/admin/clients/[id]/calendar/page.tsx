"use client";

import { use, useState } from "react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, isToday } from "date-fns";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Mock workout data for the calendar
const MOCK_WORKOUTS: Record<string, { id: string; title: string; completed: boolean; blocks: { name: string; exercises: { name: string; sets: string; detail: string }[] }[] }[]> = {
  "2026-04-14": [
    {
      id: "w1", title: "Aerobic", completed: false,
      blocks: [
        { name: "Block A", exercises: [{ name: "Run / Walk / Bike", sets: "1 Sets", detail: "00:00:00" }] },
        { name: "Block B", exercises: [{ name: "Accel Build up", sets: "6 Sets", detail: "0 reps, 01:30 rest" }] },
      ],
    },
  ],
  "2026-04-15": [
    {
      id: "w2", title: "Aerobic", completed: false,
      blocks: [
        { name: "Block A", exercises: [{ name: "Run/Walk", sets: "1 Sets", detail: "00:00:00" }] },
        { name: "Block B", exercises: [{ name: "Aerobic Power Intervals", sets: "4 Sets", detail: "00:04:00, 04:00 rest" }] },
      ],
    },
  ],
  "2026-04-16": [
    {
      id: "w3", title: "Aerobic", completed: false,
      blocks: [
        { name: "Block A", exercises: [{ name: "Run/Walk", sets: "1 Sets", detail: "00:00:00" }] },
      ],
    },
  ],
  "2026-04-17": [
    {
      id: "w4", title: "Aerobic", completed: false,
      blocks: [
        { name: "Block A", exercises: [{ name: "Run/Walk", sets: "1 Sets", detail: "00:00:00" }] },
        { name: "Block B", exercises: [{ name: "Threshold Run", sets: "1 Sets", detail: "0 mi, 00:25:00" }] },
      ],
    },
  ],
  "2026-04-18": [
    {
      id: "w5", title: "Aerobic", completed: false,
      blocks: [
        { name: "Block A", exercises: [{ name: "C2 Bike", sets: "1 Sets", detail: "00:00:00" }] },
        { name: "Block B", exercises: [{ name: "Run/Walk", sets: "1 Sets", detail: "00:00:00" }] },
      ],
    },
  ],
};

const MOCK_CLIENT = { firstName: "Miguel", lastName: "Garza" };

export default function ClientWorkoutCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3, 1)); // April 2026
  const [viewMode, setViewMode] = useState<"month" | "day">("month");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-stone-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={`${MOCK_CLIENT.firstName} ${MOCK_CLIENT.lastName}`} size="sm" />
            <div>
              <h1 className="text-lg font-bold">
                {format(currentMonth, "MMM yyyy")} <span className="font-normal text-stone-600">{MOCK_CLIENT.firstName} {MOCK_CLIENT.lastName}</span>
              </h1>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <Link href={`/admin/clients/${id}`} className="hover:underline">Change Client</Link>
                <span>/</span>
                <Link href={`/admin/clients/${id}`} className="hover:underline">Manage</Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 border border-stone-300 rounded-lg">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-stone-50"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1.5 text-sm font-medium hover:bg-stone-50">Today</button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-stone-50"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="flex border border-stone-300 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode("month")} className={`px-4 py-1.5 text-sm ${viewMode === "month" ? "bg-stone-100 font-medium" : "hover:bg-stone-50"}`}>Month</button>
              <button onClick={() => setViewMode("day")} className={`px-4 py-1.5 text-sm ${viewMode === "day" ? "bg-stone-800 text-white font-medium" : "hover:bg-stone-50"}`}>Day</button>
            </div>
            <button className="p-2 text-stone-400 hover:text-stone-600"><Download className="h-4 w-4" /></button>
            <button className="p-2 text-stone-400 hover:text-stone-600"><Eye className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {/* Day headers */}
        {dayNames.map((day) => (
          <div key={day} className="border-b border-r border-stone-200 px-2 py-2 text-xs font-medium text-stone-500 text-center">
            {day}
          </div>
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const workouts = MOCK_WORKOUTS[dateKey] || [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <div
              key={dateKey}
              className={`border-b border-r border-stone-200 min-h-[140px] ${!inMonth ? "bg-stone-50" : ""}`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between px-2 pt-1">
                <button className="text-stone-400 hover:text-stone-600 text-xs">
                  <Plus className="h-3 w-3" />
                </button>
                <span className={`text-xs ${today ? "bg-stone-900 text-white rounded-full w-5 h-5 flex items-center justify-center" : inMonth ? "text-stone-600" : "text-stone-300"}`}>
                  {format(day, "d")}
                </span>
                {workouts.length > 0 && (
                  <button className="text-stone-400 hover:text-stone-600 text-xs">⋮</button>
                )}
                {workouts.length === 0 && <span className="w-3" />}
              </div>

              {/* Workouts */}
              <div className="px-1 pb-1 space-y-1">
                {workouts.map((workout) => (
                  <Link
                    key={workout.id}
                    href={`/admin/clients/${id}/calendar/workout/${workout.id}`}
                    className="block"
                  >
                    <div className={`rounded p-1.5 text-xs ${workout.completed ? "bg-emerald-50 border border-emerald-200" : "bg-stone-50 border border-stone-200"} hover:border-stone-400 transition-colors cursor-pointer`}>
                      {/* Status + Title */}
                      <div className="flex items-center gap-1 mb-1">
                        <span className={`w-2 h-2 rounded-full ${workout.completed ? "bg-emerald-500" : "border border-stone-400"}`} />
                        <span className={`font-medium ${workout.completed ? "text-emerald-700" : "text-stone-700"}`}>
                          {workout.title}
                        </span>
                      </div>

                      {/* Blocks + Exercises */}
                      {workout.blocks.map((block, bi) => (
                        <div key={bi} className="mt-0.5">
                          <p className="font-semibold text-stone-600 text-[10px]">{block.name}</p>
                          {block.exercises.map((ex, ei) => (
                            <div key={ei} className="ml-1 text-[10px] text-stone-500">
                              <span className="text-stone-400">{String.fromCharCode(65 + bi)}{ei + 1}</span>{" "}
                              <span>{ex.name}</span>
                              <p className="ml-3 text-stone-400">{ex.sets}, {ex.detail}</p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
