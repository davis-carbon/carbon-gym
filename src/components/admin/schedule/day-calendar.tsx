"use client";

import { format, setHours, setMinutes, isSameDay } from "date-fns";

// Staff columns — matches Exercise.com multi-staff day view
const STAFF = [
  { id: "1", name: "Mada Hauck", color: "#6B7280" },
  { id: "2", name: "Madeline Gladu", color: "#8B5CF6" },
  { id: "3", name: "Bri Larson", color: "#059669" },
  { id: "4", name: "Aaron Davis", color: "#2563EB" },
];

// Mock appointments
const APPOINTMENTS = [
  { id: "1", clientName: "Jamey Whitlock", service: "1-on-1", staffId: "1", startHour: 8, startMin: 30, durationMin: 60, color: null, status: "CONFIRMED" },
  { id: "2", clientName: "Scott Redding", service: "1-on-1", staffId: "1", startHour: 9, startMin: 30, durationMin: 60, color: null, status: "CONFIRMED" },
  { id: "3", clientName: "Christian Campos", service: "1-on-1", staffId: "1", startHour: 10, startMin: 30, durationMin: 60, color: null, status: "CONFIRMED" },
  { id: "4", clientName: "Shane Flores", service: "1-on-1", staffId: "1", startHour: 11, startMin: 30, durationMin: 60, color: null, status: "CONFIRMED" },
  { id: "5", clientName: "LUNCH", service: "", staffId: "1", startHour: 12, startMin: 30, durationMin: 59, color: "#E5E7EB", status: "CONFIRMED" },
  { id: "6", clientName: "Sarah Reuther", service: "1-on-1", staffId: "1", startHour: 13, startMin: 30, durationMin: 60, color: null, status: "CONFIRMED" },
  { id: "7", clientName: "Nolan Wheeler", service: "1-on-1", staffId: "1", startHour: 14, startMin: 30, durationMin: 30, color: null, status: "CONFIRMED" },
  { id: "8", clientName: "Annie Sendejo", service: "1-on-1", staffId: "1", startHour: 15, startMin: 30, durationMin: 60, color: null, status: "CONFIRMED" },
  { id: "9", clientName: "Emily Grigsby", service: "1-on-1", staffId: "1", startHour: 16, startMin: 30, durationMin: 60, color: null, status: "CONFIRMED" },
  { id: "10", clientName: "Semi-Private Training", service: "Semi-Private Training", staffId: "2", startHour: 8, startMin: 30, durationMin: 60, color: null, status: "CONFIRMED" },
  { id: "11", clientName: "Therapy", service: "Therapy", staffId: "2", startHour: 10, startMin: 0, durationMin: 59, color: "#FEF3C7", status: "CONFIRMED" },
  { id: "12", clientName: "Nutrition Program Check-In Call", service: "Nutrition Program Check-In Call", staffId: "3", startHour: 10, startMin: 0, durationMin: 60, color: "#F3F4F6", status: "CONFIRMED" },
  { id: "13", clientName: "Brett Hart", service: "1-on-1", staffId: "3", startHour: 11, startMin: 0, durationMin: 30, color: null, status: "CONFIRMED" },
  { id: "14", clientName: "Nutrition Program Check-In Call", service: "Nutrition Program Check-In Call", staffId: "3", startHour: 13, startMin: 0, durationMin: 60, color: "#F3F4F6", status: "CONFIRMED" },
  { id: "15", clientName: "Jesse Weissburg", service: "1-on-1", staffId: "4", startHour: 6, startMin: 45, durationMin: 60, color: null, status: "CONFIRMED" },
  { id: "16", clientName: "Ed Hockfield", service: "1-on-1", staffId: "4", startHour: 9, startMin: 30, durationMin: 60, color: null, status: "CONFIRMED" },
  { id: "17", clientName: "Caroline Joyner", service: "1-on-1", staffId: "4", startHour: 10, startMin: 30, durationMin: 60, color: null, status: "CONFIRMED" },
  { id: "18", clientName: "Matthew Schweitzer", service: "1-on-1", staffId: "4", startHour: 11, startMin: 30, durationMin: 60, color: null, status: "CONFIRMED" },
  { id: "19", clientName: "WRITING", service: "", staffId: "4", startHour: 12, startMin: 30, durationMin: 60, color: "#DBEAFE", status: "CONFIRMED" },
  { id: "20", clientName: "Max Rice", service: "1-on-1", staffId: "4", startHour: 13, startMin: 30, durationMin: 60, color: null, status: "CONFIRMED" },
  { id: "21", clientName: "Joyce Chapa", service: "1-on-1", staffId: "4", startHour: 14, startMin: 30, durationMin: 60, color: null, status: "CONFIRMED" },
  { id: "22", clientName: "Janet Rice", service: "1-on-1", staffId: "4", startHour: 15, startMin: 30, durationMin: 60, color: null, status: "CONFIRMED" },
];

// Hours to display
const START_HOUR = 6;
const END_HOUR = 19;
const HOUR_HEIGHT = 64; // px per hour

interface DayCalendarProps {
  date: Date;
}

export function DayCalendar({ date }: DayCalendarProps) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      {/* Staff header */}
      <div className="grid border-b border-stone-200 bg-stone-50" style={{ gridTemplateColumns: `64px repeat(${STAFF.length}, 1fr)` }}>
        <div className="border-r border-stone-200 p-3" />
        {STAFF.map((staff) => (
          <div key={staff.id} className="border-r border-stone-100 last:border-0 px-3 py-3 text-center">
            <p className="text-sm font-medium text-stone-900">{staff.name}</p>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="relative overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: `64px repeat(${STAFF.length}, 1fr)`,
            minHeight: hours.length * HOUR_HEIGHT,
          }}
        >
          {/* Time labels */}
          <div className="border-r border-stone-200">
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative border-b border-stone-100"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2.5 right-2 text-xs text-stone-400">
                  {hour === 0 ? "12AM" : hour < 12 ? `${hour}AM` : hour === 12 ? "12PM" : `${hour - 12}PM`}
                </span>
              </div>
            ))}
          </div>

          {/* Staff columns */}
          {STAFF.map((staff) => {
            const staffAppointments = APPOINTMENTS.filter((a) => a.staffId === staff.id);
            return (
              <div key={staff.id} className="relative border-r border-stone-100 last:border-0">
                {/* Hour lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-stone-100"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {/* Appointment blocks */}
                {staffAppointments.map((appt) => {
                  const topMinutes = (appt.startHour - START_HOUR) * 60 + appt.startMin;
                  const top = (topMinutes / 60) * HOUR_HEIGHT;
                  const height = (appt.durationMin / 60) * HOUR_HEIGHT;
                  const bgColor = appt.color || "#E5E7EB";

                  return (
                    <div
                      key={appt.id}
                      className="absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                      style={{
                        top,
                        height: Math.max(height - 2, 20),
                        backgroundColor: bgColor,
                      }}
                    >
                      <p className="text-xs font-medium text-stone-800 truncate">
                        {appt.startHour}:{appt.startMin.toString().padStart(2, "0")} - {formatEndTime(appt.startHour, appt.startMin, appt.durationMin)}
                      </p>
                      <p className="text-xs font-semibold text-stone-900 truncate">
                        {appt.clientName}
                      </p>
                      {appt.service && appt.service !== appt.clientName && (
                        <p className="text-xs text-stone-600 truncate">{appt.service}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatEndTime(startHour: number, startMin: number, durationMin: number): string {
  const totalMin = startHour * 60 + startMin + durationMin;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}
