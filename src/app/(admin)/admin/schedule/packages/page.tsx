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

const typeLabels: Record<string, string> = {
  SESSION_PACK: "Session Pack",
  MEMBERSHIP: "Membership",
  DROP_IN: "Drop-In",
  TRIAL: "Trial",
};

export default function PackagesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", packageType: "SESSION_PACK", billingCycle: "ONE_TIME", sessionCount: "" });
  const { data: packages, isLoading } = trpc.schedule.packages.list.useQuery();

  const createPackage = trpc.schedule.packages.create.useMutation({
    onSuccess: () => { toast("success", "Package created"); utils.schedule.packages.list.invalidate(); setShowCreate(false); setForm({ name: "", price: "", packageType: "SESSION_PACK", billingCycle: "ONE_TIME", sessionCount: "" }); },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Package</Button>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="px-4 py-3 text-left font-medium text-stone-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Price</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Billing</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Sessions</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Clients</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin text-stone-400 mx-auto" /></td></tr>
            ) : (packages ?? []).length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-stone-400">No packages found.</td></tr>
            ) : (
              (packages ?? []).map((pkg) => (
                <tr key={pkg.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium">{pkg.name}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{typeLabels[pkg.packageType] || pkg.packageType}</Badge></td>
                  <td className="px-4 py-3">${pkg.price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-stone-500">{pkg.billingCycle.charAt(0) + pkg.billingCycle.slice(1).toLowerCase().replace("_", " ")}</td>
                  <td className="px-4 py-3">{pkg.sessionCount ?? "Unlimited"}</td>
                  <td className="px-4 py-3">{pkg._count.clientPackages}</td>
                  <td className="px-4 py-3"><Badge variant={pkg.isActive ? "success" : "outline"}>{pkg.isActive ? "Active" : "Inactive"}</Badge></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Package" footer={
        <>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={() => createPackage.mutate({
            name: form.name,
            price: parseFloat(form.price) || 0,
            packageType: form.packageType as any,
            billingCycle: form.billingCycle as any,
            sessionCount: form.sessionCount ? parseInt(form.sessionCount) : undefined,
          })} disabled={!form.name || !form.price || createPackage.isPending}>
            {createPackage.isPending ? "Creating..." : "Create Package"}
          </Button>
        </>
      }>
        <div className="space-y-4">
          <Input label="Package Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price ($)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Input label="Session Count" type="number" value={form.sessionCount} onChange={(e) => setForm({ ...form, sessionCount: e.target.value })} placeholder="Leave empty for unlimited" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={form.packageType} onChange={(e) => setForm({ ...form, packageType: e.target.value })} options={[
              { value: "SESSION_PACK", label: "Session Pack" },
              { value: "MEMBERSHIP", label: "Membership" },
              { value: "TRIAL", label: "Trial" },
              { value: "DROP_IN", label: "Drop-In" },
            ]} />
            <Select label="Billing Cycle" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })} options={[
              { value: "ONE_TIME", label: "One Time" },
              { value: "MONTHLY", label: "Monthly" },
              { value: "QUARTERLY", label: "Quarterly" },
              { value: "ANNUALLY", label: "Annually" },
            ]} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
