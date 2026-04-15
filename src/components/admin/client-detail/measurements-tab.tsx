"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Plus, Loader2 } from "lucide-react";

export function MeasurementsTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], weight: "", bodyFat: "", chest: "", waist: "", notes: "" });

  const { data: measurements, isLoading } = trpc.measurements.listByClient.useQuery({ clientId });

  const createMeasurement = trpc.measurements.create.useMutation({
    onSuccess: () => {
      toast("success", "Measurement recorded");
      utils.measurements.listByClient.invalidate({ clientId });
      setShowAdd(false);
      setForm({ date: new Date().toISOString().split("T")[0], weight: "", bodyFat: "", chest: "", waist: "", notes: "" });
    },
    onError: (err) => toast("error", err.message),
  });

  function handleSubmit() {
    createMeasurement.mutate({
      clientId,
      date: new Date(form.date),
      weight: form.weight ? parseFloat(form.weight) : undefined,
      bodyFatPercent: form.bodyFat ? parseFloat(form.bodyFat) : undefined,
      chest: form.chest ? parseFloat(form.chest) : undefined,
      waist: form.waist ? parseFloat(form.waist) : undefined,
      notes: form.notes || undefined,
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Measurements</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add Measurement</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          ) : (measurements ?? []).length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">No measurements recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left">
                    <th className="px-3 py-2 font-medium text-stone-600">Date</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Weight (lbs)</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Body Fat %</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Chest</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Waist</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Taken By</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(measurements ?? []).map((m) => (
                    <tr key={m.id} className="border-b border-stone-100 last:border-0">
                      <td className="px-3 py-2.5">{new Date(m.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5">{m.weight ?? "—"}</td>
                      <td className="px-3 py-2.5">{m.bodyFatPercent ? `${m.bodyFatPercent}%` : "—"}</td>
                      <td className="px-3 py-2.5">{m.chest ?? "—"}</td>
                      <td className="px-3 py-2.5">{m.waist ?? "—"}</td>
                      <td className="px-3 py-2.5 text-stone-500">{m.takenBy ? `${m.takenBy.firstName} ${m.takenBy.lastName}` : "—"}</td>
                      <td className="px-3 py-2.5 text-stone-500">{m.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Measurement"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMeasurement.isPending}>
              {createMeasurement.isPending ? "Saving..." : "Save Measurement"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Weight (lbs)" type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            <Input label="Body Fat %" type="number" value={form.bodyFat} onChange={(e) => setForm({ ...form, bodyFat: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Chest (in)" type="number" value={form.chest} onChange={(e) => setForm({ ...form, chest: e.target.value })} />
            <Input label="Waist (in)" type="number" value={form.waist} onChange={(e) => setForm({ ...form, waist: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 resize-none" rows={2} />
          </div>
        </div>
      </Modal>
    </>
  );
}
