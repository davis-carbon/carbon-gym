"use client";

import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Settings } from "lucide-react";
import { DayCalendar } from "@/components/admin/schedule/day-calendar";

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">
            {format(currentDate, "EEE, MMMM d, yyyy")}
          </h1>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-stone-300 rounded-lg">
            <button
              onClick={() => setCurrentDate(subDays(currentDate, 1))}
              className="p-2 hover:bg-stone-50 rounded-l-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
              className="p-2 hover:bg-stone-50 rounded-r-lg border-l border-stone-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4" /> Book Appointment
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <DayCalendar date={currentDate} />
    </div>
  );
}
