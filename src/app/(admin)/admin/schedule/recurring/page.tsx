"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Plus, Trash2, Loader2 } from "lucide-react";

const dayLabels: Record<string, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};

const DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"] as const;

export default function RecurringMembersPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    clientId: "", serviceId: "", staffId: "",
    dayOfWeek: "MONDAY", startTime: "09:00",
    startDate: new Date().toISOString().split("T")[0],
    frequency: "weekly",
  });

  const { data, isLoading } = trpc.schedule.recurring.list.useQuery();
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 100 }, { enabled: showCreate });
  const { data: services } = trpc.schedule.services.list.useQuery(undefined, { enabled: showCreate });
  const { data: staffList } = trpc.staff.list.useQuery(undefined, { enabled: showCreate });

  const createRecurring = trpc.schedule.recurringMembers.create.useMutation({
    onSuccess: () => { toast("success", "Recurring booking created"); utils.schedule.recurring.list.invalidate(); setShowCreate(false); },
    onError: (err) => toast("error", err.message),
  });

  const deleteRecurring = trpc.schedule.recurringMembers.delete.useMutation({
    onSuccess: () => { toast("success", "Recurring booking cancelled"); utils.schedule.recurring.list.invalidate(); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Recurring Booking</Button>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="px-4 py-3 text-left font-medium text-stone-600">Client</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Service</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Staff</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Schedule</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Start Date</th>
              <th className="px-4 py-3 text-right font-medium text-stone-600 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin text-stone-400 mx-auto" /></td></tr>
            ) : (data ?? []).length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-400">No recurring members.</td></tr>
            ) : (
              (data ?? []).map((r) => (
                <tr key={r.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{r.client.firstName} {r.client.lastName}</td>
                  <td className="px-4 py-3">{r.service.name}</td>
                  <td className="px-4 py-3">{r.staff.firstName} {r.staff.lastName}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm">Every {r.frequency.toLowerCase()} on {dayLabels[r.dayOfWeek]}</p>
                    <p className="text-xs text-stone-500">{r.startTime}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{new Date(r.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { if (confirm("Cancel this recurring booking?")) deleteRecurring.mutate({ id: r.id }); }} className="text-stone-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Recurring Booking" size="lg" footer={
        <>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={() => createRecurring.mutate({
            ...form,
            startDate: new Date(form.startDate),
            dayOfWeek: form.dayOfWeek as any,
          })} disabled={!form.clientId || !form.serviceId || !form.staffId || createRecurring.isPending}>
            {createRecurring.isPending ? "Creating..." : "Create"}
          </Button>
        </>
      }>
        <div className="space-y-4">
          <Select
            label="Client"
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            options={[{ value: "", label: "Select..." }, ...(clientsData?.clients ?? []).map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Service"
              value={form.serviceId}
              onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
              options={[{ value: "", label: "Select..." }, ...(services ?? []).map((s) => ({ value: s.id, label: s.name }))]}
            />
            <Select
              label="Staff"
              value={form.staffId}
              onChange={(e) => setForm({ ...form, staffId: e.target.value })}
              options={[{ value: "", label: "Select..." }, ...(staffList ?? []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))]}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Day"
              value={form.dayOfWeek}
              onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
              options={DAYS.map((d) => ({ value: d, label: dayLabels[d] }))}
            />
            <Input label="Time" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <Select
              label="Frequency"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              options={[{ value: "weekly", label: "Weekly" }, { value: "biweekly", label: "Biweekly" }]}
            />
          </div>
          <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
