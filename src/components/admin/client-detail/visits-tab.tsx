"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/trpc/client";
import { Loader2 } from "lucide-react";

const statusVariant: Record<string, "success" | "info" | "warning" | "danger" | "outline"> = {
  RESERVED: "info",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
  EARLY_CANCEL: "danger",
  NO_SHOW: "warning",
  LATE_CANCEL: "warning",
};

export function VisitsTab({ clientId }: { clientId: string }) {
  const { data: client } = trpc.clients.byId.useQuery({ id: clientId });
  const appointments = client?.appointments ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visit History</CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-4">No visits recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left">
                  <th className="px-3 py-2 font-medium text-stone-600">Date</th>
                  <th className="px-3 py-2 font-medium text-stone-600">Service</th>
                  <th className="px-3 py-2 font-medium text-stone-600">Staff</th>
                  <th className="px-3 py-2 font-medium text-stone-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((v) => (
                  <tr key={v.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-3 py-2.5">
                      {new Date(v.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      <span className="text-stone-400 ml-1">
                        {new Date(v.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{v.service.name}</td>
                    <td className="px-3 py-2.5">{v.staff.firstName} {v.staff.lastName}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={statusVariant[v.status] ?? "outline"}>
                        {v.status.charAt(0) + v.status.slice(1).toLowerCase().replace("_", " ")}
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
  );
}
