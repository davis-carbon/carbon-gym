"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { ExerciseFormModal } from "@/components/admin/exercise-form-modal";
import { Plus, Pencil, Archive, Video } from "lucide-react";

interface ExerciseRow {
  id: string;
  name: string;
  muscleGroup: string;
  difficulty: string;
  forceType: string;
  createdBy: string;
  hasVideo: boolean;
  isActive: boolean;
  thumbnailUrl: string | null;
  createdAt: string;
}

const MOCK_EXERCISES: ExerciseRow[] = [
  { id: "1", name: "Cable Abductions", muscleGroup: "Glutes", difficulty: "Intermediate", forceType: "Pull", createdBy: "Mada Hauck", hasVideo: false, isActive: true, thumbnailUrl: null, createdAt: "2026-04-02" },
  { id: "2", name: "Safety Bar Split Squat (M)", muscleGroup: "Quadriceps", difficulty: "Advanced", forceType: "Push", createdBy: "Aaron Davis", hasVideo: true, isActive: true, thumbnailUrl: null, createdAt: "2024-11-10" },
  { id: "3", name: "Safety Bar Reverse Lunge (M)", muscleGroup: "Quadriceps", difficulty: "Advanced", forceType: "Push", createdBy: "Madeline Gladu", hasVideo: true, isActive: true, thumbnailUrl: null, createdAt: "2026-04-01" },
  { id: "4", name: "Supported Safety Bar Squat (M)", muscleGroup: "Quadriceps", difficulty: "Intermediate", forceType: "Push", createdBy: "Madeline Gladu", hasVideo: true, isActive: true, thumbnailUrl: null, createdAt: "2026-04-01" },
  { id: "5", name: "Safety Bar Squat (M)", muscleGroup: "Quadriceps", difficulty: "Advanced", forceType: "Push", createdBy: "Madeline Gladu", hasVideo: true, isActive: true, thumbnailUrl: null, createdAt: "2026-04-01" },
  { id: "6", name: "Barbell Back Squat", muscleGroup: "Quadriceps", difficulty: "Advanced", forceType: "Push", createdBy: "Aaron Davis", hasVideo: true, isActive: true, thumbnailUrl: null, createdAt: "2024-05-15" },
  { id: "7", name: "Romanian Deadlift", muscleGroup: "Hamstrings", difficulty: "Intermediate", forceType: "Pull", createdBy: "Aaron Davis", hasVideo: true, isActive: true, thumbnailUrl: null, createdAt: "2024-05-15" },
  { id: "8", name: "Bench Press", muscleGroup: "Chest", difficulty: "Intermediate", forceType: "Push", createdBy: "Mada Hauck", hasVideo: true, isActive: true, thumbnailUrl: null, createdAt: "2024-06-01" },
  { id: "9", name: "Pull Up", muscleGroup: "Back", difficulty: "Advanced", forceType: "Pull", createdBy: "Aaron Davis", hasVideo: true, isActive: true, thumbnailUrl: null, createdAt: "2024-06-01" },
  { id: "10", name: "Dumbbell Shoulder Press", muscleGroup: "Shoulders", difficulty: "Beginner", forceType: "Push", createdBy: "Bri Larson", hasVideo: true, isActive: true, thumbnailUrl: null, createdAt: "2024-07-01" },
  { id: "11", name: "Kettlebell Swing", muscleGroup: "Full Body", difficulty: "Intermediate", forceType: "Dynamic", createdBy: "Aaron Davis", hasVideo: true, isActive: true, thumbnailUrl: null, createdAt: "2024-08-01" },
  { id: "12", name: "Plank", muscleGroup: "Core", difficulty: "Beginner", forceType: "Static", createdBy: "Bri Larson", hasVideo: false, isActive: true, thumbnailUrl: null, createdAt: "2024-08-15" },
];

const difficultyVariant: Record<string, "success" | "warning" | "danger" | "info"> = {
  Beginner: "success",
  Intermediate: "warning",
  Advanced: "danger",
  Expert: "info",
};

const columns: ColumnDef<ExerciseRow, unknown>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
          {row.original.hasVideo ? (
            <Video className="h-4 w-4 text-stone-400" />
          ) : (
            <span className="text-xs font-bold text-stone-400">
              {row.original.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  { accessorKey: "muscleGroup", header: "Muscle Group" },
  {
    accessorKey: "difficulty",
    header: "Difficulty",
    cell: ({ getValue }) => {
      const v = getValue() as string;
      return <Badge variant={difficultyVariant[v] || "outline"}>{v}</Badge>;
    },
  },
  { accessorKey: "forceType", header: "Force Type" },
  { accessorKey: "createdBy", header: "Created By" },
  {
    accessorKey: "hasVideo",
    header: "Video",
    cell: ({ getValue }) => (getValue() as boolean) ? <Badge variant="info">Yes</Badge> : <span className="text-stone-400">—</span>,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  },
  {
    id: "actions",
    header: "",
    size: 48,
    cell: () => (
      <DropdownMenu>
        <DropdownItem><Pencil className="h-4 w-4" /> Edit</DropdownItem>
        <DropdownItem danger><Archive className="h-4 w-4" /> Deactivate</DropdownItem>
      </DropdownMenu>
    ),
    enableSorting: false,
  },
];

export default function ExercisesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Exercises</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" /> Add New Exercise
        </Button>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <DataTable
          data={MOCK_EXERCISES}
          columns={columns}
          searchPlaceholder="Search exercises..."
        />
      </div>

      <ExerciseFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
