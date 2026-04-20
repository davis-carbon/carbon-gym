"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

// ─── Field Types ─────────────────────────────────────────────────────────────

type FieldType =
  | "TEXT"
  | "NUMBER"
  | "SELECT"
  | "MULTI_SELECT"
  | "DATE"
  | "BOOLEAN"
  | "SCALE"
  | "TEXTAREA"
  | "FILE";

const FIELD_ICONS: Record<FieldType, string> = {
  TEXT: "T",
  NUMBER: "#",
  SELECT: "▾",
  MULTI_SELECT: "☰",
  DATE: "📅",
  BOOLEAN: "✓",
  SCALE: "1-5",
  TEXTAREA: "≡",
  FILE: "📎",
};

const FIELD_LABELS: Record<FieldType, string> = {
  TEXT: "Short Text",
  NUMBER: "Number",
  SELECT: "Dropdown",
  MULTI_SELECT: "Multi-Select",
  DATE: "Date",
  BOOLEAN: "Yes / No",
  SCALE: "Rating Scale",
  TEXTAREA: "Long Text",
  FILE: "File Upload",
};

interface AssessmentField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  helpText?: string;
}

function generateFieldId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Submissions Tab ──────────────────────────────────────────────────────────

type Submission = {
  id: string;
  completedAt: Date | string;
  responses: unknown;
  client: { id: string; firstName: string; lastName: string; email?: string | null };
};

function SubmissionsTab({ submissions }: { submissions: Submission[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!submissions.length) {
    return <p className="text-center text-sm text-stone-400 py-8">No submissions yet.</p>;
  }

  return (
    <div className="space-y-2">
      {submissions.map((sub) => (
        <div key={sub.id} className="rounded-xl border border-stone-200 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-50 transition-colors"
            onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
          >
            <div>
              <p className="font-medium text-sm text-stone-900">
                {sub.client.firstName} {sub.client.lastName}
              </p>
              <p className="text-xs text-stone-500">
                {sub.client.email ? `${sub.client.email} · ` : ""}
                {new Date(sub.completedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-stone-400 transition-transform ${
                expanded === sub.id ? "rotate-180" : ""
              }`}
            />
          </button>
          {expanded === sub.id && (
            <div className="border-t border-stone-100 px-4 py-3 bg-stone-50">
              <dl className="space-y-2">
                {Object.entries(sub.responses as Record<string, unknown>).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-medium text-stone-600">{k}</dt>
                    <dd className="text-sm text-stone-900 mt-0.5">
                      {Array.isArray(v) ? v.join(", ") : String(v ?? "—")}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Field Editor ─────────────────────────────────────────────────────────────

function FieldEditor({
  field,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  field: AssessmentField;
  onUpdate: (f: AssessmentField) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [optionsStr, setOptionsStr] = useState(field.options?.join("\n") ?? "");

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="text-stone-300 hover:text-stone-600 disabled:opacity-20 leading-none"
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="text-stone-300 hover:text-stone-600 disabled:opacity-20 leading-none"
          >
            ▼
          </button>
        </div>
        <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500 shrink-0">
          {FIELD_ICONS[field.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-900 truncate">
            {field.label || "Untitled field"}
          </p>
          <p className="text-xs text-stone-400">
            {FIELD_LABELS[field.type]}
            {field.required ? " · Required" : ""}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-stone-400 hover:text-stone-600 p-1"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button onClick={onDelete} className="text-stone-300 hover:text-red-500 p-1">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-stone-100 p-4 bg-stone-50 space-y-3">
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">
              Question Label *
            </label>
            <input
              value={field.label}
              onChange={(e) => onUpdate({ ...field, label: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">
              Placeholder / Hint
            </label>
            <input
              value={field.placeholder ?? ""}
              onChange={(e) => onUpdate({ ...field, placeholder: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>

          {(field.type === "SELECT" || field.type === "MULTI_SELECT") && (
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">
                Options (one per line)
              </label>
              <textarea
                value={optionsStr}
                onChange={(e) => {
                  setOptionsStr(e.target.value);
                  onUpdate({
                    ...field,
                    options: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  });
                }}
                rows={4}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white focus:outline-none resize-none"
                placeholder={"Option 1\nOption 2\nOption 3"}
              />
            </div>
          )}

          {field.type === "SCALE" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">Min</label>
                <input
                  type="number"
                  value={field.min ?? 1}
                  onChange={(e) => onUpdate({ ...field, min: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">Max</label>
                <input
                  type="number"
                  value={field.max ?? 10}
                  onChange={(e) => onUpdate({ ...field, max: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">Help Text</label>
            <input
              value={field.helpText ?? ""}
              onChange={(e) => onUpdate({ ...field, helpText: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white focus:outline-none"
              placeholder="Additional context for the client"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`req-${field.id}`}
              checked={field.required ?? false}
              onChange={(e) => onUpdate({ ...field, required: e.target.checked })}
              className="rounded"
            />
            <label htmlFor={`req-${field.id}`} className="text-sm text-stone-700">
              Required
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Form Builder Tab ─────────────────────────────────────────────────────────

function FormBuilderTab({
  assessment,
}: {
  assessment: { id: string; name: string; fields: unknown };
}) {
  const utils = trpc.useUtils();
  const [fields, setFields] = useState<AssessmentField[]>(() => {
    try {
      const raw = (assessment.fields as AssessmentField[]) ?? [];
      // Ensure every field has a unique string ID (imported data may have
      // numeric/duplicate/null IDs that cause React "duplicate key" warnings)
      const seen = new Set<string>();
      return raw.map((f) => {
        const id = f.id && !seen.has(String(f.id)) ? String(f.id) : generateFieldId();
        seen.add(id);
        return { ...f, id };
      });
    } catch {
      return [];
    }
  });
  const [dirty, setDirty] = useState(false);
  const [addingType, setAddingType] = useState<FieldType | null>(null);

  const update = trpc.assessments.update.useMutation({
    onSuccess: () => {
      utils.assessments.byId.invalidate();
      setDirty(false);
    },
  });

  const mutateFields = (next: AssessmentField[]) => {
    setFields(next);
    setDirty(true);
  };

  const addField = (type: FieldType) => {
    mutateFields([
      ...fields,
      { id: generateFieldId(), type, label: "", required: false },
    ]);
    setAddingType(null);
  };

  const updateField = (i: number, f: AssessmentField) =>
    mutateFields(fields.map((x, idx) => (idx === i ? f : x)));
  const deleteField = (i: number) =>
    mutateFields(fields.filter((_, idx) => idx !== i));
  const moveUp = (i: number) => {
    if (i === 0) return;
    const arr = [...fields];
    [arr[i - 1], arr[i]] = [arr[i]!, arr[i - 1]!];
    mutateFields(arr);
  };
  const moveDown = (i: number) => {
    if (i === fields.length - 1) return;
    const arr = [...fields];
    [arr[i + 1], arr[i]] = [arr[i]!, arr[i + 1]!];
    mutateFields(arr);
  };

  return (
    <div className="space-y-3">
      {/* Save bar */}
      {dirty && (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-4 py-2">
          <p className="text-sm text-amber-700">Unsaved changes</p>
          <Button
            size="sm"
            onClick={() =>
              update.mutate({ id: assessment.id, fields: fields as never })
            }
            disabled={update.isPending}
          >
            {update.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Save Form"
            )}
          </Button>
        </div>
      )}

      {/* Field list */}
      {fields.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 py-12 text-stone-400">
          <p className="text-sm mb-3">No fields yet</p>
          <p className="text-xs">Add a field below to start building your form</p>
        </div>
      )}
      {fields.map((field, i) => (
        <FieldEditor
          key={field.id}
          field={field}
          isFirst={i === 0}
          isLast={i === fields.length - 1}
          onUpdate={(f) => updateField(i, f)}
          onDelete={() => deleteField(i)}
          onMoveUp={() => moveUp(i)}
          onMoveDown={() => moveDown(i)}
        />
      ))}

      {/* Add field */}
      {addingType === null ? (
        <button
          onClick={() => setAddingType("TEXT")}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 py-3 text-sm text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Field
        </button>
      ) : (
        <div className="rounded-xl border-2 border-stone-300 p-3 bg-stone-50">
          <p className="text-xs font-medium text-stone-600 mb-2">Select field type:</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(FIELD_LABELS) as FieldType[]).map((type) => (
              <button
                key={type}
                onClick={() => addField(type)}
                className="flex flex-col items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:border-stone-400 transition-colors"
              >
                <span className="text-base">{FIELD_ICONS[type]}</span>
                <span>{FIELD_LABELS[type]}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setAddingType(null)}
            className="mt-2 text-xs text-stone-400 hover:text-stone-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssessmentBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: assessment, isLoading } = trpc.assessments.byId.useQuery({ id });

  const [activeTab, setActiveTab] = useState<"builder" | "submissions">("builder");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameDirty, setNameDirty] = useState(false);

  // Hydrate name/description from loaded data (once)
  const [hydrated, setHydrated] = useState(false);
  if (assessment && !hydrated) {
    setName(assessment.name);
    setDescription(assessment.description ?? "");
    setHydrated(true);
  }

  const updateAssessment = trpc.assessments.update.useMutation({
    onSuccess: () => {
      toast("success", "Assessment saved");
      setNameDirty(false);
      utils.assessments.byId.invalidate({ id });
      utils.assessments.list.invalidate();
    },
    onError: (err) => toast("error", err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-red-600">Assessment not found.</p>
        <Link
          href="/admin/assessments"
          className="text-sm text-stone-500 underline mt-2 inline-block"
        >
          Back to assessments
        </Link>
      </div>
    );
  }

  const submissionCount = assessment.submissions.length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/assessments"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to assessments
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Input
              label=""
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameDirty(true);
              }}
              placeholder="Assessment name"
              className="text-xl font-semibold"
            />
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setNameDirty(true);
              }}
              placeholder="Description (optional — shown to clients)"
              rows={2}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>
          <div className="flex items-center gap-2">
            {assessment.isActive ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="outline">Archived</Badge>
            )}
            {nameDirty && (
              <Button
                onClick={() =>
                  updateAssessment.mutate({
                    id,
                    name,
                    description: description || null,
                  })
                }
                disabled={!name || updateAssessment.isPending}
              >
                <Save className="h-4 w-4" />
                {updateAssessment.isPending ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-stone-200">
        <button
          onClick={() => setActiveTab("builder")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "builder"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-700"
          }`}
        >
          Form Builder
        </button>
        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px inline-flex items-center gap-1.5 ${
            activeTab === "submissions"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-700"
          }`}
        >
          Submissions
          {submissionCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-stone-900 text-white text-xs font-medium h-4 min-w-[1rem] px-1">
              {submissionCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "builder" && <FormBuilderTab assessment={assessment} />}

      {activeTab === "submissions" && (
        <SubmissionsTab submissions={assessment.submissions} />
      )}
    </div>
  );
}
