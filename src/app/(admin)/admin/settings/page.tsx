"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/trpc/client";
import { useToast } from "@/components/ui/toast";
import { Pencil, Loader2, Plus, Trash2, Check, X, User } from "lucide-react";

// ─── Staff profile type ───────────────────────────────────────────────────────
interface StaffMemberType {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  color?: string | null;
  specialties?: string[] | null;
  certifications?: string[] | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  role: string;
  isActive: boolean;
}

// ─── Color palette ────────────────────────────────────────────────────────────
const TAG_COLORS = [
  "#6B7280", // gray
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#14B8A6", // teal
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#F43F5E", // rose
  "#64748B", // slate
  "#0EA5E9", // sky
];

function ColorSwatch({
  color,
  selected,
  onClick,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none"
      style={{ backgroundColor: color, borderColor: selected ? "#1c1917" : "transparent" }}
      title={color}
    >
      {selected && (
        <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" />
      )}
    </button>
  );
}

// ─── Inline-edit row ─────────────────────────────────────────────────────────
function TagRow({ tag, onSaved, onDelete }: {
  tag: { id: string; name: string; color: string | null; _count: { clients: number } };
  onSaved: () => void;
  onDelete: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color ?? "#6B7280");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = trpc.tags.update.useMutation({
    onSuccess: () => { setEditing(false); onSaved(); toast("success", "Tag updated"); },
    onError: (e) => toast("error", e.message),
  });
  const del = trpc.tags.delete.useMutation({
    onSuccess: () => { onDelete(); toast("success", "Tag deleted"); },
    onError: (e) => toast("error", e.message),
  });

  if (editing) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3">
        <div
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-7 text-sm flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") update.mutate({ id: tag.id, name, color });
            if (e.key === "Escape") { setEditing(false); setName(tag.name); setColor(tag.color ?? "#6B7280"); }
          }}
        />
        <div className="flex flex-wrap gap-1">
          {TAG_COLORS.map((c) => (
            <ColorSwatch key={c} color={c} selected={color === c} onClick={() => setColor(c)} />
          ))}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            onClick={() => update.mutate({ id: tag.id, name, color })}
            disabled={update.isPending || !name.trim()}
          >
            {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setEditing(false); setName(tag.name); setColor(tag.color ?? "#6B7280"); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-stone-200 p-3 hover:bg-stone-50">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tag.color ?? "#6B7280" }} />
        <span className="text-sm font-medium text-stone-900">{tag.name}</span>
        <span className="text-xs text-stone-400">{tag._count.clients} client{tag._count.clients !== 1 ? "s" : ""}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-red-600">
              Remove from {tag._count.clients} client{tag._count.clients !== 1 ? "s" : ""}?
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={() => del.mutate({ id: tag.id })}
              disabled={del.isPending}
            >
              {del.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5 text-stone-400" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Tags tab ─────────────────────────────────────────────────────────────────
function TagsTab() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: tags = [], isLoading } = trpc.tags.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]!);

  const create = trpc.tags.create.useMutation({
    onSuccess: () => {
      utils.tags.list.invalidate();
      setCreateOpen(false);
      setNewName("");
      setNewColor(TAG_COLORS[0]!);
      toast("success", "Tag created");
    },
    onError: (e) => toast("error", e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tags</CardTitle>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Tag
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          </div>
        ) : tags.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">No tags yet. Create one to get started.</p>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                onSaved={() => utils.tags.list.invalidate()}
                onDelete={() => utils.tags.list.invalidate()}
              />
            ))}
          </div>
        )}
      </CardContent>

      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setNewName(""); setNewColor(TAG_COLORS[0]!); }}
        title="New Tag"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setNewName(""); }}>Cancel</Button>
            <Button
              onClick={() => create.mutate({ name: newName, color: newColor })}
              disabled={create.isPending || !newName.trim()}
            >
              {create.isPending ? "Creating…" : "Create Tag"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Tag name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. VIP, Needs Follow-up"
            autoFocus
          />
          <div>
            <p className="text-sm font-medium text-stone-700 mb-2">Color</p>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((c) => (
                <ColorSwatch key={c} color={c} selected={newColor === c} onClick={() => setNewColor(c)} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: newColor }} />
            <span className="text-sm text-stone-600">{newName || "Preview"}</span>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

// ─── Staff Profile Modal ──────────────────────────────────────────────────────
function StaffProfileModal({ staff, onClose }: { staff: StaffMemberType; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const update = trpc.staff.updateProfile.useMutation({
    onSuccess: () => {
      utils.staff.list.invalidate();
      toast("success", "Profile updated");
      onClose();
    },
    onError: (e) => toast("error", e.message),
  });

  const [form, setForm] = useState({
    firstName: staff.firstName,
    lastName: staff.lastName,
    bio: staff.bio ?? "",
    avatarUrl: staff.avatarUrl ?? "",
    color: staff.color ?? "#6B7280",
    specialtiesStr: (staff.specialties ?? []).join(", "),
    certificationsStr: (staff.certifications ?? []).join(", "),
    linkedinUrl: staff.linkedinUrl ?? "",
    instagramUrl: staff.instagramUrl ?? "",
  });

  const handleSave = () => {
    update.mutate({
      id: staff.id,
      firstName: form.firstName,
      lastName: form.lastName,
      bio: form.bio || null,
      avatarUrl: form.avatarUrl || null,
      color: form.color,
      specialties: form.specialtiesStr.split(",").map((s) => s.trim()).filter(Boolean),
      certifications: form.certificationsStr.split(",").map((s) => s.trim()).filter(Boolean),
      linkedinUrl: form.linkedinUrl || null,
      instagramUrl: form.instagramUrl || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-900">Edit Profile</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-700 block mb-1">First Name</label>
              <input className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-700 block mb-1">Last Name</label>
              <input className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Bio</label>
            <textarea rows={3} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm resize-none" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Avatar URL</label>
            <input className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" placeholder="https://..." value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Color</label>
            <input type="color" className="h-9 w-16 rounded cursor-pointer border border-stone-200" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Specialties (comma-separated)</label>
            <input className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" placeholder="Strength Training, HIIT, Mobility" value={form.specialtiesStr} onChange={(e) => setForm({ ...form, specialtiesStr: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Certifications (comma-separated)</label>
            <input className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" placeholder="NASM-CPT, ACE, CrossFit L2" value={form.certificationsStr} onChange={(e) => setForm({ ...form, certificationsStr: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">LinkedIn URL</label>
            <input className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" placeholder="https://linkedin.com/in/..." value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Instagram</label>
            <input className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" placeholder="@username" value={form.instagramUrl} onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })} />
          </div>
        </div>
        {update.error && <p className="text-sm text-red-600 mt-3">{update.error.message}</p>}
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────
function BillingTab() {
  const { data: status, isLoading } = trpc.billing.status.useQuery();
  const isConnected = status?.enabled ?? false;
  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/stripe`
    : "/api/webhooks/stripe";

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <Card>
        <CardHeader>
          <CardTitle>Stripe Connection</CardTitle>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
          ) : (
            <Badge variant={isConnected ? "success" : "outline"}>
              {isConnected ? "Connected" : "Not configured"}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="space-y-3">
              <p className="text-sm text-stone-600">
                Stripe is configured. Package purchases and subscription billing are active.
              </p>
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary" size="sm">Open Stripe Dashboard ↗</Button>
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-stone-500">
                Add your Stripe keys to enable package purchases and recurring billing.
              </p>
              <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 space-y-1">
                <p className="text-xs font-medium text-stone-700">Required environment variables:</p>
                <code className="block text-xs text-stone-600">STRIPE_SECRET_KEY=sk_live_…</code>
                <code className="block text-xs text-stone-600">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…</code>
                <code className="block text-xs text-stone-600">STRIPE_WEBHOOK_SECRET=whsec_…</code>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook config */}
      <Card>
        <CardHeader><CardTitle>Webhook Configuration</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-stone-600 mb-3">
            Register this endpoint in your{" "}
            <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="underline text-stone-900">
              Stripe Webhook settings
            </a>{" "}
            to handle payment events.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-xs text-stone-700 font-mono truncate">
              {webhookUrl}
            </code>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { navigator.clipboard.writeText(webhookUrl); }}
            >
              Copy
            </Button>
          </div>
          <div className="mt-3 rounded-lg bg-stone-50 border border-stone-200 p-3">
            <p className="text-xs font-medium text-stone-700 mb-1">Required events:</p>
            <ul className="text-xs text-stone-600 space-y-0.5">
              <li>• checkout.session.completed</li>
              <li>• invoice.payment_succeeded</li>
              <li>• invoice.payment_failed</li>
              <li>• customer.subscription.deleted</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const roleVariant: Record<string, "danger" | "info" | "success" | "outline"> = {
  OWNER: "danger",
  ADMIN: "info",
  TRAINER: "success",
  STAFF: "outline",
};

export default function SettingsPage() {
  const { data: staffList, isLoading } = trpc.staff.list.useQuery();
  const [editingStaff, setEditingStaff] = useState<StaffMemberType | null>(null);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business Information</TabsTrigger>
          <TabsTrigger value="personal">Personal Information</TabsTrigger>
          <TabsTrigger value="staff">Staff Members</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /> Edit</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <div><p className="text-xs text-stone-500 mb-1">Website</p><p className="text-sm text-stone-900">https://www.carbontc.co</p></div>
                <div><p className="text-xs text-stone-500 mb-1">Timezone</p><p className="text-sm text-stone-900">America/Denver (MT)</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal">
          <Card>
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-stone-500">Edit your profile in Supabase Auth settings.</p></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff Members</CardTitle>
              <Button size="sm">Invite Staff</Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
              ) : (
                <div className="space-y-3">
                  {(staffList ?? []).map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-stone-200 p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${s.firstName} ${s.lastName}`} size="sm" src={s.avatarUrl ?? undefined} />
                        <div>
                          <p className="text-sm font-medium text-stone-900">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-stone-500">{s.email}</p>
                          {s.specialties && s.specialties.length > 0 && (
                            <p className="text-xs text-stone-400 mt-0.5">{s.specialties.join(" · ")}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={roleVariant[s.role] || "outline"}>
                          {s.role.charAt(0) + s.role.slice(1).toLowerCase()}
                        </Badge>
                        {!s.isActive && <Badge variant="outline">Inactive</Badge>}
                        <Button variant="ghost" size="sm" onClick={() => setEditingStaff(s)}>
                          <User className="h-3.5 w-3.5" />
                          <span className="ml-1 text-xs">Edit</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags">
          <TagsTab />
        </TabsContent>

        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
      </Tabs>

      {editingStaff && (
        <StaffProfileModal staff={editingStaff} onClose={() => setEditingStaff(null)} />
      )}
    </div>
  );
}
