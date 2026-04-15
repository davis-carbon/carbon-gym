"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Download, Eye, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

export default function ClientWorkoutCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "day">("month");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Fetch client info
  const { data: client } = trpc.clients.byId.useQuery({ id });

  // Fetch workouts for the visible date range
  const { data: workouts, isLoading } = trpc.workouts.listByClientAndDateRange.useQuery({
    clientId: id,
    startDate: calendarStart,
    endDate: calendarEnd,
  });

  // Create workout mutation
  const utils = trpc.useUtils();
  const createWorkout = trpc.workouts.create.useMutation({
    onSuccess: () => {
      utils.workouts.listByClientAndDateRange.invalidate();
      toast("success", "Workout created");
    },
    onError: (err) => toast("error", err.message),
  });

  // Group workouts by date key
  const workoutsByDate = useMemo(() => {
    const map: Record<string, typeof workouts> = {};
    for (const w of workouts ?? []) {
      const key = format(new Date(w.date), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key]!.push(w);
    }
    return map;
  }, [workouts]);

  const clientName = client ? `${client.firstName} ${client.lastName}` : "Loading...";

  function handleAddWorkout(date: Date) {
    createWorkout.mutate({
      clientId: id,
      title: "Workout",
      date,
    });
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-stone-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={clientName} size="sm" />
            <div>
              <h1 className="text-lg font-bold">
                {format(currentMonth, "MMM yyyy")} <span className="font-normal text-stone-600">{clientName}</span>
              </h1>
              <div className="flex items-center gap-2 text-xs text-stone-500">
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

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          <span className="ml-2 text-sm text-stone-500">Loading workouts...</span>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {dayNames.map((day) => (
          <div key={day} className="border-b border-r border-stone-200 px-2 py-2 text-xs font-medium text-stone-500 text-center">
            {day}
          </div>
        ))}

        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayWorkouts = workoutsByDate[dateKey] || [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <div
              key={dateKey}
              className={`border-b border-r border-stone-200 min-h-[140px] ${!inMonth ? "bg-stone-50" : ""}`}
            >
              <div className="flex items-center justify-between px-2 pt-1">
                <button
                  onClick={() => handleAddWorkout(day)}
                  className="text-stone-400 hover:text-stone-600 text-xs"
                  title="Add workout"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <span className={`text-xs ${today ? "bg-stone-900 text-white rounded-full w-5 h-5 flex items-center justify-center" : inMonth ? "text-stone-600" : "text-stone-300"}`}>
                  {format(day, "d")}
                </span>
                <span className="w-3" />
              </div>

              <div className="px-1 pb-1 space-y-1">
                {dayWorkouts.map((workout) => (
                  <Link
                    key={workout.id}
                    href={`/admin/clients/${id}/calendar/workout/${workout.id}`}
                    className="block"
                  >
                    <div className={`rounded p-1.5 text-xs ${workout.isCompleted ? "bg-emerald-50 border border-emerald-200" : "bg-stone-50 border border-stone-200"} hover:border-stone-400 transition-colors cursor-pointer`}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className={`w-2 h-2 rounded-full ${workout.isCompleted ? "bg-emerald-500" : "border border-stone-400"}`} />
                        <span className={`font-medium ${workout.isCompleted ? "text-emerald-700" : "text-stone-700"}`}>
                          {workout.title}
                        </span>
                      </div>

                      {workout.blocks.map((block) => (
                        <div key={block.id} className="mt-0.5">
                          <p className="font-semibold text-stone-600 text-[10px]">{block.name}</p>
                          {block.exercises.map((ex, ei) => (
                            <div key={ex.id} className="ml-1 text-[10px] text-stone-500">
                              <span className="text-stone-400">{block.name.replace("Block ", "")}{ei + 1}</span>{" "}
                              <span>{ex.exercise.name}</span>
                              <p className="ml-3 text-stone-400">{ex.sets.length} Sets</p>
                            </div>
                          ))}
                        </div>
                      ))}

                      {workout.blocks.length === 0 && (
                        <p className="text-[10px] text-stone-400 italic">Empty — click to add exercises</p>
                      )}
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
