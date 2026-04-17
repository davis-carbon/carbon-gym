"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { ChevronRight, Check, Loader2 } from "lucide-react";

export default function ClientWorkoutsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: workouts, isLoading } = trpc.portal.workouts.useQuery();

  const completeWorkout = trpc.portal.completeWorkout.useMutation({
    onSuccess: () => { toast("success", "Workout completed!"); utils.portal.workouts.invalidate(); utils.portal.dashboard.invalidate(); },
    onError: (err) => toast("error", err.message),
  });

  // Split into today, upcoming, past
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysWorkouts = (workouts ?? []).filter((w) => {
    const d = new Date(w.date);
    return d >= today && d < tomorrow;
  });
  const upcomingWorkouts = (workouts ?? []).filter((w) => new Date(w.date) >= tomorrow);
  const recentWorkouts = (workouts ?? []).filter((w) => new Date(w.date) < today).slice(0, 10);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Workouts</h2>

      {/* Today's workout */}
      {todaysWorkouts.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-stone-700">Today</h3>
          {todaysWorkouts.map((w) => {
            const totalExercises = w.blocks.reduce((acc, b) => acc + b.exercises.length, 0);
            return (
              <Card key={w.id}>
                <CardHeader>
                  <div>
                    <CardTitle>{w.title}</CardTitle>
                    <p className="text-xs text-stone-500 mt-0.5">{totalExercises} exercises across {w.blocks.length} blocks</p>
                  </div>
                  {w.isCompleted ? <Badge variant="success">Completed</Badge> : <Badge variant="info">Ready</Badge>}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {w.blocks.map((block) => (
                      <div key={block.id} className="border-l-2 border-stone-200 pl-3">
                        <p className="text-xs font-semibold text-stone-600">{block.name}</p>
                        {block.exercises.map((ex, ei) => (
                          <div key={ex.id} className="flex justify-between items-center py-0.5 text-sm">
                            <span className="text-stone-900">{ei + 1}. {ex.exercise.name}</span>
                            <span className="text-xs text-stone-500">{ex.sets.length} sets</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  {!w.isCompleted && (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => completeWorkout.mutate({ workoutId: w.id })}
                      disabled={completeWorkout.isPending}
                    >
                      <Check className="h-4 w-4" /> {completeWorkout.isPending ? "Completing..." : "Mark Complete"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {/* Upcoming */}
      {upcomingWorkouts.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-stone-700 mt-6">Upcoming</h3>
          <div className="space-y-2">
            {upcomingWorkouts.slice(0, 5).map((w) => {
              const totalExercises = w.blocks.reduce((acc, b) => acc + b.exercises.length, 0);
              return (
                <Card key={w.id}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{w.title}</p>
                        <p className="text-xs text-stone-500">
                          {new Date(w.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {totalExercises} exercises
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-stone-400" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Recent */}
      {recentWorkouts.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-stone-700 mt-6">Recent</h3>
          <div className="space-y-2">
            {recentWorkouts.map((w) => (
              <Card key={w.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-stone-900">{w.title}</p>
                      <p className="text-xs text-stone-500">{new Date(w.date).toLocaleDateString()}</p>
                    </div>
                    {w.isCompleted && <Badge variant="success">Done</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {(workouts ?? []).length === 0 && (
        <p className="text-center text-sm text-stone-400 py-8">No workouts assigned yet.</p>
      )}
    </div>
  );
}
