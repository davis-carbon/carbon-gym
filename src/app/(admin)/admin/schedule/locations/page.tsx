"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Plus, MapPin, Trash2, Pencil, Loader2 } from "lucide-react";

export default function LocationsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", state: "", zip: "", phone: "" });

  const { data: locations, isLoading } = trpc.schedule.locations.list.useQuery();

  const createLocation = trpc.schedule.locations.create.useMutation({
    onSuccess: () => { toast("success", "Location created"); utils.schedule.locations.list.invalidate(); closeModal(); },
    onError: (err) => toast("error", err.message),
  });

  const updateLocation = trpc.schedule.locations.update.useMutation({
    onSuccess: () => { toast("success", "Location updated"); utils.schedule.locations.list.invalidate(); closeModal(); },
    onError: (err) => toast("error", err.message),
  });

  const deleteLocation = trpc.schedule.locations.delete.useMutation({
    onSuccess: () => { toast("success", "Location deleted"); utils.schedule.locations.list.invalidate(); },
    onError: (err) => toast("error", err.message),
  });

  function closeModal() {
    setShowCreate(false);
    setEditId(null);
    setForm({ name: "", address: "", city: "", state: "", zip: "", phone: "" });
  }

  function startEdit(loc: any) {
    setEditId(loc.id);
    setForm({ name: loc.name, address: loc.address ?? "", city: loc.city ?? "", state: loc.state ?? "", zip: loc.zip ?? "", phone: loc.phone ?? "" });
    setShowCreate(true);
  }

  function handleSubmit() {
    if (editId) {
      updateLocation.mutate({ id: editId, ...form });
    } else {
      createLocation.mutate(form);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Add Location</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(locations ?? []).map((loc) => (
            <Card key={loc.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="rounded-lg bg-stone-100 p-2">
                      <MapPin className="h-5 w-5 text-stone-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-900">{loc.name}</h3>
                      {loc.address && <p className="text-sm text-stone-500 mt-1">{loc.address}{loc.city ? `, ${loc.city}` : ""}{loc.state ? `, ${loc.state} ${loc.zip ?? ""}` : ""}</p>}
                      {loc.phone && <p className="text-xs text-stone-500 mt-0.5">{loc.phone}</p>}
                      <Badge variant={loc.isActive ? "success" : "outline"} className="mt-2">
                        {loc.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(loc)} className="text-stone-400 hover:text-stone-600"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => { if (confirm(`Delete ${loc.name}?`)) deleteLocation.mutate({ id: loc.id }); }} className="text-stone-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={closeModal} title={editId ? "Edit Location" : "New Location"} footer={
        <>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.name || createLocation.isPending || updateLocation.isPending}>
            {createLocation.isPending || updateLocation.isPending ? "Saving..." : editId ? "Save" : "Create"}
          </Button>
        </>
      }>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="ZIP" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
