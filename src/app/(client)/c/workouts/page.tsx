"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";

const MOCK_TODAY_WORKOUT = {
  name: "Upper Body A",
  exercises: [
    { name: "Bench Press", sets: "4x8", weight: "155 lbs" },
    { name: "Dumbbell Rows", sets: "4x10", weight: "60 lbs" },
    { name: "Overhead Press", sets: "3x8", weight: "95 lbs" },
    { name: "Face Pulls", sets: "3x15", weight: "30 lbs" },
    { name: "Bicep Curls", sets: "3x12", weight: "30 lbs" },
  ],
};

const MOCK_RECENT_LOGS = [
  { id: "1", date: "Apr 12", name: "Lower Body A", exercises: 6, duration: "55 min" },
  { id: "2", date: "Apr 10", name: "Upper Body B", exercises: 5, duration: "48 min" },
  { id: "3", date: "Apr 7", name: "Lower Body B", exercises: 7, duration: "60 min" },
];

export default function ClientWorkoutsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Workouts</h2>
        <Button size="sm"><Plus className="h-4 w-4" /> Log Workout</Button>
      </div>

      {/* Today's workout */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{MOCK_TODAY_WORKOUT.name}</CardTitle>
            <p className="text-xs text-stone-500 mt-0.5">Today&apos;s workout</p>
          </div>
          <Badge variant="info">5 exercises</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {MOCK_TODAY_WORKOUT.exercises.map((ex, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-stone-100 last:border-0">
                <span className="text-stone-900">{ex.name}</span>
                <div className="flex items-center gap-3 text-stone-500">
                  <span>{ex.sets}</span>
                  <span>{ex.weight}</span>
                </div>
              </div>
            ))}
          </div>
          <Button variant="primary" className="w-full mt-4">
            Start Workout
          </Button>
        </CardContent>
      </Card>

      {/* Recent logs */}
      <h3 className="text-sm font-semibold text-stone-700">Recent</h3>
      <div className="space-y-2">
        {MOCK_RECENT_LOGS.map((log) => (
          <Card key={log.id}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-stone-900">{log.name}</p>
                  <p className="text-xs text-stone-500">{log.date} &middot; {log.exercises} exercises &middot; {log.duration}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
