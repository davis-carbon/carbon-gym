"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

interface CreatePlanModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreatePlanModal({ open, onClose }: CreatePlanModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ name: "", description: "", sizeWeeks: "4", planType: "" });

  const createPlan = trpc.plans.create.useMutation({
    onSuccess: () => {
      toast("success", "Plan created");
      utils.plans.list.invalidate();
      onClose();
      setForm({ name: "", description: "", sizeWeeks: "4", planType: "" });
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create New Plan"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => createPlan.mutate({ name: form.name, description: form.description || undefined, sizeWeeks: parseInt(form.sizeWeeks) || 4, planType: form.planType || undefined })} disabled={!form.name || createPlan.isPending}>
            {createPlan.isPending ? "Creating..." : "Create Plan"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Plan Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 resize-none" rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Duration (weeks)" type="number" value={form.sizeWeeks} onChange={(e) => setForm({ ...form, sizeWeeks: e.target.value })} />
          <Input label="Plan Type" value={form.planType} onChange={(e) => setForm({ ...form, planType: e.target.value })} placeholder="e.g., Strength, Hypertrophy" />
        </div>
      </div>
    </Modal>
  );
}
