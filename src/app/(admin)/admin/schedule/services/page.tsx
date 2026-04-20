"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Plus, Loader2, Trash2 } from "lucide-react";

export default function ServicesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // ── Services ──────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", type: "APPOINTMENT", durationMinutes: "60", categoryId: "" });
  const { data: services, isLoading } = trpc.schedule.services.list.useQuery();

  const createService = trpc.schedule.services.create.useMutation({
    onSuccess: () => {
      toast("success", "Service created");
      utils.schedule.services.list.invalidate();
      setShowCreate(false);
      setForm({ name: "", type: "APPOINTMENT", durationMinutes: "60", categoryId: "" });
    },
    onError: (err) => toast("error", err.message),
  });

  // ── Categories ────────────────────────────────────────────────
  const [showCategories, setShowCategories] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const { data: categories = [] } = trpc.schedule.serviceCategories.list.useQuery();

  const createCategory = trpc.schedule.serviceCategories.create.useMutation({
    onSuccess: () => {
      toast("success", "Category created");
      utils.schedule.serviceCategories.list.invalidate();
      setNewCatName("");
    },
    onError: (err) => toast("error", err.message),
  });

  const deleteCategory = trpc.schedule.serviceCategories.delete.useMutation({
    onSuccess: () => {
      toast("success", "Category deleted");
      utils.schedule.serviceCategories.list.invalidate();
    },
    onError: (err) => toast("error", err.message),
  });

  const categoryOptions = [
    { value: "", label: "No category" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Service</Button>
          <Button variant="secondary" size="sm" onClick={() => setShowCategories(true)}>Manage Categories</Button>
        </div>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="px-4 py-3 text-left font-medium text-stone-600">Service Name</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Duration</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Category</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin text-stone-400 mx-auto" /></td></tr>
            ) : (services ?? []).length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-stone-400">No services found.</td></tr>
            ) : (
              (services ?? []).map((svc) => (
                <tr key={svc.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium">{svc.name}</td>
                  <td className="px-4 py-3"><Badge variant={svc.type === "CLASS" ? "info" : "outline"}>{svc.type === "CLASS" ? "Class" : "Appointment"}</Badge></td>
                  <td className="px-4 py-3">{svc.durationMinutes} min</td>
                  <td className="px-4 py-3 text-stone-500">{svc.category?.name || "—"}</td>
                  <td className="px-4 py-3 text-stone-500">{new Date(svc.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Service Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Service" footer={
        <>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button
            onClick={() => createService.mutate({
              name: form.name,
              type: form.type as "APPOINTMENT" | "CLASS",
              durationMinutes: parseInt(form.durationMinutes) || 60,
              ...(form.categoryId && { categoryId: form.categoryId }),
            })}
            disabled={!form.name || createService.isPending}
          >
            {createService.isPending ? "Creating..." : "Create Service"}
          </Button>
        </>
      }>
        <div className="space-y-4">
          <Input label="Service Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[{ value: "APPOINTMENT", label: "Appointment" }, { value: "CLASS", label: "Class" }]} />
            <Input label="Duration (min)" type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          </div>
          <Select label="Category (optional)" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} options={categoryOptions} />
        </div>
      </Modal>

      {/* Manage Categories Modal */}
      <Modal open={showCategories} onClose={() => setShowCategories(false)} title="Manage Categories" footer={
        <Button variant="secondary" onClick={() => setShowCategories(false)}>Done</Button>
      }>
        <div className="space-y-4">
          {/* Existing categories */}
          {categories.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-2">No categories yet.</p>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2">
                  <div>
                    <span className="text-sm font-medium">{cat.name}</span>
                    <span className="text-xs text-stone-400 ml-2">{cat._count.services} service{cat._count.services !== 1 ? "s" : ""}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (cat._count.services > 0) {
                        toast("error", `Remove all services from "${cat.name}" first`);
                        return;
                      }
                      deleteCategory.mutate({ id: cat.id });
                    }}
                    disabled={deleteCategory.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-stone-400" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new category */}
          <div className="border-t border-stone-100 pt-3">
            <p className="text-xs font-medium text-stone-600 mb-2">Add Category</p>
            <div className="flex gap-2">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name"
                onKeyDown={(e) => { if (e.key === "Enter" && newCatName.trim()) createCategory.mutate({ name: newCatName.trim() }); }}
              />
              <Button
                onClick={() => createCategory.mutate({ name: newCatName.trim() })}
                disabled={!newCatName.trim() || createCategory.isPending}
              >
                {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
