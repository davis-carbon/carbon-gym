"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { TagEditor } from "@/components/admin/client-detail/tag-editor";
import { Pencil, Loader2 } from "lucide-react";

interface ClientData {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  birthDate: Date | string | null;
  height: string | null;
  weight: string | null;
  aboutMe: string | null;
  profileImageUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingZip: string | null;
  billingCountry: string | null;
  appPlatform: string | null;
  customStatus: string | null;
  tags: { tag: { id: string; name: string; color: string | null } }[];
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <p className="text-sm text-stone-900">{value || "———"}</p>
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
    </Button>
  );
}

// ── Basic Information Card ──────────────────────────────────────────────────
function BasicInfoCard({ clientId, client }: { clientId: string; client: ClientData }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: client.firstName,
    lastName: client.lastName,
    phone: client.phone ?? "",
    email: client.email ?? "",
    gender: client.gender ?? "",
    birthDate: client.birthDate
      ? new Date(client.birthDate).toISOString().split("T")[0]
      : "",
    height: client.height ?? "",
    weight: client.weight ?? "",
  });

  const update = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast("success", "Saved");
      utils.clients.byId.invalidate({ id: clientId });
      setEditing(false);
    },
    onError: (e) => toast("error", e.message),
  });

  function handleSave() {
    update.mutate({
      id: clientId,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      gender: (form.gender as any) || undefined,
      birthDate: form.birthDate ? new Date(form.birthDate) : null,
      height: form.height || null,
      weight: form.weight || null,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
        ) : (
          <EditButton onClick={() => setEditing(true)} />
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Select
              label="Gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              options={[
                { value: "", label: "Not specified" },
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
                { value: "NON_BINARY", label: "Non-binary" },
                { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
              ]}
            />
            <Input label="Birth Date" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            <Input label="Height" value={form.height} placeholder="e.g. 5'10&quot;" onChange={(e) => setForm({ ...form, height: e.target.value })} />
            <Input label="Weight" value={form.weight} placeholder="e.g. 175 lbs" onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
            <InfoField label="First Name" value={client.firstName} />
            <InfoField label="Last Name" value={client.lastName} />
            <InfoField label="Phone Number" value={client.phone} />
            <InfoField label="Email" value={client.email} />
            <InfoField label="Gender" value={
              client.gender === "MALE" ? "Male"
              : client.gender === "FEMALE" ? "Female"
              : client.gender === "NON_BINARY" ? "Non-binary"
              : client.gender === "PREFER_NOT_TO_SAY" ? "Prefer not to say"
              : null
            } />
            <InfoField label="Birth Date" value={
              client.birthDate
                ? new Date(client.birthDate).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })
                : null
            } />
            <InfoField label="Height" value={client.height} />
            <InfoField label="Weight" value={client.weight} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Other Information Card ──────────────────────────────────────────────────
function OtherInfoCard({ clientId, client }: { clientId: string; client: ClientData }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [aboutMe, setAboutMe] = useState(client.aboutMe ?? "");
  const [profileImageUrl, setProfileImageUrl] = useState(client.profileImageUrl ?? "");

  const update = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast("success", "Saved");
      utils.clients.byId.invalidate({ id: clientId });
      setEditing(false);
    },
    onError: (e) => toast("error", e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Other Information</CardTitle>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => update.mutate({ id: clientId, aboutMe: aboutMe || null, profileImageUrl: profileImageUrl || null })} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
        ) : (
          <EditButton onClick={() => setEditing(true)} />
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-stone-500 mb-2">Profile Image</p>
            <div className="flex items-center gap-3">
              <Avatar name={`${client.firstName} ${client.lastName}`} src={client.profileImageUrl} size="lg" />
              {editing && (
                <Input
                  placeholder="Image URL"
                  value={profileImageUrl}
                  onChange={(e) => setProfileImageUrl(e.target.value)}
                  className="flex-1"
                />
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-stone-500 mb-2">About Me</p>
            {editing ? (
              <textarea
                rows={3}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
                placeholder="Client bio..."
              />
            ) : (
              <p className="text-sm text-stone-900">{client.aboutMe || "———"}</p>
            )}
          </div>
        </div>
        <div className="mt-5 border-t border-stone-100 pt-4">
          <p className="text-xs text-stone-500 mb-2">Tags</p>
          <TagEditor clientId={clientId} clientTags={client.tags} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Address Card (reusable for home + billing) ──────────────────────────────
function AddressCard({
  clientId,
  title,
  fields,
  onSave,
  isSaving,
}: {
  clientId: string;
  title: string;
  fields: { street: string; city: string; state: string; zip: string; country: string };
  onSave: (f: typeof fields) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(fields);

  function handleSave() {
    onSave(form);
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setForm(fields); setEditing(false); }}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
        ) : (
          <EditButton onClick={() => setEditing(true)} />
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input label="Street Address" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            </div>
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            <Input label="Postal Code" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-5 gap-x-8">
            <div className="col-span-2 md:col-span-4">
              <InfoField label="Street Address" value={fields.street} />
            </div>
            <InfoField label="City" value={fields.city} />
            <InfoField label="State" value={fields.state} />
            <InfoField label="Postal Code" value={fields.zip} />
            <InfoField label="Country" value={fields.country} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Platform Information Card ───────────────────────────────────────────────
function PlatformInfoCard({ clientId, client }: { clientId: string; client: ClientData }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    appPlatform: client.appPlatform ?? "",
    customStatus: client.customStatus ?? "",
  });

  const update = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast("success", "Saved");
      utils.clients.byId.invalidate({ id: clientId });
      setEditing(false);
    },
    onError: (e) => toast("error", e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Information</CardTitle>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => update.mutate({ id: clientId, appPlatform: form.appPlatform || null, customStatus: form.customStatus || null })} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
        ) : (
          <EditButton onClick={() => setEditing(true)} />
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="App Platform"
              value={form.appPlatform}
              onChange={(e) => setForm({ ...form, appPlatform: e.target.value })}
              options={[
                { value: "", label: "None" },
                { value: "ios", label: "iOS" },
                { value: "android", label: "Android" },
                { value: "web", label: "Web" },
              ]}
            />
            <Input label="Custom Status" value={form.customStatus} onChange={(e) => setForm({ ...form, customStatus: e.target.value })} placeholder="e.g. VIP, Trial" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
            <InfoField label="App Platform" value={client.appPlatform} />
            <InfoField label="Custom Status" value={client.customStatus} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────
export function PersonalInfoSection({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: client } = trpc.clients.byId.useQuery({ id: clientId });

  const updateAddress = trpc.clients.update.useMutation({
    onSuccess: () => { toast("success", "Address saved"); utils.clients.byId.invalidate({ id: clientId }); },
    onError: (e) => toast("error", e.message),
  });

  const updateBillingAddress = trpc.clients.update.useMutation({
    onSuccess: () => { toast("success", "Billing address saved"); utils.clients.byId.invalidate({ id: clientId }); },
    onError: (e) => toast("error", e.message),
  });

  if (!client) return null;

  return (
    <div className="space-y-4">
      <BasicInfoCard clientId={clientId} client={client as unknown as ClientData} />

      <OtherInfoCard clientId={clientId} client={client as unknown as ClientData} />

      <AddressCard
        clientId={clientId}
        title="Home & Shipping Address"
        fields={{
          street: client.address ?? "",
          city: client.city ?? "",
          state: client.state ?? "",
          zip: client.zip ?? "",
          country: (client as any).country ?? "",
        }}
        onSave={(f) => updateAddress.mutate({
          id: clientId,
          address: f.street || null,
          city: f.city || null,
          state: f.state || null,
          zip: f.zip || null,
          country: f.country || null,
        })}
        isSaving={updateAddress.isPending}
      />

      <AddressCard
        clientId={clientId}
        title="Billing Address"
        fields={{
          street: (client as any).billingAddress ?? "",
          city: (client as any).billingCity ?? "",
          state: (client as any).billingState ?? "",
          zip: (client as any).billingZip ?? "",
          country: (client as any).billingCountry ?? "",
        }}
        onSave={(f) => updateBillingAddress.mutate({
          id: clientId,
          billingAddress: f.street || null,
          billingCity: f.city || null,
          billingState: f.state || null,
          billingZip: f.zip || null,
          billingCountry: f.country || null,
        })}
        isSaving={updateBillingAddress.isPending}
      />

      <PlatformInfoCard clientId={clientId} client={client as unknown as ClientData} />
    </div>
  );
}
