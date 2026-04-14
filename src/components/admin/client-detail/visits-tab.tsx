import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MOCK_VISITS = [
  { id: "1", service: "1-on-1", staff: "Mada Hauck", location: "CARBON", scheduledAt: "2026-04-14T08:30:00", status: "CONFIRMED" },
  { id: "2", service: "1-on-1", staff: "Mada Hauck", location: "CARBON", scheduledAt: "2026-04-11T08:30:00", status: "COMPLETED" },
  { id: "3", service: "1-on-1", staff: "Mada Hauck", location: "CARBON", scheduledAt: "2026-04-09T08:30:00", status: "COMPLETED" },
  { id: "4", service: "Semi-Private Training", staff: "Madeline Gladu", location: "CARBON", scheduledAt: "2026-04-07T08:30:00", status: "COMPLETED" },
  { id: "5", service: "1-on-1", staff: "Mada Hauck", location: "CARBON", scheduledAt: "2026-04-04T08:30:00", status: "COMPLETED" },
];

const statusVariant: Record<string, "success" | "info" | "warning" | "danger" | "outline"> = {
  RESERVED: "info",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
  EARLY_CANCEL: "danger",
  NO_SHOW: "warning",
};

export function VisitsTab({ clientId }: { clientId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visit History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left">
                <th className="px-3 py-2 font-medium text-stone-600">Date</th>
                <th className="px-3 py-2 font-medium text-stone-600">Service</th>
                <th className="px-3 py-2 font-medium text-stone-600">Staff</th>
                <th className="px-3 py-2 font-medium text-stone-600">Location</th>
                <th className="px-3 py-2 font-medium text-stone-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_VISITS.map((v) => (
                <tr key={v.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-3 py-2.5">
                    {new Date(v.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    <span className="text-stone-400 ml-1">
                      {new Date(v.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">{v.service}</td>
                  <td className="px-3 py-2.5">{v.staff}</td>
                  <td className="px-3 py-2.5">{v.location}</td>
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
      </CardContent>
    </Card>
  );
}
