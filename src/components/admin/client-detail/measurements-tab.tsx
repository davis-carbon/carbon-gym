import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const MOCK_MEASUREMENTS = [
  { id: "1", date: "2026-03-15", weight: 185, bodyFatPercent: 14.2, chest: 42, waist: 33, hips: null },
  { id: "2", date: "2026-02-01", weight: 188, bodyFatPercent: 15.1, chest: 42, waist: 34, hips: null },
  { id: "3", date: "2025-12-15", weight: 190, bodyFatPercent: 16.0, chest: 41.5, waist: 35, hips: null },
];

export function MeasurementsTab({ clientId }: { clientId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Measurements</CardTitle>
        <Button size="sm"><Plus className="h-4 w-4" /> Add Measurement</Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left">
                <th className="px-3 py-2 font-medium text-stone-600">Date</th>
                <th className="px-3 py-2 font-medium text-stone-600">Weight (lbs)</th>
                <th className="px-3 py-2 font-medium text-stone-600">Body Fat %</th>
                <th className="px-3 py-2 font-medium text-stone-600">Chest</th>
                <th className="px-3 py-2 font-medium text-stone-600">Waist</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_MEASUREMENTS.map((m) => (
                <tr key={m.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-3 py-2.5">{new Date(m.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5">{m.weight}</td>
                  <td className="px-3 py-2.5">{m.bodyFatPercent}%</td>
                  <td className="px-3 py-2.5">{m.chest ?? "—"}</td>
                  <td className="px-3 py-2.5">{m.waist ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
