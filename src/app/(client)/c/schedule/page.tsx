"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { Calendar, Clock, Loader2, Plus, X } from "lucide-react";

const statusVariant: Record<string, "success" | "info" | "outline" | "warning" | "danger"> = {
  CONFIRMED: "success",
  RESERVED: "info",
  COMPLETED: "outline",
  CANCELLED: "danger",
  NO_SHOW: "warning",
  LATE_CANCEL: "warning",
  EARLY_CANCEL: "warning",
};

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(d: string | Date) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ── Reschedule Modal ───────────────────────────────────────────────────────────

interface RescheduleModalProps {
  appt: { id: string; scheduledAt: string | Date; endAt?: string | Date | null; service: { name: string; durationMinutes: number }; staff: { firstName: string; lastName: string } };
  onClose: () => void;
  onSuccess: () => void;
}

function RescheduleModal({ appt, onClose, onSuccess }: RescheduleModalProps) {
  const utils = trpc.useUtils();
  const reschedule = trpc.portal.rescheduleAppointment.useMutation({
    onSuccess: () => { utils.portal.appointments.invalidate(); onSuccess(); onClose(); },
  });

  const duration = appt.service.durationMinutes ?? 60;
  const [dateStr, setDateStr] = useState(() => {
    const d = new Date(appt.scheduledAt);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(appt.scheduledAt);
    return d.toTimeString().slice(0, 5);
  });

  const handleSubmit = () => {
    const scheduledAt = new Date(`${dateStr}T${timeStr}`);
    const endAt = new Date(scheduledAt.getTime() + duration * 60 * 1000);
    reschedule.mutate({ id: appt.id, scheduledAt, endAt });
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-900">Reschedule Appointment</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm text-stone-600 mb-4">
          {appt.service.name} with {appt.staff.firstName} {appt.staff.lastName}
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
              min={minDate}
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
            {reschedule.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reschedule"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Book Appointment Modal ─────────────────────────────────────────────────────

function BookModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const utils = trpc.useUtils();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);

  const [dateStr, setDateStr] = useState(defaultDate);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState(""); // "" = any available
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedSlotStaffId, setSelectedSlotStaffId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const { data: services, isLoading: servicesLoading } = trpc.portal.services.useQuery();
  const { data: slots, isLoading: slotsLoading } = trpc.portal.availableSlots.useQuery(
    { date: dateStr, staffId: staffId || undefined },
    { enabled: !!dateStr },
  );

  const book = trpc.portal.bookAppointment.useMutation({
    onSuccess: () => {
      utils.portal.appointments.invalidate();
      setSuccessMsg("Appointment booked!");
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    },
  });

  const minDate = tomorrow.toISOString().slice(0, 10);

  const handleBook = () => {
    if (!selectedSlot || !serviceId || !selectedSlotStaffId) return;
    book.mutate({ staffId: selectedSlotStaffId, serviceId, scheduledAt: selectedSlot });
  };

  // Reset slot when date/staff changes
  const handleDateChange = (v: string) => { setDateStr(v); setSelectedSlot(null); setSelectedSlotStaffId(null); };
  const handleStaffChange = (v: string) => { setStaffId(v); setSelectedSlot(null); setSelectedSlotStaffId(null); };

  // Unique staff from slots (for "any available" view labels)
  const slotsByStaff = new Map<string, { name: string; slots: typeof slots }>();
  for (const s of slots ?? []) {
    if (!slotsByStaff.has(s.staffId)) slotsByStaff.set(s.staffId, { name: s.staffName, slots: [] });
    slotsByStaff.get(s.staffId)!.slots!.push(s);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-900">Book Appointment</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="h-4 w-4" /></button>
        </div>

        {successMsg ? (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-3 text-center">{successMsg}</p>
        ) : (
          <>
            {book.error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                {book.error.message}
              </p>
            )}

            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="text-xs font-medium text-stone-700 block mb-1">Date</label>
                <input
                  type="date"
                  min={minDate}
                  value={dateStr}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>

              {/* Service */}
              <div>
                <label className="text-xs font-medium text-stone-700 block mb-1">Service</label>
                {servicesLoading ? (
                  <div className="flex items-center gap-2 text-stone-400 text-sm py-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>
                ) : (
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
                  >
                    <option value="">Select a service…</option>
                    {(services ?? []).map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min)</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Staff */}
              <div>
                <label className="text-xs font-medium text-stone-700 block mb-1">Trainer (optional)</label>
                <select
                  value={staffId}
                  onChange={(e) => handleStaffChange(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
                >
                  <option value="">Any available</option>
                  {Array.from(
                    new Map((slots ?? []).map((s) => [s.staffId, s.staffName])).entries()
                  ).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Available slots */}
              <div>
                <label className="text-xs font-medium text-stone-700 block mb-2">Available Times</label>
                {slotsLoading ? (
                  <div className="flex items-center gap-2 text-stone-400 text-sm py-2"><Loader2 className="h-3 w-3 animate-spin" /> Checking availability…</div>
                ) : (slots ?? []).length === 0 ? (
                  <p className="text-sm text-stone-400 py-2">No available slots for this date.</p>
                ) : (
                  <div className="space-y-3">
                    {Array.from(slotsByStaff.entries()).map(([sid, { name, slots: staffSlots }]) => (
                      <div key={sid}>
                        {!staffId && <p className="text-xs text-stone-500 mb-1">{name}</p>}
                        <div className="flex flex-wrap gap-2">
                          {(staffSlots ?? []).map((slot) => {
                            const isSelected = selectedSlot === slot.time && selectedSlotStaffId === slot.staffId;
                            return (
                              <button
                                key={`${slot.staffId}-${slot.time}`}
                                onClick={() => { setSelectedSlot(slot.time); setSelectedSlotStaffId(slot.staffId); }}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                                  isSelected
                                    ? "bg-stone-900 text-white border-stone-900"
                                    : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                                }`}
                              >
                                {slot.displayTime}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={handleBook}
                disabled={book.isPending || !selectedSlot || !serviceId || !selectedSlotStaffId}
              >
                {book.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Book"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ClientSchedulePage() {
  const { data: appointments, isLoading } = trpc.portal.appointments.useQuery();
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [showBookModal, setShowBookModal] = useState(false);

  const now = new Date();
  const upcoming = (appointments ?? []).filter((a) => new Date(a.scheduledAt) >= now && !["CANCELLED","EARLY_CANCEL","LATE_CANCEL","NO_SHOW"].includes(a.status));
  const past = (appointments ?? []).filter((a) => new Date(a.scheduledAt) < now || ["CANCELLED","EARLY_CANCEL","LATE_CANCEL","NO_SHOW"].includes(a.status));

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>;
  }

  const reschedulingAppt = rescheduling ? appointments?.find((a) => a.id === rescheduling) : null;

  const canReschedule = (appt: { scheduledAt: string | Date; status: string }) => {
    const hoursUntil = (new Date(appt.scheduledAt).getTime() - Date.now()) / 36e5;
    return hoursUntil >= 24 && ["RESERVED", "CONFIRMED"].includes(appt.status);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">My Schedule</h2>
        <Button size="sm" onClick={() => setShowBookModal(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Book
        </Button>
      </div>

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
                      <p className="text-xs text-stone-600 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {fmtDate(appt.scheduledAt)} at {fmtTime(appt.scheduledAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={statusVariant[appt.status] ?? "info"}>
                        {appt.status.charAt(0) + appt.status.slice(1).toLowerCase().replace(/_/g, " ")}
                      </Badge>
                      {canReschedule(appt) && (
                        <button
                          onClick={() => setRescheduling(appt.id)}
                          className="text-xs text-stone-500 underline hover:text-stone-700"
                        >
                          Reschedule
                        </button>
                      )}
                    </div>
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
                        {fmtDate(appt.scheduledAt)} · {appt.staff.firstName} {appt.staff.lastName}
                      </p>
                    </div>
                    <Badge variant={statusVariant[appt.status] ?? "outline"}>
                      {appt.status.charAt(0) + appt.status.slice(1).toLowerCase().replace(/_/g, " ")}
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

      {reschedulingAppt && (
        <RescheduleModal
          appt={reschedulingAppt}
          onClose={() => setRescheduling(null)}
          onSuccess={() => setRescheduling(null)}
        />
      )}

      {showBookModal && (
        <BookModal
          onClose={() => setShowBookModal(false)}
          onSuccess={() => setShowBookModal(false)}
        />
      )}
    </div>
  );
}
