"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Plus, Loader2, Ruler, MoreVertical, ExternalLink, BarChart2, Settings } from "lucide-react";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";

// ─── Default date range: last 30 days ────────────────────────────────────────
function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtRangeLabel(from: string, to: string) {
  const f = new Date(from);
  const t = new Date(to);
  return `${f.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

// ─── Field input helper ───────────────────────────────────────────────────────
function MField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
      />
    </div>
  );
}

// ─── New Log Entry modal ──────────────────────────────────────────────────────
type FormState = {
  date: string;
  time: string;
  weight: string;
  waist: string;
  hips: string;
  sleepHours: string;
  energyLevel: string;
  waterOunces: string;
  stepsPerDay: string;
  effort: string;
  hunger: string;
  cravings: string;
  stress: string;
  chest: string;
  hrv: string;
  bodyFatPercent: string;
  leftArm: string;
  rightArm: string;
  leftThigh: string;
  rightThigh: string;
  neck: string;
  notes: string;
};

function emptyForm(): FormState {
  const now = new Date();
  return {
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().slice(0, 5),
    weight: "", waist: "", hips: "", sleepHours: "", energyLevel: "",
    waterOunces: "", stepsPerDay: "", effort: "", hunger: "", cravings: "",
    stress: "", chest: "", hrv: "", bodyFatPercent: "", leftArm: "",
    rightArm: "", leftThigh: "", rightThigh: "", neck: "", notes: "",
  };
}

function parseOpt(v: string) {
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}

export function MeasurementsTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [range, setRange] = useState(defaultRange());
  const [showRange, setShowRange] = useState(false);
  const [tempRange, setTempRange] = useState(range);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const { data: measurements, isLoading } = trpc.measurements.listByClient.useQuery({
    clientId,
    dateFrom: new Date(range.from),
    dateTo: new Date(range.to + "T23:59:59"),
  });

  const create = trpc.measurements.create.useMutation({
    onSuccess: () => {
      toast("success", "Measurement logged");
      utils.measurements.listByClient.invalidate({ clientId });
      setShowAdd(false);
      setForm(emptyForm());
    },
    onError: (err) => toast("error", err.message),
  });

  const deleteMeasurement = trpc.measurements.delete.useMutation({
    onSuccess: () => {
      toast("success", "Measurement deleted");
      utils.measurements.listByClient.invalidate({ clientId });
    },
    onError: (err) => toast("error", err.message),
  });

  function handleSubmit() {
    const [h, m] = form.time.split(":").map(Number);
    const d = new Date(form.date);
    d.setHours(h ?? 0, m ?? 0);
    create.mutate({
      clientId,
      date: d,
      weight: parseOpt(form.weight),
      waist: parseOpt(form.waist),
      hips: parseOpt(form.hips),
      sleepHours: parseOpt(form.sleepHours),
      energyLevel: parseOpt(form.energyLevel),
      waterOunces: parseOpt(form.waterOunces),
      stepsPerDay: parseOpt(form.stepsPerDay),
      effort: parseOpt(form.effort),
      hunger: parseOpt(form.hunger),
      cravings: parseOpt(form.cravings),
      stress: parseOpt(form.stress),
      chest: parseOpt(form.chest),
      hrv: parseOpt(form.hrv),
      bodyFatPercent: parseOpt(form.bodyFatPercent),
      leftArm: parseOpt(form.leftArm),
      rightArm: parseOpt(form.rightArm),
      leftThigh: parseOpt(form.leftThigh),
      rightThigh: parseOpt(form.rightThigh),
      neck: parseOpt(form.neck),
      notes: form.notes || undefined,
    });
  }

  const f = (k: keyof FormState) => (v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <>
      {/* ── Logged Measurements ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div>
            <h3 className="font-semibold text-stone-900">Logged Measurements</h3>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>

        {/* Date range picker */}
        <div className="px-5 py-3 border-b border-stone-100">
          <button
            onClick={() => { setTempRange(range); setShowRange(true); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100 transition-colors"
          >
            {fmtRangeLabel(range.from, range.to)}
            <svg className="h-3.5 w-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
            </div>
          ) : (measurements ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400">
              <Ruler className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No recent measurements found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left">
                    <th className="px-3 py-2 font-medium text-stone-500 text-xs">Date</th>
                    <th className="px-3 py-2 font-medium text-stone-500 text-xs">Weight</th>
                    <th className="px-3 py-2 font-medium text-stone-500 text-xs">Waist</th>
                    <th className="px-3 py-2 font-medium text-stone-500 text-xs">Hip</th>
                    <th className="px-3 py-2 font-medium text-stone-500 text-xs">Bust/Chest</th>
                    <th className="px-3 py-2 font-medium text-stone-500 text-xs">Body Fat %</th>
                    <th className="px-3 py-2 font-medium text-stone-500 text-xs">Sleep (hrs)</th>
                    <th className="px-3 py-2 font-medium text-stone-500 text-xs">HRV</th>
                    <th className="px-3 py-2 font-medium text-stone-500 text-xs">Taken By</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(measurements ?? []).map((m) => (
                    <tr key={m.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                      <td className="px-3 py-2.5 text-stone-900">{fmtDate(m.date)}</td>
                      <td className="px-3 py-2.5">{m.weight != null ? `${m.weight} lbs` : "—"}</td>
                      <td className="px-3 py-2.5">{m.waist != null ? `${m.waist}"` : "—"}</td>
                      <td className="px-3 py-2.5">{m.hips != null ? `${m.hips}"` : "—"}</td>
                      <td className="px-3 py-2.5">{m.chest != null ? `${m.chest}"` : "—"}</td>
                      <td className="px-3 py-2.5">{m.bodyFatPercent != null ? `${m.bodyFatPercent}%` : "—"}</td>
                      <td className="px-3 py-2.5">{m.sleepHours != null ? m.sleepHours : "—"}</td>
                      <td className="px-3 py-2.5">{m.hrv != null ? m.hrv : "—"}</td>
                      <td className="px-3 py-2.5 text-stone-500">{m.takenBy ? `${m.takenBy.firstName} ${m.takenBy.lastName}` : "—"}</td>
                      <td className="px-3 py-2.5 text-right">
                        <DropdownMenu
                          trigger={
                            <button className="p-1 rounded hover:bg-stone-100">
                              <MoreVertical className="h-4 w-4 text-stone-400" />
                            </button>
                          }
                        >
                          <DropdownItem
                            danger
                            onClick={() => {
                              if (confirm("Delete this measurement?")) {
                                deleteMeasurement.mutate({ id: m.id });
                              }
                            }}
                          >
                            Delete
                          </DropdownItem>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Manage section ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white mt-4">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">Manage</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Manage Fields */}
          <div className="rounded-lg border border-stone-200 p-4">
            <div className="flex items-start gap-2 mb-2">
              <Settings className="h-4 w-4 text-stone-500 mt-0.5 shrink-0" />
              <p className="text-sm font-semibold text-stone-900">Manage Fields</p>
            </div>
            <p className="text-xs text-stone-500 mb-3">Reorder or hide measurement fields for this client</p>
            <button
              onClick={() => toast("info", "Field management coming soon")}
              className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
            >
              Open Dialog <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>

          {/* Edit platform custom measurements */}
          <div className="rounded-lg border border-stone-200 p-4">
            <div className="flex items-start gap-2 mb-2">
              <Ruler className="h-4 w-4 text-stone-500 mt-0.5 shrink-0" />
              <p className="text-sm font-semibold text-stone-900">Edit platform custom measurements</p>
            </div>
            <p className="text-xs text-stone-500 mb-3">Manage custom measurement fields for the whole platform</p>
            <button
              onClick={() => toast("info", "Platform customization coming soon")}
              className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
            >
              Go to customize platform <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* View stats and graphs */}
          <div className="rounded-lg border border-stone-200 p-4">
            <div className="flex items-start gap-2 mb-2">
              <BarChart2 className="h-4 w-4 text-stone-500 mt-0.5 shrink-0" />
              <p className="text-sm font-semibold text-stone-900">View stats and graphs</p>
            </div>
            <p className="text-xs text-stone-500 mb-3">More in-depth graphs and charts of this client's measurements</p>
            <button
              onClick={() => toast("info", "Stats and graphs coming soon")}
              className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
            >
              Go to stats &amp; graphs <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Date range modal ─────────────────────────────────────────────────── */}
      <Modal
        open={showRange}
        onClose={() => setShowRange(false)}
        title="Select Date Range"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRange(false)}>Cancel</Button>
            <Button onClick={() => { setRange(tempRange); setShowRange(false); }}>Apply</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="From" type="date" value={tempRange.from} onChange={(e) => setTempRange((r) => ({ ...r, from: e.target.value }))} />
          <Input label="To" type="date" value={tempRange.to} onChange={(e) => setTempRange((r) => ({ ...r, to: e.target.value }))} />
        </div>
      </Modal>

      {/* ── New Log Entry modal ──────────────────────────────────────────────── */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setForm(emptyForm()); }}
        title="New Log Entry"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowAdd(false); setForm(emptyForm()); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={create.isPending}>
              {create.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Saving...</> : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Date + time */}
          <div className="rounded-lg border border-stone-100 bg-stone-50 p-3">
            <p className="text-xs font-medium text-stone-500 mb-2">When were these measurements taken?</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="" type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              <Input label="" type="time" value={form.time} onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))} />
            </div>
          </div>

          {/* Body measurements */}
          <div className="grid grid-cols-2 gap-3">
            <MField label="Weight (lbs)"                  value={form.weight}      onChange={f("weight")} />
            <MField label="Waist Size (in)"               value={form.waist}       onChange={f("waist")} />
            <MField label="Hip (in)"                      value={form.hips}        onChange={f("hips")} />
            <MField label="Average Hours Of Sleep Per Night" value={form.sleepHours} onChange={f("sleepHours")} />
            <MField label="Daily Energy Levels"           value={form.energyLevel} onChange={f("energyLevel")} />
            <MField label="Average Ounces Of Water Per Day" value={form.waterOunces} onChange={f("waterOunces")} />
            <MField label="Average Steps Per Day"         value={form.stepsPerDay} onChange={f("stepsPerDay")} />
            <MField label="Effort"                        value={form.effort}      onChange={f("effort")} />
            <MField label="Hunger"                        value={form.hunger}      onChange={f("hunger")} />
            <MField label="Cravings"                      value={form.cravings}    onChange={f("cravings")} />
            <MField label="Stress"                        value={form.stress}      onChange={f("stress")} />
            <MField label="Bust / Chest (in)"             value={form.chest}       onChange={f("chest")} />
            <MField label="HRV"                           value={form.hrv}         onChange={f("hrv")} />
            <MField label="Body Fat %"                    value={form.bodyFatPercent} onChange={f("bodyFatPercent")} />
            <MField label="Left Arm (in)"                 value={form.leftArm}     onChange={f("leftArm")} />
            <MField label="Right Arm (in)"                value={form.rightArm}    onChange={f("rightArm")} />
            <MField label="Left Thigh (in)"               value={form.leftThigh}   onChange={f("leftThigh")} />
            <MField label="Right Thigh (in)"              value={form.rightThigh}  onChange={f("rightThigh")} />
            <MField label="Neck (in)"                     value={form.neck}        onChange={f("neck")} />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
              rows={2}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
