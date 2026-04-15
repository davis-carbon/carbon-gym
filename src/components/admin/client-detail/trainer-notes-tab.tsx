"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Plus, Trash2, Loader2 } from "lucide-react";

export function TrainerNotesTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [newNote, setNewNote] = useState("");

  const { data: notes, isLoading } = trpc.notes.listByClient.useQuery({ clientId });

  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => {
      toast("success", "Note added");
      setNewNote("");
      utils.notes.listByClient.invalidate({ clientId });
    },
    onError: (err) => toast("error", err.message),
  });

  const deleteNote = trpc.notes.delete.useMutation({
    onSuccess: () => {
      utils.notes.listByClient.invalidate({ clientId });
    },
  });

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
            <Button
              size="sm"
              disabled={!newNote.trim() || createNote.isPending}
              onClick={() => createNote.mutate({ clientId, content: newNote.trim() })}
            >
              <Plus className="h-4 w-4" /> {createNote.isPending ? "Adding..." : "Add Note"}
            </Button>
          </div>
        </div>

        {/* Notes list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          </div>
        ) : (notes ?? []).length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-4">No notes yet.</p>
        ) : (
          <div className="space-y-4">
            {(notes ?? []).map((note) => (
              <div key={note.id} className="rounded-lg border border-stone-100 p-4 group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={`${note.staff.firstName} ${note.staff.lastName}`} size="sm" />
                    <span className="text-sm font-medium">{note.staff.firstName} {note.staff.lastName}</span>
                    <span className="text-xs text-stone-400">
                      {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <button
                    onClick={() => { if (confirm("Delete this note?")) deleteNote.mutate({ id: note.id }); }}
                    className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-stone-700">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
