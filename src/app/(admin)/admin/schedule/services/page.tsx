"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const MOCK_SERVICES = [
  { id: "1", name: "Discovery Call", type: "Appointment", duration: 20, category: "", createdAt: "2026-04-09" },
  { id: "2", name: "Gym Tour", type: "Appointment", duration: 30, category: "", createdAt: "2025-07-15" },
  { id: "3", name: "Semi-Private Training", type: "Class", duration: 60, category: "", createdAt: "2025-08-04" },
  { id: "4", name: "1-on-1", type: "Appointment", duration: 60, category: "", createdAt: "2023-10-31" },
  { id: "5", name: "Nutrition Program Check-In Call", type: "Appointment", duration: 30, category: "", createdAt: "2023-11-01" },
  { id: "6", name: "Initial Evaluation", type: "Appointment", duration: 90, category: "", createdAt: "2024-01-15" },
  { id: "7", name: "30-Minute Bodywork", type: "Appointment", duration: 30, category: "", createdAt: "2024-03-01" },
  { id: "8", name: "60 Minute Restorative Massage", type: "Appointment", duration: 60, category: "", createdAt: "2024-03-01" },
  { id: "9", name: "90 Minute Restorative", type: "Appointment", duration: 90, category: "", createdAt: "2024-06-15" },
  { id: "10", name: "Therapy", type: "Appointment", duration: 60, category: "", createdAt: "2024-08-01" },
];

export default function ServicesPage() {
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
            {MOCK_SERVICES.map((svc) => (
              <tr key={svc.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-medium">{svc.name}</td>
                <td className="px-4 py-3"><Badge variant={svc.type === "Class" ? "info" : "outline"}>{svc.type}</Badge></td>
                <td className="px-4 py-3">{svc.duration} min</td>
                <td className="px-4 py-3 text-stone-500">{svc.category || "—"}</td>
                <td className="px-4 py-3 text-stone-500">{new Date(svc.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
