"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import {
  Search,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Eye,
  Pencil,
  Download,
  Trash2,
} from "lucide-react";

// ─── Field types ──────────────────────────────────────────────────────────────
type FieldType = "TEXT" | "NUMBER" | "SELECT" | "MULTI_SELECT" | "DATE" | "BOOLEAN" | "SCALE" | "TEXTAREA" | "FILE";

interface AssessmentField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  helpText?: string;
}

// ─── Date formatter ───────────────────────────────────────────────────────────
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ─── Single field renderer ────────────────────────────────────────────────────
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: AssessmentField;
  value: string | string[] | boolean | number;
  onChange: (val: string | string[] | boolean | number) => void;
}) {
  const base = "w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white";

  switch (field.type) {
    case "TEXTAREA":
      return <textarea className={`${base} resize-none`} rows={3} placeholder={field.placeholder} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "NUMBER":
      return <input type="number" className={base} placeholder={field.placeholder} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "DATE":
      return <input type="date" className={base} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "SELECT":
      return (
        <Select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          options={[{ value: "", label: "Select..." }, ...(field.options ?? []).map((o) => ({ value: o, label: o }))]}
        />
      );
    case "MULTI_SELECT":
      return (
        <div className="space-y-1.5">
          {(field.options ?? []).map((opt) => {
            const selected = Array.isArray(value) ? value.includes(opt) : false;
            return (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={selected} onChange={() => { const arr = Array.isArray(value) ? [...value] : []; onChange(selected ? arr.filter((v) => v !== opt) : [...arr, opt]); }} className="rounded" />
                <span className="text-sm text-stone-700">{opt}</span>
              </label>
            );
          })}
        </div>
      );
    case "BOOLEAN":
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={(value as boolean) ?? false} onChange={(e) => onChange(e.target.checked)} className="rounded" />
          <span className="text-sm text-stone-700">Yes</span>
        </label>
      );
    case "SCALE": {
      const min = field.min ?? 1;
      const max = field.max ?? 10;
      return (
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400">{min}</span>
          <input type="range" min={min} max={max} step={1} value={(value as number) ?? min} onChange={(e) => onChange(parseInt(e.target.value))} className="flex-1" />
          <span className="text-xs text-stone-400">{max}</span>
          <span className="w-8 text-center text-sm font-medium">{(value as number) ?? min}</span>
        </div>
      );
    }
    default:
      return <input type="text" className={base} placeholder={field.placeholder} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
}

// ─── Complete Assessment Modal ────────────────────────────────────────────────
function CompleteAssessmentModal({ clientId, open, onClose }: { clientId: string; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [step, setStep] = useState<"pick" | "fill">("pick");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [responses, setResponses] = useState<Record<string, string | string[] | boolean | number>>({});

  const { data: assessments } = trpc.assessments.list.useQuery({ isActive: true }, { enabled: open });
  const { data: selected } = trpc.assessments.byId.useQuery({ id: selectedId }, { enabled: !!selectedId && step === "fill" });

  const submit = trpc.assessments.submit.useMutation({
    onSuccess: () => {
      toast("success", "Assessment completed");
      utils.assessments.listSubmissions.invalidate({ clientId });
      handleClose();
    },
    onError: (e) => toast("error", e.message),
  });

  function handleClose() { setStep("pick"); setSearch(""); setSelectedId(""); setResponses({}); onClose(); }

  const filtered = (assessments ?? []).filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
  const fields = (selected?.fields as unknown as AssessmentField[]) ?? [];
  const missingRequired = fields.filter((f) => f.required).some((f) => { const v = responses[f.id]; if (Array.isArray(v)) return v.length === 0; return !v && v !== 0 && v !== false; });

  if (step === "pick") {
    return (
      <Modal open={open} onClose={handleClose} title="Complete Assessment"
        footer={<><Button variant="secondary" onClick={handleClose}>Cancel</Button><Button onClick={() => { if (selectedId) setStep("fill"); }} disabled={!selectedId}>Continue</Button></>}>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input className="w-full rounded-lg border border-stone-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" placeholder="Select an assessment or sequence" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {!assessments ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
              : filtered.length === 0 ? <p className="text-sm text-stone-400 text-center py-4">No assessments found.</p>
              : filtered.map((a) => (
                <button key={a.id} onClick={() => setSelectedId(a.id)}
                  className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${selectedId === a.id ? "border-stone-900 bg-stone-50" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"}`}>
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    {a.description && <p className="text-xs text-stone-400 mt-0.5 truncate max-w-xs">{a.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-stone-400">{(a.fields as unknown[]).length} fields</span>
                    <ChevronRight className="h-4 w-4 text-stone-300" />
                  </div>
                </button>
              ))}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title={selected?.name ?? "Complete Assessment"}
      footer={<><Button variant="secondary" onClick={() => setStep("pick")}>← Back</Button><Button onClick={() => submit.mutate({ assessmentId: selectedId, clientId, responses })} disabled={missingRequired || submit.isPending}>{submit.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Saving...</> : "Complete Assessment"}</Button></>}>
      <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
        {selected?.description && <p className="text-sm text-stone-500">{selected.description}</p>}
        {fields.length === 0 ? <p className="text-sm text-stone-400 text-center py-4">No fields.</p>
          : fields.map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
              {field.helpText && <p className="text-xs text-stone-400 mb-1.5">{field.helpText}</p>}
              <FieldInput field={field} value={responses[field.id] ?? (field.type === "MULTI_SELECT" ? [] : field.type === "BOOLEAN" ? false : field.type === "SCALE" ? (field.min ?? 1) : "")}
                onChange={(val) => setResponses((r) => ({ ...r, [field.id]: val }))} />
            </div>
          ))}
      </div>
    </Modal>
  );
}

// ─── Submission Results Modal ─────────────────────────────────────────────────
function SubmissionResultsModal({ submission, onClose }: {
  submission: { id: string; assessment: { name: string; fields: unknown }; responses: unknown; completedAt: Date | string };
  onClose: () => void;
}) {
  const fields = (submission.assessment.fields as AssessmentField[]) ?? [];
  const responses = (submission.responses as Record<string, unknown>) ?? {};

  function fmt(field: AssessmentField, val: unknown): string {
    if (val === null || val === undefined || val === "") return "—";
    if (field.type === "BOOLEAN") return val ? "Yes" : "No";
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  }

  return (
    <Modal open={true} onClose={onClose} title={submission.assessment.name}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      <p className="text-xs text-stone-400 mb-4">Completed {fmtDate(submission.completedAt)}</p>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {fields.map((f) => (
          <div key={f.id}>
            <p className="text-xs text-stone-500 mb-0.5">{f.label}</p>
            <p className="text-sm text-stone-900">{fmt(f, responses[f.id])}</p>
          </div>
        ))}
        {fields.length === 0 && <pre className="text-xs text-stone-600 bg-stone-50 rounded p-3 overflow-auto">{JSON.stringify(responses, null, 2)}</pre>}
      </div>
    </Modal>
  );
}

// ─── Assign Assessment Modal ──────────────────────────────────────────────────
function AssignAssessmentModal({ clientId, open, onClose }: { clientId: string; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [assessmentId, setAssessmentId] = useState("");
  const [sendReminders, setSendReminders] = useState(false);
  const [unassignAfterComplete, setUnassignAfterComplete] = useState(false);

  const { data: assessments } = trpc.assessments.list.useQuery({ isActive: true }, { enabled: open });

  const assign = trpc.assessments.assign.useMutation({
    onSuccess: () => {
      utils.assessments.listAssignments.invalidate({ clientId });
      toast("success", "Assessment assigned");
      setAssessmentId(""); setSendReminders(false); setUnassignAfterComplete(false);
      onClose();
    },
    onError: (e) => toast("error", e.message),
  });

  const options = [
    { value: "", label: "Select an assessment or sequence" },
    ...(assessments ?? []).map((a) => ({ value: a.id, label: a.name })),
  ];

  return (
    <Modal open={open} onClose={onClose} title="Assign New Assessment"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => assign.mutate({ clientId, assessmentId, sendReminders, unassignAfterComplete })} disabled={!assessmentId || assign.isPending}>{assign.isPending ? "Assigning..." : "Assign"}</Button></>}>
      <div className="space-y-4">
        <Select value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} options={options} />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={sendReminders} onChange={(e) => setSendReminders(e.target.checked)} className="rounded" />
          <span className="text-sm text-stone-700">Send reminders until client completes assessment(s)?</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={unassignAfterComplete} onChange={(e) => setUnassignAfterComplete(e.target.checked)} className="rounded" />
          <span className="text-sm text-stone-700">Unassign after client completes assessment(s)?</span>
        </label>
      </div>
    </Modal>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────
export function AssessmentsSection({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showComplete, setShowComplete] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [viewSub, setViewSub] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);

  const { data: client } = trpc.clients.byId.useQuery({ id: clientId });
  const clientName = client ? `${client.firstName} ${client.lastName}` : "this client";

  const { data: submissionsData, isLoading: loadingSubmissions } = trpc.assessments.listSubmissions.useQuery({
    clientId, search: search || undefined, page, perPage,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = trpc.assessments.listAssignments.useQuery({ clientId });

  const deleteSubmission = trpc.assessments.deleteSubmission.useMutation({
    onSuccess: () => utils.assessments.listSubmissions.invalidate({ clientId }),
    onError: (e) => toast("error", e.message),
  });

  const deleteAssignment = trpc.assessments.deleteAssignment.useMutation({
    onSuccess: () => utils.assessments.listAssignments.invalidate({ clientId }),
    onError: (e) => toast("error", e.message),
  });

  const submissions = submissionsData?.submissions ?? [];
  const total = submissionsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const viewSubData = submissions.find((s) => s.id === viewSub);

  return (
    <div className="space-y-6">
      {/* ── Completed Assessments ── */}
      <div className="rounded-xl border border-stone-200 bg-white">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div>
            <h3 className="font-semibold text-stone-800">Completed Assessments</h3>
            <p className="text-xs text-stone-500 mt-0.5">All completed assessments for {clientName}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setShowComplete(true)}>
            Complete Assessment
          </Button>
        </div>

        {/* Search */}
        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              className="w-full max-w-xs rounded-lg border border-stone-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="Search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Table */}
        {loadingSubmissions ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-stone-200 bg-stone-50 text-left">
                  <th className="px-6 py-2.5 font-medium text-stone-600">Name</th>
                  <th className="px-6 py-2.5 font-medium text-stone-600">Completed On</th>
                  <th className="px-6 py-2.5 w-12" />
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-stone-400">No assessments found.</td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                      <td className="px-6 py-3 font-medium text-stone-800">{sub.assessment.name}</td>
                      <td className="px-6 py-3 text-stone-500">
                        {sub.completedAt
                          ? fmtDate(sub.completedAt)
                          : <span className="text-stone-400">Incomplete</span>}
                      </td>
                      <td className="px-6 py-3">
                        <DropdownMenu>
                          <DropdownItem onClick={() => setViewSub(sub.id)}>
                            <Eye className="h-4 w-4" /> Results
                          </DropdownItem>
                          <DropdownItem onClick={() => { setViewSub(sub.id); setShowComplete(true); }}>
                            <Pencil className="h-4 w-4" /> Continue Progress
                          </DropdownItem>
                          <DropdownItem onClick={() => toast("info", "CSV export coming soon")}>
                            <Download className="h-4 w-4" /> Download as CSV
                          </DropdownItem>
                          <DropdownItem danger onClick={() => { if (confirm("Delete this assessment submission?")) deleteSubmission.mutate({ id: sub.id }); }}>
                            <Trash2 className="h-4 w-4" /> Delete Assessment
                          </DropdownItem>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-stone-100 text-sm text-stone-500">
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded p-1 hover:bg-stone-100 disabled:opacity-30">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-xs font-medium">{page}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded p-1 hover:bg-stone-100 disabled:opacity-30">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-xs">{(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Assigned Assessments ── */}
      <div className="rounded-xl border border-stone-200 bg-white">
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div>
            <h3 className="font-semibold text-stone-800">Assigned Assessments</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Assessments can be assigned to accounts to track their progress or to gather new information
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setShowAssign(true)}>
            Assign New Assessment
          </Button>
        </div>

        <div className="px-6 pb-5">
          {loadingAssignments ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-stone-400">
              <Search className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No assigned assessments</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left">
                  <th className="py-2 font-medium text-stone-600">Assessment</th>
                  <th className="py-2 font-medium text-stone-600">Assigned</th>
                  <th className="py-2 font-medium text-stone-600">Status</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-stone-100 last:border-0">
                    <td className="py-3 font-medium text-stone-800">{a.assessment.name}</td>
                    <td className="py-3 text-stone-500">{fmtDate(a.assignedAt)}</td>
                    <td className="py-3">
                      <Badge variant={a.completedAt ? "success" : "warning"}>
                        {a.completedAt ? "Completed" : "Pending"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <DropdownMenu>
                        <DropdownItem danger onClick={() => { if (confirm("Remove this assignment?")) deleteAssignment.mutate({ id: a.id }); }}>
                          <Trash2 className="h-4 w-4" /> Remove
                        </DropdownItem>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <CompleteAssessmentModal clientId={clientId} open={showComplete} onClose={() => { setShowComplete(false); setViewSub(null); }} />
      <AssignAssessmentModal clientId={clientId} open={showAssign} onClose={() => setShowAssign(false)} />
      {viewSubData && !showComplete && (
        <SubmissionResultsModal submission={viewSubData as never} onClose={() => setViewSub(null)} />
      )}
    </div>
  );
}
