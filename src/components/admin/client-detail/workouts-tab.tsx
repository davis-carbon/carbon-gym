import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const MOCK_PLAN_ASSIGNMENTS = [
  { id: "1", planName: "Nutrition - Weekly Check In [M]", status: "Assigned", assignedBy: "Bri Larson", startDate: "2025-11-07" },
];

const MOCK_WORKOUT_LOGS = [
  { id: "1", date: "2026-04-12", duration: 55, exercises: 6, notes: "Solid session. PR on bench." },
  { id: "2", date: "2026-04-10", duration: 48, exercises: 5, notes: "" },
  { id: "3", date: "2026-04-07", duration: 60, exercises: 7, notes: "Lower body focus." },
];

export function WorkoutsTab({ clientId }: { clientId: string }) {
  return (
    <div className="space-y-6">
      {/* Assigned Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Plans</CardTitle>
          <Button size="sm"><Plus className="h-4 w-4" /> Assign Plan</Button>
        </CardHeader>
        <CardContent>
          {MOCK_PLAN_ASSIGNMENTS.length === 0 ? (
            <p className="text-sm text-stone-500">No plans assigned.</p>
          ) : (
            <div className="space-y-3">
              {MOCK_PLAN_ASSIGNMENTS.map((pa) => (
                <div key={pa.id} className="flex items-center justify-between rounded-lg border border-stone-200 p-4">
                  <div>
                    <p className="font-medium text-sm">{pa.planName}</p>
                    <p className="text-xs text-stone-500 mt-1">Assigned by {pa.assignedBy} on {new Date(pa.startDate).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="success">{pa.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workout Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Workout Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left">
                  <th className="px-3 py-2 font-medium text-stone-600">Date</th>
                  <th className="px-3 py-2 font-medium text-stone-600">Duration</th>
                  <th className="px-3 py-2 font-medium text-stone-600">Exercises</th>
                  <th className="px-3 py-2 font-medium text-stone-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_WORKOUT_LOGS.map((log) => (
                  <tr key={log.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-3 py-2.5">{new Date(log.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5">{log.duration} min</td>
                    <td className="px-3 py-2.5">{log.exercises}</td>
                    <td className="px-3 py-2.5 text-stone-500">{log.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
