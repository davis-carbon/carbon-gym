"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

interface AssignPlanModalProps {
  open: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
}

export function AssignPlanModal({ open, onClose, planId, planName }: AssignPlanModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [clientId, setClientId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 100 }, { enabled: open });

  const assignPlan = trpc.plans.assignToClient.useMutation({
    onSuccess: () => {
      toast("success", `Plan assigned to client`);
      utils.plans.list.invalidate();
      onClose();
      setClientId("");
    },
    onError: (err) => toast("error", err.message),
  });

  const clientOptions = (clientsData?.clients ?? []).map((c) => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName}`,
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Assign "${planName}"`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => assignPlan.mutate({ planId, clientId, startDate: new Date(startDate) })}
            disabled={!clientId || assignPlan.isPending}
          >
            {assignPlan.isPending ? "Assigning..." : "Assign Plan"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          options={[{ value: "", label: "Select client..." }, ...clientOptions]}
        />
        <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
    </Modal>
  );
}
