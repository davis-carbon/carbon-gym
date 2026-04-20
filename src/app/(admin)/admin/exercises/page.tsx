"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { ExerciseFormModal } from "@/components/admin/exercise-form-modal";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Plus, Pencil, Archive, RotateCcw, Video, Loader2, Youtube } from "lucide-react";

interface ExerciseRow {
  id: string;
  name: string;
  muscleGroup: string | null;
  exerciseType: string | null;
  difficultyLevel: string | null;
  forceType: string | null;
  mechanics: string | null;
  isEachSide: boolean;
  createdBy: string | null;
  videoUrl: string | null;
  youtubeVideoId: string | null;
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

function buildColumns(
  onEdit: (id: string) => void,
  onToggleActive: (id: string, next: boolean) => void,
): ColumnDef<ExerciseRow, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center flex-shrink-0">
            {row.original.youtubeVideoId ? (
              <img
                src={`https://img.youtube.com/vi/${row.original.youtubeVideoId}/mqdefault.jpg`}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : row.original.videoUrl ? (
              <Video className="h-4 w-4 text-stone-400" />
            ) : (
              <span className="text-xs font-bold text-stone-400">
                {row.original.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{row.original.name}</span>
              {!row.original.isActive && <Badge variant="outline">Inactive</Badge>}
              {row.original.isEachSide && <Badge variant="info">Each Side</Badge>}
            </div>
            {row.original.mechanics && <p className="text-xs text-stone-400">{row.original.mechanics}</p>}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "exerciseType",
      header: "Type",
      cell: ({ getValue }) => (getValue() as string) || "—",
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
      accessorKey: "videoUrl",
      header: "Video",
      cell: ({ row }) => row.original.youtubeVideoId
        ? <span className="inline-flex items-center gap-1 text-xs text-red-500"><Youtube className="h-3.5 w-3.5" /> YouTube</span>
        : row.original.videoUrl
          ? <Badge variant="info">Uploaded</Badge>
          : <span className="text-stone-400">—</span>,
    },
    {
      accessorKey: "createdBy",
      header: "Created By",
      cell: ({ getValue }) => (getValue() as string) || "—",
    },
    {
      id: "actions",
      header: "",
      size: 48,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownItem onClick={() => onEdit(row.original.id)}>
            <Pencil className="h-4 w-4" /> Edit
          </DropdownItem>
          {row.original.isActive ? (
            <DropdownItem danger onClick={() => onToggleActive(row.original.id, false)}>
              <Archive className="h-4 w-4" /> Deactivate
            </DropdownItem>
          ) : (
            <DropdownItem onClick={() => onToggleActive(row.original.id, true)}>
              <RotateCcw className="h-4 w-4" /> Reactivate
            </DropdownItem>
          )}
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ];
}

export default function ExercisesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = trpc.exercises.list.useQuery({ limit: 200 });

  const updateExercise = trpc.exercises.update.useMutation({
    onSuccess: (_, vars) => {
      toast("success", vars.isActive === false ? "Exercise deactivated" : "Exercise reactivated");
      utils.exercises.list.invalidate();
    },
    onError: (err) => toast("error", err.message),
  });

  function openEdit(id: string) {
    setEditingId(id);
    setModalOpen(true);
  }

  function openCreate() {
    setEditingId(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  const exerciseRows: ExerciseRow[] = (data?.exercises ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup,
    exerciseType: e.exerciseType ?? null,
    difficultyLevel: e.difficultyLevel,
    forceType: e.forceType,
    mechanics: e.mechanics ?? null,
    isEachSide: e.isEachSide,
    createdBy: e.createdBy ? `${e.createdBy.firstName} ${e.createdBy.lastName}` : null,
    videoUrl: e.videoUrl,
    youtubeVideoId: e.youtubeVideoId ?? null,
    thumbnailUrl: e.thumbnailUrl,
    isActive: e.isActive,
    createdAt: e.createdAt,
  }));

  const columns = buildColumns(openEdit, (id, next) => updateExercise.mutate({ id, isActive: next }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Exercises</h1>
        <Button onClick={openCreate}>
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
        open={modalOpen}
        onClose={closeModal}
        exerciseId={editingId}
      />
    </div>
  );
}
