"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Plus, Trash2, Youtube, Video, ExternalLink } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSCLE_GROUPS = [
  { value: "", label: "None" },
  { value: "CHEST", label: "Chest" }, { value: "BACK", label: "Back" },
  { value: "SHOULDERS", label: "Shoulders" }, { value: "BICEPS", label: "Biceps" },
  { value: "TRICEPS", label: "Triceps" }, { value: "FOREARMS", label: "Forearms" },
  { value: "QUADRICEPS", label: "Quadriceps" }, { value: "HAMSTRINGS", label: "Hamstrings" },
  { value: "GLUTES", label: "Glutes" }, { value: "CALVES", label: "Calves" },
  { value: "CORE", label: "Core" }, { value: "ABS", label: "Abs" },
  { value: "OBLIQUES", label: "Obliques" }, { value: "FULL_BODY", label: "Full Body" },
  { value: "CARDIO", label: "Cardio" }, { value: "OTHER", label: "Other" },
];

const DIFFICULTY_LEVELS = [
  { value: "", label: "None" },
  { value: "BEGINNER", label: "Beginner" }, { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" }, { value: "EXPERT", label: "Expert" },
];

const FORCE_TYPES = [
  { value: "", label: "None" },
  { value: "PUSH", label: "Push" }, { value: "PULL", label: "Pull" },
  { value: "STATIC", label: "Static" }, { value: "DYNAMIC", label: "Dynamic" },
];

const EXERCISE_TYPES = [
  { value: "", label: "None" },
  { value: "Strength", label: "Strength" }, { value: "Cardio", label: "Cardio" },
  { value: "Mobility", label: "Mobility" }, { value: "Flexibility", label: "Flexibility" },
  { value: "Plyometric", label: "Plyometric" }, { value: "Olympic", label: "Olympic" },
  { value: "Functional", label: "Functional" }, { value: "Balance", label: "Balance" },
];

const MECHANICS_OPTIONS = [
  { value: "", label: "None" },
  { value: "Compound", label: "Compound" }, { value: "Isolation", label: "Isolation" },
];

const LATERALITY_OPTIONS = [
  { value: "", label: "None" },
  { value: "Bilateral", label: "Bilateral (both sides)" },
  { value: "Unilateral", label: "Unilateral (one side)" },
  { value: "Each Side", label: "Each Side (log per side)" },
];

type Tab = "basics" | "video" | "steps" | "advanced";

// ─── YouTube helpers ──────────────────────────────────────────────────────────

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function isYoutubeUrl(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}

// ─── Array editor ─────────────────────────────────────────────────────────────

function ArrayEditor({
  label, placeholder, items, onChange,
}: {
  label: string; placeholder: string; items: string[]; onChange: (v: string[]) => void;
}) {
  function update(idx: number, val: string) {
    const next = [...items];
    next[idx] = val;
    onChange(next);
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-2">{label}</label>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-stone-400 w-5 text-right flex-shrink-0">{idx + 1}.</span>
            <input
              value={item}
              onChange={(e) => update(idx, e.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            <button onClick={() => remove(idx)} className="text-stone-300 hover:text-red-500 transition-colors flex-shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add {items.length === 0 ? "first item" : "another"}
        </button>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface ExerciseFormModalProps {
  open: boolean;
  onClose: () => void;
  exerciseId?: string | null;
}

const EMPTY_FORM = {
  name: "", description: "", muscleGroup: "", secondaryMuscles: [] as string[],
  difficultyLevel: "", forceType: "", equipment: "", videoUrl: "", instructions: "",
  exerciseType: "", mechanics: "", laterality: "", isEachSide: false,
  tempo: "", steps: [] as string[], tips: [] as string[], variations: [] as string[],
  tags: [] as string[],
};

export function ExerciseFormModal({ open, onClose, exerciseId }: ExerciseFormModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const isEdit = !!exerciseId;
  const [tab, setTab] = useState<Tab>("basics");
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: existing } = trpc.exercises.byId.useQuery({ id: exerciseId! }, { enabled: !!exerciseId && open });

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name,
        description: existing.description ?? "",
        muscleGroup: existing.muscleGroup ?? "",
        secondaryMuscles: (existing.secondaryMuscles as string[]) ?? [],
        difficultyLevel: existing.difficultyLevel ?? "",
        forceType: existing.forceType ?? "",
        equipment: existing.equipment ?? "",
        videoUrl: existing.videoUrl ?? "",
        instructions: existing.instructions ?? "",
        exerciseType: existing.exerciseType ?? "",
        mechanics: existing.mechanics ?? "",
        laterality: existing.laterality ?? "",
        isEachSide: existing.isEachSide,
        tempo: existing.tempo ?? "",
        steps: existing.steps ?? [],
        tips: existing.tips ?? [],
        variations: existing.variations ?? [],
        tags: existing.tags ?? [],
      });
    }
    if (!exerciseId) {
      setForm(EMPTY_FORM);
      setTab("basics");
    }
  }, [existing, isEdit, exerciseId]);

  const createExercise = trpc.exercises.create.useMutation({
    onSuccess: () => { toast("success", "Exercise created"); utils.exercises.list.invalidate(); onClose(); },
    onError: (err) => toast("error", err.message),
  });

  const updateExercise = trpc.exercises.update.useMutation({
    onSuccess: () => { toast("success", "Exercise updated"); utils.exercises.list.invalidate(); utils.exercises.byId.invalidate({ id: exerciseId! }); onClose(); },
    onError: (err) => toast("error", err.message),
  });

  function handleSubmit() {
    const data = {
      name: form.name,
      description: form.description || undefined,
      instructions: form.instructions || undefined,
      muscleGroup: form.muscleGroup || undefined,
      secondaryMuscles: form.secondaryMuscles.filter(Boolean),
      difficultyLevel: form.difficultyLevel || undefined,
      forceType: form.forceType || undefined,
      equipment: form.equipment || undefined,
      videoUrl: form.videoUrl || undefined,
      exerciseType: form.exerciseType || undefined,
      mechanics: form.mechanics || undefined,
      laterality: form.laterality || undefined,
      isEachSide: form.isEachSide,
      tempo: form.tempo || undefined,
      steps: form.steps.filter(Boolean),
      tips: form.tips.filter(Boolean),
      variations: form.variations.filter(Boolean),
      tags: form.tags.filter(Boolean),
    };

    if (isEdit) {
      updateExercise.mutate({ id: exerciseId!, ...data });
    } else {
      createExercise.mutate(data);
    }
  }

  const isPending = createExercise.isPending || updateExercise.isPending;
  const youtubeId = form.videoUrl ? extractYoutubeId(form.videoUrl) : null;

  // Secondary muscles multi-select chip toggle
  const muscleOptions = MUSCLE_GROUPS.slice(1); // skip empty
  function toggleSecondary(val: string) {
    setForm((f) => ({
      ...f,
      secondaryMuscles: f.secondaryMuscles.includes(val)
        ? f.secondaryMuscles.filter((m) => m !== val)
        : [...f.secondaryMuscles, val],
    }));
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "basics", label: "Basics" },
    { key: "video", label: "Video" },
    { key: "steps", label: "Steps & Tips" },
    { key: "advanced", label: "Advanced" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Exercise" : "Add New Exercise"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.name || isPending}>
            {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Exercise"}
          </Button>
        </>
      }
    >
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-stone-200 -mt-1 mb-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Basics ── */}
      {tab === "basics" && (
        <div className="space-y-4">
          <Input label="Exercise Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of the exercise…"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Exercise Type" value={form.exerciseType} onChange={(e) => setForm({ ...form, exerciseType: e.target.value })} options={EXERCISE_TYPES} />
            <Select label="Mechanics" value={form.mechanics} onChange={(e) => setForm({ ...form, mechanics: e.target.value })} options={MECHANICS_OPTIONS} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Primary Muscle Group" value={form.muscleGroup} onChange={(e) => setForm({ ...form, muscleGroup: e.target.value })} options={MUSCLE_GROUPS} />
            <Select label="Force Type" value={form.forceType} onChange={(e) => setForm({ ...form, forceType: e.target.value })} options={FORCE_TYPES} />
          </div>

          {/* Secondary muscles */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Secondary Muscles</label>
            <div className="flex flex-wrap gap-1.5">
              {muscleOptions.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => toggleSecondary(m.value)}
                  className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${
                    form.secondaryMuscles.includes(m.value)
                      ? "bg-stone-900 text-white border-stone-900"
                      : "border-stone-200 text-stone-500 hover:border-stone-400"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Difficulty" value={form.difficultyLevel} onChange={(e) => setForm({ ...form, difficultyLevel: e.target.value })} options={DIFFICULTY_LEVELS} />
            <Input label="Equipment" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} placeholder="e.g. Barbell, Dumbbell…" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Laterality</label>
            <div className="flex gap-2">
              {LATERALITY_OPTIONS.slice(1).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setForm({ ...form, laterality: form.laterality === o.value ? "" : o.value, isEachSide: o.value === "Each Side" })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs transition-colors ${
                    form.laterality === o.value
                      ? "bg-stone-900 text-white border-stone-900"
                      : "border-stone-200 text-stone-600 hover:border-stone-400"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Video ── */}
      {tab === "video" && (
        <div className="space-y-5">
          {/* YouTube import */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1 flex items-center gap-1.5">
              <Youtube className="h-4 w-4 text-red-500" /> YouTube URL
            </label>
            <Input
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=... or youtu.be/..."
            />
            {form.videoUrl && isYoutubeUrl(form.videoUrl) && !youtubeId && (
              <p className="text-xs text-amber-500 mt-1">Could not parse YouTube ID from this URL.</p>
            )}
          </div>

          {/* YouTube preview */}
          {youtubeId && (
            <div className="rounded-xl overflow-hidden border border-stone-200">
              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  title="YouTube preview"
                />
              </div>
              <div className="px-3 py-2 bg-stone-50 flex items-center justify-between">
                <span className="text-xs text-stone-400 font-mono">{youtubeId}</span>
                <a href={form.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline">
                  <ExternalLink className="h-3 w-3" /> Open on YouTube
                </a>
              </div>
            </div>
          )}

          {/* Upload fallback */}
          {!youtubeId && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                <Video className="h-4 w-4" /> Or Upload Video File
              </label>
              <FileUpload
                bucket="exercise-media"
                accept="video/mp4,video/quicktime,video/webm"
                label="Upload exercise video (MP4, MOV, WebM)"
                currentUrl={(form.videoUrl && !isYoutubeUrl(form.videoUrl)) ? form.videoUrl : null}
                onUploaded={(url) => setForm({ ...form, videoUrl: url })}
                maxSizeMB={200}
              />
            </div>
          )}

          {/* Thumbnail */}
          <Input
            label="Thumbnail URL (optional)"
            value={""}
            onChange={() => {}}
            placeholder="https://..."
          />
        </div>
      )}

      {/* ── Steps & Tips ── */}
      {tab === "steps" && (
        <div className="space-y-6">
          <ArrayEditor
            label="Step-by-Step Instructions"
            placeholder="e.g. Stand with feet shoulder-width apart…"
            items={form.steps}
            onChange={(v) => setForm({ ...form, steps: v })}
          />
          <ArrayEditor
            label="Coaching Tips"
            placeholder="e.g. Keep your core braced throughout…"
            items={form.tips}
            onChange={(v) => setForm({ ...form, tips: v })}
          />
          <ArrayEditor
            label="Variations"
            placeholder="e.g. Romanian Deadlift, Stiff-Leg Deadlift…"
            items={form.variations}
            onChange={(v) => setForm({ ...form, variations: v })}
          />
          {/* Legacy instructions fallback */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Free-text Instructions <span className="text-xs text-stone-400">(legacy)</span>
            </label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="General instructions (if not using steps above)…"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
              rows={3}
            />
          </div>
        </div>
      )}

      {/* ── Advanced ── */}
      {tab === "advanced" && (
        <div className="space-y-4">
          <div>
            <Input
              label="Tempo"
              value={form.tempo}
              onChange={(e) => setForm({ ...form, tempo: e.target.value })}
              placeholder="e.g. 3-1-2-0 (eccentric–pause–concentric–pause)"
            />
            <p className="text-xs text-stone-400 mt-1">
              Format: <span className="font-mono">eccentric-top pause-concentric-bottom pause</span>. X = explosive. 0 = no pause.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">
                  {tag}
                  <button onClick={() => setForm({ ...form, tags: form.tags.filter((_, i) => i !== idx) })} className="hover:text-red-500">×</button>
                </span>
              ))}
              <input
                placeholder="Add tag + Enter"
                className="rounded-full border border-stone-200 px-3 py-1 text-xs placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    setForm({ ...form, tags: [...form.tags, e.currentTarget.value.trim()] });
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
