"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";

interface ExerciseFormModalProps {
  open: boolean;
  onClose: () => void;
}

const MUSCLE_GROUPS = [
  { value: "", label: "Select..." },
  { value: "CHEST", label: "Chest" },
  { value: "BACK", label: "Back" },
  { value: "SHOULDERS", label: "Shoulders" },
  { value: "BICEPS", label: "Biceps" },
  { value: "TRICEPS", label: "Triceps" },
  { value: "QUADRICEPS", label: "Quadriceps" },
  { value: "HAMSTRINGS", label: "Hamstrings" },
  { value: "GLUTES", label: "Glutes" },
  { value: "CALVES", label: "Calves" },
  { value: "CORE", label: "Core" },
  { value: "FULL_BODY", label: "Full Body" },
  { value: "CARDIO", label: "Cardio" },
];

const DIFFICULTY_LEVELS = [
  { value: "", label: "Select..." },
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "EXPERT", label: "Expert" },
];

const FORCE_TYPES = [
  { value: "", label: "Select..." },
  { value: "PUSH", label: "Push" },
  { value: "PULL", label: "Pull" },
  { value: "STATIC", label: "Static" },
  { value: "DYNAMIC", label: "Dynamic" },
];

export function ExerciseFormModal({ open, onClose }: ExerciseFormModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    name: "",
    description: "",
    muscleGroup: "",
    difficultyLevel: "",
    forceType: "",
    equipment: "",
    videoUrl: "",
    instructions: "",
  });

  const createExercise = trpc.exercises.create.useMutation({
    onSuccess: () => {
      toast("success", "Exercise created");
      utils.exercises.list.invalidate();
      onClose();
      setForm({ name: "", description: "", muscleGroup: "", difficultyLevel: "", forceType: "", equipment: "", videoUrl: "", instructions: "" });
    },
    onError: (err) => toast("error", err.message),
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    createExercise.mutate({
      name: form.name,
      description: form.description || undefined,
      muscleGroup: form.muscleGroup || undefined,
      difficultyLevel: form.difficultyLevel || undefined,
      forceType: form.forceType || undefined,
      equipment: form.equipment || undefined,
      videoUrl: form.videoUrl || undefined,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Exercise"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.name || createExercise.isPending}>
            {createExercise.isPending ? "Creating..." : "Create Exercise"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Exercise Name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} required />
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="Brief description..." className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 resize-none" rows={2} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Select label="Muscle Group" value={form.muscleGroup} onChange={(e) => handleChange("muscleGroup", e.target.value)} options={MUSCLE_GROUPS} />
          <Select label="Difficulty" value={form.difficultyLevel} onChange={(e) => handleChange("difficultyLevel", e.target.value)} options={DIFFICULTY_LEVELS} />
          <Select label="Force Type" value={form.forceType} onChange={(e) => handleChange("forceType", e.target.value)} options={FORCE_TYPES} />
        </div>
        <Input label="Equipment" value={form.equipment} onChange={(e) => handleChange("equipment", e.target.value)} placeholder="e.g., Barbell, Dumbbell, Cable..." />
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Video</label>
          <FileUpload
            bucket="exercise-media"
            accept="video/mp4,video/quicktime,video/webm"
            label="Upload exercise video"
            currentUrl={form.videoUrl || null}
            onUploaded={(url) => handleChange("videoUrl", url)}
            maxSizeMB={100}
          />
        </div>
        <Input label="Or Video URL" value={form.videoUrl} onChange={(e) => handleChange("videoUrl", e.target.value)} placeholder="https://youtube.com/..." />
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Instructions</label>
          <textarea value={form.instructions} onChange={(e) => handleChange("instructions", e.target.value)} placeholder="Step-by-step..." className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 resize-none" rows={3} />
        </div>
      </div>
    </Modal>
  );
}
