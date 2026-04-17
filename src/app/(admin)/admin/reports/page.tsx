"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/trpc/client";
import { Loader2, TrendingUp, Users, DollarSign, Calendar, Dumbbell, AlertCircle } from "lucide-react";

const lifecycleLabels: Record<string, string> = {
  LEAD: "Lead", PROSPECT: "Prospect", CLIENT: "Client", FORMER_CLIENT: "Former",
};

const billingLabels: Record<string, string> = {
  PAID: "Paid", NON_BILLED: "Non-Billed", BILLED: "Billed", PAST_DUE: "Past Due", CANCELLED: "Cancelled",
};

export default function ReportsPage() {
  const { data: clientMetrics, isLoading: cmLoading } = trpc.reports.clientMetrics.useQuery();
  const { data: utilization, isLoading: utilLoading } = trpc.reports.staffUtilization.useQuery();
  const { data: activity, isLoading: actLoading } = trpc.reports.workoutActivity.useQuery();
  const { data: revenue, isLoading: revLoading } = trpc.reports.revenue.useQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total Clients"
          value={cmLoading ? "..." : String(clientMetrics?.total ?? 0)}
          subtitle={`${clientMetrics?.active ?? 0} active`}
          icon={Users}
        />
        <KpiCard
          title="New in 30 days"
          value={cmLoading ? "..." : String(clientMetrics?.newLast30 ?? 0)}
          subtitle={`${clientMetrics?.newLast90 ?? 0} in 90 days`}
          icon={TrendingUp}
        />
        <KpiCard
          title="Paying Clients"
          value={revLoading ? "..." : String(revenue?.payingClients ?? 0)}
          subtitle={`${revenue?.activePackages ?? 0} active packages`}
          icon={DollarSign}
        />
        <KpiCard
          title="Inactive Clients"
          value={actLoading ? "..." : String(activity?.noWorkoutCount ?? 0)}
          subtitle="No workouts in 30 days"
          icon={AlertCircle}
        />
      </div>

      {/* Client breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Lifecycle Stage</CardTitle></CardHeader>
          <CardContent>
            {cmLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
            ) : (
              <div className="space-y-2">
                {(clientMetrics?.byLifecycle ?? []).map((b) => (
                  <div key={b.stage} className="flex items-center justify-between text-sm">
                    <span className="text-stone-700">{lifecycleLabels[b.stage] || b.stage}</span>
                    <span className="font-medium">{b.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Billing Status</CardTitle></CardHeader>
          <CardContent>
            {cmLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
            ) : (
              <div className="space-y-2">
                {(clientMetrics?.byBilling ?? []).map((b) => (
                  <div key={b.status} className="flex items-center justify-between text-sm">
                    <span className="text-stone-700">{billingLabels[b.status] || b.status}</span>
                    <span className="font-medium">{b.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff utilization */}
      <Card>
        <CardHeader><CardTitle>Staff Utilization (Last 30 Days)</CardTitle></CardHeader>
        <CardContent>
          {utilLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left">
                    <th className="px-3 py-2 font-medium text-stone-600">Staff</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Total</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Completed</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Cancelled</th>
                    <th className="px-3 py-2 font-medium text-stone-600">Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(utilization ?? []).map((u) => (
                    <tr key={u.staffId} className="border-b border-stone-100 last:border-0">
                      <td className="px-3 py-2.5 font-medium">{u.name}</td>
                      <td className="px-3 py-2.5">{u.total}</td>
                      <td className="px-3 py-2.5 text-emerald-600">{u.completed}</td>
                      <td className="px-3 py-2.5 text-red-500">{u.cancelled}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={u.completionRate >= 80 ? "success" : u.completionRate >= 60 ? "warning" : "danger"}>
                          {u.completionRate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top active clients */}
      <Card>
        <CardHeader><CardTitle>Most Active Clients (Last 30 Days)</CardTitle></CardHeader>
        <CardContent>
          {actLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          ) : (activity?.topActive ?? []).length === 0 ? (
            <p className="text-sm text-stone-400">No workout activity yet.</p>
          ) : (
            <div className="space-y-2">
              {(activity?.topActive ?? []).map((c, i) => (
                <div key={c.clientId} className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-stone-400 w-5">#{i + 1}</span>
                    <span className="text-sm font-medium">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <Dumbbell className="h-4 w-4" />
                    {c.workoutCount} workouts
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ title, value, subtitle, icon: Icon }: { title: string; value: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-stone-500">{title}</p>
            <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
            <p className="mt-0.5 text-xs text-stone-400">{subtitle}</p>
          </div>
          <Icon className="h-5 w-5 text-stone-400" />
        </div>
      </CardContent>
    </Card>
  );
}
