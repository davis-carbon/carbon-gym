"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";

const MOCK_UPCOMING = [
  { id: "1", service: "1-on-1", staff: "Mada Hauck", date: "Tue, Apr 15", time: "8:30 AM", status: "CONFIRMED" },
  { id: "2", service: "1-on-1", staff: "Mada Hauck", date: "Thu, Apr 17", time: "8:30 AM", status: "RESERVED" },
  { id: "3", service: "Semi-Private Training", staff: "Madeline Gladu", date: "Fri, Apr 18", time: "8:30 AM", status: "RESERVED" },
  { id: "4", service: "1-on-1", staff: "Mada Hauck", date: "Tue, Apr 22", time: "8:30 AM", status: "RESERVED" },
];

const statusVariant: Record<string, "success" | "info"> = {
  CONFIRMED: "success",
  RESERVED: "info",
};

export default function ClientSchedulePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">My Schedule</h2>
        <Button size="sm"><Plus className="h-4 w-4" /> Book</Button>
      </div>

      <div className="space-y-2">
        {MOCK_UPCOMING.map((appt) => (
          <Card key={appt.id}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-stone-100 p-2 mt-0.5">
                  <Calendar className="h-4 w-4 text-stone-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-stone-900">{appt.service}</p>
                  <p className="text-xs text-stone-500">with {appt.staff}</p>
                  <p className="text-xs text-stone-600 mt-1">{appt.date} at {appt.time}</p>
                </div>
                <Badge variant={statusVariant[appt.status] ?? "info"}>
                  {appt.status.charAt(0) + appt.status.slice(1).toLowerCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
