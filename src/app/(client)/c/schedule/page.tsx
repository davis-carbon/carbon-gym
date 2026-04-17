"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/trpc/client";
import { Calendar, Loader2 } from "lucide-react";

const statusVariant: Record<string, "success" | "info" | "outline" | "warning" | "danger"> = {
  CONFIRMED: "success",
  RESERVED: "info",
  COMPLETED: "outline",
  CANCELLED: "danger",
  NO_SHOW: "warning",
};

export default function ClientSchedulePage() {
  const { data: appointments, isLoading } = trpc.portal.appointments.useQuery();

  const now = new Date();
  const upcoming = (appointments ?? []).filter((a) => new Date(a.scheduledAt) >= now);
  const past = (appointments ?? []).filter((a) => new Date(a.scheduledAt) < now);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">My Schedule</h2>

      {upcoming.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-stone-700">Upcoming</h3>
          <div className="space-y-2">
            {upcoming.map((appt) => (
              <Card key={appt.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-stone-100 p-2 mt-0.5">
                      <Calendar className="h-4 w-4 text-stone-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-stone-900">{appt.service.name}</p>
                      <p className="text-xs text-stone-500">with {appt.staff.firstName} {appt.staff.lastName}</p>
                      <p className="text-xs text-stone-600 mt-1">
                        {new Date(appt.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        {" at "}
                        {new Date(appt.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                    <Badge variant={statusVariant[appt.status] ?? "info"}>
                      {appt.status.charAt(0) + appt.status.slice(1).toLowerCase().replace("_", " ")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-stone-700 mt-6">Past Visits</h3>
          <div className="space-y-2">
            {past.slice(0, 10).map((appt) => (
              <Card key={appt.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-stone-100 p-2 mt-0.5">
                      <Calendar className="h-4 w-4 text-stone-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-stone-900">{appt.service.name}</p>
                      <p className="text-xs text-stone-500">
                        {new Date(appt.scheduledAt).toLocaleDateString()} · {appt.staff.firstName} {appt.staff.lastName}
                      </p>
                    </div>
                    <Badge variant={statusVariant[appt.status] ?? "outline"}>
                      {appt.status.charAt(0) + appt.status.slice(1).toLowerCase().replace("_", " ")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {appointments?.length === 0 && (
        <p className="text-center text-sm text-stone-400 py-8">No appointments scheduled.</p>
      )}
    </div>
  );
}
