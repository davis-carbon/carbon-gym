"use client";

import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Settings, Loader2, X } from "lucide-react";
import { DayCalendar } from "@/components/admin/schedule/day-calendar";
import { BookAppointmentModal } from "@/components/admin/schedule/book-appointment-modal";
import { trpc } from "@/trpc/client";

// ── Admin Reschedule Modal ─────────────────────────────────────────────────
interface AdminRescheduleModalProps {
  apptId: string;
  appointments: Array<{
    id: string;
    scheduledAt: Date;
    endAt: Date;
    service: { name: string; durationMinutes: number };
    client: { firstName: string; lastName: string };
  }>;
  onClose: () => void;
  onSuccess: () => void;
}

function AdminRescheduleModal({ apptId, appointments, onClose, onSuccess }: AdminRescheduleModalProps) {
  const utils = trpc.useUtils();
  const reschedule = trpc.schedule.appointments.reschedule.useMutation({
    onSuccess: () => {
      utils.schedule.appointments.listByDate.invalidate();
      onSuccess();
      onClose();
    },
  });

  const appt = appointments.find((a) => a.id === apptId);
  if (!appt) return null;

  const duration = appt.service.durationMinutes ?? 60;
  const [dateStr, setDateStr] = useState(() => new Date(appt.scheduledAt).toISOString().slice(0, 10));
  const [timeStr, setTimeStr] = useState(() => new Date(appt.scheduledAt).toTimeString().slice(0, 5));

  const handleSubmit = () => {
    const scheduledAt = new Date(`${dateStr}T${timeStr}`);
    const endAt = new Date(scheduledAt.getTime() + duration * 60 * 1000);
    reschedule.mutate({ id: apptId, scheduledAt, endAt });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-900">Edit Appointment Time</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm text-stone-600 mb-4">
          {appt.service.name} — {appt.client.firstName} {appt.client.lastName}
        </p>

        {reschedule.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
            {reschedule.error.message}
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Date</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Time</label>
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <p className="text-xs text-stone-500">Duration: {duration} minutes</p>
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={reschedule.isPending || !dateStr || !timeStr}>
            {reschedule.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Schedule Page ──────────────────────────────────────────────────────────
export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBookModal, setShowBookModal] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

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
          onAppointmentClick={(id) => setReschedulingId(id)}
        />
      )}

      <BookAppointmentModal
        open={showBookModal}
        onClose={() => setShowBookModal(false)}
        defaultDate={currentDate.toISOString().split("T")[0]}
      />

      {reschedulingId && (
        <AdminRescheduleModal
          apptId={reschedulingId}
          appointments={appointments ?? []}
          onClose={() => setReschedulingId(null)}
          onSuccess={() => setReschedulingId(null)}
        />
      )}
    </div>
  );
}
