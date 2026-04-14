import { Badge } from "@/components/ui/badge";

const MOCK_RECURRING = [
  { id: "143307", name: "AMY Burnett", service: "1-on-1", staff: "Mada Hauck", day: "Monday", time: "1:30 PM - 2:30 PM", startDate: "2024-06-24" },
  { id: "143308", name: "AMY Burnett", service: "1-on-1", staff: "Michael Surges", day: "Thursday", time: "10:30 AM - 11:30 AM", startDate: "2025-11-13" },
  { id: "148064", name: "Max Rice", service: "1-on-1", staff: "Aaron Davis", day: "Tuesday", time: "10:30 AM - 11:30 AM", startDate: "2025-12-16" },
  { id: "166067", name: "Tyler Wheeler", service: "1-on-1", staff: "Madeline Gladu", day: "Wednesday", time: "9:30 AM - 10:30 AM", startDate: "2026-04-08" },
];

export default function RecurringMembersPage() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50">
            <th className="px-4 py-3 text-left font-medium text-stone-600">ID</th>
            <th className="px-4 py-3 text-left font-medium text-stone-600">Name</th>
            <th className="px-4 py-3 text-left font-medium text-stone-600">Service</th>
            <th className="px-4 py-3 text-left font-medium text-stone-600">Staff</th>
            <th className="px-4 py-3 text-left font-medium text-stone-600">Schedule</th>
            <th className="px-4 py-3 text-left font-medium text-stone-600">Start Date</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_RECURRING.map((r) => (
            <tr key={r.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 cursor-pointer transition-colors">
              <td className="px-4 py-3 text-stone-500">{r.id}</td>
              <td className="px-4 py-3 font-medium">{r.name}</td>
              <td className="px-4 py-3">{r.service}</td>
              <td className="px-4 py-3">{r.staff}</td>
              <td className="px-4 py-3">
                <p className="text-sm">Every week on {r.day}</p>
                <p className="text-xs text-stone-500">{r.time}</p>
              </td>
              <td className="px-4 py-3 text-stone-500">{new Date(r.startDate).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
