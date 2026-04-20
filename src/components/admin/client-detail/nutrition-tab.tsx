"use client";

import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  FileText,
  Trash2,
  Upload,
  ChevronRight,
  X,
  Save,
} from "lucide-react";

// ── types ─────────────────────────────────────────────────────────────────────

type DayType = "training" | "rest";

interface GoalRow {
  carbs: string;
  fat: string;
  protein: string;
  fiber: string;
  kcalPerGramCarbs: string;
  kcalPerGramFat: string;
  kcalPerGramProtein: string;
  kcalPerGramFiber: string;
  autoCalculateCalories: boolean;
  totalCalories: string;
  notes: string;
}

const defaultGoalRow = (): GoalRow => ({
  carbs: "",
  fat: "",
  protein: "",
  fiber: "",
  kcalPerGramCarbs: "4",
  kcalPerGramFat: "9",
  kcalPerGramProtein: "4",
  kcalPerGramFiber: "4",
  autoCalculateCalories: true,
  totalCalories: "",
  notes: "",
});

function dbToForm(row: {
  carbs: number | null;
  fat: number | null;
  protein: number | null;
  fiber: number | null;
  kcalPerGramCarbs: number;
  kcalPerGramFat: number;
  kcalPerGramProtein: number;
  kcalPerGramFiber: number;
  autoCalculateCalories: boolean;
  totalCalories: number | null;
  notes: string | null;
} | null): GoalRow {
  if (!row) return defaultGoalRow();
  return {
    carbs: row.carbs?.toString() ?? "",
    fat: row.fat?.toString() ?? "",
    protein: row.protein?.toString() ?? "",
    fiber: row.fiber?.toString() ?? "",
    kcalPerGramCarbs: row.kcalPerGramCarbs.toString(),
    kcalPerGramFat: row.kcalPerGramFat.toString(),
    kcalPerGramProtein: row.kcalPerGramProtein.toString(),
    kcalPerGramFiber: row.kcalPerGramFiber.toString(),
    autoCalculateCalories: row.autoCalculateCalories,
    totalCalories: row.totalCalories?.toString() ?? "",
    notes: row.notes ?? "",
  };
}

function calcCalories(form: GoalRow): number {
  const c = parseFloat(form.carbs) || 0;
  const f = parseFloat(form.fat) || 0;
  const p = parseFloat(form.protein) || 0;
  const fi = parseFloat(form.fiber) || 0;
  const kc = parseFloat(form.kcalPerGramCarbs) || 4;
  const kf = parseFloat(form.kcalPerGramFat) || 9;
  const kp = parseFloat(form.kcalPerGramProtein) || 4;
  const kfi = parseFloat(form.kcalPerGramFiber) || 4;
  return Math.round(c * kc + f * kf + p * kp + fi * kfi);
}

// ── MacroField ─────────────────────────────────────────────────────────────────

function MacroField({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      {editing ? (
        <input
          type="number"
          min={0}
          step={0.1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          placeholder="—"
        />
      ) : (
        <p className="text-sm font-medium text-stone-800">
          {value ? value : <span className="text-stone-300">————</span>}
        </p>
      )}
    </div>
  );
}

// ── Nutrition Goals Card ──────────────────────────────────────────────────────

function NutritionGoalsCard({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [activeDay, setActiveDay] = useState<DayType>("training");
  const [trainingForm, setTrainingForm] = useState<GoalRow>(defaultGoalRow());
  const [restForm, setRestForm] = useState<GoalRow>(defaultGoalRow());

  const { data: goals, isLoading } = trpc.nutrition.getGoals.useQuery({ clientId });

  // Prime form state when data first loads (not in edit mode)
  useEffect(() => {
    if (goals && !editing) {
      setTrainingForm(dbToForm(goals.training));
      setRestForm(dbToForm(goals.rest));
    }
  }, [goals]); // eslint-disable-line react-hooks/exhaustive-deps

  const upsert = trpc.nutrition.upsertGoals.useMutation({
    onSuccess: () => {
      utils.nutrition.getGoals.invalidate({ clientId });
      setEditing(false);
      toast("success", "Nutrition goals saved");
    },
    onError: (err) => toast("error", err.message),
  });

  function handleEdit() {
    // Prime form from latest DB data when entering edit mode
    if (goals) {
      setTrainingForm(dbToForm(goals.training));
      setRestForm(dbToForm(goals.rest));
    }
    setEditing(true);
  }

  function handleCancel() {
    if (goals) {
      setTrainingForm(dbToForm(goals.training));
      setRestForm(dbToForm(goals.rest));
    }
    setEditing(false);
  }

  async function handleSave() {
    const toMutation = (form: GoalRow, dayType: DayType) => ({
      clientId,
      dayType,
      carbs: form.carbs ? parseFloat(form.carbs) : null,
      fat: form.fat ? parseFloat(form.fat) : null,
      protein: form.protein ? parseFloat(form.protein) : null,
      fiber: form.fiber ? parseFloat(form.fiber) : null,
      kcalPerGramCarbs: parseFloat(form.kcalPerGramCarbs) || 4,
      kcalPerGramFat: parseFloat(form.kcalPerGramFat) || 9,
      kcalPerGramProtein: parseFloat(form.kcalPerGramProtein) || 4,
      kcalPerGramFiber: parseFloat(form.kcalPerGramFiber) || 4,
      autoCalculateCalories: form.autoCalculateCalories,
      totalCalories: form.autoCalculateCalories
        ? calcCalories(form)
        : form.totalCalories ? parseFloat(form.totalCalories) : null,
      notes: form.notes || null,
    });

    await upsert.mutateAsync(toMutation(trainingForm, "training"));
    await upsert.mutateAsync(toMutation(restForm, "rest"));
  }

  const form = activeDay === "training" ? trainingForm : restForm;
  const setForm = activeDay === "training" ? setTrainingForm : setRestForm;

  // Computed total for display / edit
  const displayCalories = useMemo(() => {
    if (editing && form.autoCalculateCalories) return calcCalories(form);
    if (editing && form.totalCalories) return parseFloat(form.totalCalories) || 0;
    const dbRow = activeDay === "training" ? goals?.training : goals?.rest;
    return dbRow?.totalCalories ?? calcCalories(dbToForm(dbRow ?? null));
  }, [editing, form, goals, activeDay]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
        <h3 className="font-semibold text-stone-800">Nutrition Goals</h3>
        {editing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
            <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" /> Save
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={handleEdit}>
            <span className="text-stone-500 text-sm">Edit</span>
          </Button>
        )}
      </div>

      <div className="px-6 pb-6">
        {/* Day type tabs */}
        <div className="flex border-b border-stone-200 mt-4 mb-5">
          {(["training", "rest"] as DayType[]).map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={[
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeDay === day
                  ? "border-stone-800 text-stone-800"
                  : "border-transparent text-stone-500 hover:text-stone-700",
              ].join(" ")}
            >
              {day === "training" ? "Training day goals" : "Rest day goals"}
            </button>
          ))}
        </div>

        {/* Macros 2-col grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-4">
          <MacroField label="Carbs" value={form.carbs} editing={editing} onChange={(v) => setForm({ ...form, carbs: v })} />
          <MacroField label="Fat" value={form.fat} editing={editing} onChange={(v) => setForm({ ...form, fat: v })} />
          <MacroField label="Protein" value={form.protein} editing={editing} onChange={(v) => setForm({ ...form, protein: v })} />
          <MacroField label="Fiber" value={form.fiber} editing={editing} onChange={(v) => setForm({ ...form, fiber: v })} />
        </div>

        {/* kcal multipliers + total */}
        <div className="rounded-lg bg-stone-50 border border-stone-100 p-4 space-y-4">
          {/* Auto-calc toggle (edit only) */}
          {editing && (
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                onClick={() => setForm({ ...form, autoCalculateCalories: !form.autoCalculateCalories })}
                className={[
                  "relative w-9 h-5 rounded-full transition-colors",
                  form.autoCalculateCalories ? "bg-stone-700" : "bg-stone-300",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    form.autoCalculateCalories ? "translate-x-4" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
              <span className="text-sm text-stone-600">Automatically calculate calories based on macros</span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <MacroField label="kcal per gram of Carbs" value={form.kcalPerGramCarbs} editing={editing} onChange={(v) => setForm({ ...form, kcalPerGramCarbs: v })} />
            <MacroField label="kcal per gram of Fat" value={form.kcalPerGramFat} editing={editing} onChange={(v) => setForm({ ...form, kcalPerGramFat: v })} />
            <MacroField label="kcal per gram of Protein" value={form.kcalPerGramProtein} editing={editing} onChange={(v) => setForm({ ...form, kcalPerGramProtein: v })} />
            <MacroField label="kcal per gram of Fiber" value={form.kcalPerGramFiber} editing={editing} onChange={(v) => setForm({ ...form, kcalPerGramFiber: v })} />
          </div>

          <div>
            <p className="text-xs text-stone-500 mb-1">Total calories</p>
            {editing && !form.autoCalculateCalories ? (
              <input
                type="number"
                min={0}
                value={form.totalCalories}
                onChange={(e) => setForm({ ...form, totalCalories: e.target.value })}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                placeholder="—"
              />
            ) : (
              <p className="text-sm font-medium text-stone-800">
                {displayCalories ? displayCalories : <span className="text-stone-300">————</span>}
              </p>
            )}
          </div>
        </div>

        {/* Notes — only shown on training day (matches Exercise.com) */}
        {activeDay === "training" && (
          <div className="mt-5">
            <p className="text-xs text-stone-500 mb-1">Notes</p>
            {editing ? (
              <div>
                <textarea
                  value={trainingForm.notes}
                  onChange={(e) => setTrainingForm({ ...trainingForm, notes: e.target.value })}
                  rows={5}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    toast("info", "Nutrition notes template — coming soon");
                  }}
                  className="text-xs text-stone-400 hover:text-stone-600 mt-1"
                >
                  Paste Notes Template
                </button>
              </div>
            ) : (
              <p className="text-sm text-stone-700 whitespace-pre-wrap">
                {goals?.training?.notes || <span className="text-stone-300">—</span>}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Nutrition Files Card ──────────────────────────────────────────────────────

function NutritionFilesCard({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: files = [], isLoading } = trpc.nutrition.listFiles.useQuery({ clientId });

  const deleteFile = trpc.nutrition.deleteFile.useMutation({
    onSuccess: () => utils.nutrition.listFiles.invalidate({ clientId }),
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
        <h3 className="font-semibold text-stone-800">Nutrition Files</h3>
        <Button size="sm" variant="ghost" onClick={() => toast("info", "File upload coming soon")}>
          <span className="text-stone-500 text-sm">Edit</span>
        </Button>
      </div>

      <div className="px-6 py-4 space-y-2">
        <button
          onClick={() => toast("info", "File upload coming soon")}
          className="flex items-center gap-2 rounded-full bg-stone-100 hover:bg-stone-200 px-4 py-2 text-sm text-stone-600 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload Files
        </button>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-sm text-stone-400 py-2">No files uploaded yet.</p>
        ) : (
          <div className="mt-2 space-y-1">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-stone-400 shrink-0" />
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-stone-700 hover:underline truncate"
                  >
                    {f.name}
                  </a>
                </div>
                <button
                  onClick={() => deleteFile.mutate({ id: f.id })}
                  className="text-red-400 hover:text-red-600 ml-4 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function NutritionTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();

  return (
    <div className="space-y-5">
      <NutritionGoalsCard clientId={clientId} />
      <NutritionFilesCard clientId={clientId} />

      {/* Manage */}
      <div>
        <h4 className="font-semibold text-stone-700 mb-3">Manage</h4>
        <div className="grid grid-cols-1 gap-3 max-w-sm">
          <button
            onClick={() => toast("info", "Nutrition notes template — coming soon")}
            className="text-left rounded-xl border border-stone-200 bg-white p-5 hover:bg-stone-50 transition-colors"
          >
            <p className="font-semibold text-sm text-stone-800 mb-1">
              Nutrition Notes Template
            </p>
            <p className="text-xs text-stone-500 mb-3">
              Edit your global nutrition notes template which can be used to populate your
              nutrition notes with a standardized format
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-stone-600 font-medium">
              Open Dialog <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
