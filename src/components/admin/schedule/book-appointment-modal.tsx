"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface BookAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultStaffId?: string;
}

const STAFF_OPTIONS = [
  { value: "1", label: "Mada Hauck" },
  { value: "2", label: "Madeline Gladu" },
  { value: "3", label: "Bri Larson" },
  { value: "4", label: "Aaron Davis" },
];

const SERVICE_OPTIONS = [
  { value: "1", label: "1-on-1 (60 min)" },
  { value: "2", label: "Semi-Private Training (60 min)" },
  { value: "3", label: "Nutrition Check-In (30 min)" },
  { value: "4", label: "Discovery Call (20 min)" },
  { value: "5", label: "Gym Tour (30 min)" },
  { value: "6", label: "Initial Evaluation (90 min)" },
  { value: "7", label: "Therapy (60 min)" },
];

export function BookAppointmentModal({ open, onClose, defaultDate, defaultStaffId }: BookAppointmentModalProps) {
  const [form, setForm] = useState({
    clientSearch: "",
    clientId: "",
    staffId: defaultStaffId || "",
    serviceId: "",
    date: defaultDate || new Date().toISOString().split("T")[0],
    startTime: "09:00",
    notes: "",
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    console.log("Booking appointment:", form);
    onClose();
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
          <Button onClick={handleSubmit} disabled={!form.clientSearch || !form.staffId || !form.serviceId}>
            Book Appointment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Client"
          placeholder="Search for a client..."
          value={form.clientSearch}
          onChange={(e) => handleChange("clientSearch", e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Staff Member"
            value={form.staffId}
            onChange={(e) => handleChange("staffId", e.target.value)}
            options={STAFF_OPTIONS}
            placeholder="Select staff..."
          />
          <Select
            label="Service"
            value={form.serviceId}
            onChange={(e) => handleChange("serviceId", e.target.value)}
            options={SERVICE_OPTIONS}
            placeholder="Select service..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => handleChange("date", e.target.value)}
          />
          <Input
            label="Start Time"
            type="time"
            value={form.startTime}
            onChange={(e) => handleChange("startTime", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Optional notes..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-1 resize-none"
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
}
