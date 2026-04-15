"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Pencil } from "lucide-react";

interface PersonalInfoTabProps {
  clientId: string;
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    gender: string | null;
    birthDate: string;
    location: string;
    height: string | null;
    weight: string | null;
    aboutMe: string | null;
  };
}

export function PersonalInfoTab({ clientId, client }: PersonalInfoTabProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(client);

  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast("success", "Client updated");
      utils.clients.byId.invalidate({ id: clientId });
      setEditing(false);
    },
    onError: (err) => toast("error", err.message),
  });

  function handleSave() {
    updateClient.mutate({
      id: clientId,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email || undefined,
      phone: form.phone || undefined,
      gender: (form.gender as any) || undefined,
      birthDate: form.birthDate ? new Date(form.birthDate) : undefined,
      height: form.height || undefined,
      weight: form.weight || undefined,
      aboutMe: form.aboutMe || undefined,
    });
  }

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setForm(client); setEditing(false); }}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={updateClient.isPending}>
              {updateClient.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Select
              label="Gender"
              value={form.gender || ""}
              onChange={(e) => setForm({ ...form, gender: e.target.value || null })}
              options={[
                { value: "", label: "Not specified" },
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
                { value: "NON_BINARY", label: "Non-binary" },
              ]}
            />
            <Input label="Birth Date" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            <Input label="Height" value={form.height || ""} onChange={(e) => setForm({ ...form, height: e.target.value || null })} />
            <Input label="Weight" value={form.weight || ""} onChange={(e) => setForm({ ...form, weight: e.target.value || null })} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            <InfoField label="First Name" value={client.firstName} />
            <InfoField label="Last Name" value={client.lastName} />
            <InfoField label="Phone Number" value={client.phone || "—"} />
            <InfoField label="Email" value={client.email || "—"} />
            <InfoField label="Gender" value={client.gender || "—"} />
            <InfoField label="Birth Date" value={client.birthDate ? new Date(client.birthDate).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" }) : "—"} />
            <InfoField label="Height" value={client.height || "—"} />
            <InfoField label="Weight" value={client.weight || "—"} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Other Information</CardTitle></CardHeader>
        <CardContent>
          <InfoField label="About Me" value={client.aboutMe || "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <p className="text-sm text-stone-900">{value}</p>
    </div>
  );
}
