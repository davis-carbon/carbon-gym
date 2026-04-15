"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddClientModal({ open, onClose }: AddClientModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    lifecycleStage: "CLIENT" as "LEAD" | "PROSPECT" | "CLIENT" | "FORMER_CLIENT",
  });

  const createClient = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast("success", "Client created");
      utils.clients.list.invalidate();
      onClose();
      setForm({ firstName: "", lastName: "", email: "", phone: "", lifecycleStage: "CLIENT" });
    },
    onError: (err) => {
      toast("error", err.message || "Failed to create client");
    },
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    createClient.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email || undefined,
      phone: form.phone || undefined,
      lifecycleStage: form.lifecycleStage,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Client"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.firstName || !form.lastName || createClient.isPending}
          >
            {createClient.isPending ? "Creating..." : "Create Client"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={form.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            required
          />
          <Input
            label="Last Name"
            value={form.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            required
          />
        </div>
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />
        <Input
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
        />
        <Select
          label="Lifecycle Stage"
          value={form.lifecycleStage}
          onChange={(e) => handleChange("lifecycleStage", e.target.value)}
          options={[
            { value: "LEAD", label: "Lead" },
            { value: "PROSPECT", label: "Prospect" },
            { value: "CLIENT", label: "Client" },
          ]}
        />
      </div>
    </Modal>
  );
}
