"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ExerciseFormModalProps {
  open: boolean;
  onClose: () => void;
  exercise?: {
    id: string;
    name: string;
    description: string;
    muscleGroup: string;
    difficultyLevel: string;
    forceType: string;
    equipment: string;
    videoUrl: string;
    instructions: string;
  };
}

const MUSCLE_GROUPS = [
  { value: "CHEST", label: "Chest" },
  { value: "BACK", label: "Back" },
  { value: "SHOULDERS", label: "Shoulders" },
  { value: "BICEPS", label: "Biceps" },
  { value: "TRICEPS", label: "Triceps" },
  { value: "FOREARMS", label: "Forearms" },
  { value: "QUADRICEPS", label: "Quadriceps" },
  { value: "HAMSTRINGS", label: "Hamstrings" },
  { value: "GLUTES", label: "Glutes" },
  { value: "CALVES", label: "Calves" },
  { value: "CORE", label: "Core" },
  { value: "FULL_BODY", label: "Full Body" },
  { value: "CARDIO", label: "Cardio" },
];

const DIFFICULTY_LEVELS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "EXPERT", label: "Expert" },
];

const FORCE_TYPES = [
  { value: "PUSH", label: "Push" },
  { value: "PULL", label: "Pull" },
  { value: "STATIC", label: "Static" },
  { value: "DYNAMIC", label: "Dynamic" },
];

export function ExerciseFormModal({ open, onClose, exercise }: ExerciseFormModalProps) {
  const isEdit = !!exercise;
  const [form, setForm] = useState({
    name: exercise?.name ?? "",
    description: exercise?.description ?? "",
    muscleGroup: exercise?.muscleGroup ?? "",
    difficultyLevel: exercise?.difficultyLevel ?? "",
    forceType: exercise?.forceType ?? "",
    equipment: exercise?.equipment ?? "",
    videoUrl: exercise?.videoUrl ?? "",
    instructions: exercise?.instructions ?? "",
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    console.log(isEdit ? "Updating exercise:" : "Creating exercise:", form);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Exercise" : "Add New Exercise"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.name}>
            {isEdit ? "Save Changes" : "Create Exercise"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Exercise Name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          required
        />

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Brief description of the exercise..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-1 resize-none"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Muscle Group"
            value={form.muscleGroup}
            onChange={(e) => handleChange("muscleGroup", e.target.value)}
            options={MUSCLE_GROUPS}
            placeholder="Select..."
          />
          <Select
            label="Difficulty"
            value={form.difficultyLevel}
            onChange={(e) => handleChange("difficultyLevel", e.target.value)}
            options={DIFFICULTY_LEVELS}
            placeholder="Select..."
          />
          <Select
            label="Force Type"
            value={form.forceType}
            onChange={(e) => handleChange("forceType", e.target.value)}
            options={FORCE_TYPES}
            placeholder="Select..."
          />
        </div>

        <Input
          label="Equipment"
          value={form.equipment}
          onChange={(e) => handleChange("equipment", e.target.value)}
          placeholder="e.g., Barbell, Dumbbell, Cable..."
        />

        <Input
          label="Video URL"
          value={form.videoUrl}
          onChange={(e) => handleChange("videoUrl", e.target.value)}
          placeholder="https://youtube.com/... or upload"
        />

        {/* Video upload area */}
        <div className="rounded-lg border-2 border-dashed border-stone-300 p-6 text-center">
          <p className="text-sm text-stone-500">
            Drag & drop a video file here, or click to upload
          </p>
          <p className="text-xs text-stone-400 mt-1">MP4, MOV up to 100MB</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Instructions</label>
          <textarea
            value={form.instructions}
            onChange={(e) => handleChange("instructions", e.target.value)}
            placeholder="Step-by-step instructions..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-1 resize-none"
            rows={4}
          />
        </div>
      </div>
    </Modal>
  );
}
