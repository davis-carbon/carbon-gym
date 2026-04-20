"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import {
  Plus, Loader2, Search, ChevronDown, ChevronUp,
  Pencil, MoreVertical, Trash2, Settings,
} from "lucide-react";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ─── New / Edit Note Modal ────────────────────────────────────────────────────
function NoteModal({
  open,
  onClose,
  clientId,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  existing?: { id: string; title: string; content: string; noteDate: Date | string | null };
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const now = new Date();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [content, setContent] = useState(existing?.content ?? "");
  const [dateStr, setDateStr] = useState(
    existing?.noteDate
      ? new Date(existing.noteDate).toISOString().split("T")[0]
      : now.toISOString().split("T")[0]
  );
  const [timeStr, setTimeStr] = useState(
    existing?.noteDate
      ? new Date(existing.noteDate).toTimeString().slice(0, 5)
      : now.toTimeString().slice(0, 5)
  );

  const create = trpc.notes.create.useMutation({
    onSuccess: () => {
      toast("success", "Note saved");
      utils.notes.listByClient.invalidate({ clientId });
      onClose();
    },
    onError: (e) => toast("error", e.message),
  });

  const update = trpc.notes.update.useMutation({
    onSuccess: () => {
      toast("success", "Note updated");
      utils.notes.listByClient.invalidate({ clientId });
      onClose();
    },
    onError: (e) => toast("error", e.message),
  });

  const deleteNote = trpc.notes.delete.useMutation({
    onSuccess: () => {
      toast("success", "Note deleted");
      utils.notes.listByClient.invalidate({ clientId });
      onClose();
    },
    onError: (e) => toast("error", e.message),
  });

  function getNoteDate() {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(dateStr);
    d.setHours(h ?? 0, m ?? 0);
    return d;
  }

  function handleSave() {
    if (!title.trim() || !content.trim()) return;
    if (existing) {
      update.mutate({ id: existing.id, title: title.trim(), content: content.trim(), noteDate: getNoteDate() });
    } else {
      create.mutate({ clientId, title: title.trim(), content: content.trim(), noteDate: getNoteDate() });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? "Edit Note" : "New Note"}
      footer={
        <div className="flex items-center justify-between w-full">
          {existing ? (
            <button
              onClick={() => { if (confirm("Delete this note?")) deleteNote.mutate({ id: existing.id }); }}
              className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim() || !content.trim() || isPending}>
              {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Saving...</> : "Save Note"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
        />
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Notes *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note..."
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            rows={4}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Date *</label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Client Note Field Accordion ──────────────────────────────────────────────
function ClientNoteAccordion({
  clientId,
  field,
  value,
  onFieldUpdated,
  onFieldDeleted,
}: {
  clientId: string;
  field: { id: string; title: string };
  value: string;
  onFieldUpdated: () => void;
  onFieldDeleted: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newTitle, setNewTitle] = useState(field.title);

  const upsert = trpc.notes.upsertNoteValue.useMutation({
    onSuccess: () => {
      toast("success", "Saved");
      utils.notes.listNoteValues.invalidate({ clientId });
      setEditing(false);
    },
    onError: (e) => toast("error", e.message),
  });

  const updateField = trpc.notes.updateNoteField.useMutation({
    onSuccess: () => {
      toast("success", "Field title updated");
      onFieldUpdated();
      setShowRenameModal(false);
    },
    onError: (e) => toast("error", e.message),
  });

  const deleteField = trpc.notes.deleteNoteField.useMutation({
    onSuccess: () => {
      toast("success", "Field deleted");
      onFieldDeleted();
    },
    onError: (e) => toast("error", e.message),
  });

  return (
    <>
      <div className="border-b border-stone-100 last:border-0">
        {/* Accordion header */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-stone-50 transition-colors"
        >
          <span className="text-sm font-medium text-stone-800">{field.title}</span>
          {open ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
        </button>

        {/* Accordion body */}
        {open && (
          <div className="px-5 pb-4">
            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
                  rows={3}
                  placeholder="Enter note..."
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => { setDraft(value); setEditing(false); }}>Cancel</Button>
                  <Button size="sm" onClick={() => upsert.mutate({ clientId, fieldId: field.id, content: draft })} disabled={upsert.isPending}>
                    {upsert.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-stone-500 mb-3 min-h-[1.25rem]">
                  {value || "No Notes"}
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setDraft(value); setEditing(true); }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <DropdownMenu
                    trigger={
                      <button className="p-1 rounded hover:bg-stone-100">
                        <MoreVertical className="h-4 w-4 text-stone-400" />
                      </button>
                    }
                  >
                    <DropdownItem onClick={() => { setNewTitle(field.title); setShowRenameModal(true); }}>
                      Edit global field title
                    </DropdownItem>
                    <DropdownItem
                      danger
                      onClick={() => {
                        if (confirm(`Delete "${field.title}" for all clients?`)) {
                          deleteField.mutate({ id: field.id });
                        }
                      }}
                    >
                      Delete global field
                    </DropdownItem>
                  </DropdownMenu>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Rename field modal */}
      <Modal
        open={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        title="Edit global field title"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRenameModal(false)}>Cancel</Button>
            <Button
              onClick={() => updateField.mutate({ id: field.id, title: newTitle })}
              disabled={!newTitle.trim() || updateField.isPending}
            >
              {updateField.isPending ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <Input
          label="Field title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="e.g. Client Issues/Goals Overview"
        />
        <p className="text-xs text-stone-400 mt-2">This will change the field title for all clients.</p>
      </Modal>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function TrainerNotesTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [showAdd, setShowAdd] = useState(false);
  const [editingNote, setEditingNote] = useState<{
    id: string; title: string; content: string; noteDate: Date | string | null;
  } | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldTitle, setNewFieldTitle] = useState("");

  // Filters
  const [search, setSearch] = useState("");

  const { data: notes, isLoading: notesLoading } = trpc.notes.listByClient.useQuery({ clientId });
  const { data: noteFields, isLoading: fieldsLoading } = trpc.notes.listNoteFields.useQuery();
  const { data: noteValues } = trpc.notes.listNoteValues.useQuery({ clientId });

  const addField = trpc.notes.addNoteField.useMutation({
    onSuccess: () => {
      toast("success", "Field added");
      utils.notes.listNoteFields.invalidate();
      setShowAddField(false);
      setNewFieldTitle("");
    },
    onError: (e) => toast("error", e.message),
  });

  const getFieldValue = (fieldId: string) =>
    noteValues?.find((v) => v.fieldId === fieldId)?.content ?? "";

  const filteredNotes = (notes ?? []).filter((n) => {
    if (!search) return true;
    return (
      (n.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <>
      {/* ── Notes History ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white">
        <div className="flex items-start justify-between px-5 py-4 border-b border-stone-100">
          <div>
            <h3 className="font-semibold text-stone-900">Notes History</h3>
            <p className="text-xs text-stone-400 mt-0.5">View history of note edits over time</p>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        {/* Search / filters */}
        <div className="px-5 py-3 border-b border-stone-100 flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full rounded-lg border border-stone-200 pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
        </div>

        {/* Notes list */}
        <div className="px-5 py-4">
          {notesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400">
              <Search className="h-7 w-7 mb-2" />
              <p className="text-sm">No matching notes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border border-stone-100 p-4 hover:border-stone-200 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {note.title && (
                        <p className="text-sm font-semibold text-stone-900 mb-1">{note.title}</p>
                      )}
                      <p className="text-sm text-stone-700 whitespace-pre-wrap">{note.content}</p>
                    </div>
                    <button
                      onClick={() => setEditingNote({
                        id: note.id,
                        title: note.title ?? "",
                        content: note.content,
                        noteDate: note.noteDate,
                      })}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-stone-100 shrink-0 transition-all"
                    >
                      <Pencil className="h-3.5 w-3.5 text-stone-400" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-stone-400">
                      {note.staff.firstName} {note.staff.lastName}
                    </span>
                    <span className="text-stone-300 text-xs">·</span>
                    <span className="text-xs text-stone-400">
                      {fmtDate(note.noteDate ?? note.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Client Notes ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white mt-4">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">Client Notes</h3>
        </div>

        {fieldsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          </div>
        ) : (
          <div>
            {(noteFields ?? []).map((field) => (
              <ClientNoteAccordion
                key={field.id}
                clientId={clientId}
                field={field}
                value={getFieldValue(field.id)}
                onFieldUpdated={() => utils.notes.listNoteFields.invalidate()}
                onFieldDeleted={() => utils.notes.listNoteFields.invalidate()}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Manage ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white mt-4">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">Manage</h3>
        </div>
        <div className="p-5">
          <div className="rounded-lg border border-stone-200 p-4 max-w-sm">
            <div className="flex items-start gap-2 mb-2">
              <Settings className="h-4 w-4 text-stone-500 mt-0.5 shrink-0" />
              <p className="text-sm font-semibold text-stone-900">Add Client Notes Field</p>
            </div>
            <p className="text-xs text-stone-500 mb-3">Add a new notes field for all clients</p>
            <button
              onClick={() => setShowAddField(true)}
              className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
            >
              Open Dialog
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <NoteModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        clientId={clientId}
      />

      {editingNote && (
        <NoteModal
          open={true}
          onClose={() => setEditingNote(null)}
          clientId={clientId}
          existing={editingNote}
        />
      )}

      <Modal
        open={showAddField}
        onClose={() => setShowAddField(false)}
        title="Add Client Notes Field"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddField(false)}>Cancel</Button>
            <Button
              onClick={() => addField.mutate({ title: newFieldTitle })}
              disabled={!newFieldTitle.trim() || addField.isPending}
            >
              {addField.isPending ? "Adding..." : "Add Field"}
            </Button>
          </>
        }
      >
        <Input
          label="Field title"
          value={newFieldTitle}
          onChange={(e) => setNewFieldTitle(e.target.value)}
          placeholder="e.g. Emergency Contact Notes"
        />
        <p className="text-xs text-stone-400 mt-2">This field will appear for all clients.</p>
      </Modal>
    </>
  );
}
