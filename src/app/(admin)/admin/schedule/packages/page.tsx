"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/trpc/client";
import { Plus, Loader2 } from "lucide-react";

const typeLabels: Record<string, string> = {
  SESSION_PACK: "Session Pack",
  MEMBERSHIP: "Membership",
  DROP_IN: "Drop-In",
  TRIAL: "Trial",
};

export default function PackagesPage() {
  const { data: packages, isLoading } = trpc.schedule.packages.list.useQuery();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button size="sm"><Plus className="h-4 w-4" /> New Package</Button>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="px-4 py-3 text-left font-medium text-stone-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Price</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Billing</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Sessions</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Clients</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin text-stone-400 mx-auto" /></td></tr>
            ) : (packages ?? []).length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-stone-400">No packages found.</td></tr>
            ) : (
              (packages ?? []).map((pkg) => (
                <tr key={pkg.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium">{pkg.name}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{typeLabels[pkg.packageType] || pkg.packageType}</Badge></td>
                  <td className="px-4 py-3">${pkg.price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-stone-500">{pkg.billingCycle.charAt(0) + pkg.billingCycle.slice(1).toLowerCase().replace("_", " ")}</td>
                  <td className="px-4 py-3">{pkg.sessionCount ?? "Unlimited"}</td>
                  <td className="px-4 py-3">{pkg._count.clientPackages}</td>
                  <td className="px-4 py-3"><Badge variant={pkg.isActive ? "success" : "outline"}>{pkg.isActive ? "Active" : "Inactive"}</Badge></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
