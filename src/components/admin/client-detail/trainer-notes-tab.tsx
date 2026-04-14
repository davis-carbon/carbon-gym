"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Plus } from "lucide-react";

const MOCK_NOTES = [
  { id: "1", content: "Knee bothering on heavy squats — switch to safety bar for 2 weeks.", staffName: "Mada Hauck", createdAt: "2026-04-10T14:30:00" },
  { id: "2", content: "Great progress on deadlift — hit 315 for 3x5. Form was solid.", staffName: "Aaron Davis", createdAt: "2026-04-03T09:15:00" },
  { id: "3", content: "Mentioned wanting to start nutrition program. Follow up next session.", staffName: "Bri Larson", createdAt: "2026-03-28T11:00:00" },
];

export function TrainerNotesTab({ clientId }: { clientId: string }) {
  const [newNote, setNewNote] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Private Trainer Notes</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Add note */}
        <div className="mb-6">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-1 resize-none"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" disabled={!newNote.trim()} onClick={() => { console.log("Save note:", newNote); setNewNote(""); }}>
              <Plus className="h-4 w-4" /> Add Note
            </Button>
          </div>
        </div>

        {/* Notes list */}
        <div className="space-y-4">
          {MOCK_NOTES.map((note) => (
            <div key={note.id} className="rounded-lg border border-stone-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Avatar name={note.staffName} size="sm" />
                <span className="text-sm font-medium">{note.staffName}</span>
                <span className="text-xs text-stone-400">
                  {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <p className="text-sm text-stone-700">{note.content}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
