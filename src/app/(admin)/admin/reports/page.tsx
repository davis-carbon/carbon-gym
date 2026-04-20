"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { downloadCsv } from "@/lib/csv";
import { Loader2, TrendingUp, Users, DollarSign, Dumbbell, AlertCircle, Download } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const lifecycleLabels: Record<string, string> = {
  LEAD: "Lead", PROSPECT: "Prospect", CLIENT: "Client", FORMER_CLIENT: "Former",
};

const billingLabels: Record<string, string> = {
  PAID: "Paid", NON_BILLED: "Non-Billed", BILLED: "Billed", PAST_DUE: "Past Due", CANCELLED: "Cancelled",
};

const MONTHS_OPTIONS = [3, 6, 12];

function MonthPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {MONTHS_OPTIONS.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${value === m ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
        >
          {m}M
        </button>
      ))}
    </div>
  );
}

function fmtMonth(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function ReportsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [exporting, setExporting] = useState<"clients" | "visits" | "payments" | "utilization" | null>(null);
  const [chartMonths, setChartMonths] = useState(6);

  const { data: clientMetrics, isLoading: cmLoading } = trpc.reports.clientMetrics.useQuery();
  const { data: utilization, isLoading: utilLoading } = trpc.reports.staffUtilization.useQuery();
  const { data: activity, isLoading: actLoading } = trpc.reports.workoutActivity.useQuery();
  const { data: revenue, isLoading: revLoading } = trpc.reports.revenue.useQuery();

  const { data: revenueTrend, isLoading: loadingRevenue } = trpc.reports.revenueTrend.useQuery({ months: chartMonths });
  const { data: clientGrowth, isLoading: loadingGrowth } = trpc.reports.clientGrowth.useQuery({ months: chartMonths });
  const { data: apptStats, isLoading: loadingAppts } = trpc.reports.appointmentStats.useQuery({ months: chartMonths });

  const revenueData = revenueTrend?.map((r) => ({ ...r, month: fmtMonth(r.month) })) ?? [];
  const growthData = clientGrowth?.map((g) => ({ ...g, month: fmtMonth(g.month) })) ?? [];
  const apptData = apptStats?.map((a) => ({ ...a, month: fmtMonth(a.month) })) ?? [];

  const totalChartRevenue = revenueTrend?.reduce((s, r) => s + Number(r.revenue), 0) ?? 0;
  const totalNewClients = clientGrowth?.reduce((s, g) => s + g.clients, 0) ?? 0;
  const completionRate = apptStats
    ? Math.round((apptStats.reduce((s, a) => s + a.completed, 0) / Math.max(1, apptStats.reduce((s, a) => s + a.total, 0))) * 100)
    : 0;

  async function exportClients() {
    setExporting("clients");
    try {
      const rows = await utils.reports.exportClients.fetch();
      downloadCsv("clients", rows, [
        { key: "id", header: "ID" },
        { key: "firstName", header: "First Name" },
        { key: "lastName", header: "Last Name" },
        { key: "email", header: "Email" },
        { key: "phone", header: "Phone" },
        { key: "gender", header: "Gender" },
        { key: "birthDate", header: "Birth Date" },
        { key: "signupDate", header: "Signup Date" },
        { key: "status", header: "Status" },
        { key: "lifecycleStage", header: "Lifecycle Stage" },
        { key: "billingStatus", header: "Billing Status" },
        { key: "assignedStaff", header: "Assigned Staff" },
        { key: "height", header: "Height" },
        { key: "weight", header: "Weight" },
      ]);
      toast("success", `${rows.length} client${rows.length === 1 ? "" : "s"} exported`);
    } catch (err: any) {
      toast("error", err?.message ?? "Export failed");
    } finally {
      setExporting(null);
    }
  }

  async function exportVisits() {
    setExporting("visits");
    try {
      const rows = await utils.reports.exportVisits.fetch();
      downloadCsv("visits", rows, [
        { key: "id", header: "ID" },
        { key: "date", header: "Date" },
        { key: "time", header: "Time (UTC)" },
        { key: "client", header: "Client" },
        { key: "clientEmail", header: "Client Email" },
        { key: "staff", header: "Staff" },
        { key: "service", header: "Service" },
        { key: "location", header: "Location" },
        { key: "status", header: "Status" },
        { key: "package", header: "Package" },
        { key: "cancelReason", header: "Cancel Reason" },
        { key: "notes", header: "Notes" },
      ]);
      toast("success", `${rows.length} visit${rows.length === 1 ? "" : "s"} exported`);
    } catch (err: any) {
      toast("error", err?.message ?? "Export failed");
    } finally {
      setExporting(null);
    }
  }

  async function exportPayments() {
    setExporting("payments");
    try {
      const rows = await utils.reports.exportPayments.fetch();
      downloadCsv("payments", rows, [
        { key: "id", header: "ID" },
        { key: "date", header: "Created Date" },
        { key: "paidDate", header: "Paid Date" },
        { key: "client", header: "Client" },
        { key: "clientEmail", header: "Client Email" },
        { key: "amount", header: "Amount" },
        { key: "currency", header: "Currency" },
        { key: "status", header: "Status" },
        { key: "package", header: "Package" },
        { key: "description", header: "Description" },
        { key: "refundedAmount", header: "Refunded" },
        { key: "failureReason", header: "Failure Reason" },
        { key: "stripePaymentIntentId", header: "Stripe Payment Intent" },
      ]);
      toast("success", `${rows.length} payment${rows.length === 1 ? "" : "s"} exported`);
    } catch (err: any) {
      toast("error", err?.message ?? "Export failed");
    } finally {
      setExporting(null);
    }
  }

  async function exportUtilization() {
    setExporting("utilization");
    try {
      const rows = await utils.reports.staffUtilization.fetch();
      downloadCsv("staff-utilization", rows, [
        { key: "staffId", header: "Staff ID" },
        { key: "name", header: "Name" },
        { key: "total", header: "Total" },
        { key: "completed", header: "Completed" },
        { key: "cancelled", header: "Cancelled" },
        { key: "completionRate", header: "Completion Rate %" },
      ]);
      toast("success", "Utilization exported");
    } catch (err: any) {
      toast("error", err?.message ?? "Export failed");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Reports</h1>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="secondary" onClick={exportClients} disabled={exporting !== null}>
            {exporting === "clients" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Clients
          </Button>
          <Button size="sm" variant="secondary" onClick={exportVisits} disabled={exporting !== null}>
            {exporting === "visits" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Visits
          </Button>
          <Button size="sm" variant="secondary" onClick={exportPayments} disabled={exporting !== null}>
            {exporting === "payments" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Payments
          </Button>
          <Button size="sm" variant="secondary" onClick={exportUtilization} disabled={exporting !== null}>
            {exporting === "utilization" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Utilization
          </Button>
        </div>
      </div>

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

      {/* ── Time-Series Charts ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-800">Trends</h2>
        <MonthPicker value={chartMonths} onChange={setChartMonths} />
      </div>

      {/* Chart KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Revenue", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalChartRevenue) },
          { label: "New Clients", value: String(totalNewClients) },
          { label: "Completion Rate", value: `${completionRate}%` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-stone-900">{value}</p>
              <p className="text-xs text-stone-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRevenue ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#292524" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#292524" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#292524" fill="url(#revGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Client growth chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">New Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingGrowth ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={growthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="clients" fill="#78716c" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Appointment stats chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAppts ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div> : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={apptData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="total" stroke="#a8a29e" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cancelled" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
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
