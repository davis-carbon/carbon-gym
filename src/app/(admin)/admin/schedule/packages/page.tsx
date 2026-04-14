"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const MOCK_PACKAGES = [
  { id: "1", name: "ORIGIN", type: "SESSION_PACK", price: 1499, billingCycle: "ONE_TIME", sessions: 12, isActive: true },
  { id: "2", name: "Monthly Unlimited", type: "MEMBERSHIP", price: 299, billingCycle: "MONTHLY", sessions: null, isActive: true },
  { id: "3", name: "10-Pack 1-on-1", type: "SESSION_PACK", price: 750, billingCycle: "ONE_TIME", sessions: 10, isActive: true },
  { id: "4", name: "Nutrition Program - Monthly", type: "MEMBERSHIP", price: 199, billingCycle: "MONTHLY", sessions: null, isActive: true },
  { id: "5", name: "Drop-In", type: "DROP_IN", price: 35, billingCycle: "ONE_TIME", sessions: 1, isActive: true },
  { id: "6", name: "Trial - 3 Sessions", type: "TRIAL", price: 99, billingCycle: "ONE_TIME", sessions: 3, isActive: true },
];

const typeLabels: Record<string, string> = {
  SESSION_PACK: "Session Pack",
  MEMBERSHIP: "Membership",
  DROP_IN: "Drop-In",
  TRIAL: "Trial",
};

export default function PackagesPage() {
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
              <th className="px-4 py-3 text-left font-medium text-stone-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PACKAGES.map((pkg) => (
              <tr key={pkg.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-medium">{pkg.name}</td>
                <td className="px-4 py-3"><Badge variant="outline">{typeLabels[pkg.type] || pkg.type}</Badge></td>
                <td className="px-4 py-3">${pkg.price.toLocaleString()}</td>
                <td className="px-4 py-3 text-stone-500">{pkg.billingCycle.charAt(0) + pkg.billingCycle.slice(1).toLowerCase().replace("_", " ")}</td>
                <td className="px-4 py-3">{pkg.sessions ?? "Unlimited"}</td>
                <td className="px-4 py-3"><Badge variant={pkg.isActive ? "success" : "outline"}>{pkg.isActive ? "Active" : "Inactive"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
