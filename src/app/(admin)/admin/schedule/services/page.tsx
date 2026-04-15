"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Plus, Loader2 } from "lucide-react";

export default function ServicesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", type: "APPOINTMENT", durationMinutes: "60" });
  const { data: services, isLoading } = trpc.schedule.services.list.useQuery();

  const createService = trpc.schedule.services.create.useMutation({
    onSuccess: () => { toast("success", "Service created"); utils.schedule.services.list.invalidate(); setShowCreate(false); setForm({ name: "", type: "APPOINTMENT", durationMinutes: "60" }); },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Service</Button>
          <Button variant="secondary" size="sm">Manage Categories</Button>
        </div>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="px-4 py-3 text-left font-medium text-stone-600">Service Name</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Duration</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Category</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin text-stone-400 mx-auto" /></td></tr>
            ) : (services ?? []).length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-stone-400">No services found.</td></tr>
            ) : (
              (services ?? []).map((svc) => (
                <tr key={svc.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium">{svc.name}</td>
                  <td className="px-4 py-3"><Badge variant={svc.type === "CLASS" ? "info" : "outline"}>{svc.type === "CLASS" ? "Class" : "Appointment"}</Badge></td>
                  <td className="px-4 py-3">{svc.durationMinutes} min</td>
                  <td className="px-4 py-3 text-stone-500">{svc.category?.name || "—"}</td>
                  <td className="px-4 py-3 text-stone-500">{new Date(svc.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Service" footer={
        <>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={() => createService.mutate({ name: form.name, type: form.type as "APPOINTMENT" | "CLASS", durationMinutes: parseInt(form.durationMinutes) || 60 })} disabled={!form.name || createService.isPending}>
            {createService.isPending ? "Creating..." : "Create Service"}
          </Button>
        </>
      }>
        <div className="space-y-4">
          <Input label="Service Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[{ value: "APPOINTMENT", label: "Appointment" }, { value: "CLASS", label: "Class" }]} />
            <Input label="Duration (min)" type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
