"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { ExerciseFormModal } from "@/components/admin/exercise-form-modal";
import { trpc } from "@/trpc/client";
import { Plus, Pencil, Archive, Video, Loader2 } from "lucide-react";

interface ExerciseRow {
  id: string;
  name: string;
  muscleGroup: string | null;
  difficultyLevel: string | null;
  forceType: string | null;
  createdBy: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  createdAt: Date;
}

const difficultyVariant: Record<string, "success" | "warning" | "danger" | "info"> = {
  BEGINNER: "success",
  INTERMEDIATE: "warning",
  ADVANCED: "danger",
  EXPERT: "info",
};

const muscleLabels: Record<string, string> = {
  CHEST: "Chest", BACK: "Back", SHOULDERS: "Shoulders", BICEPS: "Biceps",
  TRICEPS: "Triceps", FOREARMS: "Forearms", QUADRICEPS: "Quadriceps",
  HAMSTRINGS: "Hamstrings", GLUTES: "Glutes", CALVES: "Calves",
  CORE: "Core", ABS: "Abs", FULL_BODY: "Full Body", CARDIO: "Cardio", OTHER: "Other",
};

const columns: ColumnDef<ExerciseRow, unknown>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
          {row.original.videoUrl ? (
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
  {
    accessorKey: "muscleGroup",
    header: "Muscle Group",
    cell: ({ getValue }) => {
      const v = getValue() as string | null;
      return v ? (muscleLabels[v] || v) : "—";
    },
  },
  {
    accessorKey: "difficultyLevel",
    header: "Difficulty",
    cell: ({ getValue }) => {
      const v = getValue() as string | null;
      if (!v) return "—";
      const label = v.charAt(0) + v.slice(1).toLowerCase();
      return <Badge variant={difficultyVariant[v] || "outline"}>{label}</Badge>;
    },
  },
  {
    accessorKey: "forceType",
    header: "Force Type",
    cell: ({ getValue }) => {
      const v = getValue() as string | null;
      return v ? v.charAt(0) + v.slice(1).toLowerCase() : "—";
    },
  },
  {
    accessorKey: "createdBy",
    header: "Created By",
    cell: ({ getValue }) => (getValue() as string) || "—",
  },
  {
    accessorKey: "videoUrl",
    header: "Video",
    cell: ({ getValue }) => (getValue() as string) ? <Badge variant="info">Yes</Badge> : <span className="text-stone-400">—</span>,
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

  const { data, isLoading } = trpc.exercises.list.useQuery({ limit: 200 });

  const exerciseRows: ExerciseRow[] = (data?.exercises ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup,
    difficultyLevel: e.difficultyLevel,
    forceType: e.forceType,
    createdBy: e.createdBy ? `${e.createdBy.firstName} ${e.createdBy.lastName}` : null,
    videoUrl: e.videoUrl,
    thumbnailUrl: e.thumbnailUrl,
    isActive: e.isActive,
    createdAt: e.createdAt,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Exercises</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" /> Add New Exercise
        </Button>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
            <span className="ml-2 text-sm text-stone-500">Loading exercises...</span>
          </div>
        ) : (
          <DataTable
            data={exerciseRows}
            columns={columns}
            searchPlaceholder="Search exercises..."
          />
        )}
      </div>

      <ExerciseFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
