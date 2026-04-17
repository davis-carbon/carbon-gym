"use client";

import { trpc } from "@/trpc/client";
import { Loader2 } from "lucide-react";

const dayLabels: Record<string, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday", THURSDAY: "Thursday",
  FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};

export default function RecurringMembersPage() {
  const { data, isLoading } = trpc.schedule.recurring.list.useQuery();

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50">
            <th className="px-4 py-3 text-left font-medium text-stone-600">Client</th>
            <th className="px-4 py-3 text-left font-medium text-stone-600">Service</th>
            <th className="px-4 py-3 text-left font-medium text-stone-600">Staff</th>
            <th className="px-4 py-3 text-left font-medium text-stone-600">Schedule</th>
            <th className="px-4 py-3 text-left font-medium text-stone-600">Start Date</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={5} className="px-4 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin text-stone-400 mx-auto" /></td></tr>
          ) : (data ?? []).length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-12 text-center text-stone-400">No recurring members.</td></tr>
          ) : (
            (data ?? []).map((r) => (
              <tr key={r.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-medium">{r.client.firstName} {r.client.lastName}</td>
                <td className="px-4 py-3">{r.service.name}</td>
                <td className="px-4 py-3">{r.staff.firstName} {r.staff.lastName}</td>
                <td className="px-4 py-3">
                  <p className="text-sm">Every {r.frequency.toLowerCase()} on {dayLabels[r.dayOfWeek]}</p>
                  <p className="text-xs text-stone-500">{r.startTime}</p>
                </td>
                <td className="px-4 py-3 text-stone-500">{new Date(r.startDate).toLocaleDateString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
