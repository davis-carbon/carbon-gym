import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STAFF_AVAILABILITY = [
  {
    name: "Mada Hauck",
    slots: [
      { day: "Monday", time: "8:30 AM - 6:00 PM" },
      { day: "Wednesday", time: "8:30 AM - 6:00 PM" },
      { day: "Friday", time: "8:30 AM - 6:00 PM" },
    ],
  },
  {
    name: "Aaron Davis",
    slots: [
      { day: "Monday", time: "6:00 AM - 4:00 PM" },
      { day: "Tuesday", time: "6:00 AM - 4:00 PM" },
      { day: "Wednesday", time: "6:00 AM - 4:00 PM" },
      { day: "Thursday", time: "6:00 AM - 4:00 PM" },
      { day: "Friday", time: "6:00 AM - 4:00 PM" },
    ],
  },
  {
    name: "Bri Larson",
    slots: [
      { day: "Monday", time: "9:00 AM - 3:00 PM" },
      { day: "Tuesday", time: "9:00 AM - 3:00 PM" },
      { day: "Thursday", time: "9:00 AM - 3:00 PM" },
    ],
  },
  {
    name: "Madeline Gladu",
    slots: [
      { day: "Monday", time: "8:00 AM - 12:00 PM" },
      { day: "Wednesday", time: "8:00 AM - 12:00 PM" },
      { day: "Friday", time: "8:00 AM - 12:00 PM" },
    ],
  },
];

export default function AvailabilityPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {STAFF_AVAILABILITY.map((staff) => (
        <Card key={staff.name}>
          <CardHeader>
            <CardTitle>{staff.name}</CardTitle>
            <Badge variant="success">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {staff.slots.map((slot, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-stone-700">{slot.day}</span>
                  <span className="text-stone-500">{slot.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
