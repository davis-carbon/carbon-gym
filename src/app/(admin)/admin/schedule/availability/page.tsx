"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Plus, Trash2, Loader2 } from "lucide-react";

const DAY_NAMES: Record<string, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};

const DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"] as const;

export default function AvailabilityPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [addingSlotTo, setAddingSlotTo] = useState<string | null>(null);
  const [slotForm, setSlotForm] = useState({ dayOfWeek: "MONDAY", startTime: "09:00", endTime: "17:00" });

  const { data: schedules, isLoading } = trpc.schedule.availability.listByStaff.useQuery();
  const { data: staffList } = trpc.staff.list.useQuery();

  const createSchedule = trpc.schedule.availability.create.useMutation({
    onSuccess: () => { toast("success", "Schedule created"); utils.schedule.availability.listByStaff.invalidate(); setShowCreate(false); setSelectedStaffId(""); },
    onError: (err) => toast("error", err.message),
  });

  const addSlot = trpc.schedule.availability.addSlot.useMutation({
    onSuccess: () => { toast("success", "Slot added"); utils.schedule.availability.listByStaff.invalidate(); setAddingSlotTo(null); },
    onError: (err) => toast("error", err.message),
  });

  const deleteSlot = trpc.schedule.availability.deleteSlot.useMutation({
    onSuccess: () => utils.schedule.availability.listByStaff.invalidate(),
  });

  const deleteSchedule = trpc.schedule.availability.deleteSchedule.useMutation({
    onSuccess: () => { toast("success", "Schedule deleted"); utils.schedule.availability.listByStaff.invalidate(); },
  });

  const staffOptions = (staffList ?? []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Schedule</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
      ) : (schedules ?? []).length === 0 ? (
        <p className="text-center text-sm text-stone-400 py-8">No availability schedules yet. Create one to let staff be bookable.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(schedules ?? []).map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader>
                <div>
                  <CardTitle>{schedule.staff.firstName} {schedule.staff.lastName}</CardTitle>
                  <p className="text-xs text-stone-500 mt-0.5">{schedule.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Active</Badge>
                  <button onClick={() => { if (confirm("Delete this schedule?")) deleteSchedule.mutate({ id: schedule.id }); }} className="text-stone-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {schedule.slots.length === 0 && (
                    <p className="text-sm text-stone-400">No time slots. Add one below.</p>
                  )}
                  {schedule.slots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between text-sm group">
                      <span className="font-medium text-stone-700">{DAY_NAMES[slot.dayOfWeek]}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-500">{slot.startTime} — {slot.endTime}</span>
                        <button onClick={() => deleteSlot.mutate({ id: slot.id })} className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {addingSlotTo === schedule.id ? (
                  <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        label=""
                        value={slotForm.dayOfWeek}
                        onChange={(e) => setSlotForm({ ...slotForm, dayOfWeek: e.target.value })}
                        options={DAYS.map((d) => ({ value: d, label: DAY_NAMES[d] }))}
                      />
                      <Input label="" type="time" value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} />
                      <Input label="" type="time" value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => addSlot.mutate({ scheduleId: schedule.id, dayOfWeek: slotForm.dayOfWeek as any, startTime: slotForm.startTime, endTime: slotForm.endTime })} disabled={addSlot.isPending}>Add</Button>
                      <Button size="sm" variant="secondary" onClick={() => setAddingSlotTo(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingSlotTo(schedule.id)} className="mt-3 text-xs text-stone-500 hover:text-stone-700">
                    + Add time slot
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Availability Schedule" footer={
        <>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={() => createSchedule.mutate({ staffId: selectedStaffId, name: "Default" })} disabled={!selectedStaffId || createSchedule.isPending}>
            {createSchedule.isPending ? "Creating..." : "Create"}
          </Button>
        </>
      }>
        <div className="space-y-4">
          <Select
            label="Staff Member"
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            options={[{ value: "", label: "Select staff..." }, ...staffOptions]}
          />
          <p className="text-xs text-stone-500">A default schedule will be created. Add time slots to define when this staff is bookable.</p>
        </div>
      </Modal>
    </div>
  );
}
