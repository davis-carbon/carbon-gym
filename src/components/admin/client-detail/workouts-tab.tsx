"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { Plus, Calendar, Loader2 } from "lucide-react";

export function WorkoutsTab({ clientId }: { clientId: string }) {
  // Fetch recent workouts (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: workouts, isLoading } = trpc.workouts.listByClientAndDateRange.useQuery({
    clientId,
    startDate: thirtyDaysAgo,
    endDate: new Date(),
  });

  // Fetch plan assignments
  const { data: client } = trpc.clients.byId.useQuery({ id: clientId });

  return (
    <div className="space-y-6">
      {/* Assigned Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {client?.planAssignments && client.planAssignments.length > 0 ? (
            <div className="space-y-3">
              {client.planAssignments.map((pa) => (
                <div key={pa.id} className="flex items-center justify-between rounded-lg border border-stone-200 p-4">
                  <div>
                    <p className="font-medium text-sm">{pa.plan.name}</p>
                    <p className="text-xs text-stone-500 mt-1">
                      {pa.startDate ? `Started ${new Date(pa.startDate).toLocaleDateString()}` : "No start date"}
                    </p>
                  </div>
                  <Badge variant={pa.isActive ? "success" : "outline"}>{pa.isActive ? "Active" : "Ended"}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-400">No plans assigned.</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Workouts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Workouts (30 days)</CardTitle>
          <Link href={`/admin/clients/${clientId}/calendar`}>
            <Button size="sm" variant="secondary"><Calendar className="h-4 w-4" /> Open Calendar</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          ) : (workouts ?? []).length === 0 ? (
            <p className="text-sm text-stone-400">No workouts in the last 30 days.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left">
                    <th className="px-3 py-2 font-medium text-stone-600">Date</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Title</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Blocks</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Exercises</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(workouts ?? []).map((w) => {
                    const totalExercises = w.blocks.reduce((acc, b) => acc + b.exercises.length, 0);
                    return (
                      <tr key={w.id} className="border-b border-stone-100 last:border-0">
                        <td className="px-3 py-2.5">{new Date(w.date).toLocaleDateString()}</td>
                        <td className="px-3 py-2.5 font-medium">
                          <Link href={`/admin/clients/${clientId}/calendar/workout/${w.id}`} className="hover:underline">
                            {w.title}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">{w.blocks.length}</td>
                        <td className="px-3 py-2.5">{totalExercises}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={w.isCompleted ? "success" : "outline"}>
                            {w.isCompleted ? "Completed" : "Scheduled"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
