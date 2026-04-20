"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Plus, Trash2, Loader2, ChevronLeft, ChevronRight, Utensils } from "lucide-react";

function startOfDayLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatDay(d: Date): string {
  const today = startOfDayLocal(new Date());
  const target = startOfDayLocal(d);
  const diff = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return target.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export default function PortalNutritionPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDayLocal(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    mealName: "",
    description: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    notes: "",
  });

  const { data: plan } = trpc.portal.myPlan.useQuery();
  const { data: logs, isLoading } = trpc.portal.logsByDate.useQuery({ date: selectedDate });

  const addLog = trpc.portal.addLog.useMutation({
    onSuccess: () => {
      toast("success", "Meal logged");
      utils.portal.logsByDate.invalidate({ date: selectedDate });
      setModalOpen(false);
      resetForm();
    },
    onError: (err) => toast("error", err.message),
  });

  const deleteLog = trpc.portal.deleteLog.useMutation({
    onSuccess: () => {
      utils.portal.logsByDate.invalidate({ date: selectedDate });
    },
    onError: (err) => toast("error", err.message),
  });

  function resetForm() {
    setForm({ mealName: "", description: "", calories: "", protein: "", carbs: "", fat: "", notes: "" });
  }

  function handleSubmit() {
    addLog.mutate({
      date: selectedDate,
      mealName: form.mealName || undefined,
      description: form.description || undefined,
      calories: form.calories ? Number(form.calories) : undefined,
      protein: form.protein ? Number(form.protein) : undefined,
      carbs: form.carbs ? Number(form.carbs) : undefined,
      fat: form.fat ? Number(form.fat) : undefined,
      notes: form.notes || undefined,
    });
  }

  const totals = useMemo(() => {
    const rows = logs ?? [];
    return rows.reduce(
      (acc, l) => ({
        calories: acc.calories + (l.calories ?? 0),
        protein: acc.protein + (l.protein ?? 0),
        carbs: acc.carbs + (l.carbs ?? 0),
        fat: acc.fat + (l.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [logs]);

  // Compute target totals for selected day from plan meals
  const planTargets = useMemo(() => {
    if (!plan?.meals?.length) return null;
    const meals = plan.meals;
    return meals.reduce(
      (acc, m) => ({
        calories: acc.calories + (m.calories ?? 0),
        protein: acc.protein + (m.protein ?? 0),
        carbs: acc.carbs + (m.carbs ?? 0),
        fat: acc.fat + (m.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [plan]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-stone-900">Nutrition</h2>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Log
        </Button>
      </div>

      {/* Date switcher */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-stone-200 px-3 py-2">
        <button
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          className="p-1.5 rounded hover:bg-stone-100 text-stone-600"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium">{formatDay(selectedDate)}</p>
        <button
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
          className="p-1.5 rounded hover:bg-stone-100 text-stone-600"
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Totals */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <Nutrient label="Cal" value={totals.calories} target={planTargets?.calories} />
            <Nutrient label="P" value={totals.protein} target={planTargets?.protein} unit="g" />
            <Nutrient label="C" value={totals.carbs} target={planTargets?.carbs} unit="g" />
            <Nutrient label="F" value={totals.fat} target={planTargets?.fat} unit="g" />
          </div>
        </CardContent>
      </Card>

      {/* Today's logs */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
      ) : (logs ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white py-10 text-center">
          <Utensils className="h-6 w-6 text-stone-400 mx-auto mb-2" />
          <p className="text-sm text-stone-500">No meals logged {formatDay(selectedDate).toLowerCase()}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(logs ?? []).map((l) => (
            <Card key={l.id}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="font-medium text-stone-900">{l.mealName || "Meal"}</p>
                      {l.calories !== null && (
                        <span className="text-xs text-stone-500">{Math.round(l.calories!)} cal</span>
                      )}
                    </div>
                    {l.description && <p className="text-xs text-stone-600 mt-0.5">{l.description}</p>}
                    {(l.protein || l.carbs || l.fat) && (
                      <p className="text-xs text-stone-400 mt-0.5">
                        {l.protein != null && `${Math.round(l.protein)}p `}
                        {l.carbs != null && `${Math.round(l.carbs)}c `}
                        {l.fat != null && `${Math.round(l.fat)}f`}
                      </p>
                    )}
                    {l.notes && <p className="text-xs text-stone-500 mt-1 italic">{l.notes}</p>}
                  </div>
                  <button
                    onClick={() => { if (confirm("Delete this entry?")) deleteLog.mutate({ id: l.id }); }}
                    className="text-stone-400 hover:text-red-500 p-1"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Plan reference */}
      {plan && (
        <Card>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {plan.description && <p className="text-sm text-stone-600 mb-3">{plan.description}</p>}
            {plan.meals.length === 0 ? (
              <p className="text-sm text-stone-400">Your trainer hasn&apos;t added meals to this plan yet.</p>
            ) : (
              <div className="space-y-1.5">
                {plan.meals.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm border-b border-stone-100 last:border-0 py-1.5">
                    <span className="font-medium text-stone-700">{m.name}</span>
                    <span className="text-xs text-stone-500">
                      {m.calories ? `${Math.round(m.calories)} cal` : ""}
                      {m.protein ? ` · ${Math.round(m.protein)}p` : ""}
                      {m.carbs ? ` · ${Math.round(m.carbs)}c` : ""}
                      {m.fat ? ` · ${Math.round(m.fat)}f` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Log meal modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={`Log Meal · ${formatDay(selectedDate)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={addLog.isPending}>
              {addLog.isPending ? "Saving..." : "Log Meal"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Meal"
            value={form.mealName}
            onChange={(e) => setForm({ ...form, mealName: e.target.value })}
            placeholder="Breakfast, Lunch, Snack..."
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g. Oatmeal with berries"
          />
          <div className="grid grid-cols-4 gap-2">
            <Input label="Cal" type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
            <Input label="Protein" type="number" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
            <Input label="Carbs" type="number" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} />
            <Input label="Fat" type="number" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Nutrient({
  label, value, target, unit,
}: { label: string; value: number; target?: number | null; unit?: string }) {
  const hasTarget = target && target > 0;
  const pct = hasTarget ? Math.min(100, Math.round((value / target!) * 100)) : 0;
  return (
    <div>
      <p className="text-xs text-stone-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-stone-900 mt-0.5">
        {Math.round(value)}{unit ? unit : ""}
      </p>
      {hasTarget && (
        <>
          <p className="text-[10px] text-stone-400">/ {Math.round(target!)}{unit ?? ""}</p>
          <div className="mt-1 h-1 w-full rounded-full bg-stone-100 overflow-hidden">
            <div
              className={`h-full ${pct >= 100 ? "bg-emerald-500" : "bg-stone-900"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
