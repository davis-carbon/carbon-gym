"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Plus, FileText, Trash2, Loader2, ChevronRight } from "lucide-react";

export default function AssessmentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data: assessments, isLoading } = trpc.assessments.list.useQuery();

  const createAssessment = trpc.assessments.create.useMutation({
    onSuccess: (created) => {
      toast("success", "Assessment created");
      utils.assessments.list.invalidate();
      setShowCreate(false);
      setForm({ name: "", description: "" });
      router.push(`/admin/assessments/${created.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  const deleteAssessment = trpc.assessments.delete.useMutation({
    onSuccess: () => { toast("success", "Assessment archived"); utils.assessments.list.invalidate(); },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Assessments</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Assessment
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>
      ) : (assessments ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white py-16 text-center">
          <FileText className="h-8 w-8 text-stone-400 mx-auto mb-3" />
          <p className="text-sm text-stone-500">No assessments yet. Create one to start collecting client data.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-3 text-left font-medium text-stone-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-stone-600">Fields</th>
                <th className="px-4 py-3 text-left font-medium text-stone-600">Submissions</th>
                <th className="px-4 py-3 text-left font-medium text-stone-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-stone-600">Created</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {(assessments ?? []).map((a) => {
                const fieldCount = Array.isArray(a.fields) ? (a.fields as unknown[]).length : 0;
                return (
                  <tr
                    key={a.id}
                    className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/assessments/${a.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.name}</div>
                      {a.description && <div className="text-xs text-stone-500 mt-0.5 line-clamp-1">{a.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{fieldCount}</td>
                    <td className="px-4 py-3 text-stone-600">{a._count.submissions}</td>
                    <td className="px-4 py-3">
                      {a.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Archived</Badge>}
                    </td>
                    <td className="px-4 py-3 text-stone-500">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {a.isActive && (
                          <button
                            onClick={(e) => { e.stopPropagation(); if (confirm(`Archive "${a.name}"?`)) deleteAssessment.mutate({ id: a.id }); }}
                            className="text-stone-400 hover:text-red-500"
                            aria-label="Archive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <ChevronRight className="h-4 w-4 text-stone-300" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Assessment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createAssessment.mutate({ name: form.name, description: form.description || undefined })}
              disabled={!form.name || createAssessment.isPending}
            >
              {createAssessment.isPending ? "Creating..." : "Create & Build"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Initial Health Screening" />
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional — shown to clients when filling out the form"
              rows={2}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
