"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

interface BookAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
}

export function BookAppointmentModal({ open, onClose, defaultDate }: BookAppointmentModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Fetch services and clients for dropdowns
  const { data: services } = trpc.schedule.services.list.useQuery(undefined, { enabled: open });
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 100 }, { enabled: open });

  const [form, setForm] = useState({
    clientId: "",
    staffId: "",
    serviceId: "",
    date: defaultDate || new Date().toISOString().split("T")[0],
    startTime: "09:00",
    notes: "",
  });

  // Build option lists
  const clientOptions = (clientsData?.clients ?? []).map((c) => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName}`,
  }));

  const serviceOptions = (services ?? []).map((s) => ({
    value: s.id,
    label: `${s.name} (${s.durationMinutes} min)`,
  }));

  const createAppointment = trpc.schedule.appointments.create.useMutation({
    onSuccess: () => {
      toast("success", "Appointment booked");
      onClose();
      setForm({ clientId: "", staffId: "", serviceId: "", date: defaultDate || "", startTime: "09:00", notes: "" });
    },
    onError: (err) => toast("error", err.message),
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    const service = services?.find((s) => s.id === form.serviceId);
    const duration = service?.durationMinutes ?? 60;

    const scheduledAt = new Date(`${form.date}T${form.startTime}:00`);
    const endAt = new Date(scheduledAt.getTime() + duration * 60 * 1000);

    createAppointment.mutate({
      clientId: form.clientId,
      staffId: form.staffId || "placeholder", // Will be current user
      serviceId: form.serviceId,
      scheduledAt,
      endAt,
      notes: form.notes || undefined,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Book Appointment"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.clientId || !form.serviceId || createAppointment.isPending}>
            {createAppointment.isPending ? "Booking..." : "Book Appointment"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Client"
          value={form.clientId}
          onChange={(e) => handleChange("clientId", e.target.value)}
          options={[{ value: "", label: "Select client..." }, ...clientOptions]}
        />
        <Select
          label="Service"
          value={form.serviceId}
          onChange={(e) => handleChange("serviceId", e.target.value)}
          options={[{ value: "", label: "Select service..." }, ...serviceOptions]}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} />
          <Input label="Start Time" type="time" value={form.startTime} onChange={(e) => handleChange("startTime", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} placeholder="Optional notes..." className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 resize-none" rows={3} />
        </div>
      </div>
    </Modal>
  );
}
