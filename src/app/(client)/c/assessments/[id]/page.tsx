"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Loader2 } from "lucide-react";

type FieldType =
  | "TEXT"
  | "NUMBER"
  | "SELECT"
  | "MULTI_SELECT"
  | "DATE"
  | "BOOLEAN"
  | "SCALE"
  | "TEXTAREA"
  | "FILE"
  // legacy aliases kept for backward compat
  | "LONG_TEXT"
  | "CHECKBOX"
  | "RATING";

interface AssessmentField {
  // supports both old schema (name) and new schema (id)
  id?: string;
  name?: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  helpText?: string;
}

/** Returns the key used to store/look up a field's response. */
function fieldKey(f: AssessmentField): string {
  return f.id ?? f.name ?? f.label;
}

export default function PortalAssessmentCompletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: assessment, isLoading } = trpc.portal.assessmentById.useQuery({ id });
  const [responses, setResponses] = useState<Record<string, unknown>>({});

  const submit = trpc.portal.submitAssessment.useMutation({
    onSuccess: () => {
      toast("success", "Thanks! Your trainer will review shortly.");
      utils.portal.assessments.invalidate();
      router.push("/c/assessments");
    },
    onError: (err) => toast("error", err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-red-600">Assessment not available.</p>
        <Link href="/c/assessments" className="text-sm text-stone-500 underline mt-2 inline-block">
          Back
        </Link>
      </div>
    );
  }

  const fields: AssessmentField[] = Array.isArray(assessment.fields)
    ? (assessment.fields as unknown as AssessmentField[])
    : [];

  function setField(key: string, value: unknown) {
    setResponses((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    for (const f of fields) {
      if (!f.required) continue;
      const key = fieldKey(f);
      const v = responses[key];
      const empty =
        v === undefined ||
        v === null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0);
      if (empty) return `Please answer: ${f.label}`;
    }
    return null;
  }

  function handleSubmit() {
    const err = validate();
    if (err) {
      toast("error", err);
      return;
    }
    submit.mutate({ assessmentId: id, responses: responses as Record<string, unknown> });
  }

  return (
    <div className="space-y-4">
      <Link
        href="/c/assessments"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div>
        <h2 className="text-xl font-bold text-stone-900">{assessment.name}</h2>
        {assessment.description && (
          <p className="text-sm text-stone-500 mt-1">{assessment.description}</p>
        )}
      </div>

      <div className="space-y-3">
        {fields.map((f) => {
          const key = fieldKey(f);
          return (
            <Card key={key}>
              <CardContent className="pt-4 pb-4">
                <div className="block">
                  <div className="text-sm font-medium text-stone-900">
                    {f.label}
                    {f.required && <span className="text-red-500 ml-1">*</span>}
                  </div>
                  {f.helpText && (
                    <p className="text-xs text-stone-500 mt-0.5">{f.helpText}</p>
                  )}
                  <div className="mt-2">
                    <FieldInput
                      field={f}
                      value={responses[key]}
                      onChange={(v) => setField(key, v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {fields.length === 0 && (
          <p className="text-sm text-stone-400 text-center py-8">
            This assessment has no questions yet.
          </p>
        )}
      </div>

      <div className="sticky bottom-20 pt-2">
        <Button
          onClick={handleSubmit}
          disabled={submit.isPending || fields.length === 0}
          className="w-full"
          size="lg"
        >
          {submit.isPending ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: AssessmentField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const baseInput =
    "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500";

  switch (field.type) {
    case "TEXT":
      return (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={baseInput}
        />
      );

    case "TEXTAREA":
    case "LONG_TEXT":
      return (
        <textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={`${baseInput} resize-none`}
        />
      );

    case "NUMBER":
      return (
        <input
          type="number"
          value={String(value ?? "")}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Number(e.target.value))
          }
          placeholder={field.placeholder}
          className={baseInput}
        />
      );

    case "DATE":
      return (
        <input
          type="date"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={baseInput}
        />
      );

    case "BOOLEAN":
    case "CHECKBOX": {
      return (
        <div className="flex gap-3">
          {["Yes", "No"].map((opt) => {
            const isSelected =
              (opt === "Yes" && value === true) || (opt === "No" && value === false);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt === "Yes")}
                className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                  isSelected
                    ? "border-stone-800 bg-stone-800 text-white"
                    : "border-stone-200 text-stone-600 hover:border-stone-400"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    case "SELECT":
      return (
        <div className="space-y-2">
          {(field.options ?? []).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`w-full text-left rounded-xl border-2 px-4 py-2.5 text-sm transition-colors ${
                value === opt
                  ? "border-stone-800 bg-stone-50"
                  : "border-stone-200 hover:border-stone-400"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      );

    case "MULTI_SELECT": {
      const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2">
          {(field.options ?? []).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() =>
                onChange(
                  selected.includes(opt)
                    ? selected.filter((s) => s !== opt)
                    : [...selected, opt]
                )
              }
              className={`w-full text-left rounded-xl border-2 px-4 py-2.5 text-sm transition-colors ${
                selected.includes(opt)
                  ? "border-stone-800 bg-stone-50"
                  : "border-stone-200 hover:border-stone-400"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    case "SCALE":
    case "RATING": {
      const min = field.min ?? 1;
      const max = field.max ?? 10;
      const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      const current = typeof value === "number" ? value : null;
      return (
        <div className="flex gap-1">
          {nums.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-colors ${
                current === n
                  ? "border-stone-800 bg-stone-800 text-white"
                  : "border-stone-200 text-stone-600 hover:border-stone-400"
              }`}
              aria-label={`${n}`}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    case "FILE":
      return (
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            onChange(file ? file.name : "");
          }}
          className="w-full text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
        />
      );

    default:
      return (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={baseInput}
        />
      );
  }
}
