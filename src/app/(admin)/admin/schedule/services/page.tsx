"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/trpc/client";
import { Plus, Loader2 } from "lucide-react";

export default function ServicesPage() {
  const { data: services, isLoading } = trpc.schedule.services.list.useQuery();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <div className="flex gap-2">
          <Button size="sm"><Plus className="h-4 w-4" /> New Service</Button>
          <Button variant="secondary" size="sm">Manage Categories</Button>
        </div>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="px-4 py-3 text-left font-medium text-stone-600">Service Name</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Duration</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Category</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin text-stone-400 mx-auto" /></td></tr>
            ) : (services ?? []).length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-stone-400">No services found.</td></tr>
            ) : (
              (services ?? []).map((svc) => (
                <tr key={svc.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium">{svc.name}</td>
                  <td className="px-4 py-3"><Badge variant={svc.type === "CLASS" ? "info" : "outline"}>{svc.type === "CLASS" ? "Class" : "Appointment"}</Badge></td>
                  <td className="px-4 py-3">{svc.durationMinutes} min</td>
                  <td className="px-4 py-3 text-stone-500">{svc.category?.name || "—"}</td>
                  <td className="px-4 py-3 text-stone-500">{new Date(svc.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
