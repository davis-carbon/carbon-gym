"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Pencil, Trash2, Copy, Loader2 } from "lucide-react";

const triggerLabels: Record<string, string> = {
  DAYS_AFTER_PURCHASE: "days after purchase",
  DAYS_AFTER_SIGNUP: "days after signup",
  DAYS_BEFORE_EXPIRY: "days before package expiry",
  ON_FIRST_LOGIN: "on first login",
  MANUAL: "manual trigger",
};

const actionTypeLabels: Record<string, string> = {
  ASSIGN_STAFF: "Assign a Staff Member",
  IMPORT_PLAN: "Assign/Import a Plan",
  ASSIGN_RESOURCE: "Assign a Resource",
  SEND_MESSAGE: "Send a Message",
  ASSIGN_GROUP: "Add to Group",
  ADD_TAG: "Add a Tag",
};

export default function AutomationsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    trigger: "DAYS_AFTER_PURCHASE",
    triggerValue: "0",
    triggerProduct: "",
    actionType: "ASSIGN_STAFF",
    actionDetail: "",
  });

  const { data: automations, isLoading } = trpc.automations.list.useQuery();

  const createAutomation = trpc.automations.create.useMutation({
    onSuccess: () => {
      toast("success", "Automation created");
      utils.automations.list.invalidate();
      setShowCreate(false);
    },
    onError: (err) => toast("error", err.message),
  });

  const deleteAutomation = trpc.automations.delete.useMutation({
    onSuccess: () => { toast("success", "Automation deleted"); utils.automations.list.invalidate(); },
  });

  const toggleAutomation = trpc.automations.update.useMutation({
    onSuccess: () => utils.automations.list.invalidate(),
  });

  const filtered = (automations ?? []).filter((a) =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Automations</h1>
        <Button onClick={() => setShowCreate(true)}>Create New Automation</Button>
      </div>

      <div className="mb-4 max-w-md">
        <SearchInput placeholder="Filter Automations" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-stone-400 py-12">No automations. Click &quot;Create New Automation&quot; to add one.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((rule) => {
            const actions = (rule.actions as any[]) || [];
            const actionLabel = actions.length > 0 ? (actionTypeLabels[actions[0]?.type] || actions[0]?.type) : "No action";

            return (
              <Card key={rule.id} className={!rule.isActive ? "opacity-60" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-semibold text-stone-900">
                          Automation | {actionLabel}
                        </h3>
                        {!rule.isActive && <Badge variant="outline">Disabled</Badge>}
                        <div className="flex items-center gap-1 ml-2">
                          <button onClick={() => { if (confirm("Delete?")) deleteAutomation.mutate({ id: rule.id }); }} className="text-stone-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex gap-4">
                          <span className="font-semibold text-stone-700 w-20">When?</span>
                          <span className="text-stone-600">{rule.triggerValue ?? 0} {triggerLabels[rule.trigger]} {rule.triggerProduct ? `of ${rule.triggerProduct}` : ""}</span>
                        </div>
                        <div className="flex gap-4">
                          <span className="font-semibold text-stone-700 w-20">Who?</span>
                          <span className="text-stone-600">{JSON.stringify(rule.filterCriteria) === "{}" ? "all accounts" : JSON.stringify(rule.filterCriteria)}</span>
                        </div>
                        <div className="flex gap-4">
                          <span className="font-semibold text-stone-700 w-20">What?</span>
                          <span className="text-stone-600">{actions.map((a: any) => a.detail || a.type).join(", ") || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAutomation.mutate({ id: rule.id, isActive: !rule.isActive })}
                    >
                      {rule.isActive ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Automation" size="lg" footer={
        <>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={() => createAutomation.mutate({
            name: form.name || `${actionTypeLabels[form.actionType]} automation`,
            trigger: form.trigger as any,
            triggerValue: parseInt(form.triggerValue) || 0,
            triggerProduct: form.triggerProduct || undefined,
            actions: [{ type: form.actionType, detail: form.actionDetail }],
          })} disabled={createAutomation.isPending}>
            {createAutomation.isPending ? "Creating..." : "Create"}
          </Button>
        </>
      }>
        <div className="space-y-4">
          <Input label="Name (optional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Auto-generated if empty" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Trigger" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} options={[
              { value: "DAYS_AFTER_PURCHASE", label: "Days after purchase" },
              { value: "DAYS_AFTER_SIGNUP", label: "Days after signup" },
              { value: "DAYS_BEFORE_EXPIRY", label: "Days before expiry" },
              { value: "ON_FIRST_LOGIN", label: "On first login" },
              { value: "MANUAL", label: "Manual" },
            ]} />
            <Input label="Trigger Value (days)" type="number" value={form.triggerValue} onChange={(e) => setForm({ ...form, triggerValue: e.target.value })} />
          </div>
          <Input label="Product/Package (optional)" value={form.triggerProduct} onChange={(e) => setForm({ ...form, triggerProduct: e.target.value })} placeholder="e.g., ORIGIN" />
          <Select label="Action" value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })} options={[
            { value: "ASSIGN_STAFF", label: "Assign a Staff Member" },
            { value: "IMPORT_PLAN", label: "Assign/Import a Plan" },
            { value: "ASSIGN_RESOURCE", label: "Assign a Resource" },
            { value: "SEND_MESSAGE", label: "Send a Message" },
            { value: "ASSIGN_GROUP", label: "Add to Group" },
            { value: "ADD_TAG", label: "Add a Tag" },
          ]} />
          <Input label="Action Detail" value={form.actionDetail} onChange={(e) => setForm({ ...form, actionDetail: e.target.value })} placeholder="e.g., Staff name, Plan name, etc." />
        </div>
      </Modal>
    </div>
  );
}
