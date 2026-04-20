"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/trpc/client";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtValue(val: number | null | undefined, unit: string) {
  if (val == null) return null;
  return `${val} ${unit}`;
}

type Measurement = {
  id: string;
  date: string | Date;
  weight?: number | null;
  bodyFatPercent?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  leftArm?: number | null;
  rightArm?: number | null;
  leftThigh?: number | null;
  rightThigh?: number | null;
  neck?: number | null;
  notes?: string | null;
};

const FIELDS: { key: keyof Measurement; label: string; unit: string }[] = [
  { key: "weight", label: "Weight", unit: "lbs" },
  { key: "bodyFatPercent", label: "Body Fat", unit: "%" },
  { key: "chest", label: "Chest", unit: "in" },
  { key: "waist", label: "Waist", unit: "in" },
  { key: "hips", label: "Hips", unit: "in" },
  { key: "leftArm", label: "Left Arm", unit: "in" },
  { key: "rightArm", label: "Right Arm", unit: "in" },
  { key: "leftThigh", label: "Left Thigh", unit: "in" },
  { key: "rightThigh", label: "Right Thigh", unit: "in" },
  { key: "neck", label: "Neck", unit: "in" },
];

function MeasurementRow({ m }: { m: Measurement }) {
  const [open, setOpen] = useState(false);

  const recorded = FIELDS.filter((f) => m[f.key] != null);

  // Show first 3 fields inline as a preview
  const preview = recorded.slice(0, 3);
  const rest = recorded.slice(3);

  return (
    <div className="border border-stone-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-50 transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-stone-900">{fmtDate(m.date)}</p>
          <p className="text-xs text-stone-500 mt-0.5">
            {preview.map((f) => `${f.label}: ${fmtValue(m[f.key] as number, f.unit)}`).join(" · ")}
            {recorded.length === 0 && "No values recorded"}
          </p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-stone-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-1 border-t border-stone-100 pt-3">
          {recorded.length === 0 ? (
            <p className="text-sm text-stone-400">No values recorded.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {recorded.map((f) => (
                <div key={f.key as string}>
                  <span className="text-xs text-stone-500">{f.label}</span>
                  <p className="text-sm font-medium text-stone-900">{fmtValue(m[f.key] as number, f.unit)}</p>
                </div>
              ))}
            </div>
          )}
          {m.notes && (
            <p className="text-xs text-stone-500 mt-2 pt-2 border-t border-stone-100">
              <span className="font-medium">Notes:</span> {m.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function MeasurementsPage() {
  const { data: measurements, isLoading } = trpc.portal.measurements.useQuery();

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>;
  }

  if (!measurements || measurements.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Measurements</h2>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-stone-400 max-w-xs">
            No measurements recorded yet. Your coach will log these during check-ins.
          </p>
        </div>
      </div>
    );
  }

  const latest = measurements[0]!;
  const latestFields = FIELDS.filter((f) => latest[f.key] != null);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Measurements</h2>

      {/* Most recent summary card */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
            Latest · {fmtDate(latest.date)}
          </p>
          {latestFields.length === 0 ? (
            <p className="text-sm text-stone-400">No values recorded.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {latestFields.map((f) => (
                <div key={f.key as string}>
                  <p className="text-xs text-stone-500">{f.label}</p>
                  <p className="text-base font-semibold text-stone-900">{fmtValue(latest[f.key] as number, f.unit)}</p>
                </div>
              ))}
            </div>
          )}
          {latest.notes && (
            <p className="text-xs text-stone-500 mt-3 pt-3 border-t border-stone-100">
              <span className="font-medium">Notes:</span> {latest.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {measurements.length > 1 && (
        <>
          <h3 className="text-sm font-semibold text-stone-700">History</h3>
          <div className="space-y-2">
            {measurements.slice(1).map((m) => (
              <MeasurementRow key={m.id} m={m as Measurement} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
