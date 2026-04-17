"use client";

import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Settings, Loader2 } from "lucide-react";
import { DayCalendar } from "@/components/admin/schedule/day-calendar";
import { BookAppointmentModal } from "@/components/admin/schedule/book-appointment-modal";
import { trpc } from "@/trpc/client";

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBookModal, setShowBookModal] = useState(false);

  // Fetch staff and appointments for the selected date
  const { data: staff } = trpc.staff.list.useQuery();
  const { data: appointments, isLoading } = trpc.schedule.appointments.listByDate.useQuery({
    date: currentDate,
  });

  // Transform staff for calendar columns (only active trainers)
  const staffColumns = (staff ?? [])
    .filter((s) => s.isActive && s.role !== "OWNER")
    .concat((staff ?? []).filter((s) => s.isActive && s.role === "OWNER"))
    .slice(0, 6)
    .map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      color: s.color,
    }));

  // Transform appointments for calendar
  const calendarAppointments = (appointments ?? []).map((a) => {
    const start = new Date(a.scheduledAt);
    const end = new Date(a.endAt);
    const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
    return {
      id: a.id,
      clientName: `${a.client.firstName} ${a.client.lastName}`,
      service: a.service.name,
      staffId: a.staffId,
      startHour: start.getHours(),
      startMin: start.getMinutes(),
      durationMin,
      color: a.service.color || null,
      status: a.status,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{format(currentDate, "EEE, MMMM d, yyyy")}</h1>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-stone-300 rounded-lg">
            <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-2 hover:bg-stone-50 rounded-l-lg"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 hover:bg-stone-50 rounded-r-lg border-l border-stone-300"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <Button size="sm" onClick={() => setShowBookModal(true)}><Plus className="h-4 w-4" /> Book Appointment</Button>
          <Button variant="ghost" size="sm"><Settings className="h-4 w-4" /></Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          <span className="ml-2 text-sm text-stone-500">Loading schedule...</span>
        </div>
      ) : (
        <DayCalendar
          date={currentDate}
          staff={staffColumns.length > 0 ? staffColumns : undefined}
          appointments={calendarAppointments.length > 0 || staffColumns.length > 0 ? calendarAppointments : undefined}
        />
      )}

      <BookAppointmentModal
        open={showBookModal}
        onClose={() => setShowBookModal(false)}
        defaultDate={currentDate.toISOString().split("T")[0]}
      />
    </div>
  );
}
