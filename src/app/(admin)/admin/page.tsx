"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Users, CreditCard, Dumbbell, Package, CreditCardIcon, ClipboardCheck } from "lucide-react";

const KPI_DATA = [
  { title: "New Accounts", value: 8, subtitle: "This Month", icon: Users, trend: "+3 from last month" },
  { title: "Failed Payments", value: 2, subtitle: "This Month", icon: CreditCard, trend: "−1 from last month" },
  { title: "No Logged Workouts", value: 749, subtitle: "Current", icon: Dumbbell, trend: null },
  { title: "Expiring Package Accounts", value: 33, subtitle: "Next 30 Days", icon: Package, trend: null },
  { title: "Expiring Card Accounts", value: 0, subtitle: "Next 30 Days", icon: CreditCardIcon, trend: null },
  { title: "Completed Assessment", value: 29, subtitle: "This Month", icon: ClipboardCheck, trend: "+12 from last month" },
];

const BREAKDOWN = [
  { label: "New Leads", count: 0, amount: null },
  { label: "New Clients", count: 0, amount: null },
  { label: "New Sales", count: 0, amount: "$0.00" },
  { label: "Renewals", count: 0, amount: "$0.00" },
  { label: "Refunds", count: 0, amount: "$0.00" },
  { label: "Cancellations", count: 0, amount: null },
  { label: "Failed Payments", count: 0, amount: "$0.00" },
];

export default function AdminDashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <select className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500">
            <option>Date Range</option>
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
          </select>
          <select className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500">
            <option>Compare To</option>
            <option>Previous Period</option>
            <option>Same Period Last Year</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* KPI Cards */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {KPI_DATA.map((kpi) => (
              <Card key={kpi.title}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-stone-500">{kpi.title}</p>
                      <p className="mt-2 text-3xl font-bold text-stone-900">{kpi.value.toLocaleString()}</p>
                      <p className="mt-1 text-xs text-stone-400">{kpi.subtitle}</p>
                    </div>
                    <div className="rounded-lg bg-stone-100 p-2">
                      <kpi.icon className="h-5 w-5 text-stone-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Breakdown Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-stone-900">Breakdown</h2>
                <select className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-600">
                  <option>Today</option>
                  <option>This Week</option>
                  <option>This Month</option>
                </select>
              </div>
              <div className="space-y-3">
                {BREAKDOWN.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-500">{item.count}</span>
                      <span className="text-stone-700">{item.label}</span>
                    </div>
                    {item.amount && (
                      <span className="text-stone-900 font-medium">{item.amount}</span>
                    )}
                  </div>
                ))}
                <div className="border-t border-stone-200 pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-900">Total change</span>
                  <span className="text-sm font-semibold text-red-600">$0.00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
