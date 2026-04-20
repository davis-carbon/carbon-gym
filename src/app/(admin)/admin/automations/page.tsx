"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Trash2, Loader2, Play, Plus, X, Pencil } from "lucide-react";
import type { AutomationAction } from "@/lib/automation-types";

// ─── Types ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AutomationType = any;

// ─── Trigger / action metadata ────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "DAYS_AFTER_SIGNUP", label: "Days after signup", hasValue: true },
  { value: "DAYS_AFTER_PURCHASE", label: "Days after purchase", hasValue: true },
  { value: "DAYS_BEFORE_EXPIRY", label: "Days before package expiry", hasValue: true },
  { value: "DAYS_BEFORE_BIRTHDAY", label: "Days before birthday", hasValue: true },
  { value: "LOW_SESSIONS_REMAINING", label: "Sessions remaining ≤", hasValue: true },
  { value: "PLAN_ENDING_SOON", label: "Plan ending in X days", hasValue: true },
  { value: "TAG_ADDED", label: "Tag added", hasValue: false },
  { value: "TAG_REMOVED", label: "Tag removed", hasValue: false },
  { value: "ON_FIRST_LOGIN", label: "On first login", hasValue: false },
  { value: "MANUAL", label: "Manual trigger", hasValue: false },
];

const triggerLabels: Record<string, string> = Object.fromEntries(
  TRIGGER_OPTIONS.map((t) => [t.value, t.label])
);

const ACTION_TEMPLATES: Record<AutomationAction["type"], AutomationAction> = {
  SEND_PUSH: { type: "SEND_PUSH", title: "Hey {{name}}!", body: "" },
  SEND_EMAIL: { type: "SEND_EMAIL", subject: "From Carbon TC", body: "Hi {{name}}," },
  SEND_MESSAGE: { type: "SEND_MESSAGE", subject: "", body: "Hi {{name}}," },
  ASSIGN_TAG: { type: "ASSIGN_TAG", tagName: "" },
  REMOVE_TAG: { type: "REMOVE_TAG", tagName: "" },
  UPDATE_LIFECYCLE: { type: "UPDATE_LIFECYCLE", stage: "CLIENT" },
  ASSIGN_PLAN: { type: "ASSIGN_PLAN", planId: "" },
};

// ─── AutomationModal ──────────────────────────────────────────────────────────

function AutomationModal({
  automation,
  onClose,
}: {
  automation?: AutomationType | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [trigger, setTrigger] = useState<string>(automation?.trigger ?? "DAYS_AFTER_SIGNUP");
  const [triggerValue, setTriggerValue] = useState<string>(
    automation?.triggerValue?.toString() ?? "7"
  );
  const [name, setName] = useState(automation?.name ?? "");
  const [actions, setActions] = useState<AutomationAction[]>(
    (automation?.actions as AutomationAction[]) ?? []
  );
  const [newActionType, setNewActionType] = useState<AutomationAction["type"]>("SEND_PUSH");

  const create = trpc.automations.create.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
      toast("success", "Automation created");
      onClose();
    },
    onError: (err) => toast("error", err.message),
  });
  const update = trpc.automations.update.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
      toast("success", "Automation updated");
      onClose();
    },
    onError: (err) => toast("error", err.message),
  });

  const triggerOption = TRIGGER_OPTIONS.find((t) => t.value === trigger);

  const addAction = () =>
    setActions([...actions, { ...ACTION_TEMPLATES[newActionType] } as AutomationAction]);
  const removeAction = (i: number) => setActions(actions.filter((_, idx) => idx !== i));
  const updateAction = (i: number, patch: Partial<AutomationAction>) => {
    setActions(
      actions.map((a, idx) => (idx === i ? ({ ...a, ...patch } as AutomationAction) : a))
    );
  };

  const handleSave = () => {
    const data = {
      name: name || `${triggerOption?.label ?? trigger} automation`,
      trigger: trigger as never,
      triggerValue: triggerOption?.hasValue && triggerValue ? parseInt(triggerValue) : undefined,
      actions: actions as never,
    };
    if (automation?.id) update.mutate({ id: automation.id, ...data });
    else create.mutate(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">
            {automation ? "Edit Automation" : "New Automation"}
          </h3>
          <button onClick={onClose}>
            <X className="h-4 w-4 text-stone-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 7-day follow up"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>

          {/* Trigger */}
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">When</label>
            <div className="flex gap-2">
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none"
              >
                {TRIGGER_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {triggerOption?.hasValue && (
                <input
                  type="number"
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  className="w-16 rounded-lg border border-stone-200 px-2 py-2 text-sm text-center focus:outline-none"
                  min={0}
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-2">Then do…</label>
            <div className="space-y-2">
              {actions.map((action, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-stone-200 p-3 bg-stone-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-stone-700">
                      {action.type.replace(/_/g, " ")}
                    </span>
                    <button onClick={() => removeAction(i)}>
                      <X className="h-3.5 w-3.5 text-stone-400 hover:text-red-500" />
                    </button>
                  </div>

                  {action.type === "SEND_PUSH" && (
                    <div className="space-y-2">
                      <input
                        value={action.title}
                        onChange={(e) => updateAction(i, { title: e.target.value })}
                        placeholder="Title"
                        className="w-full rounded border border-stone-200 px-2 py-1 text-xs"
                      />
                      <textarea
                        value={action.body}
                        onChange={(e) => updateAction(i, { body: e.target.value })}
                        placeholder="Message body (use {{name}} for client name)"
                        rows={2}
                        className="w-full rounded border border-stone-200 px-2 py-1 text-xs resize-none"
                      />
                    </div>
                  )}

                  {(action.type === "SEND_EMAIL" || action.type === "SEND_MESSAGE") && (
                    <div className="space-y-2">
                      <input
                        value={(action as { subject: string }).subject}
                        onChange={(e) =>
                          updateAction(i, { subject: e.target.value } as Partial<AutomationAction>)
                        }
                        placeholder="Subject"
                        className="w-full rounded border border-stone-200 px-2 py-1 text-xs"
                      />
                      <textarea
                        value={action.body}
                        onChange={(e) => updateAction(i, { body: e.target.value })}
                        placeholder="Body (use {{name}} for client name)"
                        rows={3}
                        className="w-full rounded border border-stone-200 px-2 py-1 text-xs resize-none"
                      />
                    </div>
                  )}

                  {(action.type === "ASSIGN_TAG" || action.type === "REMOVE_TAG") && (
                    <input
                      value={action.tagName}
                      onChange={(e) =>
                        updateAction(i, { tagName: e.target.value } as Partial<AutomationAction>)
                      }
                      placeholder="Tag name"
                      className="w-full rounded border border-stone-200 px-2 py-1 text-xs"
                    />
                  )}

                  {action.type === "UPDATE_LIFECYCLE" && (
                    <select
                      value={action.stage}
                      onChange={(e) =>
                        updateAction(i, {
                          stage: e.target.value as AutomationAction & {
                            type: "UPDATE_LIFECYCLE";
                          } extends { stage: infer S } ? S : never,
                        } as Partial<AutomationAction>)
                      }
                      className="w-full rounded border border-stone-200 px-2 py-1 text-xs"
                    >
                      {(["LEAD", "PROSPECT", "CLIENT", "FORMER_CLIENT"] as const).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}

                  {action.type === "ASSIGN_PLAN" && (
                    <input
                      value={action.planId}
                      onChange={(e) =>
                        updateAction(i, { planId: e.target.value } as Partial<AutomationAction>)
                      }
                      placeholder="Plan ID"
                      className="w-full rounded border border-stone-200 px-2 py-1 text-xs"
                    />
                  )}
                </div>
              ))}

              {/* Add action row */}
              <div className="flex gap-2">
                <select
                  value={newActionType}
                  onChange={(e) => setNewActionType(e.target.value as AutomationAction["type"])}
                  className="flex-1 rounded-lg border border-stone-200 px-2 py-2 text-xs focus:outline-none"
                >
                  {(Object.keys(ACTION_TEMPLATES) as AutomationAction["type"][]).map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addAction}
                  className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={create.isPending || update.isPending}
            className="flex-1 rounded-lg bg-stone-900 text-white px-4 py-2 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {create.isPending || update.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Save Automation"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"new" | AutomationType | null>(null);

  const { data: automations, isLoading } = trpc.automations.list.useQuery();

  const deleteAutomation = trpc.automations.delete.useMutation({
    onSuccess: () => {
      toast("success", "Automation deleted");
      utils.automations.list.invalidate();
    },
  });

  const toggleAutomation = trpc.automations.update.useMutation({
    onSuccess: () => utils.automations.list.invalidate(),
  });

  const runAutomation = trpc.automations.runNow.useMutation({
    onSuccess: (res) => {
      const parts = [`${res.affected} affected`];
      if (res.skipped > 0) parts.push(`${res.skipped} skipped (already run)`);
      if (res.errors.length > 0) parts.push(`${res.errors.length} errors`);
      toast("success", parts.join(", "));
      utils.automations.list.invalidate();
    },
    onError: (err) => toast("error", err.message),
  });

  const filtered = (automations ?? []).filter(
    (a) => !search || a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {modal && (
        <AutomationModal
          automation={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Automations</h1>
        <button
          onClick={() => setModal("new")}
          className="flex items-center gap-1.5 rounded-lg bg-stone-900 text-white px-4 py-2 text-sm font-medium hover:bg-stone-700"
        >
          <Plus className="h-4 w-4" />
          New Automation
        </button>
      </div>

      <div className="mb-4 max-w-md">
        <SearchInput
          placeholder="Filter Automations"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-stone-400 py-12">
          No automations. Click &quot;New Automation&quot; to add one.
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((rule) => {
            const actions = (rule.actions as AutomationAction[]) ?? [];
            const triggerLabel = triggerLabels[rule.trigger] ?? rule.trigger;

            return (
              <Card key={rule.id} className={!rule.isActive ? "opacity-60" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <h3 className="font-semibold text-stone-900">{rule.name}</h3>
                        {!rule.isActive && <Badge variant="outline">Disabled</Badge>}
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex gap-4">
                          <span className="font-semibold text-stone-700 w-20 shrink-0">When?</span>
                          <span className="text-stone-600">
                            {rule.triggerValue != null ? `${rule.triggerValue} ` : ""}
                            {triggerLabel}
                            {rule.triggerProduct ? ` of ${rule.triggerProduct}` : ""}
                          </span>
                        </div>
                        <div className="flex gap-4">
                          <span className="font-semibold text-stone-700 w-20 shrink-0">Who?</span>
                          <span className="text-stone-600">
                            {JSON.stringify(rule.filterCriteria) === "{}"
                              ? "all accounts"
                              : JSON.stringify(rule.filterCriteria)}
                          </span>
                        </div>
                        <div className="flex gap-4">
                          <span className="font-semibold text-stone-700 w-20 shrink-0">What?</span>
                          <span className="text-stone-600">
                            {actions.length > 0
                              ? actions
                                  .map((a) => a.type.replace(/_/g, " ").toLowerCase())
                                  .join(", ")
                              : "—"}
                          </span>
                        </div>
                        <div className="flex gap-4 pt-1">
                          <span className="font-semibold text-stone-700 w-20 shrink-0">
                            Last run?
                          </span>
                          <span className="text-stone-500 text-xs">
                            {rule.lastRunAt
                              ? new Date(rule.lastRunAt).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })
                              : "Never"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-4 shrink-0">
                      <button
                        onClick={() => setModal(rule)}
                        className="p-1.5 text-stone-400 hover:text-stone-700 rounded"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this automation?"))
                            deleteAutomation.mutate({ id: rule.id });
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-500 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          runAutomation.mutate({ id: rule.id })
                        }
                        disabled={runAutomation.isPending}
                        className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                        title="Run now"
                      >
                        {runAutomation.isPending && runAutomation.variables?.id === rule.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        Run
                      </button>
                      <button
                        onClick={() =>
                          toggleAutomation.mutate({ id: rule.id, isActive: !rule.isActive })
                        }
                        className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      >
                        {rule.isActive ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
